import { spawn } from "node:child_process";

const daemonUrl = process.env.VITE_DAEMON_URL ?? "http://127.0.0.1:4327";
const children = new Set();
let shuttingDown = false;

function spawnPnpm(args, label) {
  const child = spawn("pnpm", args, {
    stdio: "inherit",
    env: process.env
  });
  children.add(child);
  child.once("exit", (code, signal) => {
    children.delete(child);
    if (shuttingDown) {
      return;
    }
    if (code && code !== 0) {
      console.error(`[${label}] exited with code ${code}`);
    }
    shutdown(code ?? 0);
  });
  return child;
}

async function daemonIsHealthy() {
  try {
    const response = await fetch(`${daemonUrl}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}

function shutdown(code = 0) {
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

if (await daemonIsHealthy()) {
  console.log(`[elves-hq] Reusing local daemon at ${daemonUrl}`);
} else {
  console.log("[elves-hq] Starting local daemon");
  spawnPnpm(["dev:daemon"], "daemon");
}

spawnPnpm(["dev:ui"], "ui");
