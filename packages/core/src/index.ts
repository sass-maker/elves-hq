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
  status: "open" | "approved" | "requested_fix" | "rejected";
  risk: "low" | "medium" | "high";
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
  mode: "dry-run" | "codex-readonly";
  status: "running" | "completed" | "failed" | "killed";
  command: string;
  startedAt: string;
  endedAt: string | null;
  exitCode: number | null;
}

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
