import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { CheckScriptKey, DecisionAction, ElfRun } from "@elves-hq/core";
import { RoomProcessManager } from "./process-manager";
import { WorkspaceStore } from "./store";

const port = Number(process.env.ELVES_HQ_DAEMON_PORT ?? 4327);
const runsRoot = fileURLToPath(new URL("../../../runs/", import.meta.url));
const store = new WorkspaceStore();
const processManager = new RoomProcessManager(store);

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  });
  response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) {
    return {};
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);

  try {
    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, { ok: true, service: "elves-hq-local-daemon" });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/workspace") {
      sendJson(response, 200, store.getWorkspace());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/needs-me") {
      sendJson(response, 200, { items: store.getDecisionItems() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/import/fleet-registry") {
      const result = store.importFleetRegistry();
      sendJson(response, 200, { ...result, workspace: store.getWorkspace() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/rooms") {
      const body = await readJson(request);
      const result = store.createTaskRoom(readCreateRoomInput(body));
      sendJson(response, 200, { ...result, workspace: store.getWorkspace() });
      return;
    }

    const decisionMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/decision$/);
    if (request.method === "POST" && decisionMatch) {
      const body = await readJson(request);
      const input = readDecisionInput(body);
      if (input.action === "retry") {
        const result = processManager.retryRoom(decisionMatch[1]);
        sendJson(response, 200, { ...result, workspace: store.getWorkspace(), needs: store.getDecisionItems() });
        return;
      }

      const room = store.resolveDecision(decisionMatch[1], input);
      sendJson(response, 200, { room, workspace: store.getWorkspace(), needs: store.getDecisionItems() });
      return;
    }

    const runsMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/runs$/);
    if (request.method === "GET" && runsMatch) {
      sendJson(response, 200, { runs: store.listRuns(runsMatch[1]) });
      return;
    }

    const startRunMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/runs\/start$/);
    if (request.method === "POST" && startRunMatch) {
      const body = await readJson(request);
      const mode = readRunMode(body);
      const prompt = body && typeof body === "object" && typeof (body as { prompt?: unknown }).prompt === "string" ? (body as { prompt: string }).prompt : undefined;
      const result = processManager.startRoomRun(startRunMatch[1], { mode, prompt });
      sendJson(response, 200, result);
      return;
    }

    const killRunMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/kill$/);
    if (request.method === "POST" && killRunMatch) {
      sendJson(response, 200, processManager.killRun(killRunMatch[1]));
      return;
    }

    const diffMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/diff$/);
    if (request.method === "GET" && diffMatch) {
      const runId = diffMatch[1];
      if (!/^run-[a-z0-9-]+$/i.test(runId)) {
        sendJson(response, 400, { error: "Invalid run id" });
        return;
      }

      const diffPath = fileURLToPath(new URL(`${runId}/diff.patch`, `file://${runsRoot.endsWith("/") ? runsRoot : `${runsRoot}/`}`));
      if (!existsSync(diffPath)) {
        sendJson(response, 404, { error: "No diff captured for this run" });
        return;
      }

      sendJson(response, 200, { runId, diff: readFileSync(diffPath, "utf8") });
      return;
    }

    const checkMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/check$/);
    if (request.method === "POST" && checkMatch) {
      const body = await readJson(request);
      const scriptKey = readCheckScriptKey(body);
      sendJson(response, 200, processManager.runCheck(checkMatch[1], scriptKey));
      return;
    }

    const checkOutputMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/check-output$/);
    if (request.method === "GET" && checkOutputMatch) {
      const runId = checkOutputMatch[1];
      if (!/^run-[a-z0-9-]+$/i.test(runId)) {
        sendJson(response, 400, { error: "Invalid run id" });
        return;
      }

      const outputPath = fileURLToPath(new URL(`${runId}/check.log`, `file://${runsRoot.endsWith("/") ? runsRoot : `${runsRoot}/`}`));
      if (!existsSync(outputPath)) {
        sendJson(response, 404, { error: "No check output captured for this run" });
        return;
      }

      sendJson(response, 200, { runId, output: readFileSync(outputPath, "utf8") });
      return;
    }

    const codevetterMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/codevetter$/);
    if (request.method === "POST" && codevetterMatch) {
      sendJson(response, 200, processManager.runCodeVetter(codevetterMatch[1]));
      return;
    }

    if (request.method === "GET" && codevetterMatch) {
      const runId = codevetterMatch[1];
      if (!/^run-[a-z0-9-]+$/i.test(runId)) {
        sendJson(response, 400, { error: "Invalid run id" });
        return;
      }

      const outputPath = fileURLToPath(new URL(`${runId}/codevetter.md`, `file://${runsRoot.endsWith("/") ? runsRoot : `${runsRoot}/`}`));
      if (!existsSync(outputPath)) {
        sendJson(response, 404, { error: "No CodeVetter report captured for this run" });
        return;
      }

      sendJson(response, 200, { runId, output: readFileSync(outputPath, "utf8") });
      return;
    }

    const cleanupWorktreeMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/cleanup-worktree$/);
    if (request.method === "POST" && cleanupWorktreeMatch) {
      sendJson(response, 200, processManager.cleanupWorktree(cleanupWorktreeMatch[1]));
      return;
    }

    const noteMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/notes$/);
    if (request.method === "POST" && noteMatch) {
      const body = await readJson(request);
      if (!body || typeof body !== "object" || typeof (body as { body?: unknown }).body !== "string") {
        sendJson(response, 400, { error: "Expected JSON body with string field: body" });
        return;
      }
      const room = store.addRoomNote(noteMatch[1], (body as { body: string }).body);
      sendJson(response, 200, { room });
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : "Unknown error" });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Elves HQ local daemon listening on http://127.0.0.1:${port}`);
});

function readRunMode(body: unknown): ElfRun["mode"] {
  if (!body || typeof body !== "object" || !("mode" in body)) {
    return "dry-run";
  }

  const mode = (body as { mode?: unknown }).mode;
  if (mode === "dry-run" || mode === "codex-readonly" || mode === "worktree-dry-run" || mode === "codex-worktree") {
    return mode;
  }

  throw new Error("Unsupported run mode");
}

function readCheckScriptKey(body: unknown): CheckScriptKey | undefined {
  if (!body || typeof body !== "object" || !("scriptKey" in body)) {
    return undefined;
  }

  const scriptKey = (body as { scriptKey?: unknown }).scriptKey;
  if (scriptKey === "check" || scriptKey === "typecheck" || scriptKey === "test" || scriptKey === "build") {
    return scriptKey;
  }

  throw new Error("Unsupported check script key");
}

function readCreateRoomInput(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new Error("Expected JSON body");
  }

  const record = body as { productId?: unknown; title?: unknown; acceptanceCriteria?: unknown; assignedElfId?: unknown };
  if (typeof record.productId !== "string") {
    throw new Error("productId is required");
  }
  if (typeof record.title !== "string") {
    throw new Error("title is required");
  }

  return {
    productId: record.productId,
    title: record.title,
    acceptanceCriteria: Array.isArray(record.acceptanceCriteria) ? record.acceptanceCriteria.filter((item): item is string => typeof item === "string") : [],
    assignedElfId: typeof record.assignedElfId === "string" ? record.assignedElfId : undefined
  };
}

function readDecisionInput(body: unknown): { action: DecisionAction; note?: string } {
  if (!body || typeof body !== "object") {
    throw new Error("Expected JSON body");
  }

  const record = body as { action?: unknown; note?: unknown };
  if (record.action !== "approve" && record.action !== "request_fix" && record.action !== "reject" && record.action !== "snooze" && record.action !== "retry") {
    throw new Error("Unsupported decision action");
  }

  return {
    action: record.action,
    note: typeof record.note === "string" ? record.note : undefined
  };
}
