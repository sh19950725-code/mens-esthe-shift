import { supabase } from "@/lib/supabase";

export type Shift = {
  id: string;
  cast_id: string;
  room_id: string | null;
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

export async function getShiftsByDate(
  workDate: string
): Promise<Shift[]> {
  const { data, error } = await supabase
    .from("shifts")
    .select(`
      id,
      cast_id,
      room_id,
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
): Promise<Shift[]> {
  const { data, error } = await supabase
    .from("shifts")
    .select(`
      id,
      cast_id,
      room_id,
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
  endTime: string,
  excludeShiftId?: string
) {
  const { data, error } = await supabase
    .from("shifts")
    .select(`
      id,
      cast_id,
      room_id,
      start_time,
      end_time,
      casts (
        name,
        display_name
      ),
      rooms (
        name
      )
    `)
    .eq("work_date", workDate);

  if (error) {
    throw error;
  }

  const shifts = (data ?? []).filter(
    (shift) => shift.id !== excludeShiftId
  );

  const castConflict = shifts.find((shift) => {
    if (shift.cast_id !== castId) {
      return false;
    }

    return (
      startTime < shift.end_time &&
      endTime > shift.start_time
    );
  });

  if (castConflict) {
    const castData = Array.isArray(castConflict.casts)
      ? castConflict.casts[0]
      : castConflict.casts;

    const castName =
      castData?.display_name ||
      castData?.name ||
      "選択したキャスト";

    return {
      ok: false,
      message:
        `${castName}は` +
        `${castConflict.start_time.slice(0, 5)}〜` +
        `${castConflict.end_time.slice(0, 5)}に` +
        "別のシフトが登録されています。",
    };
  }

  if (roomId) {
    const roomConflict = shifts.find((shift) => {
      if (shift.room_id !== roomId) {
        return false;
      }

      return (
        startTime < shift.end_time &&
        endTime > shift.start_time
      );
    });

    if (roomConflict) {
      const roomData = Array.isArray(roomConflict.rooms)
        ? roomConflict.rooms[0]
        : roomConflict.rooms;

      const castData = Array.isArray(roomConflict.casts)
        ? roomConflict.casts[0]
        : roomConflict.casts;

      const roomName =
        roomData?.name ||
        "選択した部屋";

      const castName =
        castData?.display_name ||
        castData?.name ||
        "別のキャスト";

      return {
        ok: false,
        message:
          `${roomName}は` +
          `${roomConflict.start_time.slice(0, 5)}〜` +
          `${roomConflict.end_time.slice(0, 5)}に` +
          `${castName}が使用しています。`,
      };
    }
  }

  return {
    ok: true,
    message: "",
  };
}

export async function createShift(
  input: CreateShiftInput
): Promise<void> {
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
): Promise<void> {
  const { error } = await supabase
    .from("shifts")
    .update(input)
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function deleteShiftById(
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("shifts")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}