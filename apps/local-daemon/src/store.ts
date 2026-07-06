import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { seedWorkspace, type Artifact, type Decision, type Elf, type Product, type Room, type RoomAsk, type RoomLog, type Task, type WorkspaceSeed } from "@elves-hq/core";

const databasePath = fileURLToPath(new URL("../../../data/elves.db", import.meta.url));
const fleetRegistryPath = fileURLToPath(new URL("../../../../saas-maker/foundry.projects.json", import.meta.url));

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

interface TaskRow {
  id: string;
  productId: string;
  title: string;
  acceptanceCriteria: string;
  priority: Task["priority"];
}

export class WorkspaceStore {
  private readonly db: DatabaseSync;

  constructor() {
    mkdirSync(dirname(databasePath), { recursive: true });
    this.db = new DatabaseSync(databasePath);
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.createSchema();
    this.seedIfEmpty();
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

    return { products, elves, tasks, rooms };
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
    `);
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
      "INSERT INTO rooms (id, product_id, task_id, assigned_elf_id, title, status, started_at, last_activity_at, summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
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
        insertRoom.run(room.id, room.productId, room.taskId, room.assignedElfId, room.title, room.status, room.startedAt, room.lastActivityAt, room.summary);
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
