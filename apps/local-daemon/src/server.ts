import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { CheckScriptKey, DecisionAction, ElfRun, Product, ProductMemorySectionKey, Task } from "@elves-hq/core";
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

    if (request.method === "GET" && url.pathname === "/api/briefs/daily") {
      sendJson(response, 200, store.getDailyBrief());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/briefs/daily.md") {
      sendJson(response, 200, store.getDailyBriefMarkdown());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/fm/feed") {
      sendJson(response, 200, store.getElfFmFeed());
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/products") {
      const body = await readJson(request);
      const product = store.createProduct(readCreateProductInput(body));
      sendJson(response, 200, { product, workspace: store.getWorkspace() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/products/inspect-path") {
      const body = await readJson(request);
      sendJson(response, 200, store.inspectProductPath(readInspectProductPathInput(body)));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/tasks") {
      const body = await readJson(request);
      const task = store.createTask(readCreateTaskInput(body));
      sendJson(response, 200, { task, workspace: store.getWorkspace() });
      return;
    }

    const assignTaskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/assign-room$/);
    if (request.method === "POST" && assignTaskMatch) {
      const body = await readJson(request);
      const result = store.assignTaskToRoom(assignTaskMatch[1], readAssignTaskRoomInput(body));
      sendJson(response, 200, { ...result, workspace: store.getWorkspace(), needs: store.getDecisionItems(), brief: store.getDailyBrief(), fm: store.getElfFmFeed() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/rooms") {
      const body = await readJson(request);
      const result = store.createTaskRoom(readCreateRoomInput(body));
      sendJson(response, 200, { ...result, workspace: store.getWorkspace() });
      return;
    }

    const roomTranscriptMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/transcript$/);
    if (request.method === "POST" && roomTranscriptMatch) {
      sendJson(response, 200, store.generateRoomTranscript(roomTranscriptMatch[1]));
      return;
    }

    if (request.method === "GET" && roomTranscriptMatch) {
      sendJson(response, 200, store.getRoomTranscript(roomTranscriptMatch[1]));
      return;
    }

    const productMemoryMatch = url.pathname.match(/^\/api\/products\/([^/]+)\/memory$/);
    if (request.method === "GET" && productMemoryMatch) {
      sendJson(response, 200, store.getProductMemory(productMemoryMatch[1]));
      return;
    }

    const productInspectionMatch = url.pathname.match(/^\/api\/products\/([^/]+)\/inspection$/);
    if (request.method === "GET" && productInspectionMatch) {
      sendJson(response, 200, store.inspectProductFolder(productInspectionMatch[1]));
      return;
    }

    const productMemorySectionMatch = url.pathname.match(/^\/api\/products\/([^/]+)\/memory\/([^/]+)$/);
    if (request.method === "POST" && productMemorySectionMatch) {
      const body = await readJson(request);
      const sectionBody = readMemorySectionInput(body);
      sendJson(response, 200, store.updateProductMemorySection(productMemorySectionMatch[1], readMemorySectionKey(productMemorySectionMatch[2]), sectionBody));
      return;
    }

    const decisionMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/decision$/);
    if (request.method === "POST" && decisionMatch) {
      const body = await readJson(request);
      const input = readDecisionInput(body);
      if (input.action === "retry") {
        const result = processManager.retryRoom(decisionMatch[1], input.note);
        sendJson(response, 200, { ...result, workspace: store.getWorkspace(), needs: store.getDecisionItems() });
        return;
      }

      const room = store.resolveDecision(decisionMatch[1], input);
      sendJson(response, 200, { room, workspace: store.getWorkspace(), needs: store.getDecisionItems() });
      return;
    }

    const answerAskMatch = url.pathname.match(/^\/api\/rooms\/([^/]+)\/asks\/([^/]+)\/answer$/);
    if (request.method === "POST" && answerAskMatch) {
      const body = await readJson(request);
      const room = store.answerRoomAsk(answerAskMatch[1], readAnswerAskInput(answerAskMatch[2], body));
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

    const promptMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/prompt$/);
    if (request.method === "GET" && promptMatch) {
      const runId = promptMatch[1];
      if (!/^run-[a-z0-9-]+$/i.test(runId)) {
        sendJson(response, 400, { error: "Invalid run id" });
        return;
      }

      const promptPath = fileURLToPath(new URL(`${runId}/prompt.md`, `file://${runsRoot.endsWith("/") ? runsRoot : `${runsRoot}/`}`));
      if (!existsSync(promptPath)) {
        sendJson(response, 404, { error: "No prompt captured for this run" });
        return;
      }

      sendJson(response, 200, { runId, prompt: readFileSync(promptPath, "utf8") });
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

function readMemorySectionKey(value: string): ProductMemorySectionKey {
  if (value === "PRODUCT" || value === "STRATEGY" || value === "ARCHITECTURE" || value === "DECISIONS" || value === "DO_NOT_DO" || value === "RECENT_LEARNINGS") {
    return value;
  }

  throw new Error("Unsupported memory section");
}

function readMemorySectionInput(body: unknown): string {
  if (!body || typeof body !== "object" || typeof (body as { body?: unknown }).body !== "string") {
    throw new Error("Expected JSON body with string field: body");
  }

  return (body as { body: string }).body;
}

function readCreateRoomInput(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new Error("Expected JSON body");
  }

  const record = body as { productId?: unknown; title?: unknown; acceptanceCriteria?: unknown; assignedElfId?: unknown; playbookId?: unknown };
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
    assignedElfId: typeof record.assignedElfId === "string" ? record.assignedElfId : undefined,
    playbookId: typeof record.playbookId === "string" ? record.playbookId : undefined
  };
}

function readCreateTaskInput(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new Error("Task body is required");
  }

  const record = body as { productId?: unknown; title?: unknown; acceptanceCriteria?: unknown; priority?: unknown };
  if (typeof record.productId !== "string") {
    throw new Error("productId is required");
  }
  if (typeof record.title !== "string") {
    throw new Error("title is required");
  }

  return {
    productId: record.productId,
    title: record.title,
    acceptanceCriteria: readAcceptanceCriteria(record.acceptanceCriteria),
    priority: readOptionalTaskPriority(record.priority)
  };
}

function readAssignTaskRoomInput(body: unknown) {
  if (!body || typeof body !== "object") {
    return {};
  }

  const record = body as { assignedElfId?: unknown; playbookId?: unknown };
  return {
    assignedElfId: typeof record.assignedElfId === "string" && record.assignedElfId.trim() ? record.assignedElfId : undefined,
    playbookId: typeof record.playbookId === "string" && record.playbookId.trim() ? record.playbookId : undefined
  };
}

function readAcceptanceCriteria(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function readOptionalTaskPriority(value: unknown): Task["priority"] | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (value === "high" || value === "medium" || value === "low") {
    return value;
  }
  throw new Error("Unsupported task priority");
}

function readCreateProductInput(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new Error("Product body is required");
  }
  const value = body as { name?: unknown; localPath?: unknown; currentGoal?: unknown; priority?: unknown; status?: unknown };
  if (typeof value.name !== "string" || typeof value.localPath !== "string") {
    throw new Error("Product name and localPath are required");
  }
  const priority = readOptionalProductPriority(value.priority);
  const status = readOptionalProductStatus(value.status);
  return {
    name: value.name,
    localPath: value.localPath,
    currentGoal: typeof value.currentGoal === "string" ? value.currentGoal : undefined,
    priority,
    status
  };
}

function readInspectProductPathInput(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new Error("Product path body is required");
  }
  const value = body as { name?: unknown; localPath?: unknown };
  if (typeof value.localPath !== "string") {
    throw new Error("localPath is required");
  }
  return {
    name: typeof value.name === "string" ? value.name : "",
    localPath: value.localPath
  };
}

function readOptionalProductPriority(value: unknown): Product["priority"] | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (value === "P0" || value === "P1" || value === "P2") {
    return value;
  }
  throw new Error("Unsupported product priority");
}

function readOptionalProductStatus(value: unknown): Product["status"] | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (value === "active" || value === "maintain" || value === "paused" || value === "killed") {
    return value;
  }
  throw new Error("Unsupported product status");
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

function readAnswerAskInput(askId: string, body: unknown): { askId: string; answer: string; note?: string } {
  if (!body || typeof body !== "object") {
    throw new Error("Expected JSON body");
  }

  const record = body as { answer?: unknown; note?: unknown };
  if (typeof record.answer !== "string") {
    throw new Error("answer is required");
  }

  return {
    askId,
    answer: record.answer,
    note: typeof record.note === "string" ? record.note : undefined
  };
}
