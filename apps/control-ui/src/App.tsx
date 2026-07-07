import {
  Activity,
  ArrowRight,
  Bell,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleStop,
  ClipboardCheck,
  FileText,
  FolderPlus,
  GitBranch,
  GripVertical,
  Hammer,
  HelpCircle,
  Folder,
  Maximize2,
  MessageSquare,
  Minimize2,
  PanelRightOpen,
  Radio,
  Inbox,
  LayoutDashboard,
  Map as MapIcon,
  ScrollText,
  Settings2,
  ShieldCheck,
  Sparkles,
  SquareTerminal,
  TestTube2,
  Trash2
} from "lucide-react";
import {
  buildElfFmFeed,
  buildDailyBrief,
  buildDecisionItems,
  seedWorkspace,
  getBlockingArtifacts,
  statusLabels,
  type Artifact,
  type CheckScriptKey,
  type DailyBrief,
  type DailyBriefItem,
  type DailyBriefSection,
  type DecisionAction,
  type DecisionItem,
  type ElfFmFeed,
  type ElfFmStation,
  type ElfFmTranscriptItem,
  type ElfRun,
  type LocalFolderListing,
  type Playbook,
  type Product,
  type ProductFolderInspection,
  type ProductMemory,
  type ProductMemorySection,
  type ProductMemorySectionKey,
  type Room,
  type RoomStatus,
  type Task,
  type WorkspaceSeed
} from "@elves-hq/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Separator } from "./components/ui/separator";
import { Textarea } from "./components/ui/textarea";
import { cn } from "./lib/utils";

const statusOrder: RoomStatus[] = ["asking", "working", "ready", "blocked", "failed", "idle", "done"];

const statusTone: Record<RoomStatus, "green" | "amber" | "red" | "blue" | "secondary"> = {
  working: "green",
  asking: "amber",
  blocked: "red",
  failed: "red",
  ready: "blue",
  done: "secondary",
  idle: "secondary"
};

const fmTone: Record<ElfFmTranscriptItem["tone"], "green" | "amber" | "red" | "blue" | "secondary"> = {
  green: "green",
  amber: "amber",
  red: "red",
  blue: "blue",
  neutral: "secondary"
};

const statusDot: Record<RoomStatus, string> = {
  working: "bg-emerald-500",
  asking: "bg-amber-500",
  blocked: "bg-red-500",
  failed: "bg-red-500",
  ready: "bg-blue-500",
  done: "bg-stone-400",
  idle: "bg-stone-400"
};

const daemonBaseUrl = import.meta.env.VITE_DAEMON_URL ?? "http://127.0.0.1:4327";
const paneLayoutStorageKey = "elves-hq:pane-layout:v1";
const terminalDrawerLayoutStorageKey = "elves-hq:terminal-drawer-layout:v1";
const terminalGridColumns = 12;
const terminalGridRowHeight = 74;
const roomDeckPageSize = 4;

type PaneLayout = {
  fleet: number;
  rooms: number;
};

type TerminalDrawerLayout = {
  cols: number;
  rows: number;
};

type TerminalDrawerLayouts = Record<string, TerminalDrawerLayout>;

type TerminalDrawerRole = "primary" | "secondary" | "intervention";

type TerminalDrawerEntry = {
  room: Room;
  role: TerminalDrawerRole;
  decisionItem?: DecisionItem;
};

type RoomDeckScope = "active" | "all";

type RoomSignalFilter = "all" | "needs" | "working" | "ready" | "failed" | "blocked" | "idle";

type RoomSortOrder = "priority" | "recent" | "project";

type CheckGateSelection = CheckScriptKey | "auto";

type RoomCommand =
  | "build"
  | "draft"
  | "read"
  | "dry"
  | "prompt"
  | "log"
  | "transcript"
  | "diff"
  | "check"
  | "vet"
  | "apply"
  | "cleanup"
  | "approve"
  | "request_fix"
  | "snooze"
  | "reject"
  | "retry"
  | "close"
  | "kill";

type OverviewPanel = "needs" | "fm" | "backlog" | "brief";

type RoomWorkbenchTab = "timeline" | "logs" | "artifacts" | "outputs" | "notes" | "memory";

type RoomTimelineTone = "green" | "amber" | "red" | "blue" | "secondary";

type RoomTimelineItem = {
  id: string;
  source: string;
  title: string;
  summary: string;
  time?: string;
  tone: RoomTimelineTone;
};

type RoomOutputPreview = {
  id: string;
  title: string;
  icon: React.ReactNode;
  body?: string;
};

type ShellView = "overview" | "room";

type CommandCenterRoomSet = {
  primaryRoom: Room | undefined;
  secondaryRooms: Room[];
  interventionRoom: Room | undefined;
  interventionItem: DecisionItem | undefined;
};

type ProductPulseRow = {
  product: Product;
  signal: RoomStatus;
  needsCount: number;
};

type TaskDraft = {
  title: string;
  acceptanceCriteria: string;
  priority: Task["priority"];
};

type BacklogAssignment = {
  assignedElfId: string;
  playbookId: string;
};

const roomWorkbenchTabs: Array<{ id: RoomWorkbenchTab; label: string }> = [
  { id: "timeline", label: "Timeline" },
  { id: "logs", label: "Logs" },
  { id: "artifacts", label: "Artifacts" },
  { id: "outputs", label: "Outputs" },
  { id: "notes", label: "Notes" },
  { id: "memory", label: "Memory" }
];

const defaultPaneLayout: PaneLayout = {
  fleet: 260,
  rooms: 560
};

function formatSyncTime(date = new Date()) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

const decisionActionLabels: Record<DecisionAction, string> = {
  approve: "Approve",
  request_fix: "Request fix",
  reject: "Reject",
  snooze: "Snooze",
  retry: "Retry",
  close: "Close"
};

const productStatuses: Product["status"][] = ["active", "maintain", "paused", "killed"];

const roomSignalFilters: Array<{ id: RoomSignalFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "needs", label: "Needs Me" },
  { id: "working", label: "Working" },
  { id: "ready", label: "Ready" },
  { id: "failed", label: "Failed" },
  { id: "blocked", label: "Blocked" },
  { id: "idle", label: "Idle" }
];

const roomSortLabels: Record<RoomSortOrder, string> = {
  priority: "Priority signal",
  recent: "Recent activity",
  project: "Project name"
};

function runTimingLabel(run: ElfRun) {
  const started = Date.parse(run.startedAt);
  if (!Number.isFinite(started)) {
    return run.exitCode === null ? "exit pending" : `exit ${run.exitCode}`;
  }

  const ended = run.endedAt ? Date.parse(run.endedAt) : Date.now();
  if (!Number.isFinite(ended) || ended < started) {
    return run.exitCode === null ? "exit pending" : `exit ${run.exitCode}`;
  }

  const duration = formatDuration(ended - started);
  const exit = run.exitCode === null ? (run.status === "running" ? "running" : "exit pending") : `exit ${run.exitCode}`;
  return `${duration} · ${exit}`;
}

function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) {
    return `${seconds}s`;
  }
  if (minutes < 60) {
    return `${minutes}m ${seconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

const checkScriptKeys: CheckScriptKey[] = ["check", "typecheck", "test", "build"];
const productPriorities: Product["priority"][] = ["P0", "P1", "P2"];
const taskStatusTone: Record<Task["status"], "green" | "amber" | "red" | "blue" | "secondary"> = {
  inbox: "secondary",
  ready: "blue",
  assigned: "green",
  done: "secondary",
  killed: "red"
};

function roomProduct(workspace: WorkspaceSeed, room: Room): Product {
  const product = workspace.products.find((item) => item.id === room.productId);
  if (!product) {
    throw new Error(`Missing product for room ${room.id}`);
  }
  return product;
}

function uniqueTerminalDrawerEntries(entries: Array<TerminalDrawerEntry | undefined>): TerminalDrawerEntry[] {
  const seen = new Set<string>();
  const result: TerminalDrawerEntry[] = [];
  for (const entry of entries) {
    if (!entry || seen.has(entry.room.id)) {
      continue;
    }
    seen.add(entry.room.id);
    result.push(entry);
  }
  return result;
}

function roomElf(workspace: WorkspaceSeed, room: Room) {
  const elf = workspace.elves.find((item) => item.id === room.assignedElfId);
  if (!elf) {
    throw new Error(`Missing elf for room ${room.id}`);
  }
  return elf;
}

function roomTask(workspace: WorkspaceSeed, room: Room) {
  const task = workspace.tasks.find((item) => item.id === room.taskId);
  if (!task) {
    throw new Error(`Missing task for room ${room.id}`);
  }
  return task;
}

function roomPlaybook(workspace: WorkspaceSeed, room: Room): Playbook | undefined {
  return room.playbookId ? workspace.playbooks.find((item) => item.id === room.playbookId) : undefined;
}

function defaultRoomElfId(workspace: WorkspaceSeed) {
  return workspace.elves.find((elf) => elf.role === "builder")?.id ?? workspace.elves[0]?.id ?? "";
}

export function App() {
  const [workspace, setWorkspace] = useState<WorkspaceSeed>(seedWorkspace);
  const [daemonState, setDaemonState] = useState<"connecting" | "local" | "fallback">("connecting");
  const [syncState, setSyncState] = useState<"connecting" | "live" | "stale">("connecting");
  const [lastSyncAt, setLastSyncAt] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string>("all");
  const [selectedRoomId, setSelectedRoomId] = useState<string>(seedWorkspace.rooms[1]?.id ?? "");
  const [roomNotes, setRoomNotes] = useState<Record<string, string>>({});
  const [roomRuns, setRoomRuns] = useState<Record<string, ElfRun[]>>({});
  const [terminalRunLogs, setTerminalRunLogs] = useState<Record<string, string>>({});
  const [promptPreview, setPromptPreview] = useState<Record<string, string>>({});
  const [runLogPreview, setRunLogPreview] = useState<Record<string, string>>({});
  const [diffPreview, setDiffPreview] = useState<Record<string, string>>({});
  const [checkPreview, setCheckPreview] = useState<Record<string, string>>({});
  const [codevetterPreview, setCodevetterPreview] = useState<Record<string, string>>({});
  const [cleanupPreview, setCleanupPreview] = useState<Record<string, string>>({});
  const [applyPreview, setApplyPreview] = useState<Record<string, string>>({});
  const [transcriptPreview, setTranscriptPreview] = useState<Record<string, string>>({});
  const [decisionPreview, setDecisionPreview] = useState<Record<string, string>>({});
  const [dailyBriefMarkdown, setDailyBriefMarkdown] = useState<string>("");
  const [dailyBriefExportStatus, setDailyBriefExportStatus] = useState<string>("");
  const [dailyBriefSnapshotStatus, setDailyBriefSnapshotStatus] = useState<string>("");
  const [decisionItems, setDecisionItems] = useState<DecisionItem[]>(buildDecisionItems(seedWorkspace.rooms));
  const [dailyBrief, setDailyBrief] = useState<DailyBrief>(buildDailyBrief(seedWorkspace));
  const [elfFmFeed, setElfFmFeed] = useState<ElfFmFeed>(buildElfFmFeed(seedWorkspace));
  const [productInspections, setProductInspections] = useState<Record<string, ProductFolderInspection>>({});
  const [draftProductInspection, setDraftProductInspection] = useState<ProductFolderInspection | undefined>();
  const [draftProductInspectionError, setDraftProductInspectionError] = useState("");
  const [folderListing, setFolderListing] = useState<LocalFolderListing | undefined>();
  const [folderListingStatus, setFolderListingStatus] = useState("");
  const [productSettingsStatus, setProductSettingsStatus] = useState<Record<string, string>>({});
  const [productMemoryById, setProductMemoryById] = useState<Record<string, ProductMemory>>({});
  const [selectedMemorySection, setSelectedMemorySection] = useState<ProductMemorySectionKey>("PRODUCT");
  const [memoryDrafts, setMemoryDrafts] = useState<Record<string, string>>({});
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [activeOverviewPanel, setActiveOverviewPanel] = useState<OverviewPanel>("needs");
  const [activeShellView, setActiveShellView] = useState<ShellView>("overview");
  const [paneLayout, setPaneLayout] = useState<PaneLayout>(readStoredPaneLayout);
  const [roomSignalFilter, setRoomSignalFilter] = useState<RoomSignalFilter>("all");
  const [roomSortOrder, setRoomSortOrder] = useState<RoomSortOrder>("priority");
  const [roomWorkbenchTabsById, setRoomWorkbenchTabsById] = useState<Record<string, RoomWorkbenchTab>>({});
  const [runInstructionsByRoomId, setRunInstructionsByRoomId] = useState<Record<string, string>>({});
  const [checkGateByRoomId, setCheckGateByRoomId] = useState<Record<string, CheckGateSelection>>({});
  const [focusedRoomId, setFocusedRoomId] = useState<string | null>(null);
  const [roomDeckPage, setRoomDeckPage] = useState(0);
  const [roomDeckScope, setRoomDeckScope] = useState<RoomDeckScope>("active");
  const [newRoom, setNewRoom] = useState({
    productId: seedWorkspace.products[0]?.id ?? "",
    assignedElfId: defaultRoomElfId(seedWorkspace),
    playbookId: seedWorkspace.playbooks[0]?.id ?? "",
    title: "",
    acceptanceCriteria: ""
  });
  const [newProduct, setNewProduct] = useState({
    name: "",
    localPath: "",
    currentGoal: ""
  });
  const [newTask, setNewTask] = useState({
    title: "",
    acceptanceCriteria: "",
    priority: "medium" as Task["priority"]
  });
  const [backlogAssignment, setBacklogAssignment] = useState({
    assignedElfId: defaultRoomElfId(seedWorkspace),
    playbookId: seedWorkspace.playbooks[0]?.id ?? ""
  });
  const markSynced = () => {
    setSyncState("live");
    setLastSyncAt(formatSyncTime());
  };

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetch(`${daemonBaseUrl}/api/workspace`), fetch(`${daemonBaseUrl}/api/needs-me`), fetch(`${daemonBaseUrl}/api/briefs/daily`), fetch(`${daemonBaseUrl}/api/fm/feed`)])
      .then(async ([workspaceResponse, needsResponse, briefResponse, fmResponse]) => {
        if (!workspaceResponse.ok || !needsResponse.ok || !briefResponse.ok || !fmResponse.ok) {
          throw new Error(`Daemon returned ${workspaceResponse.status}/${needsResponse.status}/${briefResponse.status}/${fmResponse.status}`);
        }
        return (await Promise.all([workspaceResponse.json(), needsResponse.json(), briefResponse.json(), fmResponse.json()])) as [
          WorkspaceSeed,
          { items: DecisionItem[] },
          DailyBrief,
          ElfFmFeed
        ];
      })
      .then(([nextWorkspace, needsBody, nextBrief, nextFmFeed]) => {
        if (!cancelled) {
          setWorkspace(nextWorkspace);
          setDecisionItems(needsBody.items);
          setDailyBrief(nextBrief);
          setElfFmFeed(nextFmFeed);
          setDaemonState("local");
          markSynced();
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWorkspace(seedWorkspace);
          setDecisionItems(buildDecisionItems(seedWorkspace.rooms));
          setDailyBrief(buildDailyBrief(seedWorkspace));
          setElfFmFeed(buildElfFmFeed(seedWorkspace));
          setDaemonState("fallback");
          setSyncState("stale");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setNewRoom((current) => {
      const assignedElfId = workspace.elves.some((elf) => elf.id === current.assignedElfId) ? current.assignedElfId : defaultRoomElfId(workspace);
      if (assignedElfId === current.assignedElfId) {
        return current;
      }
      return { ...current, assignedElfId };
    });
    setBacklogAssignment((current) => {
      const assignedElfId = workspace.elves.some((elf) => elf.id === current.assignedElfId) ? current.assignedElfId : defaultRoomElfId(workspace);
      const playbookId = workspace.playbooks.some((playbook) => playbook.id === current.playbookId) ? current.playbookId : workspace.playbooks[0]?.id ?? "";
      return assignedElfId === current.assignedElfId && playbookId === current.playbookId ? current : { assignedElfId, playbookId };
    });
  }, [workspace.elves, workspace.playbooks]);

  useEffect(() => {
    if (daemonState !== "local" || !selectedRoomId) {
      return;
    }

    let cancelled = false;

    const refresh = async () => {
      try {
        const [workspaceResponse, runsResponse, needsResponse, briefResponse, fmResponse] = await Promise.all([
          fetch(`${daemonBaseUrl}/api/workspace`),
          fetch(`${daemonBaseUrl}/api/rooms/${selectedRoomId}/runs`),
          fetch(`${daemonBaseUrl}/api/needs-me`),
          fetch(`${daemonBaseUrl}/api/briefs/daily`),
          fetch(`${daemonBaseUrl}/api/fm/feed`)
        ]);

        if (!workspaceResponse.ok || !runsResponse.ok || !needsResponse.ok || !briefResponse.ok || !fmResponse.ok) {
          return;
        }

        const [nextWorkspace, runsBody, needsBody, nextBrief, nextFmFeed] = (await Promise.all([workspaceResponse.json(), runsResponse.json(), needsResponse.json(), briefResponse.json(), fmResponse.json()])) as [
          WorkspaceSeed,
          { runs: ElfRun[] },
          { items: DecisionItem[] },
          DailyBrief,
          ElfFmFeed
        ];

        if (!cancelled) {
          setWorkspace(nextWorkspace);
          setDecisionItems(needsBody.items);
          setDailyBrief(nextBrief);
          setElfFmFeed(nextFmFeed);
          setRoomRuns((current) => ({ ...current, [selectedRoomId]: runsBody.runs }));
          markSynced();
        }
      } catch {
        setSyncState("stale");
      }
    };

    void refresh();
    const interval = window.setInterval(refresh, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [daemonState, selectedRoomId]);

  const productById = useMemo(() => new Map(workspace.products.map((product) => [product.id, product])), [workspace.products]);
  const productFilteredRooms = useMemo(() => {
    const rooms =
      selectedProductId === "all"
        ? workspace.rooms
        : workspace.rooms.filter((room) => room.productId === selectedProductId);

    return [...rooms].sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));
  }, [selectedProductId, workspace.rooms]);
  const activeRoomCount = productFilteredRooms.filter((room) => room.status !== "done").length;
  const scopedRooms = useMemo(() => (roomDeckScope === "active" ? productFilteredRooms.filter((room) => room.status !== "done") : productFilteredRooms), [productFilteredRooms, roomDeckScope]);
  const roomSignalCounts = useMemo(() => buildRoomSignalCounts(scopedRooms), [scopedRooms]);
  const visibleRooms = useMemo(
    () => organizeRooms(scopedRooms, roomSignalFilter, roomSortOrder, productById),
    [productById, roomSignalFilter, roomSortOrder, scopedRooms]
  );
  const commandCenterRooms = useMemo(
    () => selectCommandCenterRooms(workspace, visibleRooms.length > 0 ? visibleRooms : workspace.rooms, selectedProductId, decisionItems),
    [decisionItems, selectedProductId, visibleRooms, workspace]
  );
  const commandCenterRoomIds = useMemo(
    () =>
      uniqueNonNullableRoomIds([
        commandCenterRooms.primaryRoom?.id,
        commandCenterRooms.interventionRoom?.id,
        ...commandCenterRooms.secondaryRooms.map((room) => room.id)
      ]),
    [commandCenterRooms]
  );
  const commandCenterRoomKey = commandCenterRoomIds.join("|");

  const selectedRoom = visibleRooms.find((room) => room.id === selectedRoomId) ?? visibleRooms[0] ?? workspace.rooms.find((room) => room.id === selectedRoomId) ?? workspace.rooms[0];
  const selectedProduct = workspace.products.find((product) => product.id === (selectedProductId === "all" ? selectedRoom?.productId : selectedProductId));
  const selectedProductInspection = selectedProduct ? productInspections[selectedProduct.id] : undefined;
  const assignedTaskIds = useMemo(() => new Set(workspace.rooms.map((room) => room.taskId)), [workspace.rooms]);
  const selectedProductTasks = useMemo(() => (selectedProduct ? workspace.tasks.filter((task) => task.productId === selectedProduct.id) : []), [selectedProduct, workspace.tasks]);
  const selectedBacklogTasks = useMemo(
    () => selectedProductTasks.filter((task) => (task.status === "inbox" || task.status === "ready") && !assignedTaskIds.has(task.id)),
    [assignedTaskIds, selectedProductTasks]
  );
  const selectedClosedTaskCount = selectedProductTasks.length - selectedBacklogTasks.length;
  const selectedProductMemory = selectedRoom ? productMemoryById[selectedRoom.productId] : undefined;
  const productPulseRows = useMemo(() => buildProductPulseRows(workspace), [workspace]);
  const visibleBriefRecommendationCount = dailyBrief.recommendedNext.filter((item) => selectedProductId === "all" || item.productId === selectedProductId).length;
  const selectedMemoryDraftKey = selectedRoom ? `${selectedRoom.productId}:${selectedMemorySection}` : "";
  const selectedMemorySectionBody =
    selectedMemoryDraftKey && selectedMemoryDraftKey in memoryDrafts
      ? memoryDrafts[selectedMemoryDraftKey]
      : selectedProductMemory?.sections.find((section) => section.key === selectedMemorySection)?.body ?? "";
  const isRoomFocused = focusedRoomId === selectedRoom?.id;
  const mainGridTemplateColumns = isRoomFocused ? "minmax(720px, 1fr)" : `${paneLayout.fleet}px 10px ${paneLayout.rooms}px 10px minmax(380px, 1fr)`;
  const selectedRoomWorkbenchTab = selectedRoom ? roomWorkbenchTabsById[selectedRoom.id] ?? "timeline" : "timeline";
  const draftProduct = useMemo<Product | undefined>(() => {
    const localPath = newProduct.localPath.trim();
    if (!localPath) {
      return undefined;
    }
    return {
      id: "draft-product",
      name: newProduct.name.trim() || "Draft project",
      slug: "draft-product",
      localPath,
      status: "active",
      priority: "P1",
      currentGoal: newProduct.currentGoal.trim()
    };
  }, [newProduct.currentGoal, newProduct.localPath, newProduct.name]);

  const maxRoomDeckPage = Math.max(0, Math.ceil(visibleRooms.length / roomDeckPageSize) - 1);

  useEffect(() => {
    setRoomDeckPage(0);
  }, [roomDeckScope, roomSignalFilter, roomSortOrder, selectedProductId]);

  useEffect(() => {
    setRoomDeckPage((current) => Math.min(current, maxRoomDeckPage));
  }, [maxRoomDeckPage]);

  useEffect(() => {
    const selectedIndex = visibleRooms.findIndex((room) => room.id === selectedRoom.id);
    if (selectedIndex < 0) {
      return;
    }

    const selectedPage = Math.floor(selectedIndex / roomDeckPageSize);
    setRoomDeckPage((current) => (current === selectedPage ? current : selectedPage));
  }, [selectedProductId, selectedRoom.id, visibleRooms]);

  useEffect(() => {
    if (daemonState !== "local" || activeShellView !== "overview" || commandCenterRoomIds.length === 0) {
      return;
    }

    let cancelled = false;

    const refreshTerminalRuns = async () => {
      try {
        const runEntries = await Promise.all(
          commandCenterRoomIds.map(async (roomId) => {
            const response = await fetch(`${daemonBaseUrl}/api/rooms/${roomId}/runs`);
            if (!response.ok) {
              return [roomId, []] as const;
            }
            const body = (await response.json()) as { runs: ElfRun[] };
            return [roomId, body.runs] as const;
          })
        );

        if (cancelled) {
          return;
        }

        const nextRuns = Object.fromEntries(runEntries);
        setRoomRuns((current) => ({ ...current, ...nextRuns }));

        const logEntries = await Promise.all(
          runEntries.map(async ([roomId, runs]) => {
            const latestRun = runs.find((run) => run.status === "running") ?? runs[0];
            if (!latestRun) {
              return [roomId, ""] as const;
            }

            const response = await fetch(`${daemonBaseUrl}/api/runs/${latestRun.id}/logs`);
            if (!response.ok) {
              return [roomId, ""] as const;
            }

            const body = (await response.json()) as { logs: string };
            return [roomId, body.logs] as const;
          })
        );

        if (!cancelled) {
          setTerminalRunLogs((current) => ({ ...current, ...Object.fromEntries(logEntries) }));
        }
      } catch {
        setSyncState("stale");
      }
    };

    void refreshTerminalRuns();
    const interval = window.setInterval(refreshTerminalRuns, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeShellView, commandCenterRoomIds, commandCenterRoomKey, daemonState]);

  const startPaneResize = (pane: keyof PaneLayout, event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startLayout = paneLayout;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      setPaneLayout(clampPaneLayout({ ...startLayout, [pane]: startLayout[pane] + delta }));
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  useEffect(() => {
    if (daemonState !== "local" || !selectedRoom?.productId) {
      return;
    }

    let cancelled = false;

    fetch(`${daemonBaseUrl}/api/products/${selectedRoom.productId}/memory`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Daemon returned ${response.status}`);
        }
        return (await response.json()) as ProductMemory;
      })
      .then((memory) => {
        if (!cancelled) {
          setProductMemoryById((current) => ({ ...current, [memory.productId]: memory }));
        }
      })
      .catch(() => {
        // Memory is an additive V0 layer; keep the room usable if the file API is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [daemonState, selectedRoom?.productId]);

  useEffect(() => {
    if (daemonState !== "local" || !selectedProduct?.id) {
      return;
    }

    let cancelled = false;

    fetch(`${daemonBaseUrl}/api/products/${selectedProduct.id}/inspection`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Daemon returned ${response.status}`);
        }
        return (await response.json()) as ProductFolderInspection;
      })
      .then((inspection) => {
        if (!cancelled) {
          setProductInspections((current) => ({ ...current, [inspection.productId]: inspection }));
        }
      })
      .catch(() => {
        // Folder inspection is advisory; room workflows remain usable without it.
      });

    return () => {
      cancelled = true;
    };
  }, [daemonState, selectedProduct?.id]);

  useEffect(() => {
    const localPath = newProduct.localPath.trim();
    if (daemonState !== "local" || !isAddingProduct || !localPath) {
      setDraftProductInspection(undefined);
      setDraftProductInspectionError("");
      return;
    }

    let cancelled = false;
    setDraftProductInspection(undefined);
    setDraftProductInspectionError("");

    const timeout = window.setTimeout(() => {
      fetch(`${daemonBaseUrl}/api/products/inspect-path`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: newProduct.name,
          localPath
        })
      })
        .then(async (response) => {
          if (!response.ok) {
            const body = (await response.json().catch(() => ({}))) as { error?: string };
            throw new Error(body.error ?? `Daemon returned ${response.status}`);
          }
          return (await response.json()) as ProductFolderInspection;
        })
        .then((inspection) => {
          if (!cancelled) {
            setDraftProductInspection(inspection);
          }
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            setDraftProductInspectionError(error instanceof Error ? error.message : "Folder preview failed.");
          }
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [daemonState, isAddingProduct, newProduct.localPath, newProduct.name]);

  useEffect(() => {
    if (daemonState !== "local" || !isAddingProduct || folderListing) {
      return;
    }

    void loadFolderListing();
  }, [daemonState, folderListing, isAddingProduct]);

  useEffect(() => {
    window.localStorage.setItem(paneLayoutStorageKey, JSON.stringify(paneLayout));
  }, [paneLayout]);

  const counts = useMemo(() => {
    return workspace.rooms.reduce(
      (acc, room) => {
        acc[room.status] += 1;
        return acc;
      },
      {
        working: 0,
        asking: 0,
        blocked: 0,
        failed: 0,
        ready: 0,
        done: 0,
        idle: 0
      } satisfies Record<RoomStatus, number>
    );
  }, [workspace.rooms]);

  const visibleDecisionItems = useMemo(() => {
    return selectedProductId === "all" ? decisionItems : decisionItems.filter((item) => item.productId === selectedProductId);
  }, [decisionItems, selectedProductId]);

  const saveRoomNote = async (roomId: string) => {
    const note = roomNotes[roomId]?.trim();
    if (!note) {
      return;
    }

    try {
      const response = await fetch(`${daemonBaseUrl}/api/rooms/${roomId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ body: note })
      });

      if (!response.ok) {
        throw new Error(`Daemon returned ${response.status}`);
      }

      const body = (await response.json()) as { room: Room };
      setWorkspace((current) => ({
        ...current,
        rooms: current.rooms.map((room) => (room.id === roomId ? body.room : room))
      }));
      const nextWorkspace = { ...workspace, rooms: workspace.rooms.map((room) => (room.id === roomId ? body.room : room)) };
      setDailyBrief((current) => buildDailyBrief(nextWorkspace, current.generatedAt));
      setElfFmFeed(buildElfFmFeed(nextWorkspace));
      setRoomNotes((current) => ({ ...current, [roomId]: "" }));
    } catch {
      setWorkspace((current) => ({
        ...current,
        rooms: current.rooms.map((room) => (room.id === roomId ? { ...room, notes: [...room.notes, note] } : room))
      }));
      setRoomNotes((current) => ({ ...current, [roomId]: "" }));
    }
  };

  const replaceRoom = (room: Room) => {
    setWorkspace((current) => ({
      ...current,
      rooms: current.rooms.map((item) => (item.id === room.id ? room : item))
    }));
  };

  const startRoomRun = async (roomId: string, mode: ElfRun["mode"], prompt?: string) => {
    const trimmedPrompt = prompt?.trim();
    const response = await fetch(`${daemonBaseUrl}/api/rooms/${roomId}/runs/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ mode, ...(trimmedPrompt ? { prompt: trimmedPrompt } : {}) })
    });

    if (!response.ok) {
      return;
    }

    const body = (await response.json()) as { room: Room; run: ElfRun };
    replaceRoom(body.room);
    setRoomRuns((current) => ({ ...current, [roomId]: [body.run, ...(current[roomId] ?? [])] }));
    setTerminalRunLogs((current) => ({ ...current, [roomId]: "" }));
    setRunInstructionsByRoomId((current) => {
      const next = { ...current };
      delete next[roomId];
      return next;
    });
  };

  const killLatestRun = async (roomId: string) => {
    const run = roomRuns[roomId]?.find((item) => item.status === "running");
    if (!run) {
      return;
    }

    const response = await fetch(`${daemonBaseUrl}/api/runs/${run.id}/kill`, { method: "POST" });
    if (response.ok) {
      setRoomRuns((current) => ({
        ...current,
        [roomId]: (current[roomId] ?? []).map((item) => (item.id === run.id ? { ...item, status: "killed" } : item))
      }));
    }
  };

  const openLatestPrompt = async (roomId: string) => {
    const run = roomRuns[roomId]?.[0];
    if (!run) {
      setPromptPreview((current) => ({ ...current, [roomId]: "No run prompt has been captured yet." }));
      return;
    }

    const response = await fetch(`${daemonBaseUrl}/api/runs/${run.id}/prompt`);
    if (!response.ok) {
      setPromptPreview((current) => ({ ...current, [roomId]: "No prompt file was found for the latest run." }));
      return;
    }

    const body = (await response.json()) as { prompt: string };
    setPromptPreview((current) => ({ ...current, [roomId]: body.prompt || "Prompt file is empty." }));
  };

  const openLatestRunLog = async (roomId: string) => {
    const run = roomRuns[roomId]?.[0];
    if (!run) {
      setRunLogPreview((current) => ({ ...current, [roomId]: "No run log has been captured yet." }));
      return;
    }

    const response = await fetch(`${daemonBaseUrl}/api/runs/${run.id}/logs`);
    if (!response.ok) {
      setRunLogPreview((current) => ({ ...current, [roomId]: "No log file was found for the latest run." }));
      return;
    }

    const body = (await response.json()) as { logs: string };
    setRunLogPreview((current) => ({ ...current, [roomId]: body.logs || "Run log is empty." }));
  };

  const openLatestDiff = async (roomId: string) => {
    const run = roomRuns[roomId]?.find((item) => item.mode.includes("worktree") && item.status === "completed");
    if (!run) {
      setDiffPreview((current) => ({ ...current, [roomId]: "No completed worktree run has a captured diff yet." }));
      return;
    }

    const response = await fetch(`${daemonBaseUrl}/api/runs/${run.id}/diff`);
    if (!response.ok) {
      setDiffPreview((current) => ({ ...current, [roomId]: "No diff file was found for the latest worktree run." }));
      return;
    }

    const body = (await response.json()) as { diff: string };
    setDiffPreview((current) => ({ ...current, [roomId]: body.diff || "Diff file is empty." }));
  };

  const runLatestCheck = async (roomId: string, scriptKey: CheckGateSelection) => {
    const run = roomRuns[roomId]?.find((item) => item.mode.includes("worktree") && item.status === "completed");
    if (!run) {
      setCheckPreview((current) => ({ ...current, [roomId]: "No completed worktree run is ready for a check gate yet." }));
      return;
    }

    const response = await fetch(`${daemonBaseUrl}/api/runs/${run.id}/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(scriptKey === "auto" ? {} : { scriptKey })
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({ error: "Check gate failed to start." }))) as { error?: string };
      setCheckPreview((current) => ({ ...current, [roomId]: body.error ?? "Check gate failed to start." }));
      return;
    }

    const body = (await response.json()) as { output: string };
    setCheckPreview((current) => ({ ...current, [roomId]: body.output }));
  };

  const runLatestCodeVetter = async (roomId: string) => {
    const run = roomRuns[roomId]?.find((item) => item.mode.includes("worktree") && item.status === "completed");
    if (!run) {
      setCodevetterPreview((current) => ({ ...current, [roomId]: "No completed worktree run is ready for CodeVetter yet." }));
      return;
    }

    const response = await fetch(`${daemonBaseUrl}/api/runs/${run.id}/codevetter`, { method: "POST" });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({ error: "CodeVetter gate failed to start." }))) as { error?: string };
      setCodevetterPreview((current) => ({ ...current, [roomId]: body.error ?? "CodeVetter gate failed to start." }));
      return;
    }

    const body = (await response.json()) as { output: string };
    setCodevetterPreview((current) => ({ ...current, [roomId]: body.output }));
  };

  const cleanupLatestWorktree = async (roomId: string) => {
    const run = roomRuns[roomId]?.find((item) => item.mode.includes("worktree") && item.status !== "running");
    if (!run) {
      setCleanupPreview((current) => ({ ...current, [roomId]: "No inactive worktree run is available for cleanup." }));
      return;
    }

    const response = await fetch(`${daemonBaseUrl}/api/runs/${run.id}/cleanup-worktree`, { method: "POST" });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({ error: "Worktree cleanup failed." }))) as { error?: string };
      setCleanupPreview((current) => ({ ...current, [roomId]: body.error ?? "Worktree cleanup failed." }));
      return;
    }

    const body = (await response.json()) as { removed: boolean; branchName?: string; branchRemoved?: boolean; worktreePath: string; room: Room };
    replaceRoom(body.room);
    const branchText = body.branchName ? ` Branch ${body.branchRemoved ? "removed" : "kept"}: ${body.branchName}` : "";
    setCleanupPreview((current) => ({
      ...current,
      [roomId]: body.removed ? `Removed generated worktree: ${body.worktreePath}.${branchText}` : `No generated worktree found: ${body.worktreePath}.${branchText}`
    }));
  };

  const generateRoomTranscript = async (roomId: string) => {
    const response = await fetch(`${daemonBaseUrl}/api/rooms/${roomId}/transcript`, { method: "POST" });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({ error: "Room transcript failed." }))) as { error?: string };
      setTranscriptPreview((current) => ({ ...current, [roomId]: body.error ?? "Room transcript failed." }));
      return;
    }

    const body = (await response.json()) as { transcript: string; outputPath: string; room: Room };
    replaceRoom(body.room);
    setTranscriptPreview((current) => ({ ...current, [roomId]: body.transcript || `Transcript generated at ${body.outputPath}.` }));
  };

  const performDecisionAction = async (roomId: string, action: DecisionAction, note?: string) => {
    const response = await fetch(`${daemonBaseUrl}/api/rooms/${roomId}/decision`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action, note })
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({ error: "Decision action failed." }))) as { error?: string };
      setDecisionPreview((current) => ({ ...current, [roomId]: body.error ?? "Decision action failed." }));
      return;
    }

    const body = (await response.json()) as { room: Room; run?: ElfRun; workspace: WorkspaceSeed; needs: DecisionItem[] };
    setDecisionPreview((current) => ({ ...current, [roomId]: `${decisionActionLabels[action]} recorded.` }));
    setWorkspace(body.workspace);
    setDecisionItems(body.needs);
    setDailyBrief(buildDailyBrief(body.workspace));
    setElfFmFeed(buildElfFmFeed(body.workspace));
    setSelectedRoomId(body.room.id);
    setSelectedProductId(body.room.productId);
    if (note?.trim()) {
      setRoomNotes((current) => ({ ...current, [roomId]: "" }));
    }
    const run = body.run;
    if (run) {
      setRoomRuns((current) => ({ ...current, [body.room.id]: [run, ...(current[body.room.id] ?? [])] }));
    }
  };

  const answerRoomAsk = async (roomId: string, askId: string, answer: string, note?: string) => {
    const response = await fetch(`${daemonBaseUrl}/api/rooms/${roomId}/asks/${askId}/answer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ answer, note })
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({ error: "Ask answer failed." }))) as { error?: string };
      setDecisionPreview((current) => ({ ...current, [roomId]: body.error ?? "Ask answer failed." }));
      return;
    }

    const body = (await response.json()) as { room: Room; workspace: WorkspaceSeed; needs: DecisionItem[] };
    setDecisionPreview((current) => ({ ...current, [roomId]: `Answered elf ask: ${answer}` }));
    setWorkspace(body.workspace);
    setDecisionItems(body.needs);
    setDailyBrief(buildDailyBrief(body.workspace));
    setElfFmFeed(buildElfFmFeed(body.workspace));
    setSelectedRoomId(body.room.id);
    setSelectedProductId(body.room.productId);
    if (note?.trim()) {
      setRoomNotes((current) => ({ ...current, [roomId]: "" }));
      setRunInstructionsByRoomId((current) => {
        const next = { ...current };
        delete next[roomId];
        return next;
      });
    }
  };

  const createProduct = async () => {
    const name = newProduct.name.trim();
    const localPath = newProduct.localPath.trim();
    if (!name || !localPath) {
      return;
    }

    const response = await fetch(`${daemonBaseUrl}/api/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        localPath,
        currentGoal: newProduct.currentGoal
      })
    });
    if (!response.ok) {
      setDaemonState("fallback");
      return;
    }
    const body = (await response.json()) as { product: Product; workspace: WorkspaceSeed };
    setWorkspace(body.workspace);
    setDecisionItems(buildDecisionItems(body.workspace.rooms));
    setDailyBrief(buildDailyBrief(body.workspace));
    setElfFmFeed(buildElfFmFeed(body.workspace));
    setSelectedProductId(body.product.id);
    setDaemonState("local");
    setNewRoom((current) => ({
      ...current,
      productId: body.product.id,
      assignedElfId: body.workspace.elves.some((elf) => elf.id === current.assignedElfId) ? current.assignedElfId : defaultRoomElfId(body.workspace)
    }));
    setNewProduct({ name: "", localPath: "", currentGoal: "" });
    setDraftProductInspection(undefined);
    setDraftProductInspectionError("");
    setProductInspections((current) => {
      const next = { ...current };
      delete next[body.product.id];
      return next;
    });
    setIsAddingProduct(false);
  };

  const loadFolderListing = async (path?: string | null) => {
    if (daemonState !== "local") {
      setFolderListingStatus("Local daemon is required for folder browsing.");
      return;
    }

    setFolderListingStatus("Loading folders...");
    const url = new URL(`${daemonBaseUrl}/api/folders`);
    if (path) {
      url.searchParams.set("path", path);
    }

    const response = await fetch(url);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({ error: "Folder browser failed." }))) as { error?: string };
      setFolderListingStatus(body.error ?? "Folder browser failed.");
      return;
    }

    const listing = (await response.json()) as LocalFolderListing;
    setFolderListing(listing);
    setFolderListingStatus("");
  };

  const selectProductFolder = (path: string) => {
    setNewProduct((current) => ({
      ...current,
      name: current.name.trim() ? current.name : folderNameToProductName(path),
      localPath: path
    }));
  };

  const createRoom = async () => {
    const title = newRoom.title.trim();
    if (!title) {
      return;
    }

    const response = await fetch(`${daemonBaseUrl}/api/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        productId: newRoom.productId,
        assignedElfId: newRoom.assignedElfId || undefined,
        playbookId: newRoom.playbookId,
        title,
        acceptanceCriteria: newRoom.acceptanceCriteria
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
      })
    });

    if (!response.ok) {
      return;
    }

    const body = (await response.json()) as { room: Room; workspace: WorkspaceSeed };
    setWorkspace(body.workspace);
    setDecisionItems(buildDecisionItems(body.workspace.rooms));
    setDailyBrief(buildDailyBrief(body.workspace));
    setElfFmFeed(buildElfFmFeed(body.workspace));
    setSelectedProductId(body.room.productId);
    setSelectedRoomId(body.room.id);
    setNewRoom((current) => ({ ...current, title: "", acceptanceCriteria: "" }));
    setIsCreatingRoom(false);
  };

  const createBacklogTask = async () => {
    const title = newTask.title.trim();
    if (!title || !selectedProduct) {
      return;
    }

    const response = await fetch(`${daemonBaseUrl}/api/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        productId: selectedProduct.id,
        title,
        priority: newTask.priority,
        acceptanceCriteria: newTask.acceptanceCriteria
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
      })
    });

    if (!response.ok) {
      return;
    }

    const body = (await response.json()) as { task: Task; workspace: WorkspaceSeed };
    setWorkspace(body.workspace);
    setSelectedProductId(body.task.productId);
    setNewTask({ title: "", acceptanceCriteria: "", priority: "medium" });
  };

  const assignBacklogTask = async (taskId: string) => {
    const response = await fetch(`${daemonBaseUrl}/api/tasks/${taskId}/assign-room`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(backlogAssignment)
    });

    if (!response.ok) {
      return;
    }

    const body = (await response.json()) as { task: Task; room: Room; workspace: WorkspaceSeed; needs: DecisionItem[]; brief: DailyBrief; fm: ElfFmFeed };
    setWorkspace(body.workspace);
    setDecisionItems(body.needs);
    setDailyBrief(body.brief);
    setElfFmFeed(body.fm);
    setSelectedProductId(body.room.productId);
    setSelectedRoomId(body.room.id);
    setIsCreatingRoom(false);
  };

  const updateBacklogTaskStatus = async (taskId: string, status: Task["status"]) => {
    const response = await fetch(`${daemonBaseUrl}/api/tasks/${taskId}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      return;
    }

    const body = (await response.json()) as { task: Task; workspace: WorkspaceSeed; needs: DecisionItem[]; brief: DailyBrief; fm: ElfFmFeed };
    setWorkspace(body.workspace);
    setDecisionItems(body.needs);
    setDailyBrief(body.brief);
    setElfFmFeed(body.fm);
  };

  const saveProductMemorySection = async (productId: string, section: ProductMemorySectionKey, body: string) => {
    const response = await fetch(`${daemonBaseUrl}/api/products/${productId}/memory/${section}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ body })
    });

    if (!response.ok) {
      return;
    }

    const memory = (await response.json()) as ProductMemory;
    setProductMemoryById((current) => ({ ...current, [memory.productId]: memory }));
    setMemoryDrafts((current) => {
      const next = { ...current };
      delete next[`${productId}:${section}`];
      return next;
    });
  };

  const saveProductSettings = async (productId: string, input: Pick<Product, "status" | "priority" | "currentGoal">) => {
    const response = await fetch(`${daemonBaseUrl}/api/products/${productId}/settings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({ error: "Product settings failed." }))) as { error?: string };
      setProductSettingsStatus((current) => ({ ...current, [productId]: body.error ?? "Product settings failed." }));
      return;
    }

    const body = (await response.json()) as { product: Product; workspace: WorkspaceSeed };
    setWorkspace(body.workspace);
    setSelectedProductId(body.product.id);
    setProductSettingsStatus((current) => ({ ...current, [productId]: "Saved." }));
  };

  const removeProduct = async (product: Product) => {
    if (!window.confirm(`Remove ${product.name} from Elves HQ? This only removes local cockpit records. It will not delete the folder on disk.`)) {
      return;
    }

    const response = await fetch(`${daemonBaseUrl}/api/products/${product.id}/remove`, { method: "POST" });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({ error: "Product removal failed." }))) as { error?: string };
      setProductSettingsStatus((current) => ({ ...current, [product.id]: body.error ?? "Product removal failed." }));
      return;
    }

    const body = (await response.json()) as { productId: string; workspace: WorkspaceSeed; needs: DecisionItem[]; brief: DailyBrief; fm: ElfFmFeed };
    setWorkspace(body.workspace);
    setDecisionItems(body.needs);
    setDailyBrief(body.brief);
    setElfFmFeed(body.fm);
    setSelectedProductId("all");
    setSelectedRoomId(body.workspace.rooms[0]?.id ?? "");
    setProductInspections((current) => {
      const next = { ...current };
      delete next[body.productId];
      return next;
    });
    setProductSettingsStatus((current) => {
      const next = { ...current };
      delete next[body.productId];
      return next;
    });
  };

  const applyLatestDiff = async (roomId: string) => {
    const run = roomRuns[roomId]?.find((item) => item.mode.includes("worktree") && item.status === "completed");
    if (!run) {
      setApplyPreview((current) => ({ ...current, [roomId]: "No completed worktree run has a captured diff to apply yet." }));
      return;
    }

    const response = await fetch(`${daemonBaseUrl}/api/runs/${run.id}/apply-diff`, { method: "POST" });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({ error: "Diff apply failed." }))) as { error?: string };
      setApplyPreview((current) => ({ ...current, [roomId]: body.error ?? "Diff apply failed." }));
      return;
    }

    const body = (await response.json()) as { output: string; room: Room };
    replaceRoom(body.room);
    setApplyPreview((current) => ({ ...current, [roomId]: body.output }));
  };

  const exportDailyBriefMarkdown = async () => {
    const response = await fetch(`${daemonBaseUrl}/api/briefs/daily.md`);
    if (!response.ok) {
      setDailyBriefExportStatus("Daily Brief export failed.");
      return;
    }

    const body = (await response.json()) as { markdown: string; brief: DailyBrief };
    setDailyBriefMarkdown(body.markdown);
    setDailyBrief(body.brief);

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(body.markdown);
        setDailyBriefExportStatus("Markdown copied.");
        return;
      } catch {
        // Preview is still useful if clipboard access is blocked.
      }
    }

    setDailyBriefExportStatus("Markdown ready.");
  };

  const saveDailyBriefSnapshot = async () => {
    const response = await fetch(`${daemonBaseUrl}/api/briefs/daily/save`, { method: "POST" });
    if (!response.ok) {
      setDailyBriefSnapshotStatus("Daily Brief snapshot failed.");
      return;
    }

    const body = (await response.json()) as { markdown: string; brief: DailyBrief; outputPath: string };
    setDailyBrief(body.brief);
    setDailyBriefMarkdown(body.markdown);
    setDailyBriefSnapshotStatus(`Saved ${body.outputPath}`);
  };

  const openLatestDailyBriefSnapshot = async () => {
    const response = await fetch(`${daemonBaseUrl}/api/briefs/daily/latest-snapshot`);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({ error: "No Daily Brief snapshot saved yet." }))) as { error?: string };
      setDailyBriefSnapshotStatus(body.error ?? "No Daily Brief snapshot saved yet.");
      return;
    }

    const body = (await response.json()) as { markdown: string; outputPath: string };
    setDailyBriefMarkdown(body.markdown);
    setDailyBriefSnapshotStatus(`Opened ${body.outputPath}`);
  };

  const openRoomFromCommandCenter = (room: Room) => {
    setSelectedProductId(room.productId);
    setSelectedRoomId(room.id);
    setIsCreatingRoom(false);
    setFocusedRoomId(null);
    setActiveShellView("room");
  };

  if (activeShellView === "overview") {
    return (
      <TerminalCommandCenter
        workspace={workspace}
        commandCenterRooms={commandCenterRooms}
        selectedProductId={selectedProductId}
        selectedRoomId={selectedRoom.id}
        decisionItems={decisionItems}
        dailyBrief={dailyBrief}
        elfFmFeed={elfFmFeed}
        roomRuns={roomRuns}
        terminalRunLogs={terminalRunLogs}
        terminalInstructions={runInstructionsByRoomId}
        daemonState={daemonState}
        syncState={syncState}
        lastSyncAt={lastSyncAt}
        onSelectProduct={setSelectedProductId}
        onOpenRoom={openRoomFromCommandCenter}
        onOpenRoomView={() => setActiveShellView("room")}
        onTerminalInstructionChange={(roomId, value) => setRunInstructionsByRoomId((current) => ({ ...current, [roomId]: value }))}
        onStartRoomRun={(roomId, mode, prompt) => startRoomRun(roomId, mode, prompt)}
        onKillRoomRun={killLatestRun}
        onAnswerAsk={(roomId, askId, answer, note) => answerRoomAsk(roomId, askId, answer, note)}
      />
    );
  }

  return (
    <main
      className="dark-cockpit grid h-screen min-h-[760px] min-w-[1040px] gap-0 bg-[#070706] p-2.5 text-stone-100 max-lg:flex max-lg:h-auto max-lg:min-w-0 max-lg:flex-col max-lg:gap-2.5"
      style={{ gridTemplateColumns: mainGridTemplateColumns }}
    >
      <button
        className="fixed right-5 top-5 z-50 inline-flex h-9 items-center gap-2 rounded-md border border-blue-300/20 bg-[#020408]/90 px-3 font-mono text-[11px] uppercase tracking-[0.14em] text-blue-200 shadow-2xl shadow-black/40 backdrop-blur transition-colors hover:border-blue-300/50 hover:text-blue-100"
        type="button"
        onClick={() => setActiveShellView("overview")}
      >
        <SquareTerminal size={14} />
        Command center
      </button>
      {!isRoomFocused ? (
      <aside className="min-w-[220px] overflow-auto rounded-l-2xl rounded-r-md border border-stone-800 bg-stone-950/92 p-4 shadow-2xl shadow-black/40 max-lg:w-full max-lg:max-w-none max-lg:rounded-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500 text-stone-950">
            <Sparkles size={18} />
          </div>
          <div>
            <p className="text-[11px] font-extrabold uppercase text-stone-500">Local command room</p>
            <h1 className="text-2xl font-bold tracking-normal">Elves HQ</h1>
          </div>
        </div>
        <Badge variant={daemonState === "local" ? syncState === "stale" ? "amber" : "green" : daemonState === "connecting" ? "blue" : "amber"} className="mb-2">
          {daemonState === "local" ? syncState === "stale" ? "Sync stale" : "Sync live" : daemonState === "connecting" ? "Connecting daemon" : "Seed fallback"}
        </Badge>
        <p className="mb-4 text-[11px] font-semibold text-stone-500">
          {lastSyncAt ? `Last local sync ${lastSyncAt}` : daemonState === "fallback" ? "Using seed data only." : "Waiting for local daemon."}
        </p>

        <ProjectButton
          selected={selectedProductId === "all"}
          title="All projects"
          count={workspace.products.length}
          onClick={() => setSelectedProductId("all")}
        />

        <Button className="mt-3 w-full" variant="outline" size="sm" type="button" onClick={() => setIsAddingProduct((current) => !current)}>
          <FolderPlus size={14} />
          Add local project
        </Button>

        {isAddingProduct ? (
          <section className="mt-3 grid gap-2 rounded-lg border border-stone-800 bg-stone-900/80 p-3">
            <input
              className="h-9 rounded-md border border-stone-700 bg-stone-950 px-2 text-sm text-stone-100 placeholder:text-stone-500"
              value={newProduct.name}
              onChange={(event) => setNewProduct((current) => ({ ...current, name: event.target.value }))}
              placeholder="Project name"
            />
            <input
              className="h-9 rounded-md border border-stone-700 bg-stone-950 px-2 text-sm text-stone-100 placeholder:text-stone-500"
              value={newProduct.localPath}
              onChange={(event) => setNewProduct((current) => ({ ...current, localPath: event.target.value }))}
              placeholder="/Users/sarthak/Desktop/fleet/my-app"
            />
            <FolderBrowserPanel
              listing={folderListing}
              status={folderListingStatus}
              selectedPath={newProduct.localPath}
              onOpenPath={(path) => void loadFolderListing(path)}
              onSelectPath={selectProductFolder}
            />
            <Textarea
              className="min-h-16"
              value={newProduct.currentGoal}
              onChange={(event) => setNewProduct((current) => ({ ...current, currentGoal: event.target.value }))}
              placeholder="Current goal"
              rows={2}
            />
            <Button size="sm" type="button" onClick={createProduct} disabled={!newProduct.name.trim() || !newProduct.localPath.trim()}>
              Add project
            </Button>
            {draftProduct ? (
              <ProductFolderCard product={draftProduct} inspection={draftProductInspection} />
            ) : null}
            {draftProductInspectionError ? (
              <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs leading-5 text-amber-200">{draftProductInspectionError}</p>
            ) : null}
          </section>
        ) : null}

        {selectedProduct ? (
          <ProductFolderCard
            product={selectedProduct}
            inspection={selectedProductInspection}
            settingsStatus={productSettingsStatus[selectedProduct.id]}
            onSaveSettings={(input) => saveProductSettings(selectedProduct.id, input)}
            onRemove={() => removeProduct(selectedProduct)}
          />
        ) : null}

        <FleetPulsePanel
          rows={productPulseRows}
          selectedProductId={selectedProductId}
          onSelectProduct={(productId) => {
            setSelectedProductId(productId);
            setIsCreatingRoom(false);
          }}
        />

        <div className="mt-2 grid gap-2">
          {workspace.products.map((product) => {
            const productRooms = workspace.rooms.filter((room) => room.productId === product.id);
            const needs = productRooms.filter((room) => room.status === "asking" || room.status === "ready").length;

            return (
              <ProjectButton
                key={product.id}
                selected={selectedProductId === product.id}
                title={product.name}
                meta={`${product.priority} · ${product.status}`}
                count={needs || productRooms.length}
                onClick={() => setSelectedProductId(product.id)}
              />
            );
          })}
        </div>

        <div className="mt-6 grid gap-2" aria-label="Fleet status">
          <StatusPill status="asking" count={counts.asking} />
          <StatusPill status="working" count={counts.working} />
          <StatusPill status="ready" count={counts.ready} />
          <StatusPill status="failed" count={counts.failed + counts.blocked} label="Stuck" />
        </div>
      </aside>
      ) : null}

      {!isRoomFocused ? <PaneResizeHandle label="Resize fleet pane" onPointerDown={(event) => startPaneResize("fleet", event)} onReset={() => setPaneLayout(defaultPaneLayout)} /> : null}

      {!isRoomFocused ? (
      <section className="min-w-[380px] overflow-auto rounded-md border-y border-stone-800 bg-stone-950/88 p-4 shadow-2xl shadow-black/35 max-lg:w-full max-lg:min-w-0 max-lg:rounded-2xl max-lg:border" aria-label="Task rooms">
        <header className="mb-4 grid gap-3">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase text-stone-500">Task rooms</p>
              <h2 className="truncate text-2xl font-bold tracking-normal">
                {selectedProductId === "all" ? "Every active room" : workspace.products.find((item) => item.id === selectedProductId)?.name}
              </h2>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setIsCreatingRoom((current) => !current);
                  setNewRoom((current) => ({
                    ...current,
                    productId: selectedProductId === "all" ? current.productId || workspace.products[0]?.id || "" : selectedProductId
                  }));
                }}
              >
                <Hammer size={16} />
                New room
              </Button>
            </div>
          </div>
        </header>

        <OverviewSwitcher
          activePanel={activeOverviewPanel}
          counts={{
            needs: visibleDecisionItems.length,
            fm: elfFmFeed.transcript.filter((item) => selectedProductId === "all" || item.productId === selectedProductId).length,
            backlog: selectedBacklogTasks.length,
            brief: visibleBriefRecommendationCount
          }}
          onSelectPanel={setActiveOverviewPanel}
        />

        {activeOverviewPanel === "needs" ? (
          <NeedsMePanel
            items={visibleDecisionItems}
            workspace={workspace}
            onOpenRoom={(item) => {
              setSelectedProductId(item.productId);
              setSelectedRoomId(item.roomId);
              setIsCreatingRoom(false);
            }}
          />
        ) : null}

        {activeOverviewPanel === "fm" ? (
          <ElfFMPanel
            feed={elfFmFeed}
            selectedProductId={selectedProductId}
            onOpenRoom={(roomId, productId) => {
              setSelectedProductId(productId);
              setSelectedRoomId(roomId);
              setIsCreatingRoom(false);
            }}
          />
        ) : null}

        {activeOverviewPanel === "backlog" ? (
          <TaskBacklogPanel
            product={selectedProduct}
            tasks={selectedBacklogTasks}
            closedTaskCount={selectedClosedTaskCount}
            workspace={workspace}
            draft={newTask}
            assignment={backlogAssignment}
            onDraftChange={setNewTask}
            onAssignmentChange={setBacklogAssignment}
            onCreateTask={createBacklogTask}
            onAssignTask={assignBacklogTask}
            onUpdateTaskStatus={updateBacklogTaskStatus}
          />
        ) : null}

        {activeOverviewPanel === "brief" ? (
          <DailyBriefPanel
            brief={dailyBrief}
            selectedProductId={selectedProductId}
            markdownPreview={dailyBriefMarkdown}
            exportStatus={dailyBriefExportStatus}
            snapshotStatus={dailyBriefSnapshotStatus}
            onExportMarkdown={exportDailyBriefMarkdown}
            onSaveSnapshot={saveDailyBriefSnapshot}
            onOpenLatestSnapshot={openLatestDailyBriefSnapshot}
            onOpenRoom={(item) => {
              setSelectedProductId(item.productId);
              setSelectedRoomId(item.roomId);
              setIsCreatingRoom(false);
            }}
          />
        ) : null}

        {isCreatingRoom ? (
          <section className="mb-4 rounded-xl border border-stone-800 bg-stone-900/70 p-4 shadow-sm">
            <div className="mb-3">
              <p className="text-[11px] font-extrabold uppercase text-stone-500">Create room</p>
              <h3 className="text-base font-semibold text-stone-100">Assign a task to an elf</h3>
            </div>
            <div className="grid gap-3">
              <label className="grid gap-1 text-sm font-semibold text-stone-300">
                Project
                <select
                  className="h-10 rounded-md border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100"
                  value={newRoom.productId}
                  onChange={(event) => setNewRoom((current) => ({ ...current, productId: event.target.value }))}
                >
                  {workspace.products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold text-stone-300">
                Task
                <input
                  className="h-10 rounded-md border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100"
                  value={newRoom.title}
                  onChange={(event) => setNewRoom((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Fix flaky onboarding test"
                />
              </label>
              <label className="grid gap-1 text-sm font-semibold text-stone-300">
                Elf
                <select
                  className="h-10 rounded-md border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100"
                  value={newRoom.assignedElfId}
                  onChange={(event) => setNewRoom((current) => ({ ...current, assignedElfId: event.target.value }))}
                >
                  {workspace.elves.map((elf) => (
                    <option key={elf.id} value={elf.id}>
                      {elf.name} · {elf.role}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold text-stone-300">
                Playbook
                <select
                  className="h-10 rounded-md border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100"
                  value={newRoom.playbookId}
                  onChange={(event) => setNewRoom((current) => ({ ...current, playbookId: event.target.value }))}
                >
                  {workspace.playbooks.map((playbook) => (
                    <option key={playbook.id} value={playbook.id}>
                      {playbook.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold text-stone-300">
                Acceptance criteria
                <Textarea
                  value={newRoom.acceptanceCriteria}
                  onChange={(event) => setNewRoom((current) => ({ ...current, acceptanceCriteria: event.target.value }))}
                  placeholder={"One criterion per line\nRun the narrowest relevant check\nAttach diff and check output"}
                  rows={4}
                />
              </label>
              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setIsCreatingRoom(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={createRoom} disabled={!newRoom.title.trim() || !newRoom.productId}>
                  Create room
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        <RoomDeck
          rooms={visibleRooms}
          workspace={workspace}
          selectedRoomId={selectedRoom.id}
          scope={roomDeckScope}
          signalFilter={roomSignalFilter}
          sortOrder={roomSortOrder}
          activeCount={activeRoomCount}
          totalCount={productFilteredRooms.length}
          signalCounts={roomSignalCounts}
          page={roomDeckPage}
          pageSize={roomDeckPageSize}
          onScopeChange={setRoomDeckScope}
          onSignalFilterChange={setRoomSignalFilter}
          onSortOrderChange={setRoomSortOrder}
          onPageChange={setRoomDeckPage}
          onSelectRoom={setSelectedRoomId}
        />
      </section>
      ) : null}

      {!isRoomFocused ? <PaneResizeHandle label="Resize room pane" onPointerDown={(event) => startPaneResize("rooms", event)} onReset={() => setPaneLayout(defaultPaneLayout)} /> : null}

      <section className={cn("min-w-0 overflow-auto border border-stone-800 bg-stone-950/92 shadow-2xl shadow-black/40 max-lg:rounded-2xl", isRoomFocused ? "rounded-2xl" : "rounded-l-md rounded-r-2xl")} aria-label="Selected room">
        <RoomDetail
          room={selectedRoom}
          workspace={workspace}
          runs={roomRuns[selectedRoom.id] ?? []}
          diffPreview={diffPreview[selectedRoom.id]}
          promptPreview={promptPreview[selectedRoom.id]}
          runLogPreview={runLogPreview[selectedRoom.id]}
          checkPreview={checkPreview[selectedRoom.id]}
          codevetterPreview={codevetterPreview[selectedRoom.id]}
          cleanupPreview={cleanupPreview[selectedRoom.id]}
          applyPreview={applyPreview[selectedRoom.id]}
          transcriptPreview={transcriptPreview[selectedRoom.id]}
          decisionPreview={decisionPreview[selectedRoom.id]}
          productMemory={selectedProductMemory}
          productInspection={productInspections[selectedRoom.productId]}
          selectedMemorySection={selectedMemorySection}
          memoryDraft={selectedMemorySectionBody}
          activeWorkbenchTab={selectedRoomWorkbenchTab}
          isFocused={isRoomFocused}
          runInstructionDraft={runInstructionsByRoomId[selectedRoom.id] ?? ""}
          checkGateSelection={checkGateByRoomId[selectedRoom.id] ?? "auto"}
          onSelectMemorySection={setSelectedMemorySection}
          onMemoryDraftChange={(value) => setMemoryDrafts((current) => ({ ...current, [selectedMemoryDraftKey]: value }))}
          onSaveMemory={(section, body) => saveProductMemorySection(selectedRoom.productId, section, body)}
          onSelectWorkbenchTab={(tab) => setRoomWorkbenchTabsById((current) => ({ ...current, [selectedRoom.id]: tab }))}
          onRunInstructionDraftChange={(value) => setRunInstructionsByRoomId((current) => ({ ...current, [selectedRoom.id]: value }))}
          onCheckGateSelectionChange={(value) => setCheckGateByRoomId((current) => ({ ...current, [selectedRoom.id]: value }))}
          noteDraft={roomNotes[selectedRoom.id] ?? ""}
          onNoteDraftChange={(value) => setRoomNotes((current) => ({ ...current, [selectedRoom.id]: value }))}
          onSaveNote={() => saveRoomNote(selectedRoom.id)}
          onStartDryRun={(prompt) => startRoomRun(selectedRoom.id, "dry-run", prompt)}
          onStartCodexReadOnly={(prompt) => startRoomRun(selectedRoom.id, "codex-readonly", prompt)}
          onStartMode={(mode, prompt) => startRoomRun(selectedRoom.id, mode, prompt)}
          onOpenPrompt={() => openLatestPrompt(selectedRoom.id)}
          onOpenRunLog={() => openLatestRunLog(selectedRoom.id)}
          onOpenDiff={() => openLatestDiff(selectedRoom.id)}
          onRunCheck={(scriptKey) => runLatestCheck(selectedRoom.id, scriptKey)}
          onRunCodeVetter={() => runLatestCodeVetter(selectedRoom.id)}
          onCleanupWorktree={() => cleanupLatestWorktree(selectedRoom.id)}
          onApplyDiff={() => applyLatestDiff(selectedRoom.id)}
          onGenerateTranscript={() => generateRoomTranscript(selectedRoom.id)}
          onKillRun={() => killLatestRun(selectedRoom.id)}
          onDecisionAction={(action, note) => performDecisionAction(selectedRoom.id, action, note)}
          onAnswerAsk={(askId, answer, note) => answerRoomAsk(selectedRoom.id, askId, answer, note)}
          onFocusRoom={() => setFocusedRoomId(selectedRoom.id)}
          onExitFocusRoom={() => setFocusedRoomId(null)}
        />
      </section>
    </main>
  );
}

function TerminalCommandCenter({
  workspace,
  commandCenterRooms,
  selectedProductId,
  selectedRoomId,
  decisionItems,
  dailyBrief,
  elfFmFeed,
  roomRuns,
  terminalRunLogs,
  terminalInstructions,
  daemonState,
  syncState,
  lastSyncAt,
  onSelectProduct,
  onOpenRoom,
  onOpenRoomView,
  onTerminalInstructionChange,
  onStartRoomRun,
  onKillRoomRun,
  onAnswerAsk
}: {
  workspace: WorkspaceSeed;
  commandCenterRooms: CommandCenterRoomSet;
  selectedProductId: string;
  selectedRoomId: string;
  decisionItems: DecisionItem[];
  dailyBrief: DailyBrief;
  elfFmFeed: ElfFmFeed;
  roomRuns: Record<string, ElfRun[]>;
  terminalRunLogs: Record<string, string>;
  terminalInstructions: Record<string, string>;
  daemonState: "connecting" | "local" | "fallback";
  syncState: "connecting" | "live" | "stale";
  lastSyncAt: string;
  onSelectProduct: (productId: string) => void;
  onOpenRoom: (room: Room) => void;
  onOpenRoomView: () => void;
  onTerminalInstructionChange: (roomId: string, value: string) => void;
  onStartRoomRun: (roomId: string, mode: ElfRun["mode"], prompt?: string) => void;
  onKillRoomRun: (roomId: string) => void;
  onAnswerAsk: (roomId: string, askId: string, answer: string, note?: string) => void;
}) {
  const { primaryRoom, secondaryRooms, interventionRoom, interventionItem } = commandCenterRooms;
  const [focusedTerminalRoomId, setFocusedTerminalRoomId] = useState<string | null>(null);
  const [terminalDrawerLayouts, setTerminalDrawerLayouts] = useState<TerminalDrawerLayouts>(readStoredTerminalDrawerLayouts);
  const terminalCanvasRef = useRef<HTMLDivElement | null>(null);
  const activeCount = workspace.rooms.filter((room) => room.status === "working").length;
  const interventionCount = decisionItems.length;
  const systemLoad = Math.min(92, Math.max(8, activeCount * 18 + interventionCount * 9));
  const navProducts = workspace.products.slice(0, 7);
  const terminalDrawerEntries = uniqueTerminalDrawerEntries([
    interventionRoom ? { room: interventionRoom, role: "intervention", decisionItem: interventionItem } : undefined,
    primaryRoom ? { room: primaryRoom, role: "primary" } : undefined,
    ...secondaryRooms.map((room) => ({ room, role: "secondary" as const }))
  ]);
  const terminalRooms = terminalDrawerEntries.map((entry) => entry.room);
  const focusedTerminalRoom = terminalRooms.find((room) => room.id === focusedTerminalRoomId) ?? (focusedTerminalRoomId ? terminalRooms[0] : undefined);
  const focusedDecisionItem = focusedTerminalRoom?.id === interventionRoom?.id ? interventionItem : undefined;

  useEffect(() => {
    window.localStorage.setItem(terminalDrawerLayoutStorageKey, JSON.stringify(terminalDrawerLayouts));
  }, [terminalDrawerLayouts]);

  const focusTerminal = (room: Room) => {
    setFocusedTerminalRoomId(room.id);
    onOpenRoom(room);
  };

  const selectTerminal = (room: Room) => {
    onOpenRoom(room);
    setFocusedTerminalRoomId(room.id);
  };

  const getTerminalDrawerLayout = (entry: TerminalDrawerEntry) => {
    return clampTerminalDrawerLayout(terminalDrawerLayouts[entry.room.id] ?? defaultTerminalDrawerLayout(entry.role, entry.room));
  };

  const startTerminalDrawerResize = (entry: TerminalDrawerEntry, event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const startLayout = getTerminalDrawerLayout(entry);
    const startX = event.clientX;
    const startY = event.clientY;
    const canvasWidth = terminalCanvasRef.current?.clientWidth ?? 960;
    const columnWidth = Math.max(64, (canvasWidth - (terminalGridColumns - 1) * 8) / terminalGridColumns);

    const handleMove = (moveEvent: PointerEvent) => {
      const deltaCols = Math.round((moveEvent.clientX - startX) / columnWidth);
      const deltaRows = Math.round((moveEvent.clientY - startY) / terminalGridRowHeight);
      const nextLayout = clampTerminalDrawerLayout({
        cols: startLayout.cols + deltaCols,
        rows: startLayout.rows + deltaRows
      });
      setTerminalDrawerLayouts((current) => ({ ...current, [entry.room.id]: nextLayout }));
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
  };

  return (
    <main className="terminal-shell terminal-grid-bg min-h-screen min-w-[1080px] bg-[#020408] p-6 text-slate-100 max-lg:min-w-0 max-lg:p-3">
      <div className="grid min-h-[calc(100vh-48px)] grid-cols-[264px_1fr] overflow-hidden rounded-xl border border-slate-700/60 bg-[#020408] shadow-2xl shadow-black/60 max-lg:grid-cols-1">
        <aside className="flex min-h-0 flex-col border-r border-slate-700/60 bg-[#020408] px-5 py-6 max-lg:border-b max-lg:border-r-0">
          <button
            className="mb-7 grid h-9 w-9 place-items-center rounded-md text-slate-400 transition-colors hover:bg-slate-900 hover:text-blue-200"
            type="button"
            aria-label="Open terminal workbench"
            onClick={onOpenRoomView}
          >
            <ChevronLeft size={20} />
          </button>

          <div className="mb-8 flex items-center gap-4">
            <div className="grid size-11 shrink-0 place-items-center rounded border border-slate-600/80 bg-slate-950 text-blue-200">
              <SquareTerminal size={21} />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">Local Codex dashboard</p>
              <h1 className="text-[26px] font-semibold leading-7 tracking-normal text-blue-100">Elves HQ</h1>
              <p className="mt-1 font-mono text-[10px] text-slate-500">v0.local</p>
            </div>
          </div>

          <p className="mb-8 px-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            Founder operator
          </p>

          <nav className="grid gap-1" aria-label="Command center sections">
            <button
              className={cn(
                "flex min-h-11 items-center gap-3 border-r-2 px-3 text-left font-mono text-xs uppercase tracking-[0.18em] transition-colors",
                selectedProductId === "all" ? "border-blue-300 bg-slate-950 text-blue-100" : "border-transparent text-slate-400 hover:bg-slate-950 hover:text-blue-100"
              )}
              type="button"
              onClick={() => onSelectProduct("all")}
            >
              <LayoutDashboard size={18} />
              Overview
            </button>
            <button
              className="flex min-h-11 items-center gap-3 border-r-2 border-transparent px-3 text-left font-mono text-xs uppercase tracking-[0.18em] text-slate-400 transition-colors hover:bg-slate-950 hover:text-blue-100"
              type="button"
              onClick={onOpenRoomView}
            >
              <SquareTerminal size={18} />
              Terminals
            </button>
            <div className="flex min-h-11 items-center gap-3 border-r-2 border-transparent px-3 text-left font-mono text-xs uppercase tracking-[0.18em] text-slate-600">
              <MapIcon size={18} />
              Roadmap
            </div>
          </nav>

          <div className="mt-8 grid gap-1.5">
            <p className="mb-1 px-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-600">Projects</p>
            {navProducts.map((product) => {
              const productRooms = workspace.rooms.filter((room) => room.productId === product.id);
              const needs = productRooms.filter((room) => room.status === "asking" || room.status === "blocked" || room.status === "failed" || room.status === "ready").length;

              return (
                <button
                  className={cn(
                    "flex items-center justify-between gap-2 rounded px-2.5 py-2 text-left text-xs transition-colors",
                    selectedProductId === product.id ? "bg-slate-950 text-slate-100" : "text-slate-500 hover:bg-slate-950 hover:text-slate-200"
                  )}
                  key={product.id}
                  type="button"
                  onClick={() => onSelectProduct(product.id)}
                >
                  <span className="min-w-0 truncate font-semibold">{product.name}</span>
                  <span className={cn("font-mono text-[10px]", needs > 0 ? "text-amber-200" : "text-slate-600")}>{needs || productRooms.length}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-auto border-t border-slate-800 pt-5">
            <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.15em] text-slate-500">
              <span>Sys_load</span>
              <span className="text-blue-200">{systemLoad}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-950">
              <div className="h-full rounded-full bg-blue-200" style={{ width: `${systemLoad}%` }} />
            </div>
            <p className="mt-3 font-mono text-[10px] leading-4 text-slate-600">
              {daemonState === "local" ? `${syncState === "stale" ? "STALE" : "LIVE"} ${lastSyncAt || "sync"}` : daemonState === "connecting" ? "CONNECTING daemon" : "SEED fallback"}
            </p>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="flex h-16 items-center justify-between border-b border-slate-700/60 px-7 max-sm:px-4">
            <button
              className="font-mono text-xs uppercase tracking-[0.22em] text-slate-400 transition-colors hover:text-blue-100"
              type="button"
              onClick={() => onSelectProduct("all")}
            >
              {selectedProductId === "all" ? "All projects" : workspace.products.find((product) => product.id === selectedProductId)?.name ?? "All projects"}
            </button>
            <div className="flex items-center gap-3 text-slate-400">
              <button
                className="grid size-8 place-items-center rounded transition-colors hover:bg-slate-950 hover:text-blue-100"
                type="button"
                aria-label="Focus selected terminal"
                onClick={() => {
                  const room = terminalRooms.find((candidate) => candidate.id === selectedRoomId) ?? primaryRoom ?? terminalRooms[0];
                  if (room) {
                    focusTerminal(room);
                  }
                }}
              >
                <Maximize2 size={18} />
              </button>
              <button className="grid size-8 place-items-center rounded transition-colors hover:bg-slate-950 hover:text-blue-100" type="button" aria-label="Open terminal workbench" onClick={onOpenRoomView}>
                <Settings2 size={18} />
              </button>
              <button
                className="relative grid size-8 place-items-center rounded transition-colors hover:bg-slate-950 hover:text-blue-100 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-slate-400"
                type="button"
                aria-label="Open intervention room"
                disabled={!interventionRoom}
                onClick={() => {
                  if (interventionRoom) {
                    onOpenRoom(interventionRoom);
                  }
                }}
              >
                <Bell size={18} />
                {interventionCount > 0 ? <span className="absolute right-2 top-2 size-1.5 rounded-full bg-blue-200" /> : null}
              </button>
              <div className="grid size-8 place-items-center rounded-full border border-slate-700 bg-slate-950 font-mono text-[10px] text-blue-100">HQ</div>
            </div>
          </header>

          {focusedTerminalRoom ? (
            <div className="grid min-h-[calc(100vh-112px)] grid-cols-[minmax(0,1fr)_220px] gap-2 p-7 max-xl:grid-cols-1 max-sm:p-4">
              <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2">
                <div className="flex min-h-12 items-center justify-between border border-slate-800 bg-[#05080d] px-4">
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">Focused terminal drawer</p>
                    <p className="truncate text-sm font-semibold text-slate-200">{focusedTerminalRoom.title}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded border border-slate-800 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 transition-colors hover:border-blue-300/40 hover:text-blue-100"
                      type="button"
                      onClick={onOpenRoomView}
                    >
                      Inspect
                    </button>
                    <button
                      className="grid size-8 place-items-center rounded border border-slate-800 text-slate-400 transition-colors hover:border-blue-300/40 hover:text-blue-100"
                      type="button"
                      aria-label="Exit focused terminal"
                      onClick={() => setFocusedTerminalRoomId(null)}
                    >
                      <Minimize2 size={17} />
                    </button>
                  </div>
                </div>
                <TerminalPanel
                  room={focusedTerminalRoom}
                  workspace={workspace}
                  runs={roomRuns[focusedTerminalRoom.id] ?? []}
                  runLog={terminalRunLogs[focusedTerminalRoom.id] ?? ""}
                  instructionDraft={terminalInstructions[focusedTerminalRoom.id] ?? ""}
                  decisionItem={focusedDecisionItem}
                  selected
                  span="focused"
                  isTerminalFocused
                  variant={focusedTerminalRoom.id === interventionRoom?.id ? "alert" : "default"}
                  canRunCommands={daemonState === "local"}
                  onOpen={onOpenRoomView}
                  onFocus={() => setFocusedTerminalRoomId(null)}
                  onInstructionChange={(value) => onTerminalInstructionChange(focusedTerminalRoom.id, value)}
                  onStartMode={(mode, prompt) => onStartRoomRun(focusedTerminalRoom.id, mode, prompt)}
                  onKillRun={() => onKillRoomRun(focusedTerminalRoom.id)}
                  onAnswerAsk={(askId, answer, note) => onAnswerAsk(focusedTerminalRoom.id, askId, answer, note)}
                />
              </div>

              <aside className="terminal-scroll min-h-0 overflow-auto border border-slate-800 bg-[#05080d] p-3">
                <p className="mb-3 px-1 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-600">Terminal drawers</p>
                <div className="grid gap-2">
                  {terminalRooms.map((room) => (
                    <TerminalRailButton
                      key={room.id}
                      room={room}
                      workspace={workspace}
                      selected={room.id === focusedTerminalRoom.id}
                      onClick={() => selectTerminal(room)}
                    />
                  ))}
                </div>
              </aside>
            </div>
          ) : (
            <div className="min-h-[calc(100vh-112px)] p-7 max-sm:p-4">
              <div ref={terminalCanvasRef} className="grid auto-rows-[74px] grid-cols-12 gap-2">
                {terminalDrawerEntries.length > 0 ? (
                  terminalDrawerEntries.map((entry) => {
                    const layout = getTerminalDrawerLayout(entry);

                    return (
                      <TerminalPanel
                        key={entry.room.id}
                        room={entry.room}
                        workspace={workspace}
                        runs={roomRuns[entry.room.id] ?? []}
                        runLog={terminalRunLogs[entry.room.id] ?? ""}
                        instructionDraft={terminalInstructions[entry.room.id] ?? ""}
                        decisionItem={entry.decisionItem}
                        selected={entry.room.id === selectedRoomId}
                        variant={entry.role === "intervention" ? "alert" : "default"}
                        drawerLayout={layout}
                        canRunCommands={daemonState === "local"}
                        onOpen={() => onOpenRoom(entry.room)}
                        onFocus={() => focusTerminal(entry.room)}
                        onResizeStart={(event) => startTerminalDrawerResize(entry, event)}
                        onInstructionChange={(value) => onTerminalInstructionChange(entry.room.id, value)}
                        onStartMode={(mode, prompt) => onStartRoomRun(entry.room.id, mode, prompt)}
                        onKillRun={() => onKillRoomRun(entry.room.id)}
                        onAnswerAsk={(askId, answer, note) => onAnswerAsk(entry.room.id, askId, answer, note)}
                      />
                    );
                  })
                ) : (
                  <div className="col-span-12 row-span-4">
                    <TerminalEmptyPanel title="No active terminals" body="Add a local project and create a Codex terminal from the workbench." />
                  </div>
                )}
                {terminalDrawerEntries.length === 1 ? (
                  <div className="col-span-4 row-span-4">
                    <TerminalEmptyPanel title="Terminal bay idle" body={`Daily Brief: ${dailyBrief.totals.ready} ready, ${dailyBrief.totals.blocked + dailyBrief.totals.failed} stuck.`} />
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function TerminalPanel({
  room,
  workspace,
  runs,
  runLog,
  instructionDraft,
  decisionItem,
  selected,
  variant = "default",
  span,
  isTerminalFocused = false,
  drawerLayout,
  canRunCommands,
  onOpen,
  onFocus,
  onResizeStart,
  onInstructionChange,
  onStartMode,
  onKillRun,
  onAnswerAsk
}: {
  room: Room;
  workspace: WorkspaceSeed;
  runs: ElfRun[];
  runLog: string;
  instructionDraft: string;
  decisionItem?: DecisionItem;
  selected: boolean;
  variant?: "default" | "alert";
  span?: "large" | "focused";
  isTerminalFocused?: boolean;
  drawerLayout?: TerminalDrawerLayout;
  canRunCommands: boolean;
  onOpen: () => void;
  onFocus: () => void;
  onResizeStart?: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onInstructionChange: (value: string) => void;
  onStartMode: (mode: ElfRun["mode"], prompt?: string) => void;
  onKillRun: () => void;
  onAnswerAsk: (askId: string, answer: string, note?: string) => void;
}) {
  const product = roomProduct(workspace, room);
  const elf = roomElf(workspace, room);
  const tone = terminalToneForRoom(room, variant);
  const lines = buildTerminalLines(room, product, elf, runs, runLog, decisionItem);
  const activeRun = runs.find((run) => run.status === "running");
  const openAsk = room.asks[0];
  const commandDisabled = !canRunCommands || Boolean(activeRun) || Boolean(openAsk);

  return (
    <article
      className={cn(
        "group relative flex min-h-0 flex-col overflow-hidden rounded-sm border bg-[#05080d] transition-colors",
        span === "large" && "col-span-2 max-lg:col-span-1",
        span === "focused" && "min-h-[calc(100vh-198px)]",
        terminalToneClasses[tone].panel,
        selected && "ring-1 ring-blue-200/40"
      )}
      style={
        drawerLayout
          ? {
              gridColumn: `span ${drawerLayout.cols}`,
              gridRow: `span ${drawerLayout.rows}`
            }
          : undefined
      }
    >
      <header className={cn("flex items-center justify-between border-b bg-[#020408] px-4 py-3", terminalToneClasses[tone].header)}>
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("size-2 rounded-full shadow-[0_0_12px_currentColor]", terminalToneClasses[tone].dot)} />
          <span className={cn("truncate font-mono text-[11px] uppercase tracking-[0.16em]", terminalToneClasses[tone].title)}>
            {ttyLabel(room)} // {slugForTerminal(room.title)}
            <span className="ml-3 text-slate-600">{shortPath(product.localPath)}</span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            className={cn("transition-colors", terminalToneClasses[tone].icon)}
            type="button"
            aria-label={isTerminalFocused ? `Exit focused ${room.title}` : `Focus ${room.title}`}
            onClick={onFocus}
          >
            {isTerminalFocused ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
          <button className="text-slate-600 transition-colors hover:text-slate-300" type="button" aria-label={`Inspect ${room.title}`} onClick={onOpen}>
            <Settings2 size={17} />
          </button>
        </div>
      </header>
      <button
        className={cn("terminal-scroll flex-1 overflow-auto p-5 text-left font-mono text-[13px] leading-6", terminalToneClasses[tone].body)}
        type="button"
        onClick={onOpen}
      >
        {lines.map((line, index) => (
          <span className={cn("block whitespace-pre-wrap", terminalLineClass(line))} key={`${room.id}-${index}`}>
            {line}
          </span>
        ))}
        <span className={cn("mt-1 inline-block h-4 w-2 align-middle terminal-cursor", terminalToneClasses[tone].cursor)} />
      </button>
      <footer className={cn("grid gap-2 border-t bg-[#020408]/96 px-4 py-3", terminalToneClasses[tone].footer)}>
        <div className="flex min-w-0 items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            <span className={cn("size-1.5 shrink-0 rounded-full", terminalToneClasses[tone].dot)} />
            <span className={cn("truncate font-mono text-[10px] uppercase tracking-[0.12em]", terminalToneClasses[tone].title)}>
              {elf.name} {statusLabels[room.status]}
            </span>
          </span>
          <span className="grid size-6 shrink-0 place-items-center rounded-full border border-slate-700 bg-slate-950 text-[10px] text-slate-400">{elf.name.slice(0, 1)}</span>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <label className="flex min-w-0 items-center gap-2 rounded-full border border-slate-800 bg-slate-950/80 px-3 py-1.5 font-mono text-[12px] text-slate-300">
            <span className={terminalToneClasses[tone].title}>$</span>
            <input
              className="min-w-0 flex-1 bg-transparent text-slate-200 outline-none placeholder:text-slate-600 disabled:text-slate-600"
              value={instructionDraft}
              disabled={!canRunCommands}
              aria-label={`Instruction for ${room.title}`}
              placeholder={activeRun ? "instruction for next run" : "tell this elf what to do"}
              onChange={(event) => onInstructionChange(event.target.value)}
              onClick={(event) => event.stopPropagation()}
            />
          </label>
          <span className="flex items-center gap-1.5">
            {openAsk ? (
              openAsk.options.slice(0, 3).map((option) => (
                <TerminalCommandButton
                  key={option}
                  label={option}
                  tone={tone}
                  disabled={!canRunCommands}
                  onClick={() => onAnswerAsk(openAsk.id, option, instructionDraft)}
                />
              ))
            ) : activeRun ? (
              <TerminalCommandButton label="stop" tone={tone} disabled={!canRunCommands} onClick={onKillRun} />
            ) : (
              <>
                <TerminalCommandButton label="read" tone={tone} disabled={commandDisabled} onClick={() => onStartMode("codex-readonly", instructionDraft)} />
                <TerminalCommandButton label="build" tone={tone} disabled={commandDisabled} onClick={() => onStartMode("codex-worktree", instructionDraft)} />
                <TerminalCommandButton label="dry" tone={tone} disabled={commandDisabled} onClick={() => onStartMode("dry-run", instructionDraft)} />
              </>
            )}
          </span>
        </div>
      </footer>
      {onResizeStart ? (
        <button
          className="absolute bottom-1 right-1 grid size-5 cursor-nwse-resize place-items-center text-slate-700 opacity-40 transition-opacity hover:text-slate-400 group-hover:opacity-90"
          type="button"
          aria-label={`Resize ${room.title}`}
          onPointerDown={onResizeStart}
        >
          <GripVertical size={14} className="-rotate-45" />
        </button>
      ) : (
        <div className="absolute bottom-1 right-1 text-slate-700 opacity-40 transition-opacity group-hover:opacity-90">
          <GripVertical size={14} className="-rotate-45" />
        </div>
      )}
    </article>
  );
}

function TerminalRailButton({ room, workspace, selected, onClick }: { room: Room; workspace: WorkspaceSeed; selected: boolean; onClick: () => void }) {
  const product = roomProduct(workspace, room);
  const tone = terminalToneForRoom(room, room.status === "failed" || room.status === "blocked" ? "alert" : "default");

  return (
    <button
      className={cn(
        "grid gap-1 border px-3 py-2 text-left transition-colors",
        selected
          ? "border-blue-300/40 bg-slate-950 text-slate-100"
          : "border-slate-800 bg-[#020408] text-slate-500 hover:border-slate-700 hover:text-slate-200"
      )}
      type="button"
      onClick={onClick}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className={cn("size-1.5 shrink-0 rounded-full", terminalToneClasses[tone].dot)} />
        <span className="truncate font-mono text-[10px] uppercase tracking-[0.14em]">{ttyLabel(room)}</span>
      </span>
      <span className="truncate text-xs font-semibold">{room.title}</span>
      <span className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-slate-600">
        {product.name} // {statusLabels[room.status]}
      </span>
    </button>
  );
}

function TerminalEmptyPanel({ title, body, variant = "default" }: { title: string; body: string; variant?: "default" | "alert" }) {
  const tone = variant === "alert" ? "alert" : "muted";
  return (
    <article className={cn("flex min-h-[246px] flex-col overflow-hidden rounded-sm border bg-[#05080d]", terminalToneClasses[tone].panel)}>
      <header className={cn("border-b bg-[#020408] px-4 py-3", terminalToneClasses[tone].header)}>
        <span className={cn("font-mono text-[11px] uppercase tracking-[0.16em]", terminalToneClasses[tone].title)}>TTY-00 // EMPTY_BAY</span>
      </header>
      <div className={cn("grid flex-1 place-items-center p-6 text-center font-mono text-xs leading-6", terminalToneClasses[tone].body)}>
        <div>
          <p className="uppercase tracking-[0.18em] text-slate-500">{title}</p>
          <p className="mt-2 max-w-sm text-slate-500">{body}</p>
        </div>
      </div>
    </article>
  );
}

function TerminalCommandButton({
  label,
  tone,
  disabled = false,
  onClick
}: {
  label: string;
  tone: TerminalTone;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "h-6 max-w-32 truncate rounded-full border px-2 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-700",
        tone === "alert" || tone === "red"
          ? "border-red-300/25 text-red-100/80 hover:border-red-300/50 hover:text-red-100"
          : tone === "amber"
            ? "border-amber-300/25 text-amber-100/80 hover:border-amber-300/50 hover:text-amber-100"
            : "border-blue-300/20 text-blue-100/75 hover:border-blue-300/45 hover:text-blue-100"
      )}
      type="button"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {label}
    </button>
  );
}

type TerminalTone = "blue" | "amber" | "red" | "muted" | "alert";

const terminalToneClasses: Record<
  TerminalTone,
  {
    panel: string;
    header: string;
    dot: string;
    title: string;
    body: string;
    footer: string;
    icon: string;
    cursor: string;
  }
> = {
  blue: {
    panel: "border-blue-300/30",
    header: "border-blue-300/20",
    dot: "bg-blue-200 text-blue-200",
    title: "text-blue-100",
    body: "text-slate-300",
    footer: "border-blue-300/20",
    icon: "text-slate-500 hover:text-blue-100",
    cursor: "bg-blue-200"
  },
  amber: {
    panel: "border-amber-300/24",
    header: "border-amber-300/18",
    dot: "bg-amber-200 text-amber-200",
    title: "text-amber-100",
    body: "text-amber-100/75",
    footer: "border-amber-300/22",
    icon: "text-amber-100/55 hover:text-amber-100",
    cursor: "bg-amber-200"
  },
  red: {
    panel: "border-red-300/28 bg-[#060203]",
    header: "border-red-300/18",
    dot: "bg-red-200 text-red-200",
    title: "text-red-100",
    body: "text-red-100/75",
    footer: "border-red-300/25",
    icon: "text-red-100/55 hover:text-red-100",
    cursor: "bg-red-200"
  },
  muted: {
    panel: "border-slate-700/70",
    header: "border-slate-700/70",
    dot: "bg-slate-300 text-slate-300",
    title: "text-slate-300",
    body: "text-slate-400",
    footer: "border-slate-700/70",
    icon: "text-slate-500 hover:text-slate-200",
    cursor: "bg-slate-300"
  },
  alert: {
    panel: "border-red-300/35 bg-[#050102]",
    header: "border-red-300/20",
    dot: "bg-red-200 text-red-200 animate-pulse",
    title: "text-red-100",
    body: "text-red-100/78",
    footer: "border-red-300/30",
    icon: "text-red-100/55 hover:text-red-100",
    cursor: "bg-red-200"
  }
};

function terminalToneForRoom(room: Room, variant: "default" | "alert"): TerminalTone {
  if (variant === "alert") {
    return "alert";
  }
  if (room.status === "failed" || room.status === "blocked") {
    return "red";
  }
  if (room.status === "asking") {
    return "amber";
  }
  if (room.status === "working" || room.status === "ready") {
    return "blue";
  }
  return "muted";
}

function buildTerminalLines(room: Room, product: Product, elf: ReturnType<typeof roomElf>, runs: ElfRun[], runLog: string, decisionItem?: DecisionItem): string[] {
  const latestRun = runs.find((run) => run.status === "running") ?? runs[0];
  const runLogLines = runLog.trim() ? tailTerminalLog(runLog, 24) : [];
  const openAsk = room.asks[0];
  const askLines = openAsk
    ? [
        `[ASK] ${openAsk.question}`,
        ...(openAsk.recommendation ? [`[REC] ${openAsk.recommendation}`] : []),
        `[OPT] ${openAsk.options.slice(0, 3).join(" / ")}`
      ]
    : [];

  if (latestRun && runLogLines.length > 0) {
    return [
      ...askLines,
      ...(askLines.length > 0 ? [""] : []),
      `$ ${latestRun.command}`,
      `# ${latestRun.mode} // ${runTimingLabel(latestRun)}`,
      ...(latestRun.workspacePath ? [`# cwd ${latestRun.workspacePath}`] : []),
      "",
      ...runLogLines
    ].map(trimTerminalLine);
  }

  const openDecision = room.decisions.find((decision) => decision.status === "open");
  const lines: string[] = [
    `[ROOM] ${room.title}`,
    `[PROD] ${product.name}`,
    `[ELF] ${elf.name} assigned to ${elf.role} lane.`,
    `[STAT] ${statusLabels[room.status]} // last activity ${room.lastActivityAt}`
  ];

  if (decisionItem) {
    lines.push(`[NEED] ${decisionItem.title}`);
    lines.push(`[WHY] ${decisionItem.reason}`);
    if (decisionItem.recommendation) {
      lines.push(`[REC] ${decisionItem.recommendation}`);
    }
  } else if (openAsk) {
    lines.push(`[ASK] ${openAsk.question}`);
    if (openAsk.recommendation) {
      lines.push(`[REC] ${openAsk.recommendation}`);
    }
  } else if (openDecision) {
    lines.push(`[DEC] ${openDecision.title} // risk ${openDecision.risk}`);
  }

  if (latestRun) {
    lines.push(`[RUN] ${latestRun.mode} // ${runTimingLabel(latestRun)}`);
    if (latestRun.branchName) {
      lines.push(`[GIT] branch ${latestRun.branchName}`);
    }
  }

  const artifacts = room.artifacts.slice(-3);
  for (const artifact of artifacts) {
    lines.push(`[ART] ${artifact.status.toUpperCase()} ${artifact.type}: ${artifact.title}`);
  }

  const logs = room.logs.slice(-7);
  for (const log of logs) {
    lines.push(`[${log.level.toUpperCase()}] ${log.time} ${log.message}`);
  }

  if (logs.length === 0 && artifacts.length === 0 && !decisionItem && !openAsk && !openDecision) {
    lines.push(`[NOTE] ${room.summary || "No room evidence captured yet."}`);
    lines.push("[SYS] Awaiting first artifact-backed elf update.");
  }

  return lines.map(trimTerminalLine).slice(0, 18);
}

function tailTerminalLog(runLog: string, maxLines: number): string[] {
  const lines = runLog
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\t/g, "  "))
    .filter((line, index, allLines) => line.trim() || index > allLines.length - maxLines);

  return lines.slice(-maxLines);
}

function trimTerminalLine(line: string): string {
  return line.length > 170 ? `${line.slice(0, 167)}...` : line;
}

function terminalLineClass(line: string): string {
  if (line.startsWith("[ERR]") || line.startsWith("[ERROR]") || line.startsWith("[FAIL") || line.startsWith("[NEED]")) {
    return "text-red-100";
  }
  if (line.startsWith("[WARN]") || line.startsWith("[WARNING]") || line.startsWith("[ASK]") || line.startsWith("[REC]")) {
    return "text-amber-100";
  }
  if (line.startsWith("[SUCCESS]") || line.startsWith("[READY]") || line.includes("PASSED")) {
    return "text-blue-100";
  }
  if (line.startsWith("[ART]") || line.startsWith("[RUN]") || line.startsWith("[GIT]")) {
    return "text-slate-200";
  }
  return "";
}

function ttyLabel(room: Room): string {
  const hash = Array.from(room.id).reduce((total, char) => total + char.charCodeAt(0), 0);
  return `TTY-${String((hash % 89) + 1).padStart(2, "0")}`;
}

function slugForTerminal(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 18)
    .toUpperCase() || "ROOM";
}

function shortPath(path: string): string {
  const segments = path.split(/[\\/]/).filter(Boolean);
  if (segments.length <= 2) {
    return path || "/local/product";
  }
  return `/${segments.slice(-2).join("/")}`;
}

function PaneResizeHandle({
  label,
  onPointerDown,
  onReset
}: {
  label: string;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onReset: () => void;
}) {
  return (
    <div
      aria-label={label}
      className="group grid cursor-col-resize place-items-center rounded-md outline-none max-lg:hidden"
      role="separator"
      tabIndex={0}
      title={`${label}. Double click to reset.`}
      onPointerDown={onPointerDown}
      onDoubleClick={onReset}
    >
      <div className="grid h-24 w-2 place-items-center rounded-full bg-stone-900 text-stone-600 transition-colors group-hover:bg-emerald-400 group-hover:text-stone-950">
        <GripVertical size={14} />
      </div>
    </div>
  );
}

function FolderBrowserPanel({
  listing,
  status,
  selectedPath,
  onOpenPath,
  onSelectPath
}: {
  listing: LocalFolderListing | undefined;
  status: string;
  selectedPath: string;
  onOpenPath: (path: string | null) => void;
  onSelectPath: (path: string) => void;
}) {
  return (
    <section className="grid gap-2 rounded-lg border border-stone-800 bg-stone-950/70 p-2" aria-label="Local folder browser">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-extrabold uppercase text-stone-500">Pick folder</p>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" type="button" disabled={!listing?.parentPath} onClick={() => onOpenPath(listing?.parentPath ?? null)}>
            <ChevronLeft size={13} />
            Up
          </Button>
          <Button variant="outline" size="sm" type="button" onClick={() => onOpenPath(null)}>
            Root
          </Button>
        </div>
      </div>
      <p className="break-words rounded-md bg-stone-900 px-2 py-1.5 text-[11px] leading-4 text-stone-400">{listing?.currentPath ?? (status || "Loading folders...")}</p>
      {listing ? (
        <Button variant={selectedPath === listing.currentPath ? "default" : "outline"} size="sm" type="button" onClick={() => onSelectPath(listing.currentPath)}>
          <Folder size={13} />
          Use this folder
        </Button>
      ) : null}
      {status && listing ? <p className="text-xs leading-5 text-amber-200">{status}</p> : null}
      {listing ? (
        <div className="grid max-h-44 gap-1 overflow-auto pr-1">
          {listing.entries.length > 0 ? (
            listing.entries.map((entry) => (
              <button
                className={cn(
                  "flex min-h-8 items-center gap-2 rounded-md border px-2 text-left text-xs font-semibold transition-colors",
                  selectedPath === entry.path ? "border-emerald-400 bg-emerald-400 text-stone-950" : "border-stone-800 bg-stone-900/70 text-stone-200 hover:border-stone-700"
                )}
                type="button"
                key={entry.path}
                onClick={() => onOpenPath(entry.path)}
                onDoubleClick={() => onSelectPath(entry.path)}
              >
                <Folder size={13} />
                <span className="truncate">{entry.name}</span>
              </button>
            ))
          ) : (
            <p className="rounded-md border border-stone-800 px-2 py-2 text-xs text-stone-500">No child folders here.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}

function RoomDeck({
  rooms,
  workspace,
  selectedRoomId,
  scope,
  signalFilter,
  sortOrder,
  activeCount,
  totalCount,
  signalCounts,
  page,
  pageSize,
  onScopeChange,
  onSignalFilterChange,
  onSortOrderChange,
  onPageChange,
  onSelectRoom
}: {
  rooms: Room[];
  workspace: WorkspaceSeed;
  selectedRoomId: string;
  scope: RoomDeckScope;
  signalFilter: RoomSignalFilter;
  sortOrder: RoomSortOrder;
  activeCount: number;
  totalCount: number;
  signalCounts: Record<RoomSignalFilter, number>;
  page: number;
  pageSize: number;
  onScopeChange: (scope: RoomDeckScope) => void;
  onSignalFilterChange: (filter: RoomSignalFilter) => void;
  onSortOrderChange: (sortOrder: RoomSortOrder) => void;
  onPageChange: (page: number) => void;
  onSelectRoom: (roomId: string) => void;
}) {
  const pages = chunkArray(rooms, pageSize);
  const pageCount = Math.max(1, pages.length);
  const currentPage = Math.min(page, pageCount - 1);
  const canGoPrevious = currentPage > 0;
  const canGoNext = currentPage < pageCount - 1;

  return (
    <section className="grid gap-2" aria-label="Room deck">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase text-stone-500">Room deck</p>
          <p className="truncate text-sm text-stone-400">
            {rooms.length === 0 ? "No rooms for this view" : `${rooms.length} room${rooms.length === 1 ? "" : "s"} · page ${currentPage + 1} of ${pageCount}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <div className="mr-1 flex rounded-lg border border-stone-800 bg-stone-950 p-1" aria-label="Room deck scope">
            <button
              className={cn(
                "h-7 rounded-md px-2 text-[11px] font-bold transition-colors",
                scope === "active" ? "bg-stone-800 text-stone-100" : "text-stone-400 hover:bg-stone-900 hover:text-stone-100"
              )}
              type="button"
              aria-pressed={scope === "active"}
              onClick={() => onScopeChange("active")}
            >
              Active {activeCount}
            </button>
            <button
              className={cn(
                "h-7 rounded-md px-2 text-[11px] font-bold transition-colors",
                scope === "all" ? "bg-stone-800 text-stone-100" : "text-stone-400 hover:bg-stone-900 hover:text-stone-100"
              )}
              type="button"
              aria-pressed={scope === "all"}
              onClick={() => onScopeChange("all")}
            >
              All {totalCount}
            </button>
          </div>
          <Button
            aria-label="Previous room page"
            disabled={!canGoPrevious}
            size="icon"
            type="button"
            variant="outline"
            onClick={() => onPageChange(Math.max(0, currentPage - 1))}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            aria-label="Next room page"
            disabled={!canGoNext}
            size="icon"
            type="button"
            variant="outline"
            onClick={() => onPageChange(Math.min(pageCount - 1, currentPage + 1))}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      <details className="rounded-xl border border-stone-800 bg-stone-950/60 p-2">
        <summary className="cursor-pointer list-none text-[11px] font-extrabold uppercase text-stone-500">View options</summary>
        <div className="mt-2 grid gap-2">
          <div className="flex flex-wrap gap-1.5" aria-label="Room signal filter">
            {roomSignalFilters.map((filter) => (
              <button
                className={cn(
                  "h-7 rounded-md border px-2 text-[11px] font-bold transition-colors",
                  signalFilter === filter.id
                    ? "border-emerald-500/60 bg-stone-900 text-stone-100"
                    : "border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700 hover:text-stone-100"
                )}
                type="button"
                key={filter.id}
                aria-pressed={signalFilter === filter.id}
                onClick={() => onSignalFilterChange(filter.id)}
              >
                {filter.label} {signalCounts[filter.id]}
              </button>
            ))}
          </div>
          <label className="flex items-center justify-between gap-3 text-[11px] font-extrabold uppercase text-stone-500">
            Sort
            <select
              className="h-8 min-w-40 rounded-md border border-stone-800 bg-stone-950 px-2 text-xs font-bold normal-case text-stone-200 outline-none focus:border-emerald-400"
              value={sortOrder}
              onChange={(event) => onSortOrderChange(event.target.value as RoomSortOrder)}
            >
              {Object.entries(roomSortLabels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </details>

      {rooms.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-stone-800 bg-stone-950/60 p-2">
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{
              transform: `translateX(-${currentPage * 100}%)`
            }}
          >
            {pages.map((roomPage, pageIndex) => (
              <div className="grid min-w-full grid-cols-[repeat(auto-fill,minmax(245px,1fr))] gap-3 pr-1" key={pageIndex}>
                {roomPage.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    workspace={workspace}
                    selected={selectedRoomId === room.id}
                    onSelect={() => onSelectRoom(room.id)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-stone-800 bg-stone-950/60 px-3 py-3 text-sm text-stone-500">
          {totalCount > 0 && scope === "active" ? "No active rooms in this view. Switch to All to inspect completed rooms." : "No task rooms match this project filter yet."}
        </p>
      )}
    </section>
  );
}

function buildRoomSignalCounts(rooms: Room[]): Record<RoomSignalFilter, number> {
  return {
    all: rooms.length,
    needs: rooms.filter((room) => roomMatchesSignalFilter(room, "needs")).length,
    working: rooms.filter((room) => roomMatchesSignalFilter(room, "working")).length,
    ready: rooms.filter((room) => roomMatchesSignalFilter(room, "ready")).length,
    failed: rooms.filter((room) => roomMatchesSignalFilter(room, "failed")).length,
    blocked: rooms.filter((room) => roomMatchesSignalFilter(room, "blocked")).length,
    idle: rooms.filter((room) => roomMatchesSignalFilter(room, "idle")).length
  };
}

function organizeRooms(rooms: Room[], signalFilter: RoomSignalFilter, sortOrder: RoomSortOrder, productById: ReadonlyMap<string, Product>): Room[] {
  return rooms
    .filter((room) => roomMatchesSignalFilter(room, signalFilter))
    .sort((a, b) => compareRooms(a, b, sortOrder, productById));
}

function roomMatchesSignalFilter(room: Room, signalFilter: RoomSignalFilter): boolean {
  if (signalFilter === "all") {
    return true;
  }

  if (signalFilter === "needs") {
    return roomNeedsFounder(room);
  }

  if (signalFilter === "failed") {
    return room.status === "failed" || getBlockingArtifacts(room).length > 0;
  }

  if (signalFilter === "ready") {
    return room.status === "ready" || room.artifacts.some((artifact) => artifact.status === "ready" || artifact.status === "passed");
  }

  if (signalFilter === "idle") {
    return room.status === "idle" || room.status === "done";
  }

  return room.status === signalFilter;
}

function roomNeedsFounder(room: Room): boolean {
  return room.status === "asking" || room.status === "ready" || room.status === "blocked" || room.status === "failed" || room.asks.length > 0 || getBlockingArtifacts(room).length > 0;
}

function compareRooms(a: Room, b: Room, sortOrder: RoomSortOrder, productById: ReadonlyMap<string, Product>): number {
  if (sortOrder === "recent") {
    return compareRoomActivityDesc(a, b) || compareRoomTitleAsc(a, b);
  }

  if (sortOrder === "project") {
    return compareProductNameAsc(a, b, productById) || compareRoomPriority(a, b) || compareRoomActivityDesc(a, b);
  }

  return compareRoomPriority(a, b) || compareRoomActivityDesc(a, b) || compareProductNameAsc(a, b, productById);
}

function compareRoomPriority(a: Room, b: Room): number {
  return roomPriorityRank(a) - roomPriorityRank(b);
}

function roomPriorityRank(room: Room): number {
  if (room.status === "asking" || room.asks.length > 0) {
    return 0;
  }

  if (room.status === "failed" || getBlockingArtifacts(room).length > 0) {
    return 1;
  }

  if (room.status === "blocked") {
    return 2;
  }

  if (room.status === "ready" || room.artifacts.some((artifact) => artifact.status === "ready" || artifact.status === "passed")) {
    return 3;
  }

  if (room.status === "working") {
    return 4;
  }

  return 5;
}

function compareRoomActivityDesc(a: Room, b: Room): number {
  return roomActivitySortValue(b) - roomActivitySortValue(a);
}

function roomActivitySortValue(room: Room): number {
  const parsed = Date.parse(room.lastActivityAt);
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(room.lastActivityAt);
  if (timeMatch) {
    return Number(timeMatch[1]) * 60 + Number(timeMatch[2]);
  }

  return 0;
}

function compareProductNameAsc(a: Room, b: Room, productById: ReadonlyMap<string, Product>): number {
  const productNameA = productById.get(a.productId)?.name ?? "";
  const productNameB = productById.get(b.productId)?.name ?? "";
  return productNameA.localeCompare(productNameB) || compareRoomTitleAsc(a, b);
}

function compareRoomTitleAsc(a: Room, b: Room): number {
  return a.title.localeCompare(b.title);
}

function selectCommandCenterRooms(workspace: WorkspaceSeed, rooms: Room[], selectedProductId: string, decisionItems: DecisionItem[]): CommandCenterRoomSet {
  const scopedDecisionItems = decisionItems
    .filter((item) => selectedProductId === "all" || item.productId === selectedProductId)
    .sort((a, b) => b.urgency - a.urgency);
  const interventionItem = scopedDecisionItems[0];
  const interventionRoom =
    (interventionItem ? workspace.rooms.find((room) => room.id === interventionItem.roomId) : undefined) ??
    rooms.find((room) => room.status === "asking" || room.status === "blocked" || room.status === "failed" || room.status === "ready");

  const sortedRooms = [...rooms]
    .filter((room) => room.status !== "done")
    .sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status) || compareRoomActivityDesc(a, b));
  const primaryRoom = sortedRooms.find((room) => room.status === "working") ?? sortedRooms.find((room) => room.status === "ready") ?? sortedRooms[0];
  const smallRooms = sortedRooms.filter((room) => room.id !== primaryRoom?.id && room.id !== interventionRoom?.id).slice(0, 2);
  const fallbackRooms = workspace.rooms
    .filter((room) => room.id !== primaryRoom?.id && room.id !== interventionRoom?.id && !smallRooms.some((item) => item.id === room.id))
    .slice(0, Math.max(0, 2 - smallRooms.length));

  return {
    primaryRoom,
    secondaryRooms: [...smallRooms, ...fallbackRooms].slice(0, 2),
    interventionRoom,
    interventionItem
  };
}

function uniqueNonNullableRoomIds(roomIds: Array<string | undefined>): string[] {
  return Array.from(new Set(roomIds.filter((roomId): roomId is string => Boolean(roomId))));
}

function folderNameToProductName(path: string): string {
  const folderName = path.split(/[\\/]/).filter(Boolean).at(-1) ?? "Local project";
  return folderName
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function buildCheckGateOptions(productInspection: ProductFolderInspection | undefined): CheckScriptKey[] {
  const detected = productInspection?.scripts
    .filter((script) => script.gate)
    .map((script) => script.name)
    .filter((name): name is CheckScriptKey => checkScriptKeys.includes(name as CheckScriptKey)) ?? [];

  return checkScriptKeys.filter((key) => detected.includes(key));
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function readStoredPaneLayout(): PaneLayout {
  if (typeof window === "undefined") {
    return defaultPaneLayout;
  }

  const stored = window.localStorage.getItem(paneLayoutStorageKey);
  if (!stored) {
    return defaultPaneLayout;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<PaneLayout>;
    return clampPaneLayout({
      fleet: typeof parsed.fleet === "number" ? parsed.fleet : defaultPaneLayout.fleet,
      rooms: typeof parsed.rooms === "number" ? parsed.rooms : defaultPaneLayout.rooms
    });
  } catch {
    return defaultPaneLayout;
  }
}

function readStoredTerminalDrawerLayouts(): TerminalDrawerLayouts {
  if (typeof window === "undefined") {
    return {};
  }

  const stored = window.localStorage.getItem(terminalDrawerLayoutStorageKey);
  if (!stored) {
    return {};
  }

  try {
    const parsed = JSON.parse(stored) as Record<string, Partial<TerminalDrawerLayout>>;
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([roomId]) => roomId.trim().length > 0)
        .map(([roomId, layout]) => [
          roomId,
          clampTerminalDrawerLayout({
            cols: typeof layout.cols === "number" ? layout.cols : 4,
            rows: typeof layout.rows === "number" ? layout.rows : 4
          })
        ])
    );
  } catch {
    return {};
  }
}

function clampPaneLayout(layout: PaneLayout): PaneLayout {
  return {
    fleet: clampNumber(layout.fleet, 220, 360),
    rooms: clampNumber(layout.rooms, 420, 760)
  };
}

function defaultTerminalDrawerLayout(role: TerminalDrawerRole, room: Room): TerminalDrawerLayout {
  if (role === "primary") {
    return { cols: 8, rows: 5 };
  }

  if (role === "intervention" || room.status === "asking" || room.status === "blocked" || room.status === "failed" || room.status === "ready") {
    return { cols: 4, rows: 5 };
  }

  return { cols: 4, rows: 4 };
}

function clampTerminalDrawerLayout(layout: TerminalDrawerLayout): TerminalDrawerLayout {
  return {
    cols: clampNumber(Math.round(layout.cols), 3, terminalGridColumns),
    rows: clampNumber(Math.round(layout.rows), 3, 10)
  };
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function NeedsMePanel({
  items,
  workspace,
  onOpenRoom
}: {
  items: DecisionItem[];
  workspace: WorkspaceSeed;
  onOpenRoom: (item: DecisionItem) => void;
}) {
  return (
    <section className="mb-4 rounded-xl border border-stone-800 bg-stone-900/70 p-3 shadow-sm" aria-label="Needs Me">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Inbox size={17} />
          <div>
            <p className="text-[11px] font-extrabold uppercase text-stone-500">Needs Me</p>
            <h3 className="text-base font-bold tracking-normal">{items.length} founder decision{items.length === 1 ? "" : "s"}</h3>
          </div>
        </div>
        <Badge variant={items.length > 0 ? "amber" : "secondary"}>{items.length > 0 ? "Review queue" : "Quiet"}</Badge>
      </div>

      {items.length > 0 ? (
        <div className="grid gap-2">
          {items.slice(0, 2).map((item) => {
            const product = workspace.products.find((entry) => entry.id === item.productId);
            const tone = item.risk === "high" ? "red" : item.risk === "medium" ? "amber" : "green";

            return (
              <article className="grid gap-2 rounded-lg border border-stone-800 bg-stone-950/70 p-3 text-left" key={item.id}>
                <div className="flex items-center gap-2 text-xs font-extrabold text-stone-500">
                  <span className={cn("h-2.5 w-2.5 rounded-full", statusDot[item.status])} />
                  <span>{product?.name ?? "Unknown project"}</span>
                  <Badge variant={tone} className="ml-auto">{item.risk}</Badge>
                </div>
                <strong className="text-sm leading-5 text-stone-100">{item.title}</strong>
                <p className="line-clamp-2 text-xs leading-5 text-stone-400">{item.reason}</p>
                <div className="mt-auto flex flex-wrap items-center gap-1.5">
                  <Badge variant={statusTone[item.status]}>{statusLabels[item.status]}</Badge>
                  <button
                    type="button"
                    className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-bold text-stone-300 hover:bg-stone-900 hover:text-stone-100"
                    onClick={() => onOpenRoom(item)}
                  >
                    Open <ArrowRight size={13} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="rounded-lg border border-stone-800 bg-stone-950/70 px-3 py-2 text-sm text-stone-500">No room currently has an ask, failed run, blocker, or ready review.</p>
      )}
    </section>
  );
}

const overviewPanelLabels: Record<OverviewPanel, string> = {
  needs: "Needs Me",
  fm: "Elf FM",
  backlog: "Backlog",
  brief: "Brief"
};

function OverviewSwitcher({
  activePanel,
  counts,
  onSelectPanel
}: {
  activePanel: OverviewPanel;
  counts: Record<OverviewPanel, number>;
  onSelectPanel: (panel: OverviewPanel) => void;
}) {
  const panels: OverviewPanel[] = ["needs", "fm", "backlog", "brief"];

  return (
    <section className="mb-3 rounded-xl border border-stone-800 bg-stone-900/70 p-2" aria-label="Cockpit overview">
      <div className="grid grid-cols-4 gap-1.5">
        {panels.map((panel) => (
          <button
            className={cn(
              "grid min-h-12 gap-1 rounded-lg border px-2 py-1.5 text-left transition-colors",
              activePanel === panel ? "border-emerald-500/70 bg-stone-900 text-stone-100" : "border-stone-800 bg-stone-950/70 text-stone-400 hover:border-stone-700 hover:text-stone-100"
            )}
            type="button"
            key={panel}
            aria-pressed={activePanel === panel}
            onClick={() => onSelectPanel(panel)}
          >
            <span className="truncate text-[11px] font-extrabold uppercase">{overviewPanelLabels[panel]}</span>
            <span className="text-lg font-black leading-5">{counts[panel]}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ElfFMPanel({
  feed,
  selectedProductId,
  onOpenRoom
}: {
  feed: ElfFmFeed;
  selectedProductId: string;
  onOpenRoom: (roomId: string, productId: string) => void;
}) {
  const stations = feed.stations.filter((station) => selectedProductId === "all" || station.productId === selectedProductId);
  const transcript = feed.transcript.filter((item) => selectedProductId === "all" || item.productId === selectedProductId);
  const headline = selectedProductId === "all" ? feed.globalStation.nowPlaying : stations[0]?.nowPlaying ?? "No room is broadcasting for this project.";

  return (
    <section className="mb-4 rounded-xl border border-stone-800 bg-stone-950 p-3 text-stone-50 shadow-sm" aria-label="Elf FM">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Radio size={18} />
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase text-stone-400">Elf FM</p>
            <h3 className="truncate text-base font-bold tracking-normal">{headline}</h3>
          </div>
        </div>
        <Badge variant={feed.totals.stuck > 0 ? "red" : feed.totals.asking > 0 ? "amber" : feed.totals.ready > 0 ? "blue" : "green"}>
          {feed.totals.live} live
        </Badge>
      </div>

      <div className="mb-3 grid grid-cols-4 gap-2">
        <FmMetric label="Asks" value={feed.totals.asking} />
        <FmMetric label="Ready" value={feed.totals.ready} />
        <FmMetric label="Stuck" value={feed.totals.stuck} />
        <FmMetric label="Signals" value={feed.globalStation.evidenceCount} />
      </div>

      <div className="mb-3 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2">
        {(selectedProductId === "all" ? [feed.globalStation, ...stations.slice(0, 3)] : stations.slice(0, 4)).map((station) => (
          <FmStationButton station={station} key={station.id} onOpenRoom={onOpenRoom} />
        ))}
      </div>

      <div className="grid gap-1.5" aria-label="Elf FM transcript">
        {transcript.slice(0, 5).map((item) => (
          <button
            className="grid gap-1 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-2 text-left hover:bg-white/[0.1]"
            type="button"
            key={item.id}
            onClick={() => onOpenRoom(item.roomId, item.productId)}
          >
            <span className="flex items-center gap-2 text-[11px] font-extrabold uppercase text-stone-400">
              <Badge variant={fmTone[item.tone]}>{item.source}</Badge>
              <span className="truncate">{item.productName}</span>
              <span className="ml-auto normal-case text-stone-500">{item.time}</span>
            </span>
            <span className="text-sm font-bold text-stone-100">{item.title}</span>
            <span className="line-clamp-2 text-xs leading-5 text-stone-300">{item.body}</span>
          </button>
        ))}
        {transcript.length === 0 ? (
          <p className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-stone-400">No artifact-backed broadcast items for this project yet.</p>
        ) : null}
      </div>
    </section>
  );
}

function TaskBacklogPanel({
  product,
  tasks,
  closedTaskCount,
  workspace,
  draft,
  assignment,
  onDraftChange,
  onAssignmentChange,
  onCreateTask,
  onAssignTask,
  onUpdateTaskStatus
}: {
  product?: Product;
  tasks: Task[];
  closedTaskCount: number;
  workspace: WorkspaceSeed;
  draft: TaskDraft;
  assignment: BacklogAssignment;
  onDraftChange: (draft: TaskDraft) => void;
  onAssignmentChange: (assignment: BacklogAssignment) => void;
  onCreateTask: () => void;
  onAssignTask: (taskId: string) => void;
  onUpdateTaskStatus: (taskId: string, status: Task["status"]) => void;
}) {
  return (
    <section className="mb-4 rounded-xl border border-stone-800 bg-stone-900/70 p-3 shadow-sm" aria-label="Task Backlog">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <ClipboardCheck size={17} />
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase text-stone-500">Task Backlog</p>
            <h3 className="truncate text-base font-bold tracking-normal">{product ? product.name : "Select a product"}</h3>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {closedTaskCount > 0 ? <Badge variant="secondary">{closedTaskCount} closed</Badge> : null}
          <Badge variant={tasks.length > 0 ? "blue" : "secondary"}>{tasks.length} open</Badge>
        </div>
      </div>

      <div className="grid gap-2">
        <input
          className="h-9 rounded-md border border-stone-700 bg-stone-950 px-2 text-sm text-stone-100 placeholder:text-stone-500"
          value={draft.title}
          onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
          placeholder={product ? `Task for ${product.name}` : "Select a product first"}
          disabled={!product}
        />
        <Textarea
          className="min-h-16"
          value={draft.acceptanceCriteria}
          onChange={(event) => onDraftChange({ ...draft, acceptanceCriteria: event.target.value })}
          placeholder={"Acceptance criteria\nOne per line"}
          rows={2}
          disabled={!product}
        />
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <select
            className="h-9 rounded-md border border-stone-700 bg-stone-950 px-2 text-sm text-stone-100"
            value={draft.priority}
            onChange={(event) => onDraftChange({ ...draft, priority: event.target.value as Task["priority"] })}
            disabled={!product}
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            className="h-9 rounded-md border border-stone-700 bg-stone-950 px-2 text-sm text-stone-100"
            value={assignment.assignedElfId}
            onChange={(event) => onAssignmentChange({ ...assignment, assignedElfId: event.target.value })}
          >
            {workspace.elves.map((elf) => (
              <option key={elf.id} value={elf.id}>
                {elf.name}
              </option>
            ))}
          </select>
          <Button size="sm" type="button" onClick={onCreateTask} disabled={!product || !draft.title.trim()}>
            Add
          </Button>
        </div>
        <select
          className="h-9 rounded-md border border-stone-700 bg-stone-950 px-2 text-sm text-stone-100"
          value={assignment.playbookId}
          onChange={(event) => onAssignmentChange({ ...assignment, playbookId: event.target.value })}
        >
          {workspace.playbooks.map((playbook) => (
            <option key={playbook.id} value={playbook.id}>
              {playbook.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 grid gap-2">
        {tasks.slice(0, 5).map((task) => (
          <article className="grid gap-2 rounded-lg border border-stone-800 bg-stone-950/70 p-2.5" key={task.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-stone-100">{task.title}</p>
                <p className="mt-1 text-xs text-stone-500">{task.acceptanceCriteria.length} criteria · {task.priority}</p>
              </div>
              <Badge variant={taskStatusTone[task.status]}>{task.status}</Badge>
            </div>
            {task.acceptanceCriteria[0] ? <p className="line-clamp-2 text-xs leading-5 text-stone-400">{task.acceptanceCriteria[0]}</p> : null}
            <div className="flex flex-wrap gap-1.5 border-t border-stone-800 pt-2">
              {task.status === "inbox" ? (
                <Button className="h-7 px-2 text-[11px]" size="sm" variant="outline" type="button" onClick={() => onUpdateTaskStatus(task.id, "ready")}>
                  Ready
                </Button>
              ) : null}
              <Button className="h-7 px-2 text-[11px]" size="sm" type="button" onClick={() => onAssignTask(task.id)}>
                Assign
              </Button>
              <Button className="h-7 px-2 text-[11px]" size="sm" variant="outline" type="button" onClick={() => onUpdateTaskStatus(task.id, "done")}>
                Done
              </Button>
              <Button className="h-7 px-2 text-[11px]" size="sm" variant="outline" type="button" onClick={() => onUpdateTaskStatus(task.id, "killed")}>
                Kill
              </Button>
            </div>
          </article>
        ))}
        {tasks.length === 0 ? <p className="rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-2 text-sm text-stone-500">No unassigned tasks for this product.</p> : null}
        {tasks.length > 5 ? <p className="text-xs font-semibold text-stone-500">{tasks.length - 5} more backlog tasks hidden in this compact view.</p> : null}
      </div>
    </section>
  );
}

function FmMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.06] px-2 py-1.5">
      <p className="text-[10px] font-extrabold uppercase text-stone-500">{label}</p>
      <p className="text-lg font-black leading-6 text-stone-50">{value}</p>
    </div>
  );
}

function FmStationButton({ station, onOpenRoom }: { station: ElfFmStation; onOpenRoom: (roomId: string, productId: string) => void }) {
  const canOpen = Boolean(station.roomId && station.productId);

  return (
    <button
      className={cn(
        "grid min-h-[104px] gap-2 rounded-lg border border-white/10 bg-white/[0.08] p-3 text-left transition-colors",
        canOpen ? "hover:bg-white/[0.12]" : "cursor-default"
      )}
      type="button"
      disabled={!canOpen}
      onClick={() => {
        if (station.roomId && station.productId) {
          onOpenRoom(station.roomId, station.productId);
        }
      }}
    >
      <span className="flex items-center gap-2">
        <span className={cn("h-2.5 w-2.5 rounded-full", statusDot[station.signal])} />
        <span className="truncate text-xs font-extrabold uppercase text-stone-400">{station.title}</span>
        <Badge className="ml-auto" variant={statusTone[station.signal]}>{statusLabels[station.signal]}</Badge>
      </span>
      <span className="line-clamp-2 text-sm font-bold leading-5 text-stone-50">{station.nowPlaying}</span>
      <span className="line-clamp-1 text-xs text-stone-400">{station.subtitle}</span>
    </button>
  );
}

const briefSectionLabels: Record<DailyBriefSection, string> = {
  shipped: "Shipped",
  ready: "Ready",
  blocked: "Blocked",
  failed: "Failed",
  active: "Active"
};

function DailyBriefPanel({
  brief,
  selectedProductId,
  markdownPreview,
  exportStatus,
  snapshotStatus,
  onExportMarkdown,
  onSaveSnapshot,
  onOpenLatestSnapshot,
  onOpenRoom
}: {
  brief: DailyBrief;
  selectedProductId: string;
  markdownPreview: string;
  exportStatus: string;
  snapshotStatus: string;
  onExportMarkdown: () => void;
  onSaveSnapshot: () => void;
  onOpenLatestSnapshot: () => void;
  onOpenRoom: (item: DailyBriefItem) => void;
}) {
  const sections: DailyBriefSection[] = ["shipped", "ready", "blocked", "failed", "active"];
  const visibleSections = sections.map((section) => ({
    section,
    items: brief.sections[section].filter((item) => selectedProductId === "all" || item.productId === selectedProductId)
  }));
  const visibleRecommendations = brief.recommendedNext.filter((item) => selectedProductId === "all" || item.productId === selectedProductId);
  const itemCount = visibleSections.reduce((sum, section) => sum + section.items.length, 0);

  return (
    <section className="mb-4 rounded-xl border border-stone-800 bg-stone-900/70 p-3 shadow-sm" aria-label="Daily Brief">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <CalendarDays size={17} />
          <div>
            <p className="text-[11px] font-extrabold uppercase text-stone-500">Daily Brief</p>
            <h3 className="text-base font-bold tracking-normal">{itemCount} artifact-backed update{itemCount === 1 ? "" : "s"}</h3>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" type="button" onClick={onExportMarkdown}>
            <FileText size={14} />
            Brief
          </Button>
          <Button variant="outline" size="sm" type="button" onClick={onSaveSnapshot}>
            <CheckCircle2 size={14} />
            Save
          </Button>
          <Button variant="outline" size="sm" type="button" onClick={onOpenLatestSnapshot}>
            <ScrollText size={14} />
            Latest
          </Button>
          <Badge variant={visibleRecommendations.length > 0 ? "blue" : "secondary"}>
            {visibleRecommendations.length > 0 ? `${visibleRecommendations.length} next` : "No asks"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-2">
        {visibleRecommendations.length > 0 ? (
          <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 p-2">
            <p className="mb-1 text-[11px] font-extrabold uppercase text-sky-200">Recommended next</p>
            <div className="grid gap-1">
              {visibleRecommendations.slice(0, 3).map((item) => (
                <button
                  className="grid gap-1 rounded-md border border-stone-800 bg-stone-950/70 px-2 py-1.5 text-left text-xs text-stone-200 hover:border-stone-700"
                  type="button"
                  key={item.id}
                  onClick={() =>
                    onOpenRoom({
                      id: item.id,
                      roomId: item.roomId,
                      productId: item.productId,
                      productName: item.productName,
                      title: item.title,
                      summary: item.recommendation,
                      status: "asking",
                      evidence: [item.recommendation]
                    })
                  }
                >
                  <span className="font-bold">{item.productName}: {item.title}</span>
                  <span className="line-clamp-2 text-stone-400">{item.recommendation}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2">
          {visibleSections.map(({ section, items }) => (
            <div className="rounded-lg border border-stone-800 bg-stone-950/70 p-2" key={section}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-[11px] font-extrabold uppercase text-stone-500">{briefSectionLabels[section]}</p>
                <Badge variant={items.length > 0 ? statusTone[items[0].status] : "secondary"}>{items.length}</Badge>
              </div>
              <div className="grid gap-1">
                {items.slice(0, 2).map((item) => (
                  <button
                    className="rounded-md border border-stone-800 bg-stone-900/80 px-2 py-1.5 text-left text-xs hover:border-stone-700"
                    type="button"
                    key={item.id}
                    onClick={() => onOpenRoom(item)}
                  >
                    <span className="block truncate font-bold">{item.productName}</span>
                    <span className="line-clamp-2 leading-4 text-stone-400">{item.title}</span>
                  </button>
                ))}
                {items.length === 0 ? <p className="px-1 py-1 text-xs text-stone-400">None</p> : null}
              </div>
            </div>
          ))}
        </div>
        {exportStatus ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-xs font-semibold text-emerald-200">
            {exportStatus}
          </div>
        ) : null}
        {snapshotStatus ? (
          <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2 py-1.5 text-xs font-semibold text-sky-200">
            {snapshotStatus}
          </div>
        ) : null}
        {markdownPreview ? (
          <pre className="max-h-72 overflow-auto rounded-lg bg-stone-950 p-3 text-xs leading-5 text-stone-100" aria-label="Daily Brief Markdown">
            <code>{markdownPreview}</code>
          </pre>
        ) : null}
      </div>
    </section>
  );
}

function buildProductPulseRows(workspace: WorkspaceSeed): ProductPulseRow[] {
  return workspace.products.map((product) => {
    const rooms = workspace.rooms.filter((room) => room.productId === product.id);
    const needsRooms = rooms.filter((room) => room.status === "asking" || room.status === "ready" || room.status === "blocked" || room.status === "failed");
    const signalRoom = statusOrder.map((status) => rooms.find((room) => room.status === status)).find((room): room is Room => Boolean(room));
    const signal = signalRoom?.status ?? "idle";

    return {
      product,
      signal,
      needsCount: needsRooms.length
    };
  });
}

function FleetPulsePanel({
  rows,
  selectedProductId,
  onSelectProduct
}: {
  rows: ProductPulseRow[];
  selectedProductId: string;
  onSelectProduct: (productId: string) => void;
}) {
  return (
    <section className="mt-3 rounded-xl border border-stone-800 bg-stone-900/50 p-3" aria-label="Fleet Pulse">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-extrabold uppercase text-stone-500">Fleet Pulse</p>
          <h2 className="text-sm font-bold text-stone-100">Projects</h2>
        </div>
        <Badge variant="secondary">{rows.length}</Badge>
      </div>
      <div className="grid gap-1">
        {rows.map((row) => (
          <button
            className={cn(
              "flex min-h-10 items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors hover:border-stone-700 hover:bg-stone-950/70",
              selectedProductId === row.product.id ? "border-emerald-500/40 bg-stone-950/80" : "border-transparent"
            )}
            type="button"
            key={row.product.id}
            onClick={() => onSelectProduct(row.product.id)}
          >
            <span className={cn("size-2 shrink-0 rounded-full", statusDot[row.signal])} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-extrabold text-stone-100">{row.product.name}</span>
              <span className="block text-[10px] font-bold uppercase text-stone-500">{statusLabels[row.signal]}</span>
            </span>
            {row.needsCount > 0 ? <Badge variant={statusTone[row.signal]}>{row.needsCount}</Badge> : null}
          </button>
        ))}
      </div>
    </section>
  );
}

function ProjectButton({
  selected,
  title,
  meta,
  count,
  onClick
}: {
  selected: boolean;
  title: string;
  meta?: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-3 text-left transition-colors hover:border-stone-800 hover:bg-stone-900/60",
        selected && "border-emerald-500/50 bg-stone-900/80"
      )}
      type="button"
      onClick={onClick}
    >
      <span className="min-w-0">
        <span className="block overflow-wrap-anywhere font-bold">{title}</span>
        {meta ? <small className="mt-1 block text-xs text-stone-500">{meta}</small> : null}
      </span>
      <span className="grid h-8 min-w-8 place-items-center rounded-md bg-stone-900 px-2 text-sm font-bold text-stone-300">{count}</span>
    </button>
  );
}

function ProductFolderCard({
  product,
  inspection,
  settingsStatus,
  onSaveSettings,
  onRemove
}: {
  product: Product;
  inspection?: ProductFolderInspection;
  settingsStatus?: string;
  onSaveSettings?: (input: Pick<Product, "status" | "priority" | "currentGoal">) => void;
  onRemove?: () => void;
}) {
  const healthy = inspection?.exists && inspection.isDirectory && inspection.isGitRepo;
  const gateScripts = inspection?.scripts.filter((script) => script.gate).slice(0, 4) ?? [];
  const [settingsDraft, setSettingsDraft] = useState({
    status: product.status,
    priority: product.priority,
    currentGoal: product.currentGoal
  });

  useEffect(() => {
    setSettingsDraft({
      status: product.status,
      priority: product.priority,
      currentGoal: product.currentGoal
    });
  }, [product.currentGoal, product.id, product.priority, product.status]);

  return (
    <section className="mt-3 rounded-lg border border-stone-800 bg-stone-900/70 p-3" aria-label="Product folder health">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Folder size={15} className="shrink-0 text-stone-400" />
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase text-stone-500">Folder</p>
            <p className="truncate text-xs font-bold text-stone-200">{product.name}</p>
          </div>
        </div>
        <Badge variant={!inspection ? "secondary" : healthy ? "green" : "amber"}>{!inspection ? "Checking" : healthy ? "Ready" : "Needs check"}</Badge>
      </div>
      <p className="break-words rounded-md bg-stone-950 px-2 py-1.5 text-[11px] leading-4 text-stone-400">{inspection?.resolvedPath ?? product.localPath}</p>
      {inspection ? (
        <details className="mt-2 rounded-md border border-stone-800 bg-stone-950/50 p-2">
          <summary className="cursor-pointer list-none text-[11px] font-extrabold uppercase text-stone-500">Folder details</summary>
          <div className="mt-2 grid gap-2">
          <div className="grid grid-cols-3 gap-1.5">
            <FolderSignal label="Path" ok={inspection.exists && inspection.isDirectory} />
            <FolderSignal label="Git" ok={inspection.isGitRepo} />
            <FolderSignal label={inspection.packageManager === "unknown" ? "Pkg" : inspection.packageManager} ok={inspection.packageJsonExists} />
          </div>
          {gateScripts.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {gateScripts.map((script) => (
                <Badge variant="outline" key={script.name}>{script.name}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-stone-500">No check/typecheck/test/build script detected.</p>
          )}
          {inspection.warnings.length > 0 ? (
            <p className="text-xs leading-5 text-amber-300">{inspection.warnings[0]}</p>
          ) : null}
          </div>
        </details>
      ) : null}
      {onSaveSettings ? (
        <details className="mt-2 rounded-md border border-stone-800 bg-stone-950/50 p-2">
          <summary className="cursor-pointer list-none text-[11px] font-extrabold uppercase text-stone-500">Product settings</summary>
        <div className="mt-2 grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-[11px] font-bold uppercase text-stone-500">
              Status
              <select
                className="h-8 rounded-md border border-stone-700 bg-stone-950 px-2 text-xs normal-case text-stone-100"
                value={settingsDraft.status}
                onChange={(event) => setSettingsDraft((current) => ({ ...current, status: event.target.value as Product["status"] }))}
              >
                {productStatuses.map((status) => (
                  <option value={status} key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-[11px] font-bold uppercase text-stone-500">
              Priority
              <select
                className="h-8 rounded-md border border-stone-700 bg-stone-950 px-2 text-xs normal-case text-stone-100"
                value={settingsDraft.priority}
                onChange={(event) => setSettingsDraft((current) => ({ ...current, priority: event.target.value as Product["priority"] }))}
              >
                {productPriorities.map((priority) => (
                  <option value={priority} key={priority}>{priority}</option>
                ))}
              </select>
            </label>
          </div>
          <Textarea
            className="min-h-16"
            value={settingsDraft.currentGoal}
            onChange={(event) => setSettingsDraft((current) => ({ ...current, currentGoal: event.target.value }))}
            rows={2}
            placeholder="Current goal"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-stone-500">{settingsStatus ?? "Local product settings."}</span>
            <div className="flex shrink-0 items-center gap-2">
              {onRemove ? (
                <Button size="sm" variant="destructive" type="button" onClick={onRemove}>
                  Remove
                </Button>
              ) : null}
              <Button size="sm" type="button" onClick={() => onSaveSettings(settingsDraft)}>
                Save
              </Button>
            </div>
          </div>
        </div>
        </details>
      ) : null}
    </section>
  );
}

function FolderSignal({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={cn("rounded-md border px-2 py-1 text-center text-[11px] font-bold", ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-amber-500/30 bg-amber-500/10 text-amber-200")}>
      {label}
    </div>
  );
}

function StatusPill({ status, count, label }: { status: RoomStatus; count: number; label?: string }) {
  return (
    <div className="flex justify-between rounded-lg border border-stone-800 bg-stone-950/70 px-3 py-2 text-sm text-stone-300">
      <span className="flex items-center gap-2">
        <span className={cn("h-2.5 w-2.5 rounded-full", statusDot[status])} />
        {label ?? statusLabels[status]}
      </span>
      <strong>{count}</strong>
    </div>
  );
}

function RoomCard({ room, workspace, selected, onSelect }: { room: Room; workspace: WorkspaceSeed; selected: boolean; onSelect: () => void }) {
  const product = roomProduct(workspace, room);
  const elf = roomElf(workspace, room);
  const openAsks = room.asks.length;
  const readyArtifacts = room.artifacts.filter((artifact) => artifact.status === "ready" || artifact.status === "passed").length;
  const signalCount = openAsks + readyArtifacts;

  return (
    <button
      type="button"
      className={cn(
        "grid min-h-20 gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors hover:border-stone-700 hover:bg-stone-900/70",
        selected ? "border-emerald-500/45 bg-stone-900/85" : "border-stone-800 bg-stone-950/55"
      )}
      onClick={onSelect}
    >
      <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-stone-500">
        <span className={cn("size-2 shrink-0 rounded-full", statusDot[room.status])} />
        <span className="truncate uppercase">{statusLabels[room.status]}</span>
        <span className="ml-auto shrink-0">{room.lastActivityAt}</span>
      </span>
      <span className="line-clamp-1 text-sm font-extrabold leading-5 text-stone-100">{room.title}</span>
      <span className="flex min-w-0 items-center gap-2 text-[11px] font-semibold text-stone-500">
        <span className="truncate">{product.name}</span>
        <span className="text-stone-700">/</span>
        <span className="truncate">{elf.name}</span>
        {signalCount > 0 ? <Badge className="ml-auto shrink-0" variant={openAsks > 0 ? "amber" : "blue"}>{signalCount}</Badge> : null}
      </span>
    </button>
  );
}

function RoomDetail({
  room,
  workspace,
  runs,
  promptPreview,
  runLogPreview,
  diffPreview,
  checkPreview,
  codevetterPreview,
  cleanupPreview,
  applyPreview,
  transcriptPreview,
  decisionPreview,
  productMemory,
  productInspection,
  selectedMemorySection,
  memoryDraft,
  activeWorkbenchTab,
  isFocused,
  runInstructionDraft,
  checkGateSelection,
  onSelectMemorySection,
  onMemoryDraftChange,
  onSaveMemory,
  onSelectWorkbenchTab,
  onRunInstructionDraftChange,
  onCheckGateSelectionChange,
  noteDraft,
  onNoteDraftChange,
  onSaveNote,
  onStartDryRun,
  onStartCodexReadOnly,
  onStartMode,
  onOpenPrompt,
  onOpenRunLog,
  onOpenDiff,
  onRunCheck,
  onRunCodeVetter,
  onCleanupWorktree,
  onApplyDiff,
  onGenerateTranscript,
  onKillRun,
  onDecisionAction,
  onAnswerAsk,
  onFocusRoom,
  onExitFocusRoom
}: {
  room: Room;
  workspace: WorkspaceSeed;
  runs: ElfRun[];
  promptPreview?: string;
  runLogPreview?: string;
  diffPreview?: string;
  checkPreview?: string;
  codevetterPreview?: string;
  cleanupPreview?: string;
  applyPreview?: string;
  transcriptPreview?: string;
  decisionPreview?: string;
  productMemory?: ProductMemory;
  productInspection?: ProductFolderInspection;
  selectedMemorySection: ProductMemorySectionKey;
  memoryDraft: string;
  activeWorkbenchTab: RoomWorkbenchTab;
  isFocused: boolean;
  runInstructionDraft: string;
  checkGateSelection: CheckGateSelection;
  onSelectMemorySection: (section: ProductMemorySectionKey) => void;
  onMemoryDraftChange: (value: string) => void;
  onSaveMemory: (section: ProductMemorySectionKey, body: string) => void;
  onSelectWorkbenchTab: (tab: RoomWorkbenchTab) => void;
  onRunInstructionDraftChange: (value: string) => void;
  onCheckGateSelectionChange: (value: CheckGateSelection) => void;
  noteDraft: string;
  onNoteDraftChange: (value: string) => void;
  onSaveNote: () => void;
  onStartDryRun: (prompt?: string) => void;
  onStartCodexReadOnly: (prompt?: string) => void;
  onStartMode: (mode: ElfRun["mode"], prompt?: string) => void;
  onOpenPrompt: () => void;
  onOpenRunLog: () => void;
  onOpenDiff: () => void;
  onRunCheck: (scriptKey: CheckGateSelection) => void;
  onRunCodeVetter: () => void;
  onCleanupWorktree: () => void;
  onApplyDiff: () => void;
  onGenerateTranscript: () => void;
  onKillRun: () => void;
  onDecisionAction: (action: DecisionAction, note?: string) => void;
  onAnswerAsk: (askId: string, answer: string, note?: string) => void;
  onFocusRoom: () => void;
  onExitFocusRoom: () => void;
}) {
  const product = roomProduct(workspace, room);
  const elf = roomElf(workspace, room);
  const task = roomTask(workspace, room);
  const playbook = roomPlaybook(workspace, room);
  const ask = room.asks[0];
  const activeRun = runs.find((run) => run.status === "running");
  const completedWorktreeRun = runs.find((run) => run.mode.includes("worktree") && run.status === "completed");
  const inactiveWorktreeRun = runs.find((run) => run.mode.includes("worktree") && run.status !== "running");
  const decisionNote = noteDraft.trim() || undefined;
  const runInstructions = runInstructionDraft.trim() || undefined;
  const [selectedRoomCommand, setSelectedRoomCommand] = useState<RoomCommand>("build");
  const checkGateOptions = buildCheckGateOptions(productInspection);
  const activeMemorySection = productMemory?.sections.find((section) => section.key === selectedMemorySection);
  const gateChecklist = buildGateChecklist(room);
  const readOnlyBlocker = productInspection && (!productInspection.exists || !productInspection.isDirectory) ? "Product folder is missing or is not a directory." : undefined;
  const worktreeBlocker =
    productInspection && (!productInspection.exists || !productInspection.isDirectory)
      ? "Product folder is missing or is not a directory."
      : productInspection && !productInspection.isGitRepo
        ? "Product folder is not a git repository."
        : undefined;
  const gateSummary = summarizeGateChecklist(gateChecklist);
  const roomCommands: Array<{ id: RoomCommand; label: string; group: string; disabled?: boolean }> = [
    { id: "build", label: "Build in worktree", group: "Run", disabled: Boolean(worktreeBlocker) },
    { id: "draft", label: "Draft in worktree", group: "Run", disabled: Boolean(worktreeBlocker) },
    { id: "read", label: "Read-only Codex", group: "Run", disabled: Boolean(readOnlyBlocker) },
    { id: "dry", label: "Local dry run", group: "Run" },
    { id: "prompt", label: "Open prompt", group: "Inspect", disabled: runs.length === 0 },
    { id: "log", label: "Open run log", group: "Inspect", disabled: runs.length === 0 },
    { id: "transcript", label: "Generate transcript", group: "Inspect" },
    { id: "diff", label: "Open diff", group: "Inspect", disabled: !completedWorktreeRun },
    { id: "check", label: "Run check gate", group: "Inspect", disabled: !completedWorktreeRun },
    { id: "vet", label: "Run CodeVetter", group: "Inspect", disabled: !completedWorktreeRun },
    { id: "apply", label: "Apply approved diff", group: "Inspect", disabled: !completedWorktreeRun },
    { id: "cleanup", label: "Clean worktree", group: "Inspect", disabled: !inactiveWorktreeRun },
    { id: "approve", label: "Approve room", group: "Decision" },
    { id: "request_fix", label: "Request fix", group: "Decision" },
    { id: "snooze", label: "Snooze room", group: "Decision" },
    { id: "reject", label: "Reject room", group: "Decision" },
    { id: "retry", label: "Retry latest run", group: "Decision", disabled: runs.length === 0 },
    { id: "close", label: "Close room", group: "Decision" },
    { id: "kill", label: "Stop active run", group: "Decision", disabled: !activeRun }
  ];
  const selectedCommand = roomCommands.find((command) => command.id === selectedRoomCommand) ?? roomCommands[0];
  const executeRoomCommand = () => {
    switch (selectedRoomCommand) {
      case "build":
        onStartMode("codex-worktree", runInstructions);
        break;
      case "draft":
        onStartMode("worktree-dry-run", runInstructions);
        break;
      case "read":
        onStartCodexReadOnly(runInstructions);
        break;
      case "dry":
        onStartDryRun(runInstructions);
        break;
      case "prompt":
        onOpenPrompt();
        break;
      case "log":
        onOpenRunLog();
        break;
      case "transcript":
        onGenerateTranscript();
        break;
      case "diff":
        onOpenDiff();
        break;
      case "check":
        onRunCheck(checkGateSelection);
        break;
      case "vet":
        onRunCodeVetter();
        break;
      case "apply":
        onApplyDiff();
        break;
      case "cleanup":
        onCleanupWorktree();
        break;
      case "approve":
      case "request_fix":
      case "snooze":
      case "reject":
      case "retry":
      case "close":
        onDecisionAction(selectedRoomCommand, decisionNote);
        break;
      case "kill":
        onKillRun();
        break;
    }
  };
  const roomOutputs: RoomOutputPreview[] = [
    { id: "prompt", title: "Run prompt", icon: <ScrollText size={16} />, body: promptPreview },
    { id: "run-log", title: "Run log", icon: <SquareTerminal size={16} />, body: runLogPreview },
    { id: "transcript", title: "Room transcript", icon: <FileText size={16} />, body: transcriptPreview },
    { id: "diff", title: "Diff preview", icon: <GitBranch size={16} />, body: diffPreview },
    { id: "check", title: "Check output", icon: <TestTube2 size={16} />, body: checkPreview },
    { id: "codevetter", title: "CodeVetter gate", icon: <ShieldCheck size={16} />, body: codevetterPreview },
    { id: "cleanup", title: "Worktree cleanup", icon: <Trash2 size={16} />, body: cleanupPreview },
    { id: "apply", title: "Applied diff", icon: <GitBranch size={16} />, body: applyPreview }
  ];
  const openOutputCount = roomOutputs.filter((output) => output.body && output.body.trim().length > 0).length;

  return (
    <div className="grid gap-4 p-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase text-stone-500">{product.name} · {task.priority} priority</p>
          <h2 className="text-2xl font-bold tracking-normal">{room.title}</h2>
        </div>
        <Button variant="outline" size="icon" type="button" aria-label={isFocused ? "Exit focused room" : "Expand room"} onClick={isFocused ? onExitFocusRoom : onFocusRoom}>
          {isFocused ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
        </Button>
      </header>

      <section className="grid min-h-36 grid-cols-[150px_1fr] items-center gap-4 rounded-xl border border-stone-800 bg-stone-900/70 p-4 max-lg:grid-cols-1">
        <ElfWorkbench status={room.status} />
        <div>
          <Badge variant={statusTone[room.status]} className="mb-2">{statusLabels[room.status]}</Badge>
          <h3 className="text-base font-semibold">{elf.name} is assigned</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-400">{room.summary}</p>
        </div>
      </section>

      {ask ? (
        <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <SectionTitle icon={<MessageSquare size={16} />} title="Elf asks" />
          <p className="text-sm leading-6 text-amber-100">{ask.question}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ask.options.map((option) => (
              <Button variant="outline" size="sm" type="button" key={option} onClick={() => onAnswerAsk(ask.id, option, decisionNote)}>
                {option}
              </Button>
            ))}
          </div>
          <div className="mt-3 grid gap-1 rounded-lg border border-amber-500/20 bg-stone-950/60 p-3 text-sm text-amber-100">
            <strong>Recommendation</strong>
            <span>{ask.recommendation}</span>
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-[0.85fr_1fr] gap-4 rounded-xl border border-stone-800 bg-stone-900/70 p-4 max-lg:grid-cols-1">
        <div>
          <SectionTitle icon={<ClipboardCheck size={16} />} title="Acceptance" />
          <ul className="grid gap-2">
            {task.acceptanceCriteria.map((item) => (
              <li className="flex items-start gap-2 text-sm leading-5 text-stone-400" key={item}>
                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-300" size={15} />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <SectionTitle icon={<PanelRightOpen size={16} />} title="Command" />
          {readOnlyBlocker || worktreeBlocker ? (
            <div className="mb-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs leading-5 text-amber-200">
              {worktreeBlocker ?? readOnlyBlocker}
            </div>
          ) : null}
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <label className="grid gap-1 text-xs font-extrabold uppercase text-stone-500">
              Command
              <select
                className="h-9 rounded-md border border-stone-700 bg-stone-950 px-2 text-sm font-bold normal-case text-stone-100"
                value={selectedRoomCommand}
                onChange={(event) => setSelectedRoomCommand(event.target.value as RoomCommand)}
              >
                {["Run", "Inspect", "Decision"].map((group) => (
                  <optgroup label={group} key={group}>
                    {roomCommands
                      .filter((command) => command.group === group)
                      .map((command) => (
                        <option value={command.id} disabled={command.disabled} key={command.id}>
                          {command.label}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <Button
              className="mt-5 min-w-28 px-3"
              variant={selectedRoomCommand === "reject" || selectedRoomCommand === "kill" ? "destructive" : selectedRoomCommand === "build" || selectedRoomCommand === "approve" ? "default" : "outline"}
              size="sm"
              type="button"
              onClick={executeRoomCommand}
              disabled={Boolean(selectedCommand.disabled)}
            >
              {selectedCommand.label}
            </Button>
          </div>
          {selectedRoomCommand === "check" ? (
            <label className="mt-2 grid gap-1 text-xs font-extrabold uppercase text-stone-500">
              Check gate
              <select
                className="h-8 rounded-md border border-stone-700 bg-stone-950 px-2 text-xs font-bold normal-case text-stone-100"
                value={checkGateSelection}
                onChange={(event) => onCheckGateSelectionChange(event.target.value as CheckGateSelection)}
              >
                <option value="auto">Auto</option>
                {checkGateOptions.map((key) => (
                  <option value={key} key={key}>
                    {key}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {selectedCommand.disabled ? (
            <p className="mt-2 rounded-md border border-stone-800 bg-stone-950/60 px-2 py-1.5 text-xs leading-5 text-stone-500">
              This command is not available for the latest room state.
            </p>
          ) : null}
          <details className="mt-3 rounded-lg border border-stone-800 bg-stone-950/45 p-2">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-extrabold uppercase text-stone-500">
              <span>Run instructions</span>
              {runInstructionDraft.trim() ? <Badge variant="blue">Custom</Badge> : null}
            </summary>
            <Textarea
              className="mt-2 min-h-20 text-sm normal-case"
              value={runInstructionDraft}
              onChange={(event) => onRunInstructionDraftChange(event.target.value)}
              placeholder="Focus on one failing check. Do not touch unrelated files."
              rows={3}
            />
          </details>
          <details className="mt-2 rounded-lg border border-stone-800 bg-stone-950/45 p-2">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-extrabold uppercase text-stone-500">
              <span>Approval gates</span>
              <span className="normal-case text-stone-400">{gateSummary}</span>
            </summary>
            <div className="mt-2">
              <GateChecklist items={gateChecklist} />
            </div>
          </details>
          {decisionPreview ? (
            <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-5 text-amber-100">
              {decisionPreview}
            </div>
          ) : null}
        </div>
      </section>

      {playbook ? (
        <details className="rounded-xl border border-stone-800 bg-stone-900/60 p-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-stone-200">
            <BookOpenText size={16} />
            Playbook: {playbook.name}
          </summary>
          <div className="mt-3 grid gap-3">
            <div>
              <p className="text-sm leading-6 text-stone-400">{playbook.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm max-lg:grid-cols-1">
              <div>
                <p className="mb-1 text-xs font-extrabold uppercase text-stone-500">Steps</p>
                <ol className="grid list-decimal gap-1 pl-4 text-stone-400">
                  {playbook.steps.slice(0, 4).map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
              <div>
                <p className="mb-1 text-xs font-extrabold uppercase text-stone-500">Gates</p>
                <div className="flex flex-wrap gap-1.5">
                  {playbook.requiredGates.map((gate) => (
                    <Badge variant="outline" key={gate}>{gate}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </details>
      ) : null}

      {runs.length > 0 ? (
        <section>
          <SectionTitle icon={<Activity size={16} />} title="Runs" />
          <div className="overflow-hidden rounded-xl border border-stone-800 bg-stone-900/70">
            {runs.slice(0, 2).map((run, index) => (
              <div className={cn("flex items-center gap-3 p-3 text-sm", index !== Math.min(runs.length, 2) - 1 && "border-b border-stone-800")} key={run.id}>
                <Badge variant={run.status === "running" ? "blue" : run.status === "completed" ? "green" : run.status === "killed" ? "amber" : "red"}>
                  {run.status}
                </Badge>
                <div className="min-w-0">
                  <strong className="block truncate">{run.mode}</strong>
                  <p className="line-clamp-1 break-words text-xs text-stone-500">{run.command}</p>
                  {run.branchName || run.workspacePath ? (
                    <div className="mt-1 space-y-0.5 text-xs text-stone-500">
                      {run.branchName ? (
                        <p className="flex min-w-0 items-center gap-1.5">
                          <GitBranch size={12} className="shrink-0" />
                          <span className="truncate">{run.branchName}</span>
                        </p>
                      ) : null}
                      {run.workspacePath ? <p className="break-all font-mono text-[11px] text-stone-400">{run.workspacePath}</p> : null}
                    </div>
                  ) : null}
                </div>
                <span className="ml-auto shrink-0 text-xs text-stone-500">{runTimingLabel(run)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <details className="rounded-xl border border-stone-800 bg-stone-900/50 p-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-stone-200">
          <span className="flex items-center gap-2">
            <PanelRightOpen size={16} />
            Evidence & memory
          </span>
          <span className="flex flex-wrap justify-end gap-2 text-[11px] font-semibold text-stone-500">
            <span>{runs.length} runs</span>
            <span>{room.artifacts.length} artifacts</span>
            <span>{room.logs.length} logs</span>
            <span>{openOutputCount} outputs</span>
          </span>
        </summary>
        <RoomWorkbench
          room={room}
          runs={runs}
          productMemory={productMemory}
          selectedMemorySection={selectedMemorySection}
          memoryDraft={memoryDraft}
          activeMemorySection={activeMemorySection}
          activeTab={activeWorkbenchTab}
          outputs={roomOutputs}
          noteDraft={noteDraft}
          onSelectTab={onSelectWorkbenchTab}
          onSelectMemorySection={onSelectMemorySection}
          onMemoryDraftChange={onMemoryDraftChange}
          onSaveMemory={onSaveMemory}
          onNoteDraftChange={onNoteDraftChange}
          onSaveNote={onSaveNote}
        />
      </details>

    </div>
  );
}

function RoomWorkbench({
  room,
  runs,
  productMemory,
  selectedMemorySection,
  memoryDraft,
  activeMemorySection,
  activeTab,
  outputs,
  noteDraft,
  onSelectTab,
  onSelectMemorySection,
  onMemoryDraftChange,
  onSaveMemory,
  onNoteDraftChange,
  onSaveNote
}: {
  room: Room;
  runs: ElfRun[];
  productMemory?: ProductMemory;
  selectedMemorySection: ProductMemorySectionKey;
  memoryDraft: string;
  activeMemorySection?: ProductMemorySection;
  activeTab: RoomWorkbenchTab;
  outputs: RoomOutputPreview[];
  noteDraft: string;
  onSelectTab: (tab: RoomWorkbenchTab) => void;
  onSelectMemorySection: (section: ProductMemorySectionKey) => void;
  onMemoryDraftChange: (value: string) => void;
  onSaveMemory: (section: ProductMemorySectionKey, body: string) => void;
  onNoteDraftChange: (value: string) => void;
  onSaveNote: () => void;
}) {
  return (
    <section className="mt-3">
      <div className="mb-3 flex justify-end">
        <div className="flex flex-wrap rounded-lg border border-stone-800 bg-stone-950 p-1" aria-label="Room workbench tabs">
          {roomWorkbenchTabs.map((tab) => (
            <div
              className={cn(
                "flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-[11px] font-semibold transition-colors",
                activeTab === tab.id ? "bg-stone-800 text-stone-100" : "text-stone-400 hover:text-stone-100"
              )}
              role="button"
              tabIndex={0}
              key={tab.id}
              aria-pressed={activeTab === tab.id}
              onClick={() => onSelectTab(tab.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectTab(tab.id);
                }
              }}
            >
              {activeTab === tab.id ? <CheckCircle2 size={12} /> : null}
              {tab.label}
            </div>
          ))}
        </div>
      </div>

      {activeTab === "timeline" ? <RoomTimelinePanel room={room} runs={runs} /> : null}
      {activeTab === "logs" ? <RoomLogsPanel room={room} /> : null}
      {activeTab === "artifacts" ? <RoomArtifactsPanel room={room} /> : null}
      {activeTab === "outputs" ? <RoomOutputsPanel outputs={outputs} /> : null}
      {activeTab === "notes" ? (
        <RoomNotesPanel room={room} noteDraft={noteDraft} onNoteDraftChange={onNoteDraftChange} onSaveNote={onSaveNote} />
      ) : null}
      {activeTab === "memory" ? (
        <RoomMemoryPanel
          productMemory={productMemory}
          selectedMemorySection={selectedMemorySection}
          memoryDraft={memoryDraft}
          activeMemorySection={activeMemorySection}
          onSelectMemorySection={onSelectMemorySection}
          onMemoryDraftChange={onMemoryDraftChange}
          onSaveMemory={onSaveMemory}
        />
      ) : null}
    </section>
  );
}

function RoomTimelinePanel({ room, runs }: { room: Room; runs: ElfRun[] }) {
  const items = buildRoomTimeline(room, runs);

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-2">
      {items.length > 0 ? (
        <ol className="grid gap-1.5">
          {items.map((item) => (
            <li className="grid grid-cols-[10px_1fr] gap-2" key={item.id}>
              <span className={cn("mt-3 size-2 rounded-full ring-2", timelineDotTone[item.tone])} />
              <div className="rounded-lg border border-stone-800 bg-stone-900/70 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant={item.tone}>{item.source}</Badge>
                  {item.time ? <time className="text-[11px] font-semibold text-stone-500">{item.time}</time> : null}
                </div>
                <strong className="mt-1 block line-clamp-1 text-sm leading-5 text-stone-200">{item.title}</strong>
                <p className="line-clamp-1 text-xs leading-5 text-stone-500">{item.summary}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-lg border border-stone-800 bg-stone-900/70 p-3 text-sm text-stone-500">No room activity has been captured yet.</p>
      )}
    </div>
  );
}

const timelineDotTone: Record<RoomTimelineTone, string> = {
  green: "bg-emerald-400 ring-emerald-500/15",
  amber: "bg-amber-400 ring-amber-500/15",
  red: "bg-red-400 ring-red-500/15",
  blue: "bg-blue-400 ring-blue-500/15",
  secondary: "bg-stone-400 ring-stone-500/15"
};

function buildRoomTimeline(room: Room, runs: ElfRun[]): RoomTimelineItem[] {
  const items: RoomTimelineItem[] = [];

  for (const ask of room.asks) {
    items.push({
      id: `ask-${ask.id}`,
      source: "Ask",
      title: ask.question,
      summary: ask.recommendation,
      time: ask.createdAt,
      tone: "amber"
    });
  }

  for (const run of runs.slice(0, 4)) {
    items.push({
      id: `run-${run.id}`,
      source: "Run",
      title: `${run.mode} ${run.status}`,
      summary: run.command,
      time: run.endedAt ?? run.startedAt,
      tone: run.status === "completed" ? "green" : run.status === "running" ? "blue" : run.status === "killed" ? "amber" : "red"
    });
  }

  for (const artifact of room.artifacts.slice(-5).reverse()) {
    items.push({
      id: `artifact-${artifact.id}`,
      source: "Artifact",
      title: artifact.title,
      summary: artifact.summary,
      tone: artifact.status === "passed" || artifact.status === "ready" ? "green" : artifact.status === "failed" ? "red" : "secondary"
    });
  }

  for (const decision of room.decisions.slice(-4).reverse()) {
    items.push({
      id: `decision-${decision.id}`,
      source: "Decision",
      title: decision.title,
      summary: decision.status.replace(/_/g, " "),
      tone: decision.risk === "high" ? "red" : decision.risk === "medium" ? "amber" : "green"
    });
  }

  for (const log of room.logs.slice(-5).reverse()) {
    items.push({
      id: `log-${log.id}`,
      source: "Log",
      title: log.message,
      summary: log.level,
      time: log.time,
      tone: log.level === "success" ? "green" : log.level === "warning" ? "amber" : log.level === "error" ? "red" : "secondary"
    });
  }

  for (const [index, note] of room.notes.slice(-3).reverse().entries()) {
    items.push({
      id: `note-${index}-${note.slice(0, 24)}`,
      source: "Note",
      title: "Founder note",
      summary: note,
      tone: "blue"
    });
  }

  return items.slice(0, 7);
}

function RoomLogsPanel({ room }: { room: Room }) {
  return (
    <div className="max-h-96 overflow-auto rounded-lg bg-stone-950 font-mono text-xs text-stone-100">
      {room.logs.length > 0 ? (
        room.logs.map((log) => (
          <div className="grid grid-cols-[54px_1fr] gap-3 border-b border-white/5 px-3 py-2 last:border-b-0" key={log.id}>
            <time className="text-stone-400">{log.time}</time>
            <span
              className={cn(
                log.level === "success" && "text-emerald-200",
                log.level === "warning" && "text-amber-200",
                log.level === "error" && "text-red-200"
              )}
            >
              {log.message}
            </span>
          </div>
        ))
      ) : (
        <div className="px-3 py-2 text-stone-400">No logs yet.</div>
      )}
    </div>
  );
}

function RoomArtifactsPanel({ room }: { room: Room }) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-800 bg-stone-950/70">
      {room.artifacts.length > 0 ? (
        room.artifacts.map((artifact, index) => (
          <ArtifactRow key={artifact.id} artifact={artifact} last={index === room.artifacts.length - 1} />
        ))
      ) : (
        <p className="p-3 text-sm text-stone-500">No artifacts captured yet.</p>
      )}
    </div>
  );
}

function RoomOutputsPanel({ outputs }: { outputs: RoomOutputPreview[] }) {
  const openOutputs = outputs.filter((output) => output.body && output.body.trim().length > 0);

  return (
    <div className="grid gap-3 rounded-xl border border-stone-800 bg-stone-950/70 p-3">
      {openOutputs.length > 0 ? (
        openOutputs.map((output) => (
          <section className="grid gap-2" key={output.id}>
            <SectionTitle icon={output.icon} title={output.title} />
            <pre className="max-h-80 overflow-auto rounded-lg bg-stone-950 p-3 text-xs leading-5 text-stone-100">
              <code>{output.body}</code>
            </pre>
          </section>
        ))
      ) : (
        <p className="rounded-lg border border-stone-800 bg-stone-900/70 p-3 text-sm text-stone-500">
          Open a prompt, diff, transcript, check output, CodeVetter report, cleanup result, or applied diff result to inspect it here.
        </p>
      )}
    </div>
  );
}

function RoomNotesPanel({
  room,
  noteDraft,
  onNoteDraftChange,
  onSaveNote
}: {
  room: Room;
  noteDraft: string;
  onNoteDraftChange: (value: string) => void;
  onSaveNote: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-xl border border-stone-800 bg-stone-950/70 p-3">
      {room.notes.length > 0 ? (
        room.notes.map((note) => (
          <p className="text-sm leading-6 text-stone-300" key={note}>{note}</p>
        ))
      ) : (
        <p className="text-sm text-stone-500">No founder notes yet.</p>
      )}
      <Separator />
      <Textarea value={noteDraft} onChange={(event) => onNoteDraftChange(event.target.value)} placeholder="Add context for this room..." />
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={onSaveNote} disabled={noteDraft.trim().length === 0}>
          Add room note
        </Button>
      </div>
    </div>
  );
}

function RoomMemoryPanel({
  productMemory,
  selectedMemorySection,
  memoryDraft,
  activeMemorySection,
  onSelectMemorySection,
  onMemoryDraftChange,
  onSaveMemory
}: {
  productMemory?: ProductMemory;
  selectedMemorySection: ProductMemorySectionKey;
  memoryDraft: string;
  activeMemorySection?: ProductMemorySection;
  onSelectMemorySection: (section: ProductMemorySectionKey) => void;
  onMemoryDraftChange: (value: string) => void;
  onSaveMemory: (section: ProductMemorySectionKey, body: string) => void;
}) {
  return (
    <div className="grid gap-3 rounded-xl border border-stone-800 bg-stone-950/70 p-3">
      {productMemory ? (
        <>
          <div className="flex flex-wrap gap-2">
            {productMemory.sections.map((section) => (
              <Button
                variant={section.key === selectedMemorySection ? "default" : "outline"}
                size="sm"
                type="button"
                key={section.key}
                onClick={() => onSelectMemorySection(section.key)}
              >
                {section.title}
              </Button>
            ))}
          </div>
          <Textarea
            value={memoryDraft}
            onChange={(event) => onMemoryDraftChange(event.target.value)}
            rows={8}
            placeholder="Add durable product context..."
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-stone-500">
              {activeMemorySection?.filename ?? selectedMemorySection}. Local Markdown memory for {productMemory.productName}.
            </span>
            <Button type="button" size="sm" onClick={() => onSaveMemory(selectedMemorySection, memoryDraft)}>
              Save memory
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm text-stone-500">Product memory loads from the local daemon when available.</p>
      )}
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-2 flex items-center gap-2 text-sm font-bold">
      {icon}
      <h3>{title}</h3>
    </div>
  );
}

function ArtifactRow({ artifact, last }: { artifact: Artifact; last: boolean }) {
  const icon = artifact.type === "test" ? <TestTube2 size={15} /> : artifact.type === "diff" ? <GitBranch size={15} /> : <FileText size={15} />;
  const tone = artifact.status === "passed" || artifact.status === "ready" ? "green" : artifact.status === "failed" ? "red" : "secondary";

  return (
    <div className={cn("flex items-center gap-3 p-3", !last && "border-b border-stone-800")}>
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-stone-900 text-stone-300">{icon}</div>
      <div className="min-w-0">
        <strong className="block truncate text-sm">{artifact.title}</strong>
        <p className="mt-1 text-xs leading-5 text-stone-500">{artifact.summary}</p>
      </div>
      <Badge variant={tone} className="ml-auto">{artifact.status}</Badge>
    </div>
  );
}

type GateChecklistItem = {
  id: string;
  label: string;
  state: "passed" | "failed" | "missing" | "waiting";
  summary: string;
};

function buildGateChecklist(room: Pick<Room, "artifacts">): GateChecklistItem[] {
  const hasDiff = room.artifacts.some((artifact) => artifact.type === "diff");
  const checkArtifact = latestArtifactOfType(room.artifacts, "test");
  const reviewArtifact = latestArtifactOfType(room.artifacts, "review");

  return [
    buildGateChecklistItem({
      id: "check",
      label: "Check gate",
      hasDiff,
      artifact: checkArtifact,
      missingSummary: "Run Check before approval."
    }),
    buildGateChecklistItem({
      id: "codevetter",
      label: "CodeVetter",
      hasDiff,
      artifact: reviewArtifact,
      missingSummary: "Run Vet before approval."
    })
  ];
}

function latestArtifactOfType(artifacts: Artifact[], type: Artifact["type"]) {
  for (let index = artifacts.length - 1; index >= 0; index -= 1) {
    if (artifacts[index].type === type) {
      return artifacts[index];
    }
  }

  return undefined;
}

function buildGateChecklistItem({
  id,
  label,
  hasDiff,
  artifact,
  missingSummary
}: {
  id: string;
  label: string;
  hasDiff: boolean;
  artifact?: Artifact;
  missingSummary: string;
}): GateChecklistItem {
  if (!hasDiff) {
    return { id, label, state: "waiting", summary: "Waiting for a worktree diff." };
  }

  if (!artifact) {
    return { id, label, state: "missing", summary: missingSummary };
  }

  if (artifact.status === "passed") {
    return { id, label, state: "passed", summary: artifact.title };
  }

  if (artifact.status === "failed") {
    return { id, label, state: "failed", summary: artifact.title };
  }

  return { id, label, state: "missing", summary: missingSummary };
}

function summarizeGateChecklist(items: GateChecklistItem[]) {
  const failed = items.filter((item) => item.state === "failed").length;
  const missing = items.filter((item) => item.state === "missing").length;
  const waiting = items.filter((item) => item.state === "waiting").length;
  const passed = items.filter((item) => item.state === "passed").length;

  if (failed > 0) {
    return `${failed} failed`;
  }

  if (missing > 0) {
    return `${missing} required`;
  }

  if (waiting === items.length) {
    return "Waiting for diff";
  }

  return `${passed}/${items.length} passed`;
}

function GateChecklist({ items }: { items: GateChecklistItem[] }) {
  return (
    <div className="grid gap-2 rounded-lg border border-stone-800 bg-stone-950/60 p-2.5" aria-label="Gate checklist">
      {items.map((item) => (
        <div className="flex min-w-0 items-start gap-2" key={item.id}>
          <span className={cn(
            "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border",
            item.state === "passed" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
            item.state === "failed" && "border-red-500/30 bg-red-500/10 text-red-200",
            item.state === "missing" && "border-amber-500/30 bg-amber-500/10 text-amber-200",
            item.state === "waiting" && "border-stone-700 bg-stone-900 text-stone-500"
          )}>
            {item.state === "passed" ? <CheckCircle2 size={13} /> : item.state === "failed" ? <CircleStop size={13} /> : <HelpCircle size={13} />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <strong className="text-xs">{item.label}</strong>
              <Badge variant={gateBadgeTone[item.state]} className="shrink-0">{gateStateLabel[item.state]}</Badge>
            </div>
            <p className="mt-1 text-xs leading-4 text-stone-500">{item.summary}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

const gateBadgeTone: Record<GateChecklistItem["state"], "green" | "amber" | "red" | "secondary"> = {
  passed: "green",
  failed: "red",
  missing: "amber",
  waiting: "secondary"
};

const gateStateLabel: Record<GateChecklistItem["state"], string> = {
  passed: "Passed",
  failed: "Failed",
  missing: "Required",
  waiting: "Waiting"
};

function ElfWorkbench({ status }: { status: RoomStatus }) {
  return (
    <div className={cn("elf-stage", status)} aria-label={`Elf animation: ${statusLabels[status]}`}>
      <div className="shelf" />
      <div className="spark spark-one" />
      <div className="spark spark-two" />
      <div className="elf">
        <div className="hat" />
        <div className="head" />
        <div className="body" />
        <div className="arm left" />
        <div className="arm right" />
      </div>
      <div className="bench">
        <div className="bench-top" />
        <div className="bench-leg left" />
        <div className="bench-leg right" />
      </div>
      <div className="tool" />
    </div>
  );
}
