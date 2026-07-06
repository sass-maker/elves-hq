export type RoomStatus = "working" | "asking" | "blocked" | "failed" | "ready" | "done" | "idle";

export type ProductStatus = "active" | "maintain" | "paused" | "killed";

export type ElfRole = "builder" | "reviewer" | "tester" | "researcher";

export interface Product {
  id: string;
  name: string;
  slug: string;
  localPath: string;
  status: ProductStatus;
  priority: "P0" | "P1" | "P2";
  currentGoal: string;
}

export interface Elf {
  id: string;
  name: string;
  role: ElfRole;
  status: RoomStatus;
}

export interface Task {
  id: string;
  productId: string;
  title: string;
  acceptanceCriteria: string[];
  priority: "high" | "medium" | "low";
}

export interface RoomAsk {
  id: string;
  question: string;
  options: string[];
  recommendation: string;
  createdAt: string;
}

export interface RoomLog {
  id: string;
  time: string;
  level: "info" | "success" | "warning" | "error";
  message: string;
}

export interface Artifact {
  id: string;
  type: "diff" | "test" | "review" | "note" | "screenshot" | "log";
  title: string;
  summary: string;
  status: "pending" | "passed" | "failed" | "ready";
}

export interface Decision {
  id: string;
  title: string;
  status: "open" | "approved" | "requested_fix" | "rejected" | "snoozed" | "retried";
  risk: "low" | "medium" | "high";
}

export type DecisionAction = "approve" | "request_fix" | "reject" | "snooze" | "retry";

export interface DecisionItem {
  id: string;
  roomId: string;
  productId: string;
  title: string;
  reason: string;
  status: RoomStatus;
  risk: Decision["risk"];
  urgency: number;
  recommendation: string;
  evidence: string[];
  actions: string[];
}

export type DailyBriefSection = "shipped" | "ready" | "blocked" | "failed" | "active";

export interface DailyBriefItem {
  id: string;
  roomId: string;
  productId: string;
  productName: string;
  title: string;
  summary: string;
  status: RoomStatus;
  evidence: string[];
}

export interface DailyBriefRecommendation {
  id: string;
  roomId: string;
  productId: string;
  productName: string;
  title: string;
  recommendation: string;
  risk: Decision["risk"];
}

export interface DailyBrief {
  generatedAt: string;
  totals: {
    rooms: number;
    decisions: number;
    ready: number;
    blocked: number;
    failed: number;
    active: number;
  };
  sections: Record<DailyBriefSection, DailyBriefItem[]>;
  recommendedNext: DailyBriefRecommendation[];
}

export type ProductMemorySectionKey = "PRODUCT" | "STRATEGY" | "ARCHITECTURE" | "DECISIONS" | "DO_NOT_DO" | "RECENT_LEARNINGS";

export interface ProductMemorySectionDefinition {
  key: ProductMemorySectionKey;
  title: string;
  filename: string;
}

export interface ProductMemorySection extends ProductMemorySectionDefinition {
  body: string;
  updatedAt: string | null;
}

export interface ProductMemory {
  productId: string;
  productName: string;
  productSlug: string;
  sections: ProductMemorySection[];
}

export interface Room {
  id: string;
  productId: string;
  taskId: string;
  assignedElfId: string;
  title: string;
  status: RoomStatus;
  startedAt: string;
  lastActivityAt: string;
  summary: string;
  logs: RoomLog[];
  asks: RoomAsk[];
  artifacts: Artifact[];
  decisions: Decision[];
  notes: string[];
}

export interface ElfRun {
  id: string;
  roomId: string;
  mode: "dry-run" | "codex-readonly" | "worktree-dry-run" | "codex-worktree";
  status: "running" | "completed" | "failed" | "killed";
  command: string;
  startedAt: string;
  endedAt: string | null;
  exitCode: number | null;
}

export type CheckScriptKey = "check" | "typecheck" | "test" | "build";

export interface WorkspaceSeed {
  products: Product[];
  elves: Elf[];
  tasks: Task[];
  rooms: Room[];
  runs?: ElfRun[];
}

export const statusLabels: Record<RoomStatus, string> = {
  working: "Working",
  asking: "Needs you",
  blocked: "Blocked",
  failed: "Failed",
  ready: "Ready",
  done: "Done",
  idle: "Idle"
};

export const productMemorySectionDefinitions: ProductMemorySectionDefinition[] = [
  { key: "PRODUCT", title: "Product", filename: "PRODUCT.md" },
  { key: "STRATEGY", title: "Strategy", filename: "STRATEGY.md" },
  { key: "ARCHITECTURE", title: "Architecture", filename: "ARCHITECTURE.md" },
  { key: "DECISIONS", title: "Decisions", filename: "DECISIONS.md" },
  { key: "DO_NOT_DO", title: "Do Not Do", filename: "DO_NOT_DO.md" },
  { key: "RECENT_LEARNINGS", title: "Recent Learnings", filename: "RECENT_LEARNINGS.md" }
];

const decisionRiskRank: Record<DecisionItem["risk"], number> = {
  low: 1,
  medium: 2,
  high: 3
};

export function buildDecisionItems(rooms: Room[]): DecisionItem[] {
  return rooms
    .flatMap((room) => {
      const ask = room.asks[0];
      const readyArtifacts = room.artifacts.filter((artifact) => artifact.status === "ready" || artifact.status === "passed");
      const failedArtifacts = room.artifacts.filter((artifact) => artifact.status === "failed");
      const recentLogs = room.logs.slice(-3).map((log) => `${log.level}: ${log.message}`);
      const canQueueArtifactSignals = room.status !== "done" && room.status !== "idle";
      const items: DecisionItem[] = [];

      if (room.status === "asking" || ask) {
        items.push({
          id: `need-${room.id}-ask`,
          roomId: room.id,
          productId: room.productId,
          title: ask ? "Elf needs a founder call" : "Room needs founder input",
          reason: ask?.question ?? room.summary,
          status: "asking",
          risk: "medium",
          urgency: 1,
          recommendation: ask?.recommendation ?? "Open the room and answer the elf before continuing.",
          evidence: ask ? [`Options: ${ask.options.join(" / ")}`, ...recentLogs] : recentLogs,
          actions: ["Approve", "Request fix", "Snooze"]
        });
      }

      if (room.status === "failed" || room.status === "blocked" || (canQueueArtifactSignals && failedArtifacts.length > 0)) {
        items.push({
          id: `need-${room.id}-stuck`,
          roomId: room.id,
          productId: room.productId,
          title: room.status === "blocked" ? "Elf is blocked" : "Run needs inspection",
          reason: room.summary,
          status: failedArtifacts.length > 0 && room.status !== "blocked" ? "failed" : room.status,
          risk: failedArtifacts.length > 0 ? "high" : "medium",
          urgency: 2,
          recommendation: "Inspect the logs and decide whether to retry, kill, or add missing context.",
          evidence: [...failedArtifacts.map((artifact) => `${artifact.title}: ${artifact.summary}`), ...recentLogs],
          actions: ["Retry", "Request fix", "Reject"]
        });
      }

      if (room.status === "ready") {
        items.push({
          id: `need-${room.id}-ready`,
          roomId: room.id,
          productId: room.productId,
          title: "Work is ready for review",
          reason: room.summary,
          status: room.status,
          risk: failedArtifacts.length > 0 ? "high" : "low",
          urgency: 3,
          recommendation: readyArtifacts.length > 0 ? "Review the artifacts and run the relevant check before accepting." : "Open the room and verify why it is marked ready.",
          evidence: readyArtifacts.length > 0 ? readyArtifacts.map((artifact) => `${artifact.title}: ${artifact.summary}`) : recentLogs,
          actions: ["Approve", "Request fix", "Reject"]
        });
      }

      return items;
    })
    .sort((a, b) => a.urgency - b.urgency || decisionRiskRank[b.risk] - decisionRiskRank[a.risk]);
}

export function buildDailyBrief(workspace: WorkspaceSeed, generatedAt = new Date().toISOString()): DailyBrief {
  const productsById = new Map(workspace.products.map((product) => [product.id, product]));
  const sections: DailyBrief["sections"] = {
    shipped: [],
    ready: [],
    blocked: [],
    failed: [],
    active: []
  };

  for (const room of workspace.rooms) {
    const product = productsById.get(room.productId);
    const item = briefItem(room, product?.name ?? "Unknown project");
    const readyArtifacts = room.artifacts.filter((artifact) => artifact.status === "ready" || artifact.status === "passed");
    const failedArtifacts = room.artifacts.filter((artifact) => artifact.status === "failed");
    const approved = room.decisions.some((decision) => decision.status === "approved");

    if (room.status === "done" && approved) {
      sections.shipped.push(item);
    } else if (room.status === "failed" || failedArtifacts.length > 0) {
      sections.failed.push(item);
    } else if (room.status === "blocked" || room.status === "asking" || room.asks.length > 0) {
      sections.blocked.push(item);
    } else if (room.status === "ready" || readyArtifacts.length > 0) {
      sections.ready.push(item);
    } else if (room.status === "working") {
      sections.active.push(item);
    }
  }

  const decisionItems = buildDecisionItems(workspace.rooms);
  const recommendedNext = decisionItems.slice(0, 5).map((item) => {
    const product = productsById.get(item.productId);
    return {
      id: `brief-rec-${item.id}`,
      roomId: item.roomId,
      productId: item.productId,
      productName: product?.name ?? "Unknown project",
      title: item.title,
      recommendation: item.recommendation,
      risk: item.risk
    };
  });

  return {
    generatedAt,
    totals: {
      rooms: workspace.rooms.length,
      decisions: decisionItems.length,
      ready: sections.ready.length,
      blocked: sections.blocked.length,
      failed: sections.failed.length,
      active: sections.active.length
    },
    sections,
    recommendedNext
  };
}

function briefItem(room: Room, productName: string): DailyBriefItem {
  const artifactEvidence = room.artifacts.slice(-3).map((artifact) => `${artifact.title}: ${artifact.summary}`);
  const askEvidence = room.asks.slice(0, 1).map((ask) => `Ask: ${ask.question}`);
  const decisionEvidence = room.decisions.slice(-2).map((decision) => `Decision: ${decision.status} - ${decision.title}`);
  const logEvidence = room.logs.slice(-2).map((log) => `${log.level}: ${log.message}`);
  const evidence = [...artifactEvidence, ...askEvidence, ...decisionEvidence, ...logEvidence].slice(0, 4);

  return {
    id: `brief-${room.id}`,
    roomId: room.id,
    productId: room.productId,
    productName,
    title: room.title,
    summary: room.summary,
    status: room.status,
    evidence: evidence.length > 0 ? evidence : [room.summary]
  };
}

export const seedWorkspace: WorkspaceSeed = {
  products: [
    {
      id: "prod-codevetter",
      name: "CodeVetter",
      slug: "codevetter",
      localPath: "../codevetter",
      status: "active",
      priority: "P0",
      currentGoal: "Make agent-written code review reliable enough for daily use."
    },
    {
      id: "prod-saas-maker",
      name: "SaaS Maker",
      slug: "saas-maker",
      localPath: "../saas-maker",
      status: "maintain",
      priority: "P1",
      currentGoal: "Mine useful Foundry primitives while avoiding the old platform sprawl."
    },
    {
      id: "prod-high-signal",
      name: "High Signal",
      slug: "high-signal",
      localPath: "../high-signal",
      status: "active",
      priority: "P1",
      currentGoal: "Keep intelligence briefs fast, cited, and worth reading."
    }
  ],
  elves: [
    {
      id: "elf-ada",
      name: "Ada",
      role: "builder",
      status: "working"
    },
    {
      id: "elf-linus",
      name: "Linus",
      role: "reviewer",
      status: "asking"
    },
    {
      id: "elf-mira",
      name: "Mira",
      role: "tester",
      status: "ready"
    }
  ],
  tasks: [
    {
      id: "task-cv-import",
      productId: "prod-codevetter",
      title: "Tighten PR import review flow",
      priority: "high",
      acceptanceCriteria: [
        "Import flow keeps existing repo context",
        "Review summary links to changed files",
        "No production credentials are read"
      ]
    },
    {
      id: "task-sm-mine",
      productId: "prod-saas-maker",
      title: "Extract useful task-room concepts from SaaS Maker",
      priority: "medium",
      acceptanceCriteria: [
        "Keep only local-first concepts",
        "Avoid Cloudflare/auth/widget dependencies",
        "Document what should not be copied"
      ]
    },
    {
      id: "task-hs-tests",
      productId: "prod-high-signal",
      title: "Repair flaky brief renderer test",
      priority: "medium",
      acceptanceCriteria: [
        "Find the concrete flaky assertion",
        "Patch the narrowest behavior",
        "Run the relevant test file"
      ]
    }
  ],
  rooms: [
    {
      id: "room-cv-import",
      productId: "prod-codevetter",
      taskId: "task-cv-import",
      assignedElfId: "elf-ada",
      title: "PR import review flow",
      status: "working",
      startedAt: "09:12",
      lastActivityAt: "09:34",
      summary: "Ada is tracing the import path and building a narrow patch around review summary links.",
      logs: [
        { id: "log-1", time: "09:12", level: "info", message: "Created room and loaded CodeVetter task context." },
        { id: "log-2", time: "09:18", level: "info", message: "Found PR import entrypoint and review summary renderer." },
        { id: "log-3", time: "09:31", level: "success", message: "Draft patch changes 3 files; collecting diff summary next." }
      ],
      asks: [],
      artifacts: [
        {
          id: "art-1",
          type: "diff",
          title: "Draft diff",
          summary: "3 files changed in PR import and summary rendering.",
          status: "pending"
        },
        {
          id: "art-2",
          type: "test",
          title: "Targeted test",
          summary: "Not run yet.",
          status: "pending"
        }
      ],
      decisions: [],
      notes: ["No deploy actions allowed in V0 rooms.", "CodeVetter gate should attach after local diff capture exists."]
    },
    {
      id: "room-sm-mine",
      productId: "prod-saas-maker",
      taskId: "task-sm-mine",
      assignedElfId: "elf-linus",
      title: "Steal the right SaaS Maker primitives",
      status: "asking",
      startedAt: "08:45",
      lastActivityAt: "09:22",
      summary: "Linus found useful models but needs a founder call on whether task workflows should be copied now.",
      logs: [
        { id: "log-4", time: "08:45", level: "info", message: "Read SaaS Maker project status and cockpit task surfaces." },
        { id: "log-5", time: "09:02", level: "warning", message: "Task Workflows are useful but carry old abstraction weight." },
        { id: "log-6", time: "09:22", level: "info", message: "Paused for founder decision." }
      ],
      asks: [
        {
          id: "ask-1",
          question: "Should V0 copy SaaS Maker Task Workflows, or keep rooms manual until real Codex runs prove the loop?",
          options: ["Keep rooms manual for V0", "Copy Task Workflows now", "Copy only prompt templates"],
          recommendation: "Keep rooms manual for V0. Add playbooks after rooms are useful.",
          createdAt: "09:22"
        }
      ],
      artifacts: [
        {
          id: "art-3",
          type: "note",
          title: "Primitive inventory",
          summary: "Registry, task status, run events, and artifacts are worth reusing. Cloud/auth/widget layers are not.",
          status: "ready"
        }
      ],
      decisions: [
        {
          id: "dec-1",
          title: "Task Workflow copy decision",
          status: "open",
          risk: "medium"
        }
      ],
      notes: ["This is the clearest example of a room needing founder input."]
    },
    {
      id: "room-hs-tests",
      productId: "prod-high-signal",
      taskId: "task-hs-tests",
      assignedElfId: "elf-mira",
      title: "Brief renderer flaky test",
      status: "ready",
      startedAt: "07:58",
      lastActivityAt: "08:40",
      summary: "Mira isolated a timezone fixture issue and has a one-file fix ready for review.",
      logs: [
        { id: "log-7", time: "07:58", level: "info", message: "Started from failing test evidence." },
        { id: "log-8", time: "08:14", level: "info", message: "Confirmed renderer output changes across local timezone." },
        { id: "log-9", time: "08:39", level: "success", message: "Targeted test passes locally." }
      ],
      asks: [],
      artifacts: [
        {
          id: "art-4",
          type: "diff",
          title: "One-file fixture patch",
          summary: "Normalizes the date fixture before renderer assertions.",
          status: "ready"
        },
        {
          id: "art-5",
          type: "test",
          title: "brief-renderer.test.ts",
          summary: "Passed in 1.2s.",
          status: "passed"
        }
      ],
      decisions: [
        {
          id: "dec-2",
          title: "Approve ready diff",
          status: "open",
          risk: "low"
        }
      ],
      notes: ["Ready state requires artifacts. This room has both diff and test output."]
    }
  ]
};
