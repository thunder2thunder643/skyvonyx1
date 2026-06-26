import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listDatasets, createDataset, deleteDataset } from "@/lib/datasets.functions";
import { Logo } from "@/components/skyvonyx/Logo";
import { toast } from "sonner";
import { Upload, Trash2, Map, Plus, LogOut, Folder, Search, Shield, Image as ImageIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/workspace")({
  head: () => ({ meta: [{ title: "Workspace — Skyvonyx" }] }),
  component: WorkspacePage,
});

function WorkspacePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(listDatasets);
  const create = useServerFn(createDataset);
  const del = useServerFn(deleteDataset);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const datasets = useQuery({ queryKey: ["datasets"], queryFn: () => list() });

  const removeMutation = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["datasets"] });
      toast.success("Dataset deleted");
      setConfirmDelete(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${uid}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("satellite-images").upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;

        let width: number | undefined, height: number | undefined;
        if (file.type.startsWith("image/")) {
          const dims = await new Promise<{ w: number; h: number }>((res) => {
            const img = new Image();
            img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight });
            img.onerror = () => res({ w: 0, h: 0 });
            img.src = URL.createObjectURL(file);
          });
          width = dims.w || undefined; height = dims.h || undefined;
        }
        await create({ data: {
          name: file.name,
          storage_path: path,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
          width, height,
        }});
      }
      qc.invalidateQueries({ queryKey: ["datasets"] });
      toast.success(`${files.length} dataset(s) uploaded`);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  const filtered = (datasets.data ?? []).filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div
      className="min-h-screen"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOver(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
      }}
    >
      {dragOver && (
        <div className="fixed inset-0 z-40 pointer-events-none border-2 border-dashed border-gold bg-background/60 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <Upload className="size-12 text-gold mx-auto mb-3" />
            <div className="font-display text-xl uppercase tracking-[0.25em] text-gold-gradient">Drop to upload</div>
            <p className="text-xs text-muted-foreground mt-2 uppercase tracking-[0.2em]">PNG, JPG, TIFF</p>
          </div>
        </div>
      )}
      <header className="border-b border-border/60 backdrop-blur-md bg-background/50 sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3"><Logo className="h-6" /></Link>
          <nav className="flex items-center gap-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <span className="text-gold">Datasets</span>
            <Link to="/security" className="hover:text-gold flex items-center gap-1.5"><Shield className="size-3.5" /> Security</Link>
            <button onClick={signOut} className="hover:text-gold flex items-center gap-1.5"><LogOut className="size-3.5" /> Sign out</button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Operator Console</p>
            <h1 className="font-display text-3xl text-gold-gradient mt-1">Satellite Datasets</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              Upload satellite imagery, then open a scene to label objects and run AI detection.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="relative" aria-label="Search datasets">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search datasets…"
                aria-label="Search datasets"
                className="bg-secondary/40 border border-border rounded-sm pl-9 pr-3 py-2 text-sm w-56 focus:border-gold focus:outline-none"
              />
            </label>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-label="Upload satellite imagery"
              title="Upload satellite imagery (or drag files anywhere)"
              className="bg-gold-gradient text-primary-foreground font-bold uppercase tracking-[0.2em] text-xs px-4 py-2.5 rounded-sm glow-gold-sm hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center gap-2"
            >
              <Upload className="size-4" />{uploading ? "Uploading…" : "Upload Imagery"}
            </button>
          </div>
        </div>

        <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground/70 mb-8">
          Tip — drag image files anywhere on this page to upload.
        </p>

        {datasets.isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" aria-busy="true" aria-label="Loading datasets">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-panel rounded-md p-5 animate-pulse">
                <div className="aspect-video bg-secondary/40 rounded-sm mb-4" />
                <div className="h-3 w-2/3 bg-secondary/60 rounded-sm mb-2" />
                <div className="h-2 w-1/3 bg-secondary/40 rounded-sm" />
              </div>
            ))}
          </div>
        )}

        {!datasets.isLoading && filtered.length === 0 && (
          <EmptyState
            onUpload={() => fileRef.current?.click()}
            searching={!!search && (datasets.data ?? []).length > 0}
            onClearSearch={() => setSearch("")}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((d) => (
            <DatasetCard
              key={d.id}
              dataset={d}
              onDelete={() => setConfirmDelete({ id: d.id, name: d.name })}
            />
          ))}
        </div>
      </main>

      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-title"
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="glass-panel hud-corners rounded-md p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-delete-title" className="font-display text-lg text-gold-gradient mb-2">Delete dataset?</h2>
            <p className="text-sm text-muted-foreground mb-1 break-all">
              <span className="text-foreground">{confirmDelete.name}</span>
            </p>
            <p className="text-xs text-muted-foreground mb-5">
              This permanently removes the image and any saved annotations.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => removeMutation.mutate(confirmDelete.id)}
                disabled={removeMutation.isPending}
                className="flex-1 bg-destructive/80 hover:bg-destructive text-destructive-foreground font-bold uppercase tracking-[0.2em] text-xs py-2.5 rounded-sm disabled:opacity-50"
              >
                {removeMutation.isPending ? "Deleting…" : "Delete"}
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground border border-border rounded-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DatasetCard({ dataset, onDelete }: { dataset: any; onDelete: () => void }) {
  return (
    <div className="glass-panel hud-corners rounded-md p-5 group hover:border-gold/40 transition-colors">
      <div className="aspect-video bg-secondary/40 rounded-sm grid-bg mb-4 flex items-center justify-center text-muted-foreground">
        <Map className="size-10 opacity-40" />
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-1">Scene</div>
          <h3 className="font-display text-sm truncate text-foreground">{dataset.name}</h3>
          <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
            {dataset.width && dataset.height ? `${dataset.width}×${dataset.height}` : "—"} · {(dataset.size_bytes / 1024).toFixed(0)} KB
          </p>
        </div>
        <button
          onClick={onDelete}
          aria-label={`Delete dataset ${dataset.name}`}
          title="Delete dataset"
          className="shrink-0 p-1.5 -m-1.5 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <Link
        to="/workspace/$datasetId"
        params={{ datasetId: dataset.id }}
        aria-label={`Open ${dataset.name} in labeler`}
        className="mt-4 block text-center text-xs uppercase tracking-[0.2em] font-bold bg-secondary border border-border hover:border-gold hover:text-gold transition-colors rounded-sm py-2"
      >
        Open in Labeler →
      </Link>
    </div>
  );
}

function EmptyState({ onUpload, searching, onClearSearch }: { onUpload: () => void; searching?: boolean; onClearSearch?: () => void }) {
  if (searching) {
    return (
      <div className="glass-panel rounded-md p-10 text-center">
        <Search className="size-10 mx-auto text-gold/60 mb-3" />
        <h2 className="font-display text-lg mb-2">No matches</h2>
        <p className="text-sm text-muted-foreground mb-5">Try a different name, or clear the search to see everything.</p>
        <button onClick={onClearSearch} className="text-xs uppercase tracking-[0.2em] border border-border hover:border-gold hover:text-gold px-4 py-2 rounded-sm">
          Clear search
        </button>
      </div>
    );
  }
  return (
    <div className="glass-panel rounded-md p-12 text-center">
      <Folder className="size-12 mx-auto text-gold/60 mb-4" />
      <h2 className="font-display text-xl mb-2">No datasets yet</h2>
      <p className="text-sm text-muted-foreground mb-2 max-w-md mx-auto">
        Upload your first satellite scene to begin AI labeling. You can drag images directly onto this page.
      </p>
      <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground/70 mb-6 flex items-center justify-center gap-2">
        <ImageIcon className="size-3.5" /> PNG, JPG, TIFF supported
      </p>
      <button onClick={onUpload} className="bg-gold-gradient text-primary-foreground font-bold uppercase tracking-[0.2em] text-xs px-5 py-2.5 rounded-sm inline-flex items-center gap-2">
        <Plus className="size-4" /> Upload imagery
      </button>
    </div>
  );
}