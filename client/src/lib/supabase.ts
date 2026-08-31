import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export async function uploadEvidence(file: File, reportReference: string) {
  if (!supabase) throw new Error("Supabase browser environment is not configured.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `reports/${reportReference}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from("report-evidence").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}
