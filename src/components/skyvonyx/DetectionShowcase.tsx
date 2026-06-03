import { motion } from "framer-motion";
import { useState } from "react";
import sample from "@/assets/detection-sample.jpg";

type Box = { id: string; label: string; conf: number; x: number; y: number; w: number; h: number; color: string };

const boxes: Box[] = [
  { id: "b1", label: "BUILDING", conf: 0.97, x: 8, y: 6, w: 18, h: 14, color: "#FF4D4D" },
  { id: "b2", label: "BUILDING", conf: 0.94, x: 30, y: 4, w: 22, h: 18, color: "#FF4D4D" },
  { id: "b3", label: "BUILDING", conf: 0.91, x: 56, y: 8, w: 26, h: 16, color: "#FF4D4D" },
  { id: "r1", label: "ROAD", conf: 0.96, x: 0, y: 42, w: 100, h: 6, color: "#3B82F6" },
  { id: "r2", label: "ROAD", conf: 0.93, x: 40, y: 0, w: 5, h: 100, color: "#3B82F6" },
  { id: "w1", label: "WATER", conf: 0.99, x: 4, y: 48, w: 28, h: 32, color: "#22D3EE" },
  { id: "p1", label: "PARKING", conf: 0.88, x: 60, y: 70, w: 18, h: 12, color: "#F5D66B" },
  { id: "v1", label: "VEHICLE", conf: 0.86, x: 78, y: 30, w: 3, h: 2, color: "#FACC15" },
  { id: "v2", label: "VEHICLE", conf: 0.83, x: 82, y: 34, w: 3, h: 2, color: "#FACC15" },
];

const classes = ["ALL", "BUILDING", "ROAD", "WATER", "PARKING", "VEHICLE"];

export function DetectionShowcase() {
  const [filter, setFilter] = useState("ALL");
  const visible = filter === "ALL" ? boxes : boxes.filter((b) => b.label === filter);

  return (
    <section id="detection" className="relative py-32 border-t border-gold/10">
      <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-[1fr_1.6fr] gap-12 items-center">
        <div>
          <div className="text-[10px] uppercase tracking-[0.4em] text-gold mb-4">Inference Demo</div>
          <h2 className="text-4xl md:text-5xl font-black uppercase leading-tight">
            See AI <span className="text-gold-gradient">Label the Earth</span>
          </h2>
          <p className="mt-5 text-muted-foreground leading-relaxed">
            Bounding boxes, polygons and segmentation masks rendered live over orbital imagery —
            with confidence scores, layer toggles, and editable annotations.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {classes.map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] border transition-all ${
                  filter === c
                    ? "border-gold bg-gold/15 text-gold glow-gold-sm"
                    : "border-gold/20 text-muted-foreground hover:border-gold/50 hover:text-gold"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 max-w-sm">
            {[
              ["Roads", "#3B82F6"], ["Buildings", "#FF4D4D"],
              ["Water", "#22D3EE"], ["Vehicles", "#FACC15"],
              ["Forests", "#22C55E"], ["Parking", "#F5D66B"],
            ].map(([n, c]) => (
              <div key={n} className="flex items-center gap-2 text-xs uppercase tracking-wider">
                <span className="size-3 border" style={{ borderColor: c, background: `${c}33` }} />
                {n}
              </div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.7 }}
          className="hud-corners relative aspect-[1280/896] rounded-sm overflow-hidden border border-gold/30 glow-gold"
        >
          <img src={sample} alt="Satellite imagery with AI detections" width={1280} height={896} loading="lazy" className="size-full object-cover" />
          <div className="absolute inset-0 bg-background/10" />
          {/* Scan line */}
          <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent animate-scan-line" />

          {visible.map((b) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="absolute border-2"
              style={{
                left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%`,
                borderColor: b.color, background: `${b.color}22`,
                boxShadow: `0 0 12px ${b.color}66`,
              }}
            >
              <div
                className="absolute -top-5 left-0 px-1.5 py-0.5 text-[9px] font-bold font-mono uppercase tracking-wider whitespace-nowrap"
                style={{ background: b.color, color: "#0a0a0a" }}
              >
                {b.label} {(b.conf * 100).toFixed(0)}%
              </div>
            </motion.div>
          ))}

          {/* HUD overlay */}
          <div className="absolute top-3 left-3 text-[10px] font-mono text-gold uppercase tracking-widest flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-gold animate-pulse-gold" /> INFERENCE · LIVE
          </div>
          <div className="absolute bottom-3 right-3 text-[10px] font-mono text-gold/80">
            {visible.length} OBJECTS · ROBOFLOW v8
          </div>
        </motion.div>
      </div>
    </section>
  );
}