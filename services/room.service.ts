import { supabase } from "@/lib/supabase";

export type Room = {
  id: string;
  name: string;
  sort_order: number;
  status: string;
};

export async function getActiveRooms() {
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