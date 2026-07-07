import {
  Activity,
  ArrowRight,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
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
  Play,
  Radio,
  Inbox,
  ScrollText,
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
  statusLabels,
  type Artifact,
  type DailyBrief,
  type DailyBriefItem,
  type DailyBriefSection,
  type DecisionAction,
  type DecisionItem,
  type ElfFmFeed,
  type ElfFmStation,
  type ElfFmTranscriptItem,
  type ElfRun,
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
import { useEffect, useMemo, useState } from "react";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
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

type PaneLayout = {
  fleet: number;
  rooms: number;
};

type RoomWorkbenchTab = "logs" | "artifacts" | "notes" | "memory";

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
  { id: "logs", label: "Logs" },
  { id: "artifacts", label: "Artifacts" },
  { id: "notes", label: "Notes" },
  { id: "memory", label: "Memory" }
];

const defaultPaneLayout: PaneLayout = {
  fleet: 260,
  rooms: 560
};

const decisionActionLabels: Record<DecisionAction, string> = {
  approve: "Approve",
  request_fix: "Request fix",
  reject: "Reject",
  snooze: "Snooze",
  retry: "Retry"
};

const decisionActionTone: Record<DecisionAction, "default" | "outline" | "destructive"> = {
  approve: "default",
  request_fix: "outline",
  reject: "destructive",
  snooze: "outline",
  retry: "outline"
};

function decisionActionFromLabel(label: string): DecisionAction | undefined {
  return (Object.entries(decisionActionLabels).find(([, value]) => value === label)?.[0] as DecisionAction | undefined) ?? undefined;
}

function roomProduct(workspace: WorkspaceSeed, room: Room): Product {
  const product = workspace.products.find((item) => item.id === room.productId);
  if (!product) {
    throw new Error(`Missing product for room ${room.id}`);
  }
  return product;
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
  const [selectedProductId, setSelectedProductId] = useState<string>("all");
  const [selectedRoomId, setSelectedRoomId] = useState<string>(seedWorkspace.rooms[1]?.id ?? "");
  const [roomNotes, setRoomNotes] = useState<Record<string, string>>({});
  const [roomRuns, setRoomRuns] = useState<Record<string, ElfRun[]>>({});
  const [promptPreview, setPromptPreview] = useState<Record<string, string>>({});
  const [diffPreview, setDiffPreview] = useState<Record<string, string>>({});
  const [checkPreview, setCheckPreview] = useState<Record<string, string>>({});
  const [codevetterPreview, setCodevetterPreview] = useState<Record<string, string>>({});
  const [cleanupPreview, setCleanupPreview] = useState<Record<string, string>>({});
  const [transcriptPreview, setTranscriptPreview] = useState<Record<string, string>>({});
  const [decisionPreview, setDecisionPreview] = useState<Record<string, string>>({});
  const [dailyBriefMarkdown, setDailyBriefMarkdown] = useState<string>("");
  const [dailyBriefExportStatus, setDailyBriefExportStatus] = useState<string>("");
  const [decisionItems, setDecisionItems] = useState<DecisionItem[]>(buildDecisionItems(seedWorkspace.rooms));
  const [dailyBrief, setDailyBrief] = useState<DailyBrief>(buildDailyBrief(seedWorkspace));
  const [elfFmFeed, setElfFmFeed] = useState<ElfFmFeed>(buildElfFmFeed(seedWorkspace));
  const [productInspections, setProductInspections] = useState<Record<string, ProductFolderInspection>>({});
  const [productMemoryById, setProductMemoryById] = useState<Record<string, ProductMemory>>({});
  const [selectedMemorySection, setSelectedMemorySection] = useState<ProductMemorySectionKey>("PRODUCT");
  const [memoryDrafts, setMemoryDrafts] = useState<Record<string, string>>({});
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [showDailyBrief, setShowDailyBrief] = useState(false);
  const [paneLayout, setPaneLayout] = useState<PaneLayout>(readStoredPaneLayout);
  const [roomWorkbenchTabsById, setRoomWorkbenchTabsById] = useState<Record<string, RoomWorkbenchTab>>({});
  const [focusedRoomId, setFocusedRoomId] = useState<string | null>(null);
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
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWorkspace(seedWorkspace);
          setDecisionItems(buildDecisionItems(seedWorkspace.rooms));
          setDailyBrief(buildDailyBrief(seedWorkspace));
          setElfFmFeed(buildElfFmFeed(seedWorkspace));
          setDaemonState("fallback");
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
        }
      } catch {
        // Keep the last visible state; the badge already communicates daemon status on first load.
      }
    };

    void refresh();
    const interval = window.setInterval(refresh, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [daemonState, selectedRoomId]);

  const visibleRooms = useMemo(() => {
    const rooms =
      selectedProductId === "all"
        ? workspace.rooms
        : workspace.rooms.filter((room) => room.productId === selectedProductId);

    return [...rooms].sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));
  }, [selectedProductId, workspace.rooms]);
  const visibleRoomCards = visibleRooms.slice(0, 6);

  const selectedRoom = workspace.rooms.find((room) => room.id === selectedRoomId) ?? visibleRooms[0] ?? workspace.rooms[0];
  const selectedProduct = workspace.products.find((product) => product.id === (selectedProductId === "all" ? selectedRoom?.productId : selectedProductId));
  const selectedProductInspection = selectedProduct ? productInspections[selectedProduct.id] : undefined;
  const assignedTaskIds = useMemo(() => new Set(workspace.rooms.map((room) => room.taskId)), [workspace.rooms]);
  const selectedBacklogTasks = useMemo(
    () => (selectedProduct ? workspace.tasks.filter((task) => task.productId === selectedProduct.id && !assignedTaskIds.has(task.id)) : []),
    [assignedTaskIds, selectedProduct, workspace.tasks]
  );
  const selectedProductMemory = selectedRoom ? productMemoryById[selectedRoom.productId] : undefined;
  const selectedMemoryDraftKey = selectedRoom ? `${selectedRoom.productId}:${selectedMemorySection}` : "";
  const selectedMemorySectionBody =
    selectedMemoryDraftKey && selectedMemoryDraftKey in memoryDrafts
      ? memoryDrafts[selectedMemoryDraftKey]
      : selectedProductMemory?.sections.find((section) => section.key === selectedMemorySection)?.body ?? "";
  const isRoomFocused = focusedRoomId === selectedRoom?.id;
  const mainGridTemplateColumns = isRoomFocused ? "minmax(720px, 1fr)" : `${paneLayout.fleet}px 10px ${paneLayout.rooms}px 10px minmax(380px, 1fr)`;
  const selectedRoomWorkbenchTab = selectedRoom ? roomWorkbenchTabsById[selectedRoom.id] ?? "logs" : "logs";

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

  const startRoomRun = async (roomId: string, mode: ElfRun["mode"]) => {
    const response = await fetch(`${daemonBaseUrl}/api/rooms/${roomId}/runs/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ mode })
    });

    if (!response.ok) {
      return;
    }

    const body = (await response.json()) as { room: Room; run: ElfRun };
    replaceRoom(body.room);
    setRoomRuns((current) => ({ ...current, [roomId]: [body.run, ...(current[roomId] ?? [])] }));
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

  const runLatestCheck = async (roomId: string) => {
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
      body: JSON.stringify({ scriptKey: "typecheck" })
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
    setProductInspections((current) => {
      const next = { ...current };
      delete next[body.product.id];
      return next;
    });
    setIsAddingProduct(false);
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

  return (
    <main
      className="dark-cockpit grid h-screen min-h-[760px] min-w-[1040px] gap-0 bg-[radial-gradient(circle_at_70%_8%,rgba(16,185,129,0.12),transparent_24%),radial-gradient(circle_at_15%_20%,rgba(59,130,246,0.10),transparent_26%),#080b0f] p-2.5 text-stone-100 max-lg:flex max-lg:h-auto max-lg:min-w-0 max-lg:flex-col max-lg:gap-2.5"
      style={{ gridTemplateColumns: mainGridTemplateColumns }}
    >
      {!isRoomFocused ? (
      <aside className="min-w-[220px] overflow-auto rounded-l-2xl rounded-r-md border border-stone-800 bg-stone-950/92 p-4 shadow-2xl shadow-black/40 max-lg:w-full max-lg:max-w-none max-lg:rounded-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-400 text-stone-950">
            <Sparkles size={18} />
          </div>
          <div>
            <p className="text-[11px] font-extrabold uppercase text-stone-500">Local command room</p>
            <h1 className="text-2xl font-bold tracking-normal">Elves HQ</h1>
          </div>
        </div>
        <Badge variant={daemonState === "local" ? "green" : daemonState === "connecting" ? "blue" : "amber"} className="mb-4">
          {daemonState === "local" ? "Daemon connected" : daemonState === "connecting" ? "Connecting daemon" : "Seed fallback"}
        </Badge>

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
          </section>
        ) : null}

        {selectedProduct ? <ProductFolderCard product={selectedProduct} inspection={selectedProductInspection} /> : null}

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
              <Button variant="outline" size="icon" type="button" aria-label="Start room" onClick={() => startRoomRun(selectedRoom.id, "dry-run")}>
                <Play size={17} />
              </Button>
              <Button
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

        <NeedsMePanel
          items={visibleDecisionItems}
          workspace={workspace}
          onOpenRoom={(item) => {
            setSelectedProductId(item.productId);
            setSelectedRoomId(item.roomId);
            setIsCreatingRoom(false);
          }}
          onAction={(item, action) => performDecisionAction(item.roomId, action)}
        />

        <ElfFMPanel
          feed={elfFmFeed}
          selectedProductId={selectedProductId}
          onOpenRoom={(roomId, productId) => {
            setSelectedProductId(productId);
            setSelectedRoomId(roomId);
            setIsCreatingRoom(false);
          }}
        />

        <TaskBacklogPanel
          product={selectedProduct}
          tasks={selectedBacklogTasks}
          workspace={workspace}
          draft={newTask}
          assignment={backlogAssignment}
          onDraftChange={setNewTask}
          onAssignmentChange={setBacklogAssignment}
          onCreateTask={createBacklogTask}
          onAssignTask={assignBacklogTask}
        />

        <div className="mb-4 flex items-center justify-between rounded-xl border border-stone-800 bg-stone-900/70 p-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase text-stone-500">Daily Brief</p>
            <p className="text-sm text-stone-300">{dailyBrief.totals.decisions} decisions · {dailyBrief.totals.ready} ready · {dailyBrief.totals.failed} failed</p>
          </div>
          <Button variant="outline" size="sm" type="button" onClick={() => setShowDailyBrief((current) => !current)}>
            <FileText size={14} />
            {showDailyBrief ? "Hide" : "Open"}
          </Button>
        </div>

        {showDailyBrief ? (
          <DailyBriefPanel
            brief={dailyBrief}
            selectedProductId={selectedProductId}
            markdownPreview={dailyBriefMarkdown}
            exportStatus={dailyBriefExportStatus}
            onExportMarkdown={exportDailyBriefMarkdown}
            onOpenRoom={(item) => {
              setSelectedProductId(item.productId);
              setSelectedRoomId(item.roomId);
              setIsCreatingRoom(false);
            }}
          />
        ) : null}

        {isCreatingRoom ? (
          <section className="mb-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-3">
              <p className="text-[11px] font-extrabold uppercase text-stone-500">Create room</p>
              <h3 className="text-base font-semibold">Assign a task to an elf</h3>
            </div>
            <div className="grid gap-3">
              <label className="grid gap-1 text-sm font-semibold">
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
              <label className="grid gap-1 text-sm font-semibold">
                Task
                <input
                  className="h-10 rounded-md border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100"
                  value={newRoom.title}
                  onChange={(event) => setNewRoom((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Fix flaky onboarding test"
                />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
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
              <label className="grid gap-1 text-sm font-semibold">
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
              <label className="grid gap-1 text-sm font-semibold">
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

        {visibleRooms.length > visibleRoomCards.length ? (
          <p className="mb-2 text-xs font-semibold text-stone-500">Showing {visibleRoomCards.length} highest-signal rooms. Select a project or open a room for details.</p>
        ) : null}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(245px,1fr))] gap-3">
          {visibleRoomCards.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              workspace={workspace}
              selected={selectedRoom.id === room.id}
              onSelect={() => setSelectedRoomId(room.id)}
            />
          ))}
        </div>
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
          checkPreview={checkPreview[selectedRoom.id]}
          codevetterPreview={codevetterPreview[selectedRoom.id]}
          cleanupPreview={cleanupPreview[selectedRoom.id]}
          transcriptPreview={transcriptPreview[selectedRoom.id]}
          decisionPreview={decisionPreview[selectedRoom.id]}
          productMemory={selectedProductMemory}
          productInspection={productInspections[selectedRoom.productId]}
          selectedMemorySection={selectedMemorySection}
          memoryDraft={selectedMemorySectionBody}
          activeWorkbenchTab={selectedRoomWorkbenchTab}
          isFocused={isRoomFocused}
          onSelectMemorySection={setSelectedMemorySection}
          onMemoryDraftChange={(value) => setMemoryDrafts((current) => ({ ...current, [selectedMemoryDraftKey]: value }))}
          onSaveMemory={(section, body) => saveProductMemorySection(selectedRoom.productId, section, body)}
          onSelectWorkbenchTab={(tab) => setRoomWorkbenchTabsById((current) => ({ ...current, [selectedRoom.id]: tab }))}
          noteDraft={roomNotes[selectedRoom.id] ?? ""}
          onNoteDraftChange={(value) => setRoomNotes((current) => ({ ...current, [selectedRoom.id]: value }))}
          onSaveNote={() => saveRoomNote(selectedRoom.id)}
          onStartDryRun={() => startRoomRun(selectedRoom.id, "dry-run")}
          onStartCodexReadOnly={() => startRoomRun(selectedRoom.id, "codex-readonly")}
          onStartMode={(mode) => startRoomRun(selectedRoom.id, mode)}
          onOpenPrompt={() => openLatestPrompt(selectedRoom.id)}
          onOpenDiff={() => openLatestDiff(selectedRoom.id)}
          onRunCheck={() => runLatestCheck(selectedRoom.id)}
          onRunCodeVetter={() => runLatestCodeVetter(selectedRoom.id)}
          onCleanupWorktree={() => cleanupLatestWorktree(selectedRoom.id)}
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

function clampPaneLayout(layout: PaneLayout): PaneLayout {
  return {
    fleet: clampNumber(layout.fleet, 220, 360),
    rooms: clampNumber(layout.rooms, 420, 760)
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
  onOpenRoom,
  onAction
}: {
  items: DecisionItem[];
  workspace: WorkspaceSeed;
  onOpenRoom: (item: DecisionItem) => void;
  onAction: (item: DecisionItem, action: DecisionAction) => void;
}) {
  return (
    <section className="mb-4 rounded-xl border border-stone-200 bg-white p-3 shadow-sm" aria-label="Needs Me">
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
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-2">
          {items.slice(0, 4).map((item) => {
            const product = workspace.products.find((entry) => entry.id === item.productId);
            const tone = item.risk === "high" ? "red" : item.risk === "medium" ? "amber" : "green";

            return (
              <article className="grid min-h-[190px] gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3 text-left" key={item.id}>
                <div className="flex items-center gap-2 text-xs font-extrabold text-stone-500">
                  <span className={cn("h-2.5 w-2.5 rounded-full", statusDot[item.status])} />
                  <span>{product?.name ?? "Unknown project"}</span>
                  <Badge variant={tone} className="ml-auto">{item.risk}</Badge>
                </div>
                <strong className="text-sm leading-5">{item.title}</strong>
                <p className="max-h-12 overflow-hidden text-xs leading-5 text-stone-600">{item.reason}</p>
                <p className="max-h-10 overflow-hidden rounded-md bg-white px-2 py-1.5 text-xs leading-5 text-stone-500">
                  {item.evidence[0] ?? item.recommendation}
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-1.5">
                  <Badge variant={statusTone[item.status]}>{statusLabels[item.status]}</Badge>
                  <button
                    type="button"
                    className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-bold text-stone-700 hover:bg-white"
                    onClick={() => onOpenRoom(item)}
                  >
                    Open <ArrowRight size={13} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 border-t border-stone-200 pt-2">
                  {item.actions.map((label) => {
                    const action = decisionActionFromLabel(label);
                    if (!action) {
                      return null;
                    }
                    return (
                      <Button
                        className="h-7 px-2 text-[11px]"
                        variant={decisionActionTone[action]}
                        size="sm"
                        type="button"
                        key={label}
                        onClick={() => onAction(item, action)}
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-500">No room currently has an ask, failed run, blocker, or ready review.</p>
      )}
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
    <section className="mb-4 rounded-xl border border-stone-200 bg-stone-950 p-3 text-stone-50 shadow-sm" aria-label="Elf FM">
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
  workspace,
  draft,
  assignment,
  onDraftChange,
  onAssignmentChange,
  onCreateTask,
  onAssignTask
}: {
  product?: Product;
  tasks: Task[];
  workspace: WorkspaceSeed;
  draft: TaskDraft;
  assignment: BacklogAssignment;
  onDraftChange: (draft: TaskDraft) => void;
  onAssignmentChange: (assignment: BacklogAssignment) => void;
  onCreateTask: () => void;
  onAssignTask: (taskId: string) => void;
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
        <Badge variant={tasks.length > 0 ? "blue" : "secondary"}>{tasks.length} open</Badge>
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
        {tasks.slice(0, 4).map((task) => (
          <article className="grid gap-2 rounded-lg border border-stone-800 bg-stone-950/70 p-2.5" key={task.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-stone-100">{task.title}</p>
                <p className="mt-1 text-xs text-stone-500">{task.acceptanceCriteria.length} criteria · {task.priority}</p>
              </div>
              <Button className="h-7 px-2 text-[11px]" size="sm" type="button" onClick={() => onAssignTask(task.id)}>
                Assign
              </Button>
            </div>
            {task.acceptanceCriteria[0] ? <p className="line-clamp-2 text-xs leading-5 text-stone-400">{task.acceptanceCriteria[0]}</p> : null}
          </article>
        ))}
        {tasks.length === 0 ? <p className="rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-2 text-sm text-stone-500">No unassigned tasks for this product.</p> : null}
        {tasks.length > 4 ? <p className="text-xs font-semibold text-stone-500">{tasks.length - 4} more backlog tasks hidden in this compact view.</p> : null}
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
  onExportMarkdown,
  onOpenRoom
}: {
  brief: DailyBrief;
  selectedProductId: string;
  markdownPreview: string;
  exportStatus: string;
  onExportMarkdown: () => void;
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
    <section className="mb-4 rounded-xl border border-stone-200 bg-white p-3 shadow-sm" aria-label="Daily Brief">
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
          <Badge variant={visibleRecommendations.length > 0 ? "blue" : "secondary"}>
            {visibleRecommendations.length > 0 ? `${visibleRecommendations.length} next` : "No asks"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-2">
        {visibleRecommendations.length > 0 ? (
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-2">
            <p className="mb-1 text-[11px] font-extrabold uppercase text-blue-900">Recommended next</p>
            <div className="grid gap-1">
              {visibleRecommendations.slice(0, 3).map((item) => (
                <button
                  className="grid gap-1 rounded-md bg-white/80 px-2 py-1.5 text-left text-xs text-blue-950 hover:bg-white"
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
                  <span className="line-clamp-2 text-blue-800">{item.recommendation}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2">
          {visibleSections.map(({ section, items }) => (
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-2" key={section}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-[11px] font-extrabold uppercase text-stone-500">{briefSectionLabels[section]}</p>
                <Badge variant={items.length > 0 ? statusTone[items[0].status] : "secondary"}>{items.length}</Badge>
              </div>
              <div className="grid gap-1">
                {items.slice(0, 2).map((item) => (
                  <button
                    className="rounded-md bg-white px-2 py-1.5 text-left text-xs hover:bg-stone-100"
                    type="button"
                    key={item.id}
                    onClick={() => onOpenRoom(item)}
                  >
                    <span className="block truncate font-bold">{item.productName}</span>
                    <span className="line-clamp-2 leading-4 text-stone-600">{item.title}</span>
                  </button>
                ))}
                {items.length === 0 ? <p className="px-1 py-1 text-xs text-stone-400">None</p> : null}
              </div>
            </div>
          ))}
        </div>
        {exportStatus ? (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-1.5 text-xs font-semibold text-emerald-900">
            {exportStatus}
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
        "flex w-full items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-3 text-left transition-colors hover:border-stone-200 hover:bg-stone-50",
        selected && "border-emerald-200 bg-emerald-50"
      )}
      type="button"
      onClick={onClick}
    >
      <span className="min-w-0">
        <span className="block overflow-wrap-anywhere font-bold">{title}</span>
        {meta ? <small className="mt-1 block text-xs text-stone-500">{meta}</small> : null}
      </span>
      <span className="grid h-8 min-w-8 place-items-center rounded-md bg-stone-100 px-2 text-sm font-bold">{count}</span>
    </button>
  );
}

function ProductFolderCard({ product, inspection }: { product: Product; inspection?: ProductFolderInspection }) {
  const healthy = inspection?.exists && inspection.isDirectory && inspection.isGitRepo;
  const gateScripts = inspection?.scripts.filter((script) => script.gate).slice(0, 4) ?? [];

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
    <div className="flex justify-between rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm">
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

  return (
    <button type="button" className="text-left" onClick={onSelect}>
      <Card className={cn("min-h-[220px] transition-all hover:border-emerald-200 hover:shadow-lg", selected && "border-emerald-300 shadow-lg")}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-xs font-extrabold text-stone-500">
            <span className={cn("h-2.5 w-2.5 rounded-full", statusDot[room.status])} />
            <span>{statusLabels[room.status]}</span>
            <span className="ml-auto">{room.lastActivityAt}</span>
          </div>
          <CardTitle className="text-lg leading-tight">{room.title}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm leading-6 text-stone-600">{room.summary}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{product.name}</Badge>
            <Badge variant="outline">{elf.name}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Signal icon={<HelpCircle size={14} />} label={`${openAsks} asks`} active={openAsks > 0} />
            <Signal icon={<FileText size={14} />} label={`${readyArtifacts}/${room.artifacts.length} artifacts`} active={readyArtifacts > 0} />
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

function Signal({ icon, label, active }: { icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        active ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200" : "bg-stone-100 text-stone-600"
      )}
    >
      {icon}
      {label}
    </span>
  );
}

function RoomDetail({
  room,
  workspace,
  runs,
  promptPreview,
  diffPreview,
  checkPreview,
  codevetterPreview,
  cleanupPreview,
  transcriptPreview,
  decisionPreview,
  productMemory,
  productInspection,
  selectedMemorySection,
  memoryDraft,
  activeWorkbenchTab,
  isFocused,
  onSelectMemorySection,
  onMemoryDraftChange,
  onSaveMemory,
  onSelectWorkbenchTab,
  noteDraft,
  onNoteDraftChange,
  onSaveNote,
  onStartDryRun,
  onStartCodexReadOnly,
  onStartMode,
  onOpenPrompt,
  onOpenDiff,
  onRunCheck,
  onRunCodeVetter,
  onCleanupWorktree,
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
  diffPreview?: string;
  checkPreview?: string;
  codevetterPreview?: string;
  cleanupPreview?: string;
  transcriptPreview?: string;
  decisionPreview?: string;
  productMemory?: ProductMemory;
  productInspection?: ProductFolderInspection;
  selectedMemorySection: ProductMemorySectionKey;
  memoryDraft: string;
  activeWorkbenchTab: RoomWorkbenchTab;
  isFocused: boolean;
  onSelectMemorySection: (section: ProductMemorySectionKey) => void;
  onMemoryDraftChange: (value: string) => void;
  onSaveMemory: (section: ProductMemorySectionKey, body: string) => void;
  onSelectWorkbenchTab: (tab: RoomWorkbenchTab) => void;
  noteDraft: string;
  onNoteDraftChange: (value: string) => void;
  onSaveNote: () => void;
  onStartDryRun: () => void;
  onStartCodexReadOnly: () => void;
  onStartMode: (mode: ElfRun["mode"]) => void;
  onOpenPrompt: () => void;
  onOpenDiff: () => void;
  onRunCheck: () => void;
  onRunCodeVetter: () => void;
  onCleanupWorktree: () => void;
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
  const decisionNote = noteDraft.trim() || undefined;
  const activeMemorySection = productMemory?.sections.find((section) => section.key === selectedMemorySection);
  const gateChecklist = buildGateChecklist(room);
  const readOnlyBlocker = productInspection && (!productInspection.exists || !productInspection.isDirectory) ? "Product folder is missing or is not a directory." : undefined;
  const worktreeBlocker =
    productInspection && (!productInspection.exists || !productInspection.isDirectory)
      ? "Product folder is missing or is not a directory."
      : productInspection && !productInspection.isGitRepo
        ? "Product folder is not a git repository."
        : undefined;

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

      <section className="grid min-h-44 grid-cols-[190px_1fr] items-center gap-4 rounded-xl border border-stone-200 bg-[linear-gradient(135deg,#f8f5e8,#eef5ed_58%,#e9f0f8)] p-4 max-lg:grid-cols-1">
        <ElfWorkbench status={room.status} />
        <div>
          <Badge variant={statusTone[room.status]} className="mb-2">{statusLabels[room.status]}</Badge>
          <h3 className="text-base font-semibold">{elf.name} is assigned</h3>
          <p className="mt-2 text-sm leading-6 text-stone-600">{room.summary}</p>
        </div>
      </section>

      {ask ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <SectionTitle icon={<MessageSquare size={16} />} title="Elf asks" />
          <p className="text-sm leading-6 text-amber-950">{ask.question}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ask.options.map((option) => (
              <Button variant="outline" size="sm" type="button" key={option} onClick={() => onAnswerAsk(ask.id, option, decisionNote)}>
                {option}
              </Button>
            ))}
          </div>
          <div className="mt-3 grid gap-1 rounded-lg bg-white/70 p-3 text-sm text-amber-950">
            <strong>Recommendation</strong>
            <span>{ask.recommendation}</span>
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-[1fr_0.78fr] gap-4 rounded-xl border border-stone-200 bg-white p-4 max-lg:grid-cols-1">
        <div>
          <SectionTitle icon={<ClipboardCheck size={16} />} title="Acceptance" />
          <ul className="grid gap-2">
            {task.acceptanceCriteria.map((item) => (
              <li className="flex items-start gap-2 text-sm leading-5 text-stone-600" key={item}>
                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-700" size={15} />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <SectionTitle icon={<PanelRightOpen size={16} />} title="Actions" />
          <GateChecklist items={gateChecklist} />
          {readOnlyBlocker || worktreeBlocker ? (
            <div className="mb-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs leading-5 text-amber-200">
              {worktreeBlocker ?? readOnlyBlocker}
            </div>
          ) : null}
          <div className="grid grid-cols-3 gap-2">
            <Button className="min-w-0 px-2" variant="outline" size="sm" type="button" onClick={onStartDryRun}><Play size={15} />Dry</Button>
            <Button className="min-w-0 px-2" variant="outline" size="sm" type="button" onClick={onStartCodexReadOnly} disabled={Boolean(readOnlyBlocker)}><SquareTerminal size={15} />Read</Button>
            <Button className="min-w-0 px-2" variant="outline" size="sm" type="button" onClick={() => onStartMode("worktree-dry-run")} disabled={Boolean(worktreeBlocker)}><GitBranch size={15} />Draft</Button>
            <Button className="min-w-0 px-2" variant="outline" size="sm" type="button" onClick={() => onStartMode("codex-worktree")} disabled={Boolean(worktreeBlocker)}><Hammer size={15} />Build</Button>
            <Button className="min-w-0 px-2" variant="outline" size="sm" type="button" onClick={onOpenPrompt}><ScrollText size={15} />Prompt</Button>
            <Button className="min-w-0 px-2" variant="outline" size="sm" type="button" onClick={onGenerateTranscript}><FileText size={15} />Doc</Button>
            <Button className="min-w-0 px-2" variant="outline" size="sm" type="button" onClick={onOpenDiff}><GitBranch size={15} />Diff</Button>
            <Button className="min-w-0 px-2" variant="outline" size="sm" type="button" onClick={onRunCheck}><TestTube2 size={15} />Check</Button>
            <Button className="min-w-0 px-2" variant="outline" size="sm" type="button" onClick={onRunCodeVetter}><ShieldCheck size={15} />Vet</Button>
            <Button className="min-w-0 px-2" variant="outline" size="sm" type="button" onClick={onCleanupWorktree}><Trash2 size={15} />Clean</Button>
            <Button className="min-w-0 px-2" variant="destructive" size="sm" type="button" onClick={onKillRun} disabled={!activeRun}><CircleStop size={15} />Kill</Button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-stone-200 pt-3">
            <Button className="min-w-0 px-2" size="sm" type="button" onClick={() => onDecisionAction("approve", decisionNote)}>Approve</Button>
            <Button className="min-w-0 px-2" variant="outline" size="sm" type="button" onClick={() => onDecisionAction("request_fix", decisionNote)}>Request fix</Button>
            <Button className="min-w-0 px-2" variant="outline" size="sm" type="button" onClick={() => onDecisionAction("snooze", decisionNote)}>Snooze</Button>
            <Button className="min-w-0 px-2" variant="destructive" size="sm" type="button" onClick={() => onDecisionAction("reject", decisionNote)}>Reject</Button>
            <Button className="col-span-2 min-w-0 px-2" variant="outline" size="sm" type="button" onClick={() => onDecisionAction("retry", decisionNote)}>Retry latest run</Button>
          </div>
          {decisionPreview ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-950">
              {decisionPreview}
            </div>
          ) : null}
        </div>
      </section>

      {playbook ? (
        <section className="rounded-xl border border-stone-200 bg-white p-4">
          <SectionTitle icon={<BookOpenText size={16} />} title="Playbook" />
          <div className="grid gap-3">
            <div>
              <Badge variant="blue">{playbook.name}</Badge>
              <p className="mt-2 text-sm leading-6 text-stone-600">{playbook.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm max-lg:grid-cols-1">
              <div>
                <p className="mb-1 text-xs font-extrabold uppercase text-stone-500">Steps</p>
                <ol className="grid list-decimal gap-1 pl-4 text-stone-600">
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
        </section>
      ) : null}

      {runs.length > 0 ? (
        <section>
          <SectionTitle icon={<Activity size={16} />} title="Runs" />
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
            {runs.slice(0, 4).map((run, index) => (
              <div className={cn("flex items-center gap-3 p-3 text-sm", index !== Math.min(runs.length, 4) - 1 && "border-b border-stone-200")} key={run.id}>
                <Badge variant={run.status === "running" ? "blue" : run.status === "completed" ? "green" : run.status === "killed" ? "amber" : "red"}>
                  {run.status}
                </Badge>
                <div className="min-w-0">
                  <strong className="block truncate">{run.mode}</strong>
                  <p className="break-words text-xs text-stone-500">{run.command}</p>
                </div>
                <span className="ml-auto text-xs text-stone-500">{run.exitCode ?? "..."}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <RoomWorkbench
        room={room}
        productMemory={productMemory}
        selectedMemorySection={selectedMemorySection}
        memoryDraft={memoryDraft}
        activeMemorySection={activeMemorySection}
        activeTab={activeWorkbenchTab}
        noteDraft={noteDraft}
        onSelectTab={onSelectWorkbenchTab}
        onSelectMemorySection={onSelectMemorySection}
        onMemoryDraftChange={onMemoryDraftChange}
        onSaveMemory={onSaveMemory}
        onNoteDraftChange={onNoteDraftChange}
        onSaveNote={onSaveNote}
      />

      {promptPreview ? (
        <section>
          <SectionTitle icon={<ScrollText size={16} />} title="Run prompt" />
          <pre className="max-h-72 overflow-auto rounded-lg bg-stone-950 p-3 text-xs leading-5 text-stone-100">
            <code>{promptPreview}</code>
          </pre>
        </section>
      ) : null}

      {transcriptPreview ? (
        <section>
          <SectionTitle icon={<FileText size={16} />} title="Room transcript" />
          <pre className="max-h-96 overflow-auto rounded-lg bg-stone-950 p-3 text-xs leading-5 text-stone-100">
            <code>{transcriptPreview}</code>
          </pre>
        </section>
      ) : null}

      {diffPreview ? (
        <section>
          <SectionTitle icon={<GitBranch size={16} />} title="Diff preview" />
          <pre className="max-h-72 overflow-auto rounded-lg bg-stone-950 p-3 text-xs leading-5 text-stone-100">
            <code>{diffPreview}</code>
          </pre>
        </section>
      ) : null}

      {checkPreview ? (
        <section>
          <SectionTitle icon={<TestTube2 size={16} />} title="Check output" />
          <pre className="max-h-72 overflow-auto rounded-lg bg-stone-950 p-3 text-xs leading-5 text-stone-100">
            <code>{checkPreview}</code>
          </pre>
        </section>
      ) : null}

      {codevetterPreview ? (
        <section>
          <SectionTitle icon={<ShieldCheck size={16} />} title="CodeVetter gate" />
          <pre className="max-h-72 overflow-auto rounded-lg bg-stone-950 p-3 text-xs leading-5 text-stone-100">
            <code>{codevetterPreview}</code>
          </pre>
        </section>
      ) : null}

      {cleanupPreview ? (
        <section>
          <SectionTitle icon={<Trash2 size={16} />} title="Worktree cleanup" />
          <pre className="max-h-40 overflow-auto rounded-lg bg-stone-950 p-3 text-xs leading-5 text-stone-100">
            <code>{cleanupPreview}</code>
          </pre>
        </section>
      ) : null}

    </div>
  );
}

function RoomWorkbench({
  room,
  productMemory,
  selectedMemorySection,
  memoryDraft,
  activeMemorySection,
  activeTab,
  noteDraft,
  onSelectTab,
  onSelectMemorySection,
  onMemoryDraftChange,
  onSaveMemory,
  onNoteDraftChange,
  onSaveNote
}: {
  room: Room;
  productMemory?: ProductMemory;
  selectedMemorySection: ProductMemorySectionKey;
  memoryDraft: string;
  activeMemorySection?: ProductMemorySection;
  activeTab: RoomWorkbenchTab;
  noteDraft: string;
  onSelectTab: (tab: RoomWorkbenchTab) => void;
  onSelectMemorySection: (section: ProductMemorySectionKey) => void;
  onMemoryDraftChange: (value: string) => void;
  onSaveMemory: (section: ProductMemorySectionKey, body: string) => void;
  onNoteDraftChange: (value: string) => void;
  onSaveNote: () => void;
}) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <SectionTitle icon={<PanelRightOpen size={16} />} title="Room workbench" />
        <div className="flex rounded-lg border border-stone-200 bg-stone-50 p-1" aria-label="Room workbench tabs">
          {roomWorkbenchTabs.map((tab) => (
            <div
              className={cn(
                "flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-[11px] font-semibold transition-colors",
                activeTab === tab.id ? "text-stone-900" : "text-stone-700"
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

      {activeTab === "logs" ? <RoomLogsPanel room={room} /> : null}
      {activeTab === "artifacts" ? <RoomArtifactsPanel room={room} /> : null}
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
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
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
    <div className="grid gap-3 rounded-xl border border-stone-200 bg-white p-3">
      {room.notes.length > 0 ? (
        room.notes.map((note) => (
          <p className="text-sm leading-6 text-stone-600" key={note}>{note}</p>
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
    <div className="grid gap-3 rounded-xl border border-stone-200 bg-white p-3">
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
    <div className={cn("flex items-center gap-3 p-3", !last && "border-b border-stone-200")}>
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-stone-100">{icon}</div>
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

function GateChecklist({ items }: { items: GateChecklistItem[] }) {
  return (
    <div className="mb-3 grid gap-2 rounded-lg border border-stone-200 bg-stone-50/70 p-2.5" aria-label="Gate checklist">
      {items.map((item) => (
        <div className="flex min-w-0 items-start gap-2" key={item.id}>
          <span className={cn(
            "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border",
            item.state === "passed" && "border-emerald-200 bg-emerald-50 text-emerald-700",
            item.state === "failed" && "border-red-200 bg-red-50 text-red-700",
            item.state === "missing" && "border-amber-200 bg-amber-50 text-amber-700",
            item.state === "waiting" && "border-stone-200 bg-white text-stone-500"
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
