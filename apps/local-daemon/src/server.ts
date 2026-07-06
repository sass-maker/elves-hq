import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { ElfRun } from "@elves-hq/core";
import { RoomProcessManager } from "./process-manager";
import { WorkspaceStore } from "./store";

const port = Number(process.env.ELVES_HQ_DAEMON_PORT ?? 4327);
const store = new WorkspaceStore();
const processManager = new RoomProcessManager(store);

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    "Access-Control-Allow-Origin": "http://127.0.0.1:5177",
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

    if (request.method === "POST" && url.pathname === "/api/import/fleet-registry") {
      const result = store.importFleetRegistry();
      sendJson(response, 200, { ...result, workspace: store.getWorkspace() });
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
  if (mode === "dry-run" || mode === "codex-readonly") {
    return mode;
  }

  throw new Error("Unsupported run mode");
}
