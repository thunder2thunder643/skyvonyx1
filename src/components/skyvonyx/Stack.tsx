const items = [
  { name: "Roboflow API", desc: "Computer vision workflows" },
  { name: "Supabase", desc: "Auth · Storage · Postgres" },
  { name: "GIS Engine", desc: "GeoTIFF · GeoJSON · OL" },
  { name: "Vision Models", desc: "YOLOv8 · SAM · Detectron" },
  { name: "Edge Inference", desc: "Cloud GPU pipelines" },
  { name: "PostGIS", desc: "Spatial indexing & queries" },
];

export function Stack() {
  return (
    <section id="stack" className="relative py-32 border-t border-gold/10">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-14">
          <div className="text-[10px] uppercase tracking-[0.4em] text-gold mb-4">System Architecture</div>
          <h2 className="text-4xl md:text-5xl font-black uppercase">
            Powered by <span className="text-gold-gradient">Industrial Stack</span>
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it, i) => (
            <div key={it.name} className="hud-corners glass-panel p-6 group hover:-translate-y-1 transition-transform">
              <div className="text-[9px] font-mono text-gold/60 mb-3">MODULE · 0{i + 1}</div>
              <div className="font-display text-xl font-bold uppercase tracking-wider text-gold-gradient">{it.name}</div>
              <div className="text-sm text-muted-foreground mt-2">{it.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}