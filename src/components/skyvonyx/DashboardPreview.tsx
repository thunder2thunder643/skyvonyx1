import { motion } from "framer-motion";
import { Activity, Database, Cpu, MapPin, Layers, Crosshair } from "lucide-react";

const stats = [
  { icon: Database, label: "Datasets", val: "1,284", trend: "+12.4%" },
  { icon: Crosshair, label: "AI Detections", val: "12.4M", trend: "+8.1%" },
  { icon: Cpu, label: "Inference Queue", val: "37", trend: "live" },
  { icon: Activity, label: "Storage Used", val: "847 GB", trend: "72%" },
];

export function DashboardPreview() {
  return (
    <section id="dashboard" className="relative py-32 border-t border-gold/10">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-14">
          <div className="text-[10px] uppercase tracking-[0.4em] text-gold mb-4">Operator Console</div>
          <h2 className="text-4xl md:text-5xl font-black uppercase">
            Mission <span className="text-gold-gradient">Control Dashboard</span>
          </h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.7 }}
          className="hud-corners glass-panel rounded-sm p-6 md:p-8"
        >
          <div className="flex items-center justify-between border-b border-gold/15 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="size-2 rounded-full bg-gold animate-pulse-gold" />
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-gold">SKYVONYX // OPS · 04:21:18 UTC</span>
            </div>
            <div className="hidden md:flex gap-4 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <span>Overview</span><span className="text-gold">Map</span><span>Datasets</span><span>Activity</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-[260px_1fr] gap-6">
            {/* Sidebar */}
            <aside className="space-y-2">
              {[
                { i: MapPin, l: "Map Viewer", a: true },
                { i: Layers, l: "Annotations" },
                { i: Database, l: "Datasets" },
                { i: Cpu, l: "Inference" },
                { i: Activity, l: "Activity Log" },
              ].map((it) => (
                <div key={it.l} className={`flex items-center gap-3 px-3 py-2.5 text-sm uppercase tracking-wider border-l-2 ${it.a ? "border-gold bg-gold/10 text-gold" : "border-transparent text-muted-foreground hover:text-foreground hover:border-gold/30"}`}>
                  <it.i className="size-4" /> {it.l}
                </div>
              ))}
            </aside>

            {/* Main */}
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {stats.map((s) => (
                  <div key={s.label} className="border border-gold/20 p-4 relative overflow-hidden hover:border-gold/50 transition-colors">
                    <s.icon className="size-4 text-gold mb-3" />
                    <div className="font-display text-2xl font-bold text-gold-gradient">{s.val}</div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">{s.label}</div>
                    <div className="absolute top-3 right-3 text-[9px] font-mono text-gold/70">{s.trend}</div>
                  </div>
                ))}
              </div>

              <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4">
                {/* Faux Map */}
                <div className="relative aspect-video border border-gold/20 overflow-hidden grid-bg bg-card">
                  <div className="absolute inset-0" style={{
                    background: "radial-gradient(ellipse at 60% 40%, oklch(0.7 0.13 70 / 0.25), transparent 60%)",
                  }} />
                  {/* Heat blobs */}
                  {[
                    { x: 25, y: 30, s: 80, c: "#FF4D4D" },
                    { x: 60, y: 50, s: 120, c: "#F5D66B" },
                    { x: 75, y: 25, s: 60, c: "#22D3EE" },
                    { x: 40, y: 70, s: 90, c: "#22C55E" },
                  ].map((b, i) => (
                    <div key={i} className="absolute rounded-full blur-2xl opacity-60" style={{
                      left: `${b.x}%`, top: `${b.y}%`, width: b.s, height: b.s, background: b.c,
                    }} />
                  ))}
                  <div className="absolute top-3 left-3 text-[10px] font-mono text-gold uppercase tracking-widest">
                    44.892°N · 73.119°W
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                    <span>ZOOM 14 · TILE Z14/4823/6105</span>
                    <span className="text-gold">DETECTIONS 287</span>
                  </div>
                  {/* Crosshair */}
                  <Crosshair className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-10 text-gold/70" />
                </div>

                {/* Activity */}
                <div className="border border-gold/20 p-4 space-y-3">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-gold flex items-center justify-between">
                    Activity Stream
                    <span className="size-1.5 rounded-full bg-gold animate-pulse-gold" />
                  </div>
                  {[
                    ["02:14", "Inference completed · 287 obj", "ok"],
                    ["02:11", "Dataset SAFE-44N uploaded", "ok"],
                    ["02:08", "Convert HDF5 → PNG (12 bands)", "run"],
                    ["02:03", "User analyst-04 joined", "info"],
                    ["01:58", "GeoTIFF tile rendered", "ok"],
                  ].map(([t, l, k]) => (
                    <div key={t} className="flex items-start gap-3 text-xs">
                      <span className="font-mono text-muted-foreground">{t}</span>
                      <span className={`size-1.5 mt-1.5 rounded-full ${k === "ok" ? "bg-gold" : k === "run" ? "bg-accent animate-pulse" : "bg-muted-foreground"}`} />
                      <span className="text-foreground/85 flex-1">{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}