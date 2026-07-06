import {
  Activity,
  ArrowRight,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  CircleStop,
  ClipboardCheck,
  FileText,
  GitBranch,
  Hammer,
  HelpCircle,
  Maximize2,
  MessageSquare,
  PanelRightOpen,
  Play,
  Download,
  Inbox,
  ScrollText,
  ShieldCheck,
  Sparkles,
  SquareTerminal,
  TestTube2,
  Trash2
} from "lucide-react";
import {
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
  type ElfRun,
  type Playbook,
  type Product,
  type ProductMemory,
  type ProductMemorySectionKey,
  type Room,
  type RoomStatus,
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
  const [decisionItems, setDecisionItems] = useState<DecisionItem[]>(buildDecisionItems(seedWorkspace.rooms));
  const [dailyBrief, setDailyBrief] = useState<DailyBrief>(buildDailyBrief(seedWorkspace));
  const [productMemoryById, setProductMemoryById] = useState<Record<string, ProductMemory>>({});
  const [selectedMemorySection, setSelectedMemorySection] = useState<ProductMemorySectionKey>("PRODUCT");
  const [memoryDrafts, setMemoryDrafts] = useState<Record<string, string>>({});
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoom, setNewRoom] = useState({
    productId: seedWorkspace.products[0]?.id ?? "",
    assignedElfId: defaultRoomElfId(seedWorkspace),
    playbookId: seedWorkspace.playbooks[0]?.id ?? "",
    title: "",
    acceptanceCriteria: ""
  });

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetch(`${daemonBaseUrl}/api/workspace`), fetch(`${daemonBaseUrl}/api/needs-me`), fetch(`${daemonBaseUrl}/api/briefs/daily`)])
      .then(async ([workspaceResponse, needsResponse, briefResponse]) => {
        if (!workspaceResponse.ok || !needsResponse.ok || !briefResponse.ok) {
          throw new Error(`Daemon returned ${workspaceResponse.status}/${needsResponse.status}/${briefResponse.status}`);
        }
        return (await Promise.all([workspaceResponse.json(), needsResponse.json(), briefResponse.json()])) as [WorkspaceSeed, { items: DecisionItem[] }, DailyBrief];
      })
      .then(([nextWorkspace, needsBody, nextBrief]) => {
        if (!cancelled) {
          setWorkspace(nextWorkspace);
          setDecisionItems(needsBody.items);
          setDailyBrief(nextBrief);
          setDaemonState("local");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWorkspace(seedWorkspace);
          setDecisionItems(buildDecisionItems(seedWorkspace.rooms));
          setDailyBrief(buildDailyBrief(seedWorkspace));
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
  }, [workspace.elves]);

  useEffect(() => {
    if (daemonState !== "local" || !selectedRoomId) {
      return;
    }

    let cancelled = false;

    const refresh = async () => {
      try {
        const [workspaceResponse, runsResponse, needsResponse, briefResponse] = await Promise.all([
          fetch(`${daemonBaseUrl}/api/workspace`),
          fetch(`${daemonBaseUrl}/api/rooms/${selectedRoomId}/runs`),
          fetch(`${daemonBaseUrl}/api/needs-me`),
          fetch(`${daemonBaseUrl}/api/briefs/daily`)
        ]);

        if (!workspaceResponse.ok || !runsResponse.ok || !needsResponse.ok || !briefResponse.ok) {
          return;
        }

        const [nextWorkspace, runsBody, needsBody, nextBrief] = (await Promise.all([workspaceResponse.json(), runsResponse.json(), needsResponse.json(), briefResponse.json()])) as [
          WorkspaceSeed,
          { runs: ElfRun[] },
          { items: DecisionItem[] },
          DailyBrief
        ];

        if (!cancelled) {
          setWorkspace(nextWorkspace);
          setDecisionItems(needsBody.items);
          setDailyBrief(nextBrief);
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

  const selectedRoom = workspace.rooms.find((room) => room.id === selectedRoomId) ?? visibleRooms[0] ?? workspace.rooms[0];
  const selectedProductMemory = selectedRoom ? productMemoryById[selectedRoom.productId] : undefined;
  const selectedMemoryDraftKey = selectedRoom ? `${selectedRoom.productId}:${selectedMemorySection}` : "";
  const selectedMemorySectionBody =
    selectedMemoryDraftKey && selectedMemoryDraftKey in memoryDrafts
      ? memoryDrafts[selectedMemoryDraftKey]
      : selectedProductMemory?.sections.find((section) => section.key === selectedMemorySection)?.body ?? "";

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
      setDailyBrief((current) => buildDailyBrief({ ...workspace, rooms: workspace.rooms.map((room) => (room.id === roomId ? body.room : room)) }, current.generatedAt));
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
      return;
    }

    const body = (await response.json()) as { room: Room; run?: ElfRun; workspace: WorkspaceSeed; needs: DecisionItem[] };
    setWorkspace(body.workspace);
    setDecisionItems(body.needs);
    setDailyBrief(buildDailyBrief(body.workspace));
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

  const importFleetRegistry = async () => {
    const response = await fetch(`${daemonBaseUrl}/api/import/fleet-registry`, { method: "POST" });
    if (!response.ok) {
      setDaemonState("fallback");
      return;
    }
    const body = (await response.json()) as { workspace: WorkspaceSeed };
    setWorkspace(body.workspace);
    setDecisionItems(buildDecisionItems(body.workspace.rooms));
    setDailyBrief(buildDailyBrief(body.workspace));
    setDaemonState("local");
    setNewRoom((current) => ({
      ...current,
      productId: body.workspace.products[0]?.id ?? current.productId,
      assignedElfId: body.workspace.elves.some((elf) => elf.id === current.assignedElfId) ? current.assignedElfId : defaultRoomElfId(body.workspace)
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
    setSelectedProductId(body.room.productId);
    setSelectedRoomId(body.room.id);
    setNewRoom((current) => ({ ...current, title: "", acceptanceCriteria: "" }));
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

  return (
    <main className="grid h-screen min-h-[760px] min-w-[1040px] grid-cols-[minmax(220px,18vw)_minmax(380px,1fr)_minmax(380px,34vw)] gap-2.5 bg-[radial-gradient(circle_at_78%_12%,rgba(47,105,177,0.14),transparent_26%),linear-gradient(120deg,rgba(255,255,255,0.78),transparent_35%),#edf0ea] p-2.5 text-stone-900 max-lg:flex max-lg:h-auto max-lg:min-w-0 max-lg:flex-col">
      <aside className="min-w-[220px] max-w-[360px] resize-x overflow-auto rounded-l-2xl rounded-r-md border border-stone-200 bg-[#fbfbf7]/95 p-4 shadow-2xl shadow-stone-900/10 max-lg:w-full max-lg:max-w-none max-lg:resize-none max-lg:rounded-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-stone-900 text-stone-50">
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

        <Button className="mt-3 w-full" variant="outline" size="sm" type="button" onClick={importFleetRegistry}>
          <Download size={14} />
          Import fleet registry
        </Button>

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

      <section className="min-w-[380px] resize-x overflow-auto rounded-md border border-stone-200 bg-[#fbfbf7]/95 p-4 shadow-2xl shadow-stone-900/10 max-lg:w-full max-lg:min-w-0 max-lg:resize-none max-lg:rounded-2xl" aria-label="Task rooms">
        <header className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase text-stone-500">Task rooms</p>
            <h2 className="text-2xl font-bold tracking-normal">
              {selectedProductId === "all" ? "Every active room" : workspace.products.find((item) => item.id === selectedProductId)?.name}
            </h2>
          </div>
          <div className="flex gap-2">
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

        <DailyBriefPanel
          brief={dailyBrief}
          selectedProductId={selectedProductId}
          onOpenRoom={(item) => {
            setSelectedProductId(item.productId);
            setSelectedRoomId(item.roomId);
            setIsCreatingRoom(false);
          }}
        />

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
                  className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm"
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
                  className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm"
                  value={newRoom.title}
                  onChange={(event) => setNewRoom((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Fix flaky onboarding test"
                />
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                Elf
                <select
                  className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm"
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
                  className="h-10 rounded-md border border-stone-200 bg-white px-3 text-sm"
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

        <div className="grid grid-cols-[repeat(auto-fill,minmax(245px,1fr))] gap-3">
          {visibleRooms.map((room) => (
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

      <section className="min-w-0 overflow-auto rounded-l-md rounded-r-2xl border border-stone-200 bg-[#fbfbf7]/95 shadow-2xl shadow-stone-900/10 max-lg:rounded-2xl" aria-label="Selected room">
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
          productMemory={selectedProductMemory}
          selectedMemorySection={selectedMemorySection}
          memoryDraft={selectedMemorySectionBody}
          onSelectMemorySection={setSelectedMemorySection}
          onMemoryDraftChange={(value) => setMemoryDrafts((current) => ({ ...current, [selectedMemoryDraftKey]: value }))}
          onSaveMemory={(section, body) => saveProductMemorySection(selectedRoom.productId, section, body)}
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
        />
      </section>
    </main>
  );
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
  onOpenRoom
}: {
  brief: DailyBrief;
  selectedProductId: string;
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
        <Badge variant={visibleRecommendations.length > 0 ? "blue" : "secondary"}>
          {visibleRecommendations.length > 0 ? `${visibleRecommendations.length} next` : "No asks"}
        </Badge>
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
  productMemory,
  selectedMemorySection,
  memoryDraft,
  onSelectMemorySection,
  onMemoryDraftChange,
  onSaveMemory,
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
  onDecisionAction
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
  productMemory?: ProductMemory;
  selectedMemorySection: ProductMemorySectionKey;
  memoryDraft: string;
  onSelectMemorySection: (section: ProductMemorySectionKey) => void;
  onMemoryDraftChange: (value: string) => void;
  onSaveMemory: (section: ProductMemorySectionKey, body: string) => void;
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
}) {
  const product = roomProduct(workspace, room);
  const elf = roomElf(workspace, room);
  const task = roomTask(workspace, room);
  const playbook = roomPlaybook(workspace, room);
  const ask = room.asks[0];
  const activeRun = runs.find((run) => run.status === "running");
  const decisionNote = noteDraft.trim() || undefined;
  const activeMemorySection = productMemory?.sections.find((section) => section.key === selectedMemorySection);

  return (
    <div className="grid gap-4 p-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase text-stone-500">{product.name} · {task.priority} priority</p>
          <h2 className="text-2xl font-bold tracking-normal">{room.title}</h2>
        </div>
        <Button variant="outline" size="icon" type="button" aria-label="Expand room">
          <Maximize2 size={17} />
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
              <Button variant="outline" size="sm" type="button" key={option}>
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
          <div className="grid grid-cols-3 gap-2">
            <Button className="min-w-0 px-2" variant="outline" size="sm" type="button" onClick={onStartDryRun}><Play size={15} />Dry</Button>
            <Button className="min-w-0 px-2" variant="outline" size="sm" type="button" onClick={onStartCodexReadOnly}><SquareTerminal size={15} />Read</Button>
            <Button className="min-w-0 px-2" variant="outline" size="sm" type="button" onClick={() => onStartMode("worktree-dry-run")}><GitBranch size={15} />Draft</Button>
            <Button className="min-w-0 px-2" variant="outline" size="sm" type="button" onClick={() => onStartMode("codex-worktree")}><Hammer size={15} />Build</Button>
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

      <section>
        <SectionTitle icon={<ScrollText size={16} />} title="Logs" />
        <div className="overflow-hidden rounded-lg bg-stone-950 font-mono text-xs text-stone-100">
          {room.logs.map((log) => (
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
          ))}
        </div>
      </section>

      <section>
        <SectionTitle icon={<FileText size={16} />} title="Artifacts" />
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          {room.artifacts.map((artifact, index) => (
            <ArtifactRow key={artifact.id} artifact={artifact} last={index === room.artifacts.length - 1} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle icon={<BookOpenText size={16} />} title="Product memory" />
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
      </section>

      <section>
        <SectionTitle icon={<Activity size={16} />} title="Room documentation" />
        <div className="grid gap-3 rounded-xl border border-stone-200 bg-white p-3">
          {room.notes.map((note) => (
            <p className="text-sm leading-6 text-stone-600" key={note}>{note}</p>
          ))}
          <Separator />
          <Textarea value={noteDraft} onChange={(event) => onNoteDraftChange(event.target.value)} placeholder="Add context for this room..." />
          <div className="flex justify-end">
            <Button type="button" size="sm" onClick={onSaveNote} disabled={noteDraft.trim().length === 0}>
              Add room note
            </Button>
          </div>
        </div>
      </section>
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
