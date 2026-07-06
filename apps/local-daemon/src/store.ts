import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import {
  buildDecisionItems,
  buildDailyBrief,
  builtInPlaybooks,
  getApprovalBlockers,
  getBlockingArtifacts,
  productMemorySectionDefinitions,
  seedWorkspace,
  type Artifact,
  type DailyBrief,
  type Decision,
  type DecisionAction,
  type DecisionItem,
  type Elf,
  type ElfRun,
  type Playbook,
  type Product,
  type ProductMemory,
  type ProductMemorySection,
  type ProductMemorySectionKey,
  type Room,
  type RoomAsk,
  type RoomLog,
  type Task,
  type WorkspaceSeed
} from "@elves-hq/core";

const databasePath = fileURLToPath(new URL("../../../data/elves.db", import.meta.url));
const fleetRegistryPath = fileURLToPath(new URL("../../../../saas-maker/foundry.projects.json", import.meta.url));
const memoryRoot = fileURLToPath(new URL("../../../memory/", import.meta.url));
const transcriptsRoot = fileURLToPath(new URL("../../../runs/room-transcripts/", import.meta.url));

interface RegistryProject {
  desc?: string;
  url?: string;
  tier?: "active-ai" | "core" | "helper";
  priority?: Product["priority"];
  maturity?: string;
}

interface RoomRow {
  id: string;
  product_id: string;
  task_id: string;
  assigned_elf_id: string;
  playbook_id: string | null;
  title: string;
  status: Room["status"];
  started_at: string;
  last_activity_at: string;
  summary: string;
}

interface LogRow {
  id: string;
  room_id: string;
  time: string;
  level: RoomLog["level"];
  message: string;
}

interface AskRow {
  id: string;
  room_id: string;
  question: string;
  options_json: string;
  recommendation: string;
  created_at: string;
}

interface ArtifactRow {
  id: string;
  room_id: string;
  type: Artifact["type"];
  title: string;
  summary: string;
  status: Artifact["status"];
}

interface DecisionRow {
  id: string;
  room_id: string;
  title: string;
  status: Decision["status"];
  risk: Decision["risk"];
}

interface NoteRow {
  id: number;
  room_id: string;
  body: string;
  created_at: string;
}

interface RunRow {
  id: string;
  room_id: string;
  mode: ElfRun["mode"];
  status: ElfRun["status"];
  command: string;
  started_at: string;
  ended_at: string | null;
  exit_code: number | null;
}

interface TaskRow {
  id: string;
  productId: string;
  title: string;
  acceptanceCriteria: string;
  priority: Task["priority"];
}

export interface CreateRoomInput {
  productId: string;
  title: string;
  acceptanceCriteria: string[];
  assignedElfId?: string;
  playbookId?: string;
}

export interface ResolveDecisionInput {
  action: DecisionAction;
  note?: string;
}

export interface AnswerRoomAskInput {
  askId: string;
  answer: string;
  note?: string;
}

export class WorkspaceStore {
  private readonly db: DatabaseSync;

  constructor() {
    mkdirSync(dirname(databasePath), { recursive: true });
    this.db = new DatabaseSync(databasePath);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.createSchema();
    this.seedIfEmpty();
    this.recoverInterruptedRuns();
  }

  getWorkspace(): WorkspaceSeed {
    const products = this.db.prepare("SELECT * FROM products ORDER BY priority, name").all() as unknown as Product[];
    const elves = this.db.prepare("SELECT * FROM elves ORDER BY name").all() as unknown as Elf[];
    const tasks = (this.db.prepare("SELECT * FROM tasks ORDER BY priority, title").all() as unknown as TaskRow[]).map(
      (task): Task => ({
        id: task.id,
        productId: task.productId,
        title: task.title,
        acceptanceCriteria: JSON.parse(task.acceptanceCriteria) as string[],
        priority: task.priority
      })
    );
    const roomRows = this.db.prepare("SELECT * FROM rooms ORDER BY last_activity_at DESC").all() as unknown as RoomRow[];

    const rooms = roomRows.map((row) => this.hydrateRoom(row));

    return { products, elves, playbooks: builtInPlaybooks, tasks, rooms };
  }

  getPlaybook(playbookId: string | null | undefined): Playbook | undefined {
    return playbookId ? builtInPlaybooks.find((playbook) => playbook.id === playbookId) : undefined;
  }

  getDecisionItems(): DecisionItem[] {
    return buildDecisionItems(this.getWorkspace().rooms);
  }

  getDailyBrief(): DailyBrief {
    return buildDailyBrief(this.getWorkspace());
  }

  generateRoomTranscript(roomId: string): { roomId: string; outputPath: string; transcript: string; room: Room } {
    const room = this.getRoom(roomId);
    const transcript = this.renderRoomTranscript(room);
    const outputPath = roomTranscriptPath(room.id);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, transcript);
    this.db.prepare("DELETE FROM artifacts WHERE room_id = ? AND type = ? AND title = ?").run(room.id, "log", `Room transcript for ${room.id}`);
    this.addArtifact(room.id, {
      type: "log",
      title: `Room transcript for ${room.id}`,
      summary: `Generated Markdown transcript at ${outputPath}`,
      status: "ready"
    });
    this.appendRoomLog(room.id, "success", `Generated room transcript at ${outputPath}.`);

    return {
      roomId: room.id,
      outputPath,
      transcript,
      room: this.getRoom(room.id)
    };
  }

  getRoomTranscript(roomId: string): { roomId: string; outputPath: string; transcript: string } {
    this.getRoom(roomId);
    const outputPath = roomTranscriptPath(roomId);
    if (!existsSync(outputPath)) {
      throw new Error("No transcript has been generated for this room yet.");
    }

    return {
      roomId,
      outputPath,
      transcript: readFileSync(outputPath, "utf8")
    };
  }

  getProductMemory(productId: string): ProductMemory {
    const product = this.getProduct(productId);
    const productMemoryPath = resolve(memoryRoot, safePathSegment(product.slug));
    mkdirSync(productMemoryPath, { recursive: true });

    const sections = productMemorySectionDefinitions.map((definition): ProductMemorySection => {
      const filePath = resolve(productMemoryPath, definition.filename);
      if (!existsSync(filePath)) {
        writeFileSync(filePath, defaultMemoryBody(product, definition.key));
      }

      return {
        ...definition,
        body: readFileSync(filePath, "utf8"),
        updatedAt: statSync(filePath).mtime.toISOString()
      };
    });

    return {
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      sections
    };
  }

  updateProductMemorySection(productId: string, key: ProductMemorySectionKey, body: string): ProductMemory {
    const product = this.getProduct(productId);
    const definition = productMemorySectionDefinitions.find((item) => item.key === key);
    if (!definition) {
      throw new Error(`Unsupported memory section: ${key}`);
    }

    const productMemoryPath = resolve(memoryRoot, safePathSegment(product.slug));
    mkdirSync(productMemoryPath, { recursive: true });
    writeFileSync(resolve(productMemoryPath, definition.filename), `${body.trimEnd()}\n`);
    return this.getProductMemory(productId);
  }

  getRoom(roomId: string): Room {
    const row = this.db.prepare("SELECT * FROM rooms WHERE id = ?").get(roomId) as unknown as RoomRow | undefined;
    if (!row) {
      throw new Error(`Room not found: ${roomId}`);
    }
    return this.hydrateRoom(row);
  }

  getProduct(productId: string): Product {
    const product = this.db.prepare("SELECT * FROM products WHERE id = ?").get(productId) as unknown as Product | undefined;
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }
    return product;
  }

  getTask(taskId: string): Task {
    const row = this.db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as unknown as TaskRow | undefined;
    if (!row) {
      throw new Error(`Task not found: ${taskId}`);
    }
    return {
      id: row.id,
      productId: row.productId,
      title: row.title,
      acceptanceCriteria: JSON.parse(row.acceptanceCriteria) as string[],
      priority: row.priority
    };
  }

  createTaskRoom(input: CreateRoomInput): { task: Task; room: Room } {
    const title = input.title.trim();
    if (!title) {
      throw new Error("Room title is required");
    }

    const product = this.getProduct(input.productId);
    const assignedElfId = input.assignedElfId ?? this.defaultBuilderElfId();
    const playbookId = input.playbookId && this.getPlaybook(input.playbookId) ? input.playbookId : null;
    const elf = this.db.prepare("SELECT * FROM elves WHERE id = ?").get(assignedElfId) as unknown as Elf | undefined;
    if (!elf) {
      throw new Error(`Elf not found: ${assignedElfId}`);
    }

    const criteria = input.acceptanceCriteria.map((item) => item.trim()).filter(Boolean);
    if (criteria.length === 0) {
      criteria.push("Founder reviews the room output before accepting it.");
    }

    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const taskId = `task-${suffix}`;
    const roomId = `room-${suffix}`;
    const startedAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const task: Task = {
      id: taskId,
      productId: product.id,
      title,
      acceptanceCriteria: criteria,
      priority: "medium"
    };

    this.db.exec("BEGIN");
    try {
      this.db
        .prepare("INSERT INTO tasks (id, productId, title, acceptanceCriteria, priority) VALUES (?, ?, ?, ?, ?)")
        .run(task.id, task.productId, task.title, JSON.stringify(task.acceptanceCriteria), task.priority);
      this.db
        .prepare(
          "INSERT INTO rooms (id, product_id, task_id, assigned_elf_id, playbook_id, title, status, started_at, last_activity_at, summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run(roomId, product.id, task.id, assignedElfId, playbookId, title, "idle", startedAt, startedAt, `Room created for ${product.name}. Assign an elf run when ready.`);
      this.db
        .prepare("INSERT INTO room_notes (room_id, body, created_at) VALUES (?, ?, ?)")
        .run(roomId, `Created manually in Elves HQ for ${product.name}.`, new Date().toISOString());
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }

    this.appendRoomLog(roomId, "info", `Created room for ${product.name}: ${title}`);
    return { task, room: this.getRoom(roomId) };
  }

  createRun(roomId: string, mode: ElfRun["mode"], command: string): ElfRun {
    const room = this.getRoom(roomId);
    const runId = `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = new Date().toISOString();
    this.db
      .prepare(
        "INSERT INTO elf_runs (id, room_id, mode, status, command, started_at, ended_at, exit_code) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)"
      )
      .run(runId, room.id, mode, "running", command, startedAt);
    this.updateRoom(room.id, "working", `Started ${humanRunMode(mode)} run ${runId}.`);
    this.appendRoomLog(room.id, "info", `Started ${mode} run: ${command}`);

    return {
      id: runId,
      roomId: room.id,
      mode,
      status: "running",
      command,
      startedAt,
      endedAt: null,
      exitCode: null
    };
  }

  getRun(runId: string): ElfRun {
    const row = this.db.prepare("SELECT * FROM elf_runs WHERE id = ?").get(runId) as unknown as RunRow | undefined;
    if (!row) {
      throw new Error(`Run not found: ${runId}`);
    }

    return hydrateRun(row);
  }

  finishRun(runId: string, status: ElfRun["status"], exitCode: number | null): Room {
    const run = this.db.prepare("SELECT * FROM elf_runs WHERE id = ?").get(runId) as unknown as RunRow | undefined;
    if (!run) {
      throw new Error(`Run not found: ${runId}`);
    }

    const endedAt = new Date().toISOString();
    this.db.prepare("UPDATE elf_runs SET status = ?, ended_at = ?, exit_code = ? WHERE id = ?").run(status, endedAt, exitCode, runId);

    const hasOpenAsk = (this.db.prepare("SELECT COUNT(*) AS count FROM room_asks WHERE room_id = ?").get(run.room_id) as { count: number }).count > 0;
    const roomStatus = status === "completed" ? (hasOpenAsk ? "asking" : "ready") : status === "killed" ? "blocked" : "failed";
    const summary =
      status === "completed" && hasOpenAsk
        ? `Run ${runId} completed after opening an ask for founder input.`
        : status === "completed"
          ? `Run ${runId} completed. Review the logs and artifacts before accepting the room.`
        : status === "killed"
          ? `Run ${runId} was killed by the founder.`
          : `Run ${runId} failed with exit code ${exitCode ?? "unknown"}.`;

    this.updateRoom(run.room_id, roomStatus, summary);
    this.appendRoomLog(run.room_id, status === "completed" ? "success" : status === "killed" ? "warning" : "error", summary);
    return this.getRoom(run.room_id);
  }

  appendRoomLog(roomId: string, level: RoomLog["level"], message: string): RoomLog {
    const id = `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    this.db.prepare("INSERT INTO room_logs (id, room_id, time, level, message) VALUES (?, ?, ?, ?, ?)").run(id, roomId, time, level, message);
    this.db.prepare("UPDATE rooms SET last_activity_at = ? WHERE id = ?").run(time, roomId);

    return { id, time, level, message };
  }

  addArtifact(roomId: string, artifact: Omit<Artifact, "id">): Artifact {
    const id = `art-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    this.db
      .prepare("INSERT INTO artifacts (id, room_id, type, title, summary, status) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, roomId, artifact.type, artifact.title, artifact.summary, artifact.status);

    return { id, ...artifact };
  }

  markRoomStatus(roomId: string, status: Room["status"], summary: string): Room {
    this.updateRoom(roomId, status, summary);
    return this.getRoom(roomId);
  }

  openRoomAsk(roomId: string, ask: Omit<RoomAsk, "id" | "createdAt">): Room {
    const room = this.getRoom(roomId);
    const askId = `ask-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = new Date().toISOString();
    const summary = `Elf asks: ${ask.question}`;

    this.db.exec("BEGIN");
    try {
      this.db.prepare("DELETE FROM room_asks WHERE room_id = ?").run(room.id);
      this.db
        .prepare("INSERT INTO room_asks (id, room_id, question, options_json, recommendation, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run(askId, room.id, ask.question, JSON.stringify(ask.options), ask.recommendation, createdAt);
      this.db.prepare("UPDATE rooms SET status = ?, summary = ?, last_activity_at = ? WHERE id = ?").run("asking", summary, "now", room.id);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }

    this.appendRoomLog(room.id, "warning", `Elf opened an ask: ${ask.question}`);
    return this.getRoom(room.id);
  }

  resolveDecision(roomId: string, input: ResolveDecisionInput): Room {
    const room = this.getRoom(roomId);
    const note = input.note?.trim();
    const blockers = getApprovalBlockers(room);
    if (input.action === "approve" && blockers.length > 0) {
      throw new Error(`Cannot approve this room yet. ${blockers.join(" ")}`);
    }

    const resolution = decisionResolution(input.action, note);
    const decisionId = `dec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    this.db.exec("BEGIN");
    try {
      this.db
        .prepare("INSERT INTO decisions (id, room_id, title, status, risk) VALUES (?, ?, ?, ?, ?)")
        .run(decisionId, room.id, resolution.title, resolution.status, resolution.risk);
      this.db.prepare("DELETE FROM room_asks WHERE room_id = ?").run(room.id);
      this.db.prepare("UPDATE rooms SET status = ?, summary = ?, last_activity_at = ? WHERE id = ?").run(resolution.roomStatus, resolution.summary, "now", room.id);
      if (note) {
        this.db.prepare("INSERT INTO room_notes (room_id, body, created_at) VALUES (?, ?, ?)").run(room.id, note, new Date().toISOString());
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }

    this.appendRoomLog(room.id, resolution.logLevel, resolution.logMessage);
    return this.getRoom(room.id);
  }

  answerRoomAsk(roomId: string, input: AnswerRoomAskInput): Room {
    const room = this.getRoom(roomId);
    const ask = room.asks.find((item) => item.id === input.askId);
    const answer = input.answer.trim();
    const note = input.note?.trim();

    if (!ask) {
      throw new Error("Ask is no longer open in this room.");
    }
    if (!answer) {
      throw new Error("Answer is required.");
    }

    const decisionId = `dec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const noteBody = [`Answered elf ask: ${ask.question}`, `Answer: ${answer}`, note ? `Context: ${note}` : undefined].filter(Boolean).join("\n");
    const summary = `Founder answered: ${answer}`;

    this.db.exec("BEGIN");
    try {
      this.db
        .prepare("INSERT INTO decisions (id, room_id, title, status, risk) VALUES (?, ?, ?, ?, ?)")
        .run(decisionId, room.id, `Answered elf ask: ${answer}`, "answered", "low");
      this.db.prepare("INSERT INTO room_notes (room_id, body, created_at) VALUES (?, ?, ?)").run(room.id, noteBody, now);
      this.db.prepare("DELETE FROM room_asks WHERE room_id = ? AND id = ?").run(room.id, ask.id);
      this.db.prepare("UPDATE rooms SET status = ?, summary = ?, last_activity_at = ? WHERE id = ?").run("idle", summary, "now", room.id);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }

    this.appendRoomLog(room.id, "success", `Founder answered elf ask: ${answer}`);
    return this.getRoom(room.id);
  }

  listRuns(roomId: string): ElfRun[] {
    return (this.db.prepare("SELECT * FROM elf_runs WHERE room_id = ? ORDER BY started_at DESC").all(roomId) as unknown as RunRow[]).map(hydrateRun);
  }

  importFleetRegistry(): { imported: number } {
    const products = loadFleetRegistryProducts();
    if (products.length === 0) {
      return { imported: 0 };
    }

    const upsertProduct = this.db.prepare(`
      INSERT INTO products (id, name, slug, localPath, status, priority, currentGoal)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        slug = excluded.slug,
        localPath = excluded.localPath,
        status = excluded.status,
        priority = excluded.priority,
        currentGoal = excluded.currentGoal
    `);

    this.db.exec("BEGIN");
    try {
      for (const product of products) {
        upsertProduct.run(product.id, product.name, product.slug, product.localPath, product.status, product.priority, product.currentGoal);
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }

    return { imported: products.length };
  }

  addRoomNote(roomId: string, body: string): Room {
    const trimmed = body.trim();
    if (!trimmed) {
      throw new Error("Room note cannot be empty");
    }

    const room = this.db.prepare("SELECT * FROM rooms WHERE id = ?").get(roomId) as unknown as RoomRow | undefined;
    if (!room) {
      throw new Error(`Room not found: ${roomId}`);
    }

    this.db
      .prepare("INSERT INTO room_notes (room_id, body, created_at) VALUES (?, ?, ?)")
      .run(roomId, trimmed, new Date().toISOString());
    this.db.prepare("UPDATE rooms SET last_activity_at = ? WHERE id = ?").run("now", roomId);

    const updated = this.db.prepare("SELECT * FROM rooms WHERE id = ?").get(roomId) as unknown as RoomRow;
    return this.hydrateRoom(updated);
  }

  private renderRoomTranscript(room: Room): string {
    const product = this.getProduct(room.productId);
    const task = this.getTask(room.taskId);
    const elf = this.db.prepare("SELECT * FROM elves WHERE id = ?").get(room.assignedElfId) as unknown as Elf | undefined;
    const playbook = this.getPlaybook(room.playbookId);
    const runs = this.listRuns(room.id);

    return [
      `# ${room.title}`,
      "",
      `Generated: ${new Date().toISOString()}`,
      `Room: ${room.id}`,
      "",
      "## Product",
      `- Name: ${product.name}`,
      `- Local path: ${product.localPath}`,
      `- Status: ${product.status}`,
      `- Priority: ${product.priority}`,
      `- Current goal: ${product.currentGoal}`,
      "",
      "## Task",
      `- ID: ${task.id}`,
      `- Priority: ${task.priority}`,
      "",
      "### Acceptance Criteria",
      markdownList(task.acceptanceCriteria),
      "",
      "## Room State",
      `- Status: ${room.status}`,
      `- Summary: ${room.summary}`,
      `- Started: ${room.startedAt}`,
      `- Last activity: ${room.lastActivityAt}`,
      `- Assigned elf: ${elf ? `${elf.name} (${elf.role})` : room.assignedElfId}`,
      `- Playbook: ${playbook ? playbook.name : "none"}`,
      "",
      "## Open Asks",
      room.asks.length > 0
        ? room.asks
            .map((ask) => [`### ${ask.question}`, `- Created: ${ask.createdAt}`, `- Options: ${ask.options.join(" / ")}`, `- Recommendation: ${ask.recommendation}`].join("\n"))
            .join("\n\n")
        : "No open asks.",
      "",
      "## Founder Notes",
      markdownList(room.notes),
      "",
      "## Decisions",
      room.decisions.length > 0 ? room.decisions.map((decision) => `- ${decision.status} (${decision.risk}): ${decision.title}`).join("\n") : "No decisions recorded.",
      "",
      "## Artifacts",
      room.artifacts.length > 0 ? room.artifacts.map((artifact) => `- ${artifact.status} ${artifact.type}: ${artifact.title} - ${artifact.summary}`).join("\n") : "No artifacts recorded.",
      "",
      "## Runs",
      runs.length > 0 ? runs.map((run) => `- ${run.status} ${run.mode} ${run.id} exit=${run.exitCode ?? "n/a"} started=${run.startedAt} ended=${run.endedAt ?? "n/a"} command=${run.command}`).join("\n") : "No runs recorded.",
      "",
      "## Logs",
      room.logs.length > 0 ? room.logs.map((log) => `- ${log.time} ${log.level}: ${log.message}`).join("\n") : "No logs recorded.",
      ""
    ].join("\n");
  }

  private hydrateRoom(row: RoomRow): Room {
    const logs = this.db.prepare("SELECT id, time, level, message FROM room_logs WHERE room_id = ? ORDER BY id").all(row.id) as unknown as RoomLog[];
    const asks = (this.db.prepare("SELECT * FROM room_asks WHERE room_id = ? ORDER BY created_at").all(row.id) as unknown as AskRow[]).map(
      (ask): RoomAsk => ({
        id: ask.id,
        question: ask.question,
        options: JSON.parse(ask.options_json) as string[],
        recommendation: ask.recommendation,
        createdAt: ask.created_at
      })
    );
    const artifacts = this.db.prepare("SELECT id, type, title, summary, status FROM artifacts WHERE room_id = ? ORDER BY id").all(row.id) as unknown as Artifact[];
    const decisions = this.db.prepare("SELECT id, title, status, risk FROM decisions WHERE room_id = ? ORDER BY id").all(row.id) as unknown as Decision[];
    const notes = (this.db.prepare("SELECT body FROM room_notes WHERE room_id = ? ORDER BY id").all(row.id) as unknown as NoteRow[]).map((note) => note.body);

    return {
      id: row.id,
      productId: row.product_id,
      taskId: row.task_id,
      assignedElfId: row.assigned_elf_id,
      playbookId: row.playbook_id,
      title: row.title,
      status: row.status,
      startedAt: row.started_at,
      lastActivityAt: row.last_activity_at,
      summary: row.summary,
      logs,
      asks,
      artifacts,
      decisions,
      notes
    };
  }

  private createSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        localPath TEXT NOT NULL,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        currentGoal TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS elves (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        productId TEXT NOT NULL,
        title TEXT NOT NULL,
        acceptanceCriteria TEXT NOT NULL,
        priority TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        assigned_elf_id TEXT NOT NULL,
        playbook_id TEXT,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        last_activity_at TEXT NOT NULL,
        summary TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS room_logs (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        time TEXT NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS room_asks (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        question TEXT NOT NULL,
        options_json TEXT NOT NULL,
        recommendation TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        status TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS decisions (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        risk TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS room_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS elf_runs (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        mode TEXT NOT NULL,
        status TEXT NOT NULL,
        command TEXT NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        exit_code INTEGER
      );
    `);
    this.migrateSchema();
  }

  private migrateSchema() {
    const roomColumns = this.db.prepare("PRAGMA table_info(rooms)").all() as Array<{ name: string }>;
    if (!roomColumns.some((column) => column.name === "playbook_id")) {
      this.db.exec("ALTER TABLE rooms ADD COLUMN playbook_id TEXT;");
    }
  }

  private recoverInterruptedRuns() {
    const interruptedRuns = this.db.prepare("SELECT * FROM elf_runs WHERE status = ?").all("running") as unknown as RunRow[];
    if (interruptedRuns.length === 0) {
      return;
    }

    const endedAt = new Date().toISOString();
    const updateRun = this.db.prepare("UPDATE elf_runs SET status = ?, ended_at = ?, exit_code = NULL WHERE id = ?");
    const updateRoom = this.db.prepare("UPDATE rooms SET status = ?, summary = ?, last_activity_at = ? WHERE id = ?");
    const insertLog = this.db.prepare("INSERT INTO room_logs (id, room_id, time, level, message) VALUES (?, ?, ?, ?, ?)");

    this.db.exec("BEGIN");
    try {
      for (const run of interruptedRuns) {
        const summary = `Run ${run.id} was interrupted by daemon restart before completion.`;
        updateRun.run("failed", endedAt, run.id);
        updateRoom.run("failed", summary, "now", run.room_id);
        insertLog.run(`log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, run.room_id, "now", "warning", summary);
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  private updateRoom(roomId: string, status: Room["status"], summary: string) {
    this.db.prepare("UPDATE rooms SET status = ?, summary = ?, last_activity_at = ? WHERE id = ?").run(status, summary, "now", roomId);
  }

  private defaultBuilderElfId() {
    const elf = this.db.prepare("SELECT * FROM elves WHERE role = ? ORDER BY name LIMIT 1").get("builder") as unknown as Elf | undefined;
    if (!elf) {
      throw new Error("No builder elf exists");
    }
    return elf.id;
  }

  private seedIfEmpty() {
    const count = this.db.prepare("SELECT COUNT(*) AS count FROM products").get() as { count: number };
    if (count.count > 0) {
      return;
    }

    const insertProduct = this.db.prepare(
      "INSERT INTO products (id, name, slug, localPath, status, priority, currentGoal) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    const insertElf = this.db.prepare("INSERT INTO elves (id, name, role, status) VALUES (?, ?, ?, ?)");
    const insertTask = this.db.prepare("INSERT INTO tasks (id, productId, title, acceptanceCriteria, priority) VALUES (?, ?, ?, ?, ?)");
    const insertRoom = this.db.prepare(
      "INSERT INTO rooms (id, product_id, task_id, assigned_elf_id, playbook_id, title, status, started_at, last_activity_at, summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const insertLog = this.db.prepare("INSERT INTO room_logs (id, room_id, time, level, message) VALUES (?, ?, ?, ?, ?)");
    const insertAsk = this.db.prepare(
      "INSERT INTO room_asks (id, room_id, question, options_json, recommendation, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    );
    const insertArtifact = this.db.prepare("INSERT INTO artifacts (id, room_id, type, title, summary, status) VALUES (?, ?, ?, ?, ?, ?)");
    const insertDecision = this.db.prepare("INSERT INTO decisions (id, room_id, title, status, risk) VALUES (?, ?, ?, ?, ?)");
    const insertNote = this.db.prepare("INSERT INTO room_notes (room_id, body, created_at) VALUES (?, ?, ?)");

    this.db.exec("BEGIN");
    try {
      const seedProducts = mergeProducts(loadFleetRegistryProducts(), seedWorkspace.products);
      for (const product of seedProducts) {
        insertProduct.run(product.id, product.name, product.slug, product.localPath, product.status, product.priority, product.currentGoal);
      }
      for (const elf of seedWorkspace.elves) {
        insertElf.run(elf.id, elf.name, elf.role, elf.status);
      }
      for (const task of seedWorkspace.tasks) {
        insertTask.run(task.id, task.productId, task.title, JSON.stringify(task.acceptanceCriteria), task.priority);
      }
      for (const room of seedWorkspace.rooms) {
        insertRoom.run(room.id, room.productId, room.taskId, room.assignedElfId, room.playbookId ?? null, room.title, room.status, room.startedAt, room.lastActivityAt, room.summary);
        for (const log of room.logs) {
          insertLog.run(log.id, room.id, log.time, log.level, log.message);
        }
        for (const ask of room.asks) {
          insertAsk.run(ask.id, room.id, ask.question, JSON.stringify(ask.options), ask.recommendation, ask.createdAt);
        }
        for (const artifact of room.artifacts) {
          insertArtifact.run(artifact.id, room.id, artifact.type, artifact.title, artifact.summary, artifact.status);
        }
        for (const decision of room.decisions) {
          insertDecision.run(decision.id, room.id, decision.title, decision.status, decision.risk);
        }
        for (const note of room.notes) {
          insertNote.run(room.id, note, new Date().toISOString());
        }
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
}

function humanRunMode(mode: ElfRun["mode"]) {
  switch (mode) {
    case "codex-readonly":
      return "Codex read-only";
    case "worktree-dry-run":
      return "worktree dry";
    case "codex-worktree":
      return "Codex worktree";
    case "dry-run":
      return "local dry";
  }
}

function hydrateRun(row: RunRow): ElfRun {
  return {
    id: row.id,
    roomId: row.room_id,
    mode: row.mode,
    status: row.status,
    command: row.command,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    exitCode: row.exit_code
  };
}

function decisionResolution(action: DecisionAction, note: string | undefined): {
  title: string;
  status: Decision["status"];
  risk: Decision["risk"];
  roomStatus: Room["status"];
  summary: string;
  logLevel: RoomLog["level"];
  logMessage: string;
} {
  const suffix = note ? `: ${note}` : ".";

  switch (action) {
    case "approve":
      return {
        title: "Founder approved room output",
        status: "approved",
        risk: "low",
        roomStatus: "done",
        summary: `Founder approved this room${suffix}`,
        logLevel: "success",
        logMessage: `Founder approved the room${suffix}`
      };
    case "request_fix":
      return {
        title: "Founder requested a fix",
        status: "requested_fix",
        risk: "medium",
        roomStatus: "idle",
        summary: `Founder requested a fix${suffix}`,
        logLevel: "warning",
        logMessage: `Founder requested a fix${suffix}`
      };
    case "reject":
      return {
        title: "Founder rejected room output",
        status: "rejected",
        risk: "medium",
        roomStatus: "done",
        summary: `Founder rejected this room${suffix}`,
        logLevel: "warning",
        logMessage: `Founder rejected the room${suffix}`
      };
    case "snooze":
      return {
        title: "Founder snoozed room",
        status: "snoozed",
        risk: "low",
        roomStatus: "idle",
        summary: `Founder snoozed this room${suffix}`,
        logLevel: "info",
        logMessage: `Founder snoozed the room${suffix}`
      };
    case "retry":
      return {
        title: "Founder retried room",
        status: "retried",
        risk: "medium",
        roomStatus: "idle",
        summary: `Founder requested a retry${suffix}`,
        logLevel: "info",
        logMessage: `Founder requested a retry${suffix}`
      };
  }
}

function mergeProducts(primary: Product[], fallback: Product[]): Product[] {
  const productsById = new Map<string, Product>();
  for (const product of fallback) {
    productsById.set(product.id, product);
  }
  for (const product of primary) {
    productsById.set(product.id, product);
  }
  return [...productsById.values()];
}

function roomTranscriptPath(roomId: string) {
  return resolve(transcriptsRoot, `${safePathSegment(roomId)}.md`);
}

function markdownList(items: string[]) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None recorded.";
}

function loadFleetRegistryProducts(): Product[] {
  if (!existsSync(fleetRegistryPath)) {
    return [];
  }

  const registry = JSON.parse(readFileSync(fleetRegistryPath, "utf8")) as Record<string, RegistryProject>;

  return Object.entries(registry).map(([key, value]): Product => {
    const repoName = repoNameFromUrl(value.url) ?? key;
    const slug = key === "CodeVetter" ? "codevetter" : slugify(repoName);
    const name = displayName(key, repoName);
    const status: Product["status"] = value.tier === "helper" ? "maintain" : "active";

    return {
      id: `prod-${slug}`,
      name,
      slug,
      localPath: `../${slug}`,
      status,
      priority: value.priority ?? "P2",
      currentGoal: value.desc ?? "Imported from the SaaS Maker fleet registry."
    };
  });
}

function repoNameFromUrl(url: string | undefined) {
  if (!url) {
    return undefined;
  }
  const withoutGit = url.replace(/\.git$/, "");
  return withoutGit.split(/[/:]/).filter(Boolean).at(-1);
}

function slugify(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();
}

function safePathSegment(value: string) {
  return slugify(value).replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "product";
}

function defaultMemoryBody(product: Product, key: ProductMemorySectionKey) {
  const headings: Record<ProductMemorySectionKey, string> = {
    PRODUCT: "Product",
    STRATEGY: "Strategy",
    ARCHITECTURE: "Architecture",
    DECISIONS: "Decisions",
    DO_NOT_DO: "Do Not Do",
    RECENT_LEARNINGS: "Recent Learnings"
  };

  const intro =
    key === "PRODUCT"
      ? [`Product: ${product.name}`, `Current goal: ${product.currentGoal}`]
      : [`Product: ${product.name}`, "Add durable notes here."];

  return [`# ${headings[key]}`, "", ...intro, "", "## Notes", "", "- "].join("\n");
}

function displayName(key: string, repoName: string) {
  if (key === "CodeVetter") {
    return "CodeVetter";
  }
  if (key === "saas-maker") {
    return "SaaS Maker";
  }
  const source = repoName || key;
  const acronyms: Record<string, string> = {
    ai: "AI",
    api: "API",
    cli: "CLI",
    dr: "DR",
    gpt: "GPT",
    hq: "HQ",
    tv: "TV",
    ui: "UI"
  };

  return source
    .replace(/_/g, "-")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .split("-")
    .filter(Boolean)
    .map((part) => acronyms[part.toLowerCase()] ?? part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
