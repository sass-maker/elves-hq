import {
  Activity,
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
  RotateCcw,
  Download,
  ScrollText,
  Sparkles,
  SquareTerminal,
  TestTube2
} from "lucide-react";
import { seedWorkspace, statusLabels, type Artifact, type Product, type Room, type RoomStatus, type WorkspaceSeed } from "@elves-hq/core";
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

export function App() {
  const [workspace, setWorkspace] = useState<WorkspaceSeed>(seedWorkspace);
  const [daemonState, setDaemonState] = useState<"connecting" | "local" | "fallback">("connecting");
  const [selectedProductId, setSelectedProductId] = useState<string>("all");
  const [selectedRoomId, setSelectedRoomId] = useState<string>(seedWorkspace.rooms[1]?.id ?? "");
  const [roomNotes, setRoomNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    fetch(`${daemonBaseUrl}/api/workspace`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Daemon returned ${response.status}`);
        }
        return (await response.json()) as WorkspaceSeed;
      })
      .then((nextWorkspace) => {
        if (!cancelled) {
          setWorkspace(nextWorkspace);
          setDaemonState("local");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWorkspace(seedWorkspace);
          setDaemonState("fallback");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleRooms = useMemo(() => {
    const rooms =
      selectedProductId === "all"
        ? workspace.rooms
        : workspace.rooms.filter((room) => room.productId === selectedProductId);

    return [...rooms].sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));
  }, [selectedProductId, workspace.rooms]);

  const selectedRoom = workspace.rooms.find((room) => room.id === selectedRoomId) ?? visibleRooms[0] ?? workspace.rooms[0];

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
      setRoomNotes((current) => ({ ...current, [roomId]: "" }));
    } catch {
      setWorkspace((current) => ({
        ...current,
        rooms: current.rooms.map((room) => (room.id === roomId ? { ...room, notes: [...room.notes, note] } : room))
      }));
      setRoomNotes((current) => ({ ...current, [roomId]: "" }));
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
    setDaemonState("local");
  };

  return (
    <main className="grid h-screen min-h-[760px] min-w-[1120px] grid-cols-[minmax(240px,18vw)_minmax(430px,1fr)_minmax(430px,34vw)] gap-2.5 bg-[radial-gradient(circle_at_78%_12%,rgba(47,105,177,0.14),transparent_26%),linear-gradient(120deg,rgba(255,255,255,0.78),transparent_35%),#edf0ea] p-2.5 text-stone-900 max-lg:flex max-lg:h-auto max-lg:min-w-0 max-lg:flex-col">
      <aside className="min-w-[230px] max-w-[380px] resize-x overflow-auto rounded-l-2xl rounded-r-md border border-stone-200 bg-[#fbfbf7]/95 p-4 shadow-2xl shadow-stone-900/10 max-lg:w-full max-lg:max-w-none max-lg:resize-none max-lg:rounded-2xl">
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

      <section className="min-w-[420px] resize-x overflow-auto rounded-md border border-stone-200 bg-[#fbfbf7]/95 p-4 shadow-2xl shadow-stone-900/10 max-lg:w-full max-lg:min-w-0 max-lg:resize-none max-lg:rounded-2xl" aria-label="Task rooms">
        <header className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase text-stone-500">Task rooms</p>
            <h2 className="text-2xl font-bold tracking-normal">
              {selectedProductId === "all" ? "Every active room" : workspace.products.find((item) => item.id === selectedProductId)?.name}
            </h2>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" type="button" aria-label="Start room">
              <Play size={17} />
            </Button>
            <Button type="button">
              <Hammer size={16} />
              New room
            </Button>
          </div>
        </header>

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

      <section className="overflow-auto rounded-l-md rounded-r-2xl border border-stone-200 bg-[#fbfbf7]/95 shadow-2xl shadow-stone-900/10 max-lg:rounded-2xl" aria-label="Selected room">
        <RoomDetail
          room={selectedRoom}
          workspace={workspace}
          noteDraft={roomNotes[selectedRoom.id] ?? ""}
          onNoteDraftChange={(value) => setRoomNotes((current) => ({ ...current, [selectedRoom.id]: value }))}
          onSaveNote={() => saveRoomNote(selectedRoom.id)}
        />
      </section>
    </main>
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
  noteDraft,
  onNoteDraftChange,
  onSaveNote
}: {
  room: Room;
  workspace: WorkspaceSeed;
  noteDraft: string;
  onNoteDraftChange: (value: string) => void;
  onSaveNote: () => void;
}) {
  const product = roomProduct(workspace, room);
  const elf = roomElf(workspace, room);
  const task = roomTask(workspace, room);
  const ask = room.asks[0];

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
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" type="button"><SquareTerminal size={15} />Logs</Button>
            <Button variant="outline" size="sm" type="button"><GitBranch size={15} />Diff</Button>
            <Button variant="outline" size="sm" type="button"><RotateCcw size={15} />Retry</Button>
            <Button variant="destructive" size="sm" type="button"><CircleStop size={15} />Kill</Button>
          </div>
        </div>
      </section>

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
