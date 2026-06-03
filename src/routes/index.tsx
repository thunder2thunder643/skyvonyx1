import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/skyvonyx/Nav";
import { Hero } from "@/components/skyvonyx/Hero";
import { Features } from "@/components/skyvonyx/Features";
import { DetectionShowcase } from "@/components/skyvonyx/DetectionShowcase";
import { DashboardPreview } from "@/components/skyvonyx/DashboardPreview";
import { UploadSection } from "@/components/skyvonyx/Upload";
import { Stack } from "@/components/skyvonyx/Stack";
import { Footer } from "@/components/skyvonyx/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Skyvonyx — AI-Powered Geospatial Intelligence Platform" },
      { name: "description", content: "Defense-grade satellite image labeling, AI object detection, and spatial analytics for aerospace and remote-sensing operators." },
      { property: "og:title", content: "Skyvonyx — AI-Powered Geospatial Intelligence" },
      { property: "og:description", content: "Satellite image labeling, AI detection and geospatial analytics. Built for aerospace, defense and climate-tech." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main>
        <Hero />
        <Features />
        <DetectionShowcase />
        <DashboardPreview />
        <UploadSection />
        <Stack />
      </main>
      <Footer />
    </div>
  );
}
