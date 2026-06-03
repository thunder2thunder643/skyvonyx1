import { motion } from "framer-motion";
import { Satellite, Brain, Map, Layers, Shield, Radar, Upload, Cloud, Database } from "lucide-react";

const features = [
  { icon: Satellite, title: "Satellite Image Labeling", desc: "Pixel-precise annotation across multispectral, SAR, and optical imagery." },
  { icon: Brain, title: "AI Object Detection", desc: "Real-time inference via Roboflow workflows tuned for orbital data." },
  { icon: Map, title: "Road & Building Segmentation", desc: "Polygon masks for urban infrastructure at sub-meter resolution." },
  { icon: Layers, title: "Land-use Intelligence", desc: "Classify terrain, vegetation, agriculture and water at scale." },
  { icon: Shield, title: "Defense-grade Mapping", desc: "Secure pipelines with RLS-protected datasets and audit trails." },
  { icon: Radar, title: "Geospatial Analytics", desc: "Heatmaps, density grids and change-detection over time." },
  { icon: Upload, title: "Multi-format Ingestion", desc: ".SAFE, GeoTIFF, NetCDF, HDF5, JP2, SAR & more." },
  { icon: Cloud, title: "Cloud Infrastructure", desc: "Chunked uploads, async conversion, edge inference." },
  { icon: Database, title: "Dataset Management", desc: "Versioned projects, exportable in COCO, YOLO, GeoJSON." },
];

export function Features() {
  return (
    <section id="platform" className="relative py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-16">
          <div className="text-[10px] uppercase tracking-[0.4em] text-gold mb-4">Capabilities Matrix</div>
          <h2 className="text-4xl md:text-5xl font-black uppercase">
            Built for <span className="text-gold-gradient">Orbital Operations</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            A complete satellite intelligence operating system — from raw downlink to actionable annotations.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-gold/15 border border-gold/15">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
              className="bg-background p-8 group hover:bg-card transition-colors relative"
            >
              <div className="absolute top-3 right-3 text-[9px] font-mono text-gold/40">0{i + 1}</div>
              <div className="size-12 grid place-items-center border border-gold/30 mb-5 group-hover:bg-gold/10 group-hover:border-gold transition-colors">
                <f.icon className="size-5 text-gold" />
              </div>
              <h3 className="text-lg font-bold uppercase tracking-wider mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}