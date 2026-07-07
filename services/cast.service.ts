import { supabase } from "@/lib/supabase";

export type Cast = {
  id: string;
  name: string;
  display_name: string | null;
  status: string;
  memo: string | null;
};

export async function getActiveCasts() {
  const { data, error } = await supabase
    .from("casts")
    .select("id, name, display_name, status, memo")
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data as Cast[]) || [];
}

export async function createCast(name: string) {
  const { error } = await supabase.from("casts").insert({
    name,
    display_name: name,
    status: "active",
  });

  if (error) {
    throw error;
  }
}