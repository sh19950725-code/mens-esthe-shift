import { supabase } from "@/lib/supabase";

export type Room = {
  id: string;
  name: string;
  sort_order: number;
  status: string;
};

export async function getActiveRooms(): Promise<Room[]> {
  const { data, error } = await supabase
    .from("rooms")
    .select("id, name, sort_order, status")
    .eq("status", "active")
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  return (data as Room[]) || [];
}

export async function createRoom(
  name: string,
  sortOrder: number
): Promise<void> {
  const { error } = await supabase.from("rooms").insert({
    name,
    sort_order: sortOrder,
    status: "active",
  });

  if (error) {
    throw error;
  }
}

export async function deactivateRoom(id: string): Promise<void> {
  const { error } = await supabase
    .from("rooms")
    .update({
      status: "inactive",
    })
    .eq("id", id);

  if (error) {
    throw error;
  }
}