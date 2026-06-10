import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listDatasets, createDataset, deleteDataset } from "@/lib/datasets.functions";
import { Logo } from "@/components/skyvonyx/Logo";
import { toast } from "sonner";
import { Upload, Trash2, Map, Plus, LogOut, Folder, Search, Shield } from "lucide-react";

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

  const datasets = useQuery({ queryKey: ["datasets"], queryFn: () => list() });

  const removeMutation = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["datasets"] }); toast.success("Dataset deleted"); },
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
    <div className="min-h-screen">
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
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Operator Console</p>
            <h1 className="font-display text-3xl text-gold-gradient mt-1">Satellite Datasets</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                className="bg-secondary/40 border border-border rounded-sm pl-9 pr-3 py-2 text-sm w-56 focus:border-gold focus:outline-none" />
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="bg-gold-gradient text-primary-foreground font-bold uppercase tracking-[0.2em] text-xs px-4 py-2.5 rounded-sm glow-gold-sm hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center gap-2"
            >
              <Upload className="size-4" />{uploading ? "Uploading…" : "Upload Imagery"}
            </button>
          </div>
        </div>

        {datasets.isLoading && <div className="text-sm text-muted-foreground">Loading datasets…</div>}

        {!datasets.isLoading && filtered.length === 0 && (
          <EmptyState onUpload={() => fileRef.current?.click()} />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((d) => (
            <DatasetCard key={d.id} dataset={d} onDelete={() => removeMutation.mutate(d.id)} />
          ))}
        </div>
      </main>
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
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-1">Scene</div>
          <h3 className="font-display text-sm truncate text-foreground">{dataset.name}</h3>
          <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
            {dataset.width && dataset.height ? `${dataset.width}×${dataset.height}` : "—"} · {(dataset.size_bytes / 1024).toFixed(0)} KB
          </p>
        </div>
        <button onClick={onDelete} className="text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="size-4" />
        </button>
      </div>
      <Link
        to="/workspace/$datasetId"
        params={{ datasetId: dataset.id }}
        className="mt-4 block text-center text-xs uppercase tracking-[0.2em] font-bold bg-secondary border border-border hover:border-gold hover:text-gold transition-colors rounded-sm py-2"
      >
        Open in Labeler →
      </Link>
    </div>
  );
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="glass-panel rounded-md p-12 text-center">
      <Folder className="size-12 mx-auto text-gold/60 mb-4" />
      <h2 className="font-display text-xl mb-2">No datasets yet</h2>
      <p className="text-sm text-muted-foreground mb-6">Upload your first satellite scene to begin AI labeling.</p>
      <button onClick={onUpload} className="bg-gold-gradient text-primary-foreground font-bold uppercase tracking-[0.2em] text-xs px-5 py-2.5 rounded-sm inline-flex items-center gap-2">
        <Plus className="size-4" /> Upload imagery
      </button>
    </div>
  );
}