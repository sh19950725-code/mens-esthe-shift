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

export async function deactivateCast(id: string): Promise<void> {
  const { error } = await supabase
    .from("casts")
    .update({
      status: "inactive",
    })
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function getInactiveCasts(): Promise<Cast[]> {
  const { data, error } = await supabase
    .from("casts")
    .select("id, name, display_name, status, memo")
    .eq("status", "inactive")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data as Cast[]) || [];
}

export async function activateCast(id: string): Promise<void> {
  const { error } = await supabase
    .from("casts")
    .update({
      status: "active",
    })
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export type UpdateCastInput = {
  name?: string;
  display_name?: string | null;
  memo?: string | null;
};

export async function updateCastById(
  id: string,
  input: UpdateCastInput
): Promise<void> {
  const { error } = await supabase
    .from("casts")
    .update(input)
    .eq("id", id);

  if (error) {
    throw error;
  }
}