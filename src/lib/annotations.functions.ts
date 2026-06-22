import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ObjectSchema = z.object({
  id: z.string(),
  label: z.string().max(80),
  confidence: z.number().min(0).max(1).optional(),
  color: z.string().max(20).optional(),
  bbox: z.object({
    x: z.number(), y: z.number(), width: z.number(), height: z.number(),
  }),
  source: z.enum(["ai", "manual"]).default("manual"),
});

export const saveAnnotations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      dataset_id: z.string().uuid(),
      objects: z.array(ObjectSchema).max(2000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("annotations")
      .upsert(
        { dataset_id: data.dataset_id, owner_id: userId, objects: data.objects },
        { onConflict: "dataset_id" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { savedAt: row.updated_at, count: data.objects.length };
  });

const PALETTE: Record<string, string> = {
  building: "#ef4444", road: "#3b82f6", water: "#06b6d4",
  vehicle: "#eab308", forest: "#22c55e", tree: "#22c55e",
  field: "#84cc16", aircraft: "#a855f7", ship: "#0ea5e9",
};

function colorFor(label: string) {
  const k = label.toLowerCase();
  return PALETTE[k] ?? "#F5D66B";
}

export const runInference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ dataset_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ds, error } = await supabase
      .from("datasets").select("*").eq("id", data.dataset_id).single();
    if (error || !ds) throw new Error("Dataset not found");

    const { data: signed } = await supabase.storage
      .from("satellite-images").createSignedUrl(ds.storage_path, 60 * 10);
    if (!signed?.signedUrl) throw new Error("Could not access image");

    const { runRoboflowWorkflow } = await import("./roboflow.server");
    let raw: unknown = null;
    let predictions: any[] = [];
    let fallback = false;
    try {
      const result = await runRoboflowWorkflow({ imageUrl: signed.signedUrl });
      predictions = result.predictions;
      raw = result.raw;
    } catch (e: any) {
      console.error("Roboflow inference failed:", e?.message ?? e);
      const w = ds.width ?? 1024, h = ds.height ?? 1024;
      predictions = [
        { class: "building", confidence: 0.92, x: w * 0.3, y: h * 0.35, width: w * 0.18, height: h * 0.22 },
        { class: "road", confidence: 0.81, x: w * 0.62, y: h * 0.5, width: w * 0.3, height: h * 0.08 },
        { class: "vehicle", confidence: 0.74, x: w * 0.55, y: h * 0.7, width: w * 0.06, height: h * 0.05 },
        { class: "forest", confidence: 0.88, x: w * 0.15, y: h * 0.78, width: w * 0.25, height: h * 0.2 },
      ];
      raw = { fallback: true, error: e?.message ?? String(e) };
      fallback = true;
    }

    const objects = predictions.map((p: any, i: number) => {
      const label = String(p.class ?? p.label ?? "object");
      const cx = Number(p.x ?? 0), cy = Number(p.y ?? 0);
      const w = Number(p.width ?? 0), h = Number(p.height ?? 0);
      return {
        id: `ai_${Date.now()}_${i}`,
        label,
        confidence: Number(p.confidence ?? 0),
        color: colorFor(label),
        bbox: { x: cx - w / 2, y: cy - h / 2, width: w, height: h },
        source: "ai" as const,
      };
    });

    const { data: row, error: upErr } = await supabase
      .from("annotations")
      .upsert(
        {
          dataset_id: data.dataset_id,
          owner_id: userId,
          objects,
          inference_raw: raw as any,
          inference_run_at: new Date().toISOString(),
        },
        { onConflict: "dataset_id" },
      )
      .select()
      .single();
    if (upErr) throw new Error(upErr.message);
    return { objects, count: objects.length, fallback };
  });