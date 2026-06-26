import { motion } from "framer-motion";
import { ArrowRight, Radar } from "lucide-react";
import heroImg from "@/assets/hero-satellite.jpg";
import { Logo } from "./Logo";

export function Hero() {
  return (
    <section className="relative min-h-screen w-full overflow-hidden pt-32 pb-20">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={heroImg} alt="" width={1920} height={1080} className="absolute inset-0 size-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        <div className="absolute inset-0 grid-bg opacity-50" />
      </div>

      {/* Radar sweep */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-20 size-[600px] rounded-full border border-gold/10">
        <div className="absolute inset-8 rounded-full border border-gold/10" />
        <div className="absolute inset-20 rounded-full border border-gold/10" />
        <div className="absolute inset-0 animate-radar" style={{
          background: "conic-gradient(from 0deg, transparent 0deg, oklch(0.82 0.14 88 / 0.25) 30deg, transparent 60deg)",
          borderRadius: "9999px",
        }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 grid lg:grid-cols-[1.2fr_1fr] gap-12 items-center">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-gold/30 rounded-sm text-[10px] uppercase tracking-[0.3em] text-gold mb-6"
          >
            <Radar className="size-3" /> Classified · Geospatial AI · v2.4
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}>
            <Logo className="h-16 md:h-24 mb-6" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}
            className="text-4xl md:text-6xl font-black uppercase leading-[1.05] text-foreground"
          >
            AI-Powered <br />
            <span className="text-gold-gradient">Geospatial Intelligence</span> <br />
            Platform
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.35 }}
            className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed"
          >
            Defense-grade satellite image labeling, object detection, and spatial analytics powered by
            real-time computer vision. Built for aerospace, defense, and remote-sensing operators.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.5 }}
            id="cta" className="mt-10 flex flex-wrap gap-4"
          >
            <a href="#dashboard" aria-label="Launch the Skyvonyx platform dashboard" className="group bg-gold-gradient text-primary-foreground font-bold uppercase tracking-[0.2em] text-sm px-7 py-4 rounded-sm glow-gold inline-flex items-center gap-2 hover:scale-[1.02] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
              Launch Platform
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <a href="#detection" aria-label="See AI detection demo" className="border border-gold/40 text-gold uppercase tracking-[0.2em] text-sm font-bold px-7 py-4 rounded-sm hover:bg-gold/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
              Request Demo
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.8 }}
            className="mt-14 grid grid-cols-3 gap-6 max-w-lg"
          >
            {[
              { v: "12.4M", l: "Objects Detected" },
              { v: "98.7%", l: "AI Accuracy" },
              { v: "240+", l: "Active Operators" },
            ].map((s) => (
              <div key={s.l} className="border-l border-gold/30 pl-4">
                <div className="text-2xl font-display font-bold text-gold-gradient">{s.v}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">{s.l}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* HUD card */}
        <motion.div
          initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.9, delay: 0.4 }}
          className="hidden lg:block"
        >
          <div className="hud-corners glass-panel p-6 rounded-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-gold mb-4">
              <span>Live Telemetry</span>
              <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-gold animate-pulse-gold" />Streaming</span>
            </div>
            <div className="font-mono text-xs space-y-2 text-muted-foreground">
              {[
                "≫ tile_id: SVX-44.892N-73.119W",
                "≫ sensor: SENTINEL-2 · band RGB+NIR",
                "≫ resolution: 0.3m/px",
                "≫ inference: roboflow-v8 · 142ms",
                "≫ detections: 287 · conf 0.91",
                "≫ overlay: building/road/water",
              ].map((l) => <div key={l}>{l}</div>)}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {["BUILDINGS 142", "ROADS 38", "VEHICLES 87", "WATER 20"].map((t) => (
                <div key={t} className="border border-gold/20 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-foreground/80">
                  {t}
                </div>
              ))}
            </div>
            <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-gold to-transparent animate-scan-line" style={{ top: 0 }} />
          </div>
        </motion.div>
      </div>
    </section>
  );
}