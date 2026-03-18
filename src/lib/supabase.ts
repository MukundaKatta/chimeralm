import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function saveArchitecture(architecture: any) {
  const { data, error } = await supabase
    .from("architectures")
    .upsert(architecture)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function loadArchitectures() {
  const { data, error } = await supabase
    .from("architectures")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function savePaperAnnotation(annotation: any) {
  const { data, error } = await supabase
    .from("paper_annotations")
    .insert(annotation)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function loadPaperAnnotations(paperId: string) {
  const { data, error } = await supabase
    .from("paper_annotations")
    .select("*")
    .eq("paper_id", paperId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}
