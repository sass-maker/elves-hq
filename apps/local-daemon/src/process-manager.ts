import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { ElfRun } from "@elves-hq/core";
import { WorkspaceStore } from "./store";

const fleetRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const runTimeoutMs = Number(process.env.ELVES_HQ_RUN_TIMEOUT_MS ?? 120_000);

export interface StartRunOptions {
  mode: ElfRun["mode"];
  prompt?: string;
}

interface RunningProcess {
  roomId: string;
  child: ChildProcessWithoutNullStreams;
  timeout: NodeJS.Timeout;
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
    const child = this.spawnRun(product.localPath, task.title, options);
    const timeout = setTimeout(() => {
      if (!this.running.has(run.id)) {
        return;
      }
      this.store.appendRoomLog(room.id, "warning", `Run ${run.id} exceeded ${Math.round(runTimeoutMs / 1000)}s runtime cap. Stopping it.`);
      child.kill("SIGTERM");
    }, runTimeoutMs);

    this.running.set(run.id, { roomId: room.id, child, timeout });
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

  private spawnRun(localPath: string, taskTitle: string, options: StartRunOptions) {
    const cwd = resolve(fleetRoot, localPath);

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
        { cwd: existsSync(cwd) ? cwd : fleetRoot }
      );
    }

    const prompt = [
      options.prompt?.trim() || `Inspect the task "${taskTitle}" and report the safest next step. Do not edit files.`,
      "",
      "You are running from Elves HQ in read-only mode.",
      "Do not modify files, commit, push, deploy, migrate, access secrets, or make irreversible changes.",
      "Return a concise status update with concrete files or commands you inspected."
    ].join("\n");

    return spawn(
      "codex",
      ["--ask-for-approval", "never", "exec", "--json", "--sandbox", "read-only", "-C", existsSync(cwd) ? cwd : fleetRoot, prompt],
      { cwd: existsSync(cwd) ? cwd : fleetRoot }
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
    return `codex --ask-for-approval never exec --json --sandbox read-only -C ${localPath}`;
  }
}
