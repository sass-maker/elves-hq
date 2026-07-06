import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { CheckScriptKey, ElfRun } from "@elves-hq/core";
import { WorkspaceStore } from "./store";

const projectRoot = fileURLToPath(new URL("../../../", import.meta.url));
const runTimeoutMs = Number(process.env.ELVES_HQ_RUN_TIMEOUT_MS ?? 120_000);
const runsRoot = fileURLToPath(new URL("../../../runs/", import.meta.url));

export interface StartRunOptions {
  mode: ElfRun["mode"];
  prompt?: string;
}

interface RunningProcess {
  roomId: string;
  child: ChildProcessWithoutNullStreams;
  timeout: NodeJS.Timeout;
  worktreePath?: string;
}

export class RoomProcessManager {
  private readonly running = new Map<string, RunningProcess>();

  constructor(private readonly store: WorkspaceStore) {}

  startRoomRun(roomId: string, options: StartRunOptions) {
    if ([...this.running.values()].some((entry) => entry.roomId === roomId)) {
      throw new Error("A run is already active in this room");
    }

    const room = this.store.getRoom(roomId);
    const product = this.store.getProduct(room.productId);
    const task = this.store.getTask(room.taskId);
    const command = this.buildCommandDescription(product.localPath, task.title, options);
    const run = this.store.createRun(room.id, options.mode, command);
    let worktree: { path: string; branchName: string } | undefined;
    try {
      worktree = this.createWorktreeIfNeeded(run, product.localPath, task.title, options.mode);
    } catch (error) {
      this.store.appendRoomLog(room.id, "error", error instanceof Error ? error.message : "Failed to create worktree.");
      this.store.finishRun(run.id, "failed", null);
      throw error;
    }
    const child = this.spawnRun(product.localPath, task.title, options, worktree?.path);
    const timeout = setTimeout(() => {
      if (!this.running.has(run.id)) {
        return;
      }
      this.store.appendRoomLog(room.id, "warning", `Run ${run.id} exceeded ${Math.round(runTimeoutMs / 1000)}s runtime cap. Stopping it.`);
      child.kill("SIGTERM");
    }, runTimeoutMs);

    this.running.set(run.id, { roomId: room.id, child, timeout, worktreePath: worktree?.path });
    this.attachLogging(run, child);

    return { run, room: this.store.getRoom(room.id) };
  }

  killRun(runId: string) {
    const running = this.running.get(runId);
    if (!running) {
      throw new Error(`No active process for run ${runId}`);
    }

    this.store.appendRoomLog(running.roomId, "warning", `Founder requested stop for ${runId}.`);
    running.child.kill("SIGTERM");
    return { ok: true };
  }

  retryRoom(roomId: string) {
    if ([...this.running.values()].some((entry) => entry.roomId === roomId)) {
      throw new Error("A run is already active in this room");
    }

    const latestRun = this.store.listRuns(roomId)[0];
    this.store.resolveDecision(roomId, { action: "retry", note: latestRun ? `Retrying ${latestRun.mode} from ${latestRun.id}.` : "Starting first dry run." });
    return this.startRoomRun(roomId, { mode: latestRun?.mode ?? "dry-run" });
  }

  runCheck(runId: string, requestedScript?: CheckScriptKey) {
    const run = this.store.getRun(runId);
    if (run.status === "running") {
      throw new Error("Cannot run checks while the room run is still active");
    }
    if (!run.mode.includes("worktree")) {
      throw new Error("Checks require a worktree-backed run");
    }

    const worktreePath = resolve(runsRoot, run.id, "worktree");
    if (!existsSync(worktreePath)) {
      throw new Error(`Missing worktree for run ${run.id}`);
    }

    const command = detectCheckCommand(worktreePath, requestedScript);
    this.store.appendRoomLog(run.roomId, "info", `Running check gate: ${command.label}`);
    const result = spawnSync(command.command, command.args, {
      cwd: worktreePath,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 20,
      shell: false
    });

    const output = [
      `$ ${command.label}`,
      "",
      result.stdout.trim(),
      result.stderr.trim() ? `\n[stderr]\n${result.stderr.trim()}` : ""
    ]
      .filter(Boolean)
      .join("\n");
    const outputPath = fileURLToPath(new URL(`../../../runs/${run.id}/check.log`, import.meta.url));
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${output}\n`);

    const passed = result.status === 0;
    this.store.addArtifact(run.roomId, {
      type: "test",
      title: `${command.scriptKey} gate for ${run.id}`,
      summary: `${passed ? "Passed" : "Failed"} with exit code ${result.status ?? "unknown"}; output captured at ${outputPath}`,
      status: passed ? "passed" : "failed"
    });
    this.store.appendRoomLog(run.roomId, passed ? "success" : "error", `Check gate ${passed ? "passed" : "failed"}: ${command.label}`);

    return {
      runId: run.id,
      passed,
      exitCode: result.status,
      scriptKey: command.scriptKey,
      command: command.label,
      outputPath,
      output
    };
  }

  private spawnRun(localPath: string, taskTitle: string, options: StartRunOptions, worktreePath?: string) {
    const cwd = resolve(projectRoot, localPath);
    const runCwd = worktreePath ?? cwd;

    if (options.mode === "dry-run") {
      return spawn(
        process.execPath,
        [
          "-e",
          [
            "const lines = [",
            JSON.stringify(`Elf opened local room for: ${taskTitle}`) + ",",
            JSON.stringify("Loaded room context and acceptance criteria.") + ",",
            JSON.stringify("Dry run complete. Real Codex execution is available through codex-readonly mode.") + "",
            "];",
            "let i = 0;",
            "const tick = () => {",
            "  console.log(lines[i]);",
            "  i += 1;",
            "  if (i >= lines.length) process.exit(0);",
            "  setTimeout(tick, 350);",
            "};",
            "tick();"
          ].join("\n")
        ],
        { cwd: existsSync(cwd) ? cwd : projectRoot }
      );
    }

    if (options.mode === "worktree-dry-run") {
      return spawn(
        process.execPath,
        [
          "-e",
          [
            "const { writeFileSync } = require('node:fs');",
            "const path = 'ELVES_HQ_ROOM_RUN.md';",
            "writeFileSync(path, [",
            JSON.stringify(`# Elves HQ worktree dry run`) + ",",
            JSON.stringify("") + ",",
            JSON.stringify(`Task: ${taskTitle}`) + ",",
            JSON.stringify("") + ",",
            JSON.stringify("This file proves the elf wrote only inside an isolated git worktree.") + ",",
            "].join('\\n'));",
            "console.log(`Wrote ${path} in isolated worktree.`);"
          ].join("\n")
        ],
        { cwd: runCwd }
      );
    }

    const prompt = [
      options.prompt?.trim() || defaultPrompt(taskTitle, options.mode),
      "",
      options.mode === "codex-worktree"
        ? "You are running from Elves HQ inside an isolated git worktree. You may edit files only in this worktree."
        : "You are running from Elves HQ in read-only mode.",
      "Do not commit, push, deploy, migrate, access secrets, spend money, message users, or make irreversible changes.",
      "Return a concise status update with concrete files or commands you inspected."
    ].join("\n");

    return spawn(
      "codex",
      [
        "--ask-for-approval",
        "never",
        "exec",
        "--json",
        "--sandbox",
        options.mode === "codex-worktree" ? "workspace-write" : "read-only",
        "-C",
        existsSync(runCwd) ? runCwd : projectRoot,
        prompt
      ],
      { cwd: existsSync(runCwd) ? runCwd : projectRoot }
    );
  }

  private attachLogging(run: ElfRun, child: ChildProcessWithoutNullStreams) {
    child.stdout.on("data", (chunk: Buffer) => {
      this.writeLines(run.roomId, "info", chunk.toString("utf8"));
    });

    child.stderr.on("data", (chunk: Buffer) => {
      this.writeLines(run.roomId, "warning", chunk.toString("utf8"));
    });

    child.on("error", (error) => {
      this.store.appendRoomLog(run.roomId, "error", error.message);
      this.store.finishRun(run.id, "failed", null);
      this.clearRun(run.id);
    });

    child.on("close", (code, signal) => {
      const running = this.running.get(run.id);
      if (running?.worktreePath && !signal) {
        this.captureWorktreeDiff(run, running.worktreePath);
      }
      this.clearRun(run.id);
      if (signal) {
        this.store.finishRun(run.id, "killed", code);
        return;
      }
      this.store.finishRun(run.id, code === 0 ? "completed" : "failed", code);
    });
  }

  private clearRun(runId: string) {
    const running = this.running.get(runId);
    if (running) {
      clearTimeout(running.timeout);
      this.running.delete(runId);
    }
  }

  private writeLines(roomId: string, level: "info" | "warning", output: string) {
    for (const line of output.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed) {
        this.store.appendRoomLog(roomId, level, trimmed);
      }
    }
  }

  private buildCommandDescription(localPath: string, taskTitle: string, options: StartRunOptions) {
    if (options.mode === "dry-run") {
      return `node dry-run (${taskTitle})`;
    }
    if (options.mode === "worktree-dry-run") {
      return `node worktree-dry-run (${taskTitle})`;
    }
    if (options.mode === "codex-worktree") {
      return `codex --ask-for-approval never exec --json --sandbox workspace-write -C <isolated-worktree>`;
    }
    return `codex --ask-for-approval never exec --json --sandbox read-only -C ${localPath}`;
  }

  private createWorktreeIfNeeded(run: ElfRun, localPath: string, taskTitle: string, mode: ElfRun["mode"]) {
    if (mode !== "worktree-dry-run" && mode !== "codex-worktree") {
      return undefined;
    }

    const sourcePath = resolve(projectRoot, localPath);
    if (!existsSync(sourcePath)) {
      throw new Error(`Product path does not exist: ${sourcePath}`);
    }

    const gitCheck = spawnSync("git", ["-C", sourcePath, "rev-parse", "--show-toplevel"], { encoding: "utf8" });
    if (gitCheck.status !== 0) {
      throw new Error(`Product path is not a git repository: ${sourcePath}`);
    }

    const branchName = `elves/${run.roomId}/${run.id}`;
    const worktreePath = resolve(runsRoot, run.id, "worktree");
    mkdirSync(dirname(worktreePath), { recursive: true });

    const result = spawnSync("git", ["-C", sourcePath, "worktree", "add", "-b", branchName, worktreePath, "HEAD"], {
      encoding: "utf8"
    });

    if (result.status !== 0) {
      throw new Error(result.stderr.trim() || `Failed to create git worktree for ${taskTitle}`);
    }

    this.store.appendRoomLog(run.roomId, "success", `Created isolated worktree ${worktreePath} on branch ${branchName}.`);
    return { path: worktreePath, branchName };
  }

  private captureWorktreeDiff(run: ElfRun, worktreePath: string) {
    const intentToAdd = spawnSync("git", ["-C", worktreePath, "add", "-N", "."], { encoding: "utf8" });
    if (intentToAdd.status !== 0) {
      this.store.appendRoomLog(run.roomId, "warning", intentToAdd.stderr.trim() || "Could not mark untracked files for diff capture.");
    }

    const status = spawnSync("git", ["-C", worktreePath, "status", "--short"], { encoding: "utf8" });
    const diff = spawnSync("git", ["-C", worktreePath, "diff", "--", "."], { encoding: "utf8", maxBuffer: 1024 * 1024 * 10 });

    const statusText = status.stdout.trim();
    const diffText = diff.stdout.trim();

    if (!statusText && !diffText) {
      this.store.appendRoomLog(run.roomId, "info", "No worktree diff detected.");
      return;
    }

    const diffPath = fileURLToPath(new URL(`../../../runs/${run.id}/diff.patch`, import.meta.url));
    mkdirSync(dirname(diffPath), { recursive: true });
    writeFileSync(diffPath, diffText ? `${diffText}\n` : `# No textual diff captured\n# git status:\n${statusText}\n`);

    const changedCount = statusText ? statusText.split(/\r?\n/).filter(Boolean).length : 0;
    this.store.addArtifact(run.roomId, {
      type: "diff",
      title: `Worktree diff for ${run.id}`,
      summary: `${changedCount} changed file${changedCount === 1 ? "" : "s"} captured at ${diffPath}`,
      status: "ready"
    });
    this.store.appendRoomLog(run.roomId, "success", `Captured worktree diff artifact with ${changedCount} changed file${changedCount === 1 ? "" : "s"}.`);
  }
}

function defaultPrompt(taskTitle: string, mode: ElfRun["mode"]) {
  if (mode === "codex-worktree") {
    return `Work on the task "${taskTitle}" in the smallest safe way. Keep changes scoped and leave a concise summary.`;
  }

  return `Inspect the task "${taskTitle}" and report the safest next step. Do not edit files.`;
}

function detectCheckCommand(worktreePath: string, requestedScript: CheckScriptKey | undefined) {
  const packageJsonPath = resolve(worktreePath, "package.json");
  if (!existsSync(packageJsonPath)) {
    throw new Error("No package.json found in worktree; check gate detection is not available yet.");
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { scripts?: Record<string, string>; packageManager?: string };
  const scripts = packageJson.scripts ?? {};
  const scriptKey = requestedScript && scripts[requestedScript] ? requestedScript : (["check", "typecheck", "test", "build"] as CheckScriptKey[]).find((key) => scripts[key]);

  if (!scriptKey) {
    throw new Error("No check, typecheck, test, or build script found in package.json.");
  }

  const packageManager = packageJson.packageManager?.startsWith("pnpm") || existsSync(resolve(worktreePath, "pnpm-lock.yaml")) ? "pnpm" : "npm";

  if (packageManager === "pnpm") {
    return {
      scriptKey,
      command: "pnpm",
      args: [scriptKey],
      label: `pnpm ${scriptKey}`
    };
  }

  return {
    scriptKey,
    command: "npm",
    args: ["run", scriptKey],
    label: `npm run ${scriptKey}`
  };
}
