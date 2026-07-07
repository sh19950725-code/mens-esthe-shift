import { supabase } from "@/lib/supabase";

export type Shift = {
  id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  memo: string | null;
  casts: {
    name: string;
    display_name: string | null;
  } | null;
};

export async function getShiftsByDate(workDate: string) {
  const { data, error } = await supabase
    .from("shifts")
    .select(`
      id,
      work_date,
      start_time,
      end_time,
      memo,
      casts (
        name,
        display_name
      )
    `)
    .eq("work_date", workDate)
    .order("start_time", { ascending: true });

  if (error) {
    throw error;
  }

  return (data as Shift[]) || [];
}

export async function deleteShiftById(id: string) {
  const { error } = await supabase
    .from("shifts")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export type CreateShiftInput = {
  cast_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  memo?: string | null;
};

export async function createShift(input: CreateShiftInput) {
  const { error } = await supabase.from("shifts").insert(input);

  if (error) {
    throw error;
  }
}

export async function getShiftsByDateRange(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("shifts")
    .select(`
      id,
      work_date,
      start_time,
      end_time,
      memo,
      casts (
        name,
        display_name
      )
    `)
    .gte("work_date", startDate)
    .lte("work_date", endDate)
    .order("work_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    throw error;
  }

  return (data as Shift[]) || [];
}

export type UpdateShiftInput = {
  cast_id?: string;
  work_date?: string;
  start_time?: string;
  end_time?: string;
  memo?: string | null;
};

export async function updateShiftById(id: string, input: UpdateShiftInput) {
  const { error } = await supabase
    .from("shifts")
    .update(input)
    .eq("id", id);

  if (error) {
    throw error;
  }
}