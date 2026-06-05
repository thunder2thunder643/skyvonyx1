import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState, useRef } from "react";
import { getDataset } from "@/lib/datasets.functions";
import { runInference, saveAnnotations } from "@/lib/annotations.functions";
import { LabelingCanvas, type AnnObject, type Tool } from "@/components/skyvonyx/LabelingCanvas";
import { Logo } from "@/components/skyvonyx/Logo";
import {
  ArrowLeft, MousePointer2, Square, Hand, Layers, Eye, EyeOff,
  Sparkles, Download, Save, Trash2, ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/workspace/$datasetId")({
  head: () => ({ meta: [{ title: "Labeler — Skyvonyx" }] }),
  component: LabelerPage,
});

const PALETTE: Record<string, string> = {
  building: "#ef4444", road: "#3b82f6", water: "#06b6d4",
  vehicle: "#eab308", forest: "#22c55e", tree: "#22c55e",
  field: "#84cc16", aircraft: "#a855f7", ship: "#0ea5e9",
};
const colorFor = (l: string) => PALETTE[l.toLowerCase()] ?? "#F5D66B";

function LabelerPage() {
  const { datasetId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchDataset = useServerFn(getDataset);
  const infer = useServerFn(runInference);
  const save = useServerFn(saveAnnotations);

  const dq = useQuery({
    queryKey: ["dataset", datasetId],
    queryFn: () => fetchDataset({ data: { id: datasetId } }),
  });

  const [objects, setObjects] = useState<AnnObject[]>([]);
  const [tool, setTool] = useState<Tool>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showOverlays, setShowOverlays] = useState(true);
  const [hiddenLabels, setHiddenLabels] = useState<Set<string>>(new Set());
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved">("idle");
  const initialLoaded = useRef(false);

  // Hydrate from server
  useEffect(() => {
    if (dq.data?.annotation?.objects && !initialLoaded.current) {
      setObjects(dq.data.annotation.objects as AnnObject[]);
      setSavedAt(dq.data.annotation.updated_at);
      initialLoaded.current = true;
    } else if (dq.data && !dq.data.annotation && !initialLoaded.current) {
      initialLoaded.current = true;
    }
  }, [dq.data]);

  // Autosave debounce
  useEffect(() => {
    if (!initialLoaded.current) return;
    const t = setTimeout(async () => {
      try {
        setSavingState("saving");
        const r = await save({ data: { dataset_id: datasetId, objects } });
        setSavedAt(r.savedAt);
        setSavingState("saved");
        setTimeout(() => setSavingState("idle"), 1200);
      } catch (e: any) {
        setSavingState("idle");
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [objects, datasetId, save]);

  const labels = useMemo(() => {
    const m = new Map<string, { color: string; count: number }>();
    for (const o of objects) {
      const c = m.get(o.label);
      if (c) c.count++;
      else m.set(o.label, { color: o.color ?? colorFor(o.label), count: 1 });
    }
    return Array.from(m.entries()).map(([label, v]) => ({ label, ...v }));
  }, [objects]);

  const visibleLabels = useMemo(
    () => new Set(labels.filter(l => !hiddenLabels.has(l.label)).map(l => l.label)),
    [labels, hiddenLabels],
  );

  const selected = objects.find((o) => o.id === selectedId) ?? null;

  const inferMutation = useMutation({
    mutationFn: () => infer({ data: { dataset_id: datasetId } }),
    onSuccess: (r) => {
      // Merge AI detections (replace AI-source, keep manual)
      setObjects((prev) => [...prev.filter(o => o.source === "manual"), ...(r.objects as AnnObject[])]);
      toast.success(`AI detected ${r.count} objects${r.fallback ? " (demo mode)" : ""}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  function toggleLabel(l: string) {
    setHiddenLabels((s) => {
      const n = new Set(s); n.has(l) ? n.delete(l) : n.add(l); return n;
    });
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify({ dataset_id: datasetId, objects }, null, 2)],
      { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `annotations-${datasetId}.json`;
    a.click();
  }

  function exportCOCO() {
    const ds = dq.data?.dataset;
    const categories = Array.from(new Set(objects.map(o => o.label)))
      .map((name, i) => ({ id: i + 1, name }));
    const catId = (n: string) => categories.find(c => c.name === n)!.id;
    const coco = {
      images: [{ id: 1, file_name: ds?.name ?? "image", width: ds?.width, height: ds?.height }],
      categories,
      annotations: objects.map((o, i) => ({
        id: i + 1, image_id: 1, category_id: catId(o.label),
        bbox: [o.bbox.x, o.bbox.y, o.bbox.width, o.bbox.height],
        area: o.bbox.width * o.bbox.height, iscrowd: 0,
      })),
    };
    const blob = new Blob([JSON.stringify(coco, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `coco-${datasetId}.json`;
    a.click();
  }

  if (dq.isLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading scene…</div>;
  if (!dq.data?.signedUrl) return <div className="min-h-screen flex items-center justify-center text-destructive">Image unavailable</div>;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="h-14 border-b border-border/60 backdrop-blur-md bg-background/60 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/workspace" className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-gold">
            <ChevronLeft className="size-4" /> Datasets
          </Link>
          <span className="text-muted-foreground/40">|</span>
          <Logo className="h-5" />
          <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground hidden md:inline">
            {dq.data.dataset.name}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <SaveIndicator state={savingState} savedAt={savedAt} />
          <button onClick={() => inferMutation.mutate()} disabled={inferMutation.isPending}
            className="bg-gold-gradient text-primary-foreground font-bold uppercase tracking-[0.2em] text-xs px-3.5 py-2 rounded-sm glow-gold-sm flex items-center gap-2 disabled:opacity-60">
            <Sparkles className="size-4" /> {inferMutation.isPending ? "Inferring…" : "Run AI"}
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Left sidebar */}
        <aside className="w-64 border-r border-border/60 bg-card/40 backdrop-blur-md flex flex-col">
          <SidebarSection title="Classes">
            {labels.length === 0 && <div className="text-xs text-muted-foreground italic">No detections yet</div>}
            {labels.map(l => (
              <button key={l.label} onClick={() => toggleLabel(l.label)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-sm hover:bg-secondary/50 group">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="size-2.5 rounded-sm shrink-0" style={{ background: l.color }} />
                  <span className="text-xs uppercase tracking-wider truncate">{l.label}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span>{l.count}</span>
                  {hiddenLabels.has(l.label) ? <EyeOff className="size-3" /> : <Eye className="size-3 opacity-60" />}
                </div>
              </button>
            ))}
          </SidebarSection>

          <SidebarSection title="Layers">
            <ToggleRow label="AI Overlays" value={showOverlays} onChange={setShowOverlays} />
          </SidebarSection>

          <SidebarSection title="Scene Info">
            <InfoRow label="Dimensions" value={`${dq.data.dataset.width ?? "?"}×${dq.data.dataset.height ?? "?"}`} />
            <InfoRow label="Size" value={`${((dq.data.dataset.size_bytes ?? 0) / 1024).toFixed(0)} KB`} />
            <InfoRow label="Format" value={dq.data.dataset.mime_type ?? "—"} />
          </SidebarSection>
        </aside>

        {/* Center: canvas + tools */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-12 border-b border-border/60 bg-card/30 flex items-center gap-1 px-3 shrink-0">
            <ToolButton active={tool === "select"} onClick={() => setTool("select")} icon={<MousePointer2 className="size-4" />} label="Select" hint="V" />
            <ToolButton active={tool === "bbox"} onClick={() => setTool("bbox")} icon={<Square className="size-4" />} label="BBox" hint="B" />
            <ToolButton active={tool === "pan"} onClick={() => setTool("pan")} icon={<Hand className="size-4" />} label="Pan" hint="H" />
            <div className="mx-2 h-6 w-px bg-border" />
            <button onClick={() => setShowOverlays(s => !s)}
              className="px-2.5 py-1.5 text-xs uppercase tracking-wider rounded-sm hover:bg-secondary/60 flex items-center gap-1.5">
              <Layers className="size-3.5" /> Overlays
            </button>
            <div className="ml-auto text-[10px] uppercase tracking-[0.2em] text-muted-foreground hidden md:flex items-center gap-3">
              <span>Scroll: Zoom</span><span>Alt+Drag: Pan</span><span>Del: Remove</span><span>F: Fit</span>
            </div>
          </div>
          <div className="flex-1 relative">
            <LabelingCanvas
              imageUrl={dq.data.signedUrl}
              objects={objects}
              setObjects={setObjects}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              tool={tool}
              visibleLabels={visibleLabels}
              showOverlays={showOverlays}
            />
          </div>
        </div>

        {/* Right sidebar */}
        <aside className="w-72 border-l border-border/60 bg-card/40 backdrop-blur-md flex flex-col">
          <SidebarSection title="Selection">
            {!selected && <div className="text-xs text-muted-foreground italic">Select an object to edit</div>}
            {selected && (
              <div className="space-y-3">
                <FieldRow label="Label">
                  <input
                    value={selected.label}
                    onChange={(e) => {
                      const v = e.target.value;
                      setObjects(prev => prev.map(o => o.id === selected.id ? { ...o, label: v, color: colorFor(v) } : o));
                    }}
                    className="w-full bg-secondary/40 border border-border rounded-sm px-2 py-1 text-xs focus:border-gold focus:outline-none"
                  />
                </FieldRow>
                {selected.confidence !== undefined && (
                  <FieldRow label="Confidence">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-gold-gradient" style={{ width: `${selected.confidence * 100}%` }} />
                      </div>
                      <span className="text-xs font-mono w-10 text-right">{Math.round(selected.confidence * 100)}%</span>
                    </div>
                  </FieldRow>
                )}
                <FieldRow label="Source">
                  <span className="text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-sm"
                    style={{ background: selected.source === "ai" ? "#3b82f622" : "#F5D66B22", color: selected.source === "ai" ? "#3b82f6" : "#F5D66B" }}>
                    {selected.source}
                  </span>
                </FieldRow>
                <div className="grid grid-cols-2 gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <div>X<div className="text-foreground font-mono mt-0.5">{Math.round(selected.bbox.x)}</div></div>
                  <div>Y<div className="text-foreground font-mono mt-0.5">{Math.round(selected.bbox.y)}</div></div>
                  <div>W<div className="text-foreground font-mono mt-0.5">{Math.round(selected.bbox.width)}</div></div>
                  <div>H<div className="text-foreground font-mono mt-0.5">{Math.round(selected.bbox.height)}</div></div>
                </div>
                <button
                  onClick={() => {
                    setObjects(p => p.filter(o => o.id !== selected.id));
                    setSelectedId(null);
                  }}
                  className="w-full text-xs uppercase tracking-wider bg-destructive/20 hover:bg-destructive/30 text-destructive rounded-sm py-1.5 flex items-center justify-center gap-1.5">
                  <Trash2 className="size-3.5" /> Delete
                </button>
              </div>
            )}
          </SidebarSection>

          <SidebarSection title="Export">
            <button onClick={exportJSON} className="w-full text-xs uppercase tracking-wider bg-secondary hover:bg-secondary/70 rounded-sm py-2 flex items-center justify-center gap-2">
              <Download className="size-3.5" /> JSON
            </button>
            <button onClick={exportCOCO} className="w-full text-xs uppercase tracking-wider bg-secondary hover:bg-secondary/70 rounded-sm py-2 flex items-center justify-center gap-2">
              <Download className="size-3.5" /> COCO
            </button>
          </SidebarSection>

          <div className="mt-auto p-4 border-t border-border/60 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {objects.length} object(s) · {labels.length} class(es)
          </div>
        </aside>
      </div>
    </div>
  );
}

function SidebarSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 border-b border-border/60 space-y-2">
      <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-display">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function ToolButton({ active, onClick, icon, label, hint }: any) {
  return (
    <button onClick={onClick}
      className={`px-2.5 py-1.5 text-xs uppercase tracking-wider rounded-sm flex items-center gap-1.5 transition-colors ${active ? "bg-gold-gradient text-primary-foreground" : "hover:bg-secondary/60"}`}>
      {icon} {label} <span className="opacity-60 text-[10px]">{hint}</span>
    </button>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="w-full flex items-center justify-between px-2 py-1.5 rounded-sm hover:bg-secondary/50">
      <span className="text-xs uppercase tracking-wider">{label}</span>
      <span className={`w-8 h-4 rounded-full relative transition-colors ${value ? "bg-gold-gradient" : "bg-secondary"}`}>
        <span className={`absolute top-0.5 size-3 rounded-full bg-background transition-all ${value ? "left-4" : "left-0.5"}`} />
      </span>
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-muted-foreground uppercase tracking-wider text-[10px]">{label}</span>
      <span className="font-mono text-foreground truncate ml-2">{value}</span>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-1">{label}</div>
      {children}
    </div>
  );
}

function SaveIndicator({ state, savedAt }: { state: "idle" | "saving" | "saved"; savedAt: string | null }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.2em] flex items-center gap-1.5 text-muted-foreground">
      <span className={`size-1.5 rounded-full ${state === "saving" ? "bg-yellow-400 animate-pulse" : state === "saved" ? "bg-emerald-400" : "bg-muted-foreground/40"}`} />
      {state === "saving" ? "Saving…" : savedAt ? `Saved ${timeAgo(savedAt)}` : "Auto-save on"}
    </div>
  );
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}