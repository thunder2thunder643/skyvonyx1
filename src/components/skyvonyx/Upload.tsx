import { motion } from "framer-motion";
import { UploadCloud, FileType2 } from "lucide-react";

const formats = [".img", ".tif", ".geotiff", ".nc", ".hdf", ".h5", ".jp2", ".SAFE", ".sid", ".jpg", ".png"];

export function UploadSection() {
  return (
    <section className="relative py-32 border-t border-gold/10">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <div className="text-[10px] uppercase tracking-[0.4em] text-gold mb-4">Ingestion Pipeline</div>
        <h2 className="text-4xl md:text-5xl font-black uppercase">
          Drop Imagery. <span className="text-gold-gradient">We Handle The Rest.</span>
        </h2>
        <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
          Chunked uploads, geospatial metadata extraction, automatic conversion and AI labeling — in a single stream.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }}
          className="hud-corners mt-12 glass-panel p-12 md:p-16 relative overflow-hidden"
        >
          <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
          <UploadCloud className="size-16 text-gold mx-auto mb-6 glow-gold-sm" />
          <div className="text-2xl font-display font-bold uppercase tracking-widest">Drag &amp; Drop</div>
          <div className="text-sm text-muted-foreground mt-2 uppercase tracking-[0.2em]">or click to browse</div>

          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {formats.map((f) => (
              <span key={f} className="flex items-center gap-1.5 px-3 py-1.5 border border-gold/25 text-xs font-mono text-muted-foreground">
                <FileType2 className="size-3 text-gold/70" /> {f}
              </span>
            ))}
          </div>

          <div className="mt-10 max-w-md mx-auto">
            <div className="flex justify-between text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
              <span>Sentinel-2 · SAFE</span><span className="text-gold">68%</span>
            </div>
            <div className="h-1.5 bg-secondary overflow-hidden">
              <motion.div
                initial={{ width: 0 }} whileInView={{ width: "68%" }}
                viewport={{ once: true }} transition={{ duration: 1.4, ease: "easeOut" }}
                className="h-full bg-gold-gradient glow-gold-sm"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}