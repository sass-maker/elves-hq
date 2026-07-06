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

  runCodeVetter(runId: string) {
    const run = this.store.getRun(runId);
    if (run.status === "running") {
      throw new Error("Cannot run CodeVetter while the room run is still active");
    }
    if (!run.mode.includes("worktree")) {
      throw new Error("CodeVetter requires a worktree-backed run");
    }

    const worktreePath = resolve(runsRoot, run.id, "worktree");
    const diffPath = resolve(runsRoot, run.id, "diff.patch");
    if (!existsSync(worktreePath)) {
      throw new Error(`Missing worktree for run ${run.id}`);
    }
    if (!existsSync(diffPath)) {
      throw new Error(`Missing diff for run ${run.id}`);
    }

    this.store.appendRoomLog(run.roomId, "info", "Running CodeVetter gate.");
    const report = process.env.CODEVETTER_COMMAND
      ? runConfiguredCodeVetter(process.env.CODEVETTER_COMMAND, { diffPath, worktreePath, runId })
      : runLocalCodeVetterScan(readFileSync(diffPath, "utf8"), { diffPath, worktreePath, runId });

    const outputPath = resolve(runsRoot, run.id, "codevetter.md");
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, report.markdown);

    this.store.addArtifact(run.roomId, {
      type: "review",
      title: `CodeVetter gate for ${run.id}`,
      summary: report.summary,
      status: report.blocking ? "failed" : "passed"
    });
    if (report.blocking) {
      this.store.markRoomStatus(run.roomId, "failed", `CodeVetter blocked run ${run.id}: ${report.summary}`);
    }
    this.store.appendRoomLog(run.roomId, report.blocking ? "error" : "success", `CodeVetter gate ${report.blocking ? "blocked" : "passed"}: ${report.summary}`);

    return {
      runId: run.id,
      blocking: report.blocking,
      findingCount: report.findingCount,
      highCount: report.highCount,
      mediumCount: report.mediumCount,
      outputPath,
      output: report.markdown
    };
  }

  cleanupWorktree(runId: string) {
    const run = this.store.getRun(runId);
    if (run.status === "running") {
      throw new Error("Cannot clean up a worktree while the room run is still active");
    }
    if (!run.mode.includes("worktree")) {
      throw new Error("Cleanup requires a worktree-backed run");
    }

    const room = this.store.getRoom(run.roomId);
    const product = this.store.getProduct(room.productId);
    const sourcePath = resolve(projectRoot, product.localPath);
    const worktreePath = resolve(runsRoot, run.id, "worktree");

    if (!existsSync(worktreePath)) {
      this.store.appendRoomLog(run.roomId, "warning", `No generated worktree found for ${run.id}; captured artifacts remain available.`);
      return {
        runId: run.id,
        removed: false,
        worktreePath,
        room: this.store.getRoom(run.roomId)
      };
    }

    const result = spawnSync("git", ["-C", sourcePath, "worktree", "remove", "--force", worktreePath], {
      encoding: "utf8"
    });
    if (result.status !== 0) {
      throw new Error(result.stderr.trim() || `Failed to remove worktree for ${run.id}`);
    }

    this.store.addArtifact(run.roomId, {
      type: "log",
      title: `Worktree cleanup for ${run.id}`,
      summary: `Removed generated worktree at ${worktreePath}; captured diff, check, and review artifacts remain in runs/${run.id}.`,
      status: "passed"
    });
    this.store.appendRoomLog(run.roomId, "success", `Removed generated worktree for ${run.id}. Captured artifacts remain available.`);

    return {
      runId: run.id,
      removed: true,
      worktreePath,
      room: this.store.getRoom(run.roomId)
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

interface CodeVetterReport {
  blocking: boolean;
  findingCount: number;
  highCount: number;
  mediumCount: number;
  summary: string;
  markdown: string;
}

interface CodeVetterContext {
  diffPath: string;
  worktreePath: string;
  runId: string;
}

function runConfiguredCodeVetter(commandTemplate: string, context: CodeVetterContext): CodeVetterReport {
  const outputPath = resolve(runsRoot, context.runId, "codevetter-external-output.txt");
  const command = commandTemplate
    .replaceAll("{diff}", shellQuote(context.diffPath))
    .replaceAll("{worktree}", shellQuote(context.worktreePath))
    .replaceAll("{output}", shellQuote(outputPath));
  const finalCommand = command.includes(context.diffPath) ? command : `${command} ${shellQuote(context.diffPath)}`;
  const result = spawnSync(finalCommand, {
    cwd: context.worktreePath,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20,
    shell: true
  });
  const combined = [result.stdout.trim(), result.stderr.trim() ? `\n[stderr]\n${result.stderr.trim()}` : ""].filter(Boolean).join("\n");
  const externalOutput = existsSync(outputPath) ? readFileSync(outputPath, "utf8") : combined;
  const blocking = result.status !== 0;
  const markdown = [
    "# CodeVetter Gate",
    "",
    `Run: ${context.runId}`,
    "Adapter: external command",
    `Command: ${finalCommand}`,
    `Exit code: ${result.status ?? "unknown"}`,
    "",
    "## Result",
    "",
    blocking ? "Blocking: external CodeVetter command returned a non-zero exit code." : "Passed: external CodeVetter command exited successfully.",
    "",
    "## Output",
    "",
    "```text",
    externalOutput || "No output.",
    "```"
  ].join("\n");

  return {
    blocking,
    findingCount: blocking ? 1 : 0,
    highCount: blocking ? 1 : 0,
    mediumCount: 0,
    summary: blocking ? "External CodeVetter command failed; review output before approval." : "External CodeVetter command passed.",
    markdown
  };
}

function runLocalCodeVetterScan(diff: string, context: CodeVetterContext): CodeVetterReport {
  const findings = localDiffFindings(diff);
  const highCount = findings.filter((finding) => finding.severity === "high").length;
  const mediumCount = findings.filter((finding) => finding.severity === "medium").length;
  const blocking = highCount > 0;
  const summary =
    findings.length === 0
      ? "No high-confidence local diff risks found."
      : `${findings.length} local diff risk${findings.length === 1 ? "" : "s"} found: ${highCount} high, ${mediumCount} medium.`;
  const markdown = [
    "# CodeVetter Gate",
    "",
    `Run: ${context.runId}`,
    "Adapter: local deterministic fallback",
    `Diff: ${context.diffPath}`,
    `Worktree: ${context.worktreePath}`,
    "",
    "## Result",
    "",
    blocking ? "Blocking: high-severity findings require founder review or a fix." : "Passed: no high-severity findings were detected by the local fallback scan.",
    "",
    "## Findings",
    "",
    findings.length === 0
      ? "No findings."
      : findings
          .map(
            (finding, index) =>
              `${index + 1}. **${finding.severity.toUpperCase()}** ${finding.title}\n   - Evidence: \`${finding.evidence}\`\n   - Why it matters: ${finding.detail}`
          )
          .join("\n\n"),
    "",
    "## Notes",
    "",
    "This fallback gate is not a substitute for the full CodeVetter desktop review engine. Set `CODEVETTER_COMMAND` to an external CodeVetter CLI command when one is available."
  ].join("\n");

  return {
    blocking,
    findingCount: findings.length,
    highCount,
    mediumCount,
    summary,
    markdown
  };
}

function localDiffFindings(diff: string) {
  const findings: Array<{ severity: "high" | "medium"; title: string; detail: string; evidence: string }> = [];
  const rules: Array<{ severity: "high" | "medium"; title: string; detail: string; pattern: RegExp }> = [
    {
      severity: "high",
      title: "Potential hardcoded secret",
      detail: "New code appears to assign a credential-like value. Secrets should not be committed or exposed to elves unless explicitly allowed.",
      pattern: /^\+.*(?:api[_-]?key|secret|token|password)\s*[:=]\s*['"][^'"]{8,}/i
    },
    {
      severity: "high",
      title: "Shell execution risk",
      detail: "New code appears to run shell commands through a string shell. Review for command injection before approval.",
      pattern: /^\+.*(?:shell\s*:\s*true|exec\s*\(|execSync\s*\()/i
    },
    {
      severity: "high",
      title: "Unsafe HTML injection",
      detail: "New code writes raw HTML into the page. Review sanitization and source trust before approval.",
      pattern: /^\+.*(?:dangerouslySetInnerHTML|innerHTML\s*=)/i
    },
    {
      severity: "medium",
      title: "Dynamic code execution",
      detail: "New code appears to evaluate strings as code. Confirm the input is trusted and cannot be influenced by users.",
      pattern: /^\+.*(?:eval\s*\(|new Function\s*\()/i
    },
    {
      severity: "medium",
      title: "Network request introduced",
      detail: "New network calls may affect privacy, reliability, or costs. Confirm the endpoint and failure behavior are acceptable.",
      pattern: /^\+.*(?:fetch\s*\(|axios\.|http\.request|https\.request)/i
    }
  ];

  for (const line of diff.split(/\r?\n/)) {
    if (!line.startsWith("+") || line.startsWith("+++")) {
      continue;
    }
    for (const rule of rules) {
      const evidence = line.slice(0, 180);
      if (rule.pattern.test(line) && !findings.some((finding) => finding.title === rule.title && finding.evidence === evidence)) {
        findings.push({ severity: rule.severity, title: rule.title, detail: rule.detail, evidence });
      }
    }
  }

  return findings;
}

function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}
