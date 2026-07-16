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

  rooms: {
    name: string;
  } | null;
};

export type CreateShiftInput = {
  cast_id: string;
  room_id?: string | null;
  work_date: string;
  start_time: string;
  end_time: string;
  memo?: string | null;
};

export type UpdateShiftInput = {
  cast_id?: string;
  room_id?: string | null;
  work_date?: string;
  start_time?: string;
  end_time?: string;
  memo?: string | null;
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
      ),
      rooms (
        name
      )
    `)
    .eq("work_date", workDate)
    .order("start_time", { ascending: true });

  if (error) {
    throw error;
  }

  return (data as Shift[]) || [];
}

export async function getShiftsByDateRange(
  startDate: string,
  endDate: string
) {
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
      ),
      rooms (
        name
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

export async function checkShiftConflict(
  castId: string,
  roomId: string | null,
  workDate: string,
  startTime: string,
  endTime: string
) {
  const { data, error } = await supabase
    .from("shifts")
    .select("cast_id, room_id, start_time, end_time")
    .eq("work_date", workDate);

  if (error) {
    throw error;
  }

  const shifts = data ?? [];

  // キャスト重複チェック
  const castConflict = shifts.find((shift) => {
    if (shift.cast_id !== castId) return false;

    return (
      startTime < shift.end_time &&
      endTime > shift.start_time
    );
  });

  if (castConflict) {
    return {
      ok: false,
      message: "このキャストは同じ時間帯に別のシフトがあります。",
    };
  }

  // 部屋重複チェック
  if (roomId) {
    const roomConflict = shifts.find((shift) => {
      if (shift.room_id !== roomId) return false;

      return (
        startTime < shift.end_time &&
        endTime > shift.start_time
      );
    });

    if (roomConflict) {
      return {
        ok: false,
        message: "この部屋は同じ時間帯に使用されています。",
      };
    }
  }

  return {
    ok: true,
    message: "",
  };
}

export async function createShift(input: CreateShiftInput) {
  const { error } = await supabase
    .from("shifts")
    .insert(input);

  if (error) {
    throw error;
  }
}

export async function updateShiftById(
  id: string,
  input: UpdateShiftInput
) {
  const { error } = await supabase
    .from("shifts")
    .update(input)
    .eq("id", id);

  if (error) {
    throw error;
  }
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