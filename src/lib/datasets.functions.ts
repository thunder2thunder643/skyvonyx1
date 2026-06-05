import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listDatasets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("datasets")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createDataset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      name: z.string().min(1).max(200),
      storage_path: z.string().min(1).max(500),
      mime_type: z.string().max(100).optional(),
      size_bytes: z.number().int().nonnegative().optional(),
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("datasets")
      .insert({ ...data, owner_id: userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getDataset = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: ds, error }, { data: ann }] = await Promise.all([
      supabase.from("datasets").select("*").eq("id", data.id).single(),
      supabase.from("annotations").select("*").eq("dataset_id", data.id).maybeSingle(),
    ]);
    if (error) throw new Error(error.message);
    const { data: signed } = await supabase.storage
      .from("satellite-images")
      .createSignedUrl(ds.storage_path, 60 * 60);
    return { dataset: ds, annotation: ann ?? null, signedUrl: signed?.signedUrl ?? null };
  });

export const deleteDataset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ds } = await supabase.from("datasets").select("storage_path").eq("id", data.id).single();
    if (ds?.storage_path) await supabase.storage.from("satellite-images").remove([ds.storage_path]);
    const { error } = await supabase.from("datasets").delete().eq("id", data.id).eq("owner_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const signDatasetUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ storage_path: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: signed, error } = await supabase.storage
      .from("satellite-images")
      .createSignedUrl(data.storage_path, 60 * 60);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });