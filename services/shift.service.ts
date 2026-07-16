import { supabase } from "@/lib/supabase";

type CastRelation = {
  name: string;
  display_name: string | null;
};

type RoomRelation = {
  name: string;
};

type RawShift = {
  id: string;
  cast_id: string;
  room_id: string | null;
  work_date: string;
  start_time: string;
  end_time: string;
  memo: string | null;
  casts: CastRelation | CastRelation[] | null;
  rooms: RoomRelation | RoomRelation[] | null;
};

export type Shift = {
  id: string;
  cast_id: string;
  room_id: string | null;
  work_date: string;
  start_time: string;
  end_time: string;
  memo: string | null;
  casts: CastRelation | null;
  rooms: RoomRelation | null;
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

type ConflictResult = {
  ok: boolean;
  message: string;
};

function getFirstRelation<T>(relation: T | T[] | null): T | null {
  if (!relation) {
    return null;
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function normalizeShift(shift: RawShift): Shift {
  return {
    id: shift.id,
    cast_id: shift.cast_id,
    room_id: shift.room_id,
    work_date: shift.work_date,
    start_time: shift.start_time,
    end_time: shift.end_time,
    memo: shift.memo,
    casts: getFirstRelation(shift.casts),
    rooms: getFirstRelation(shift.rooms),
  };
}

function normalizeShifts(data: RawShift[] | null): Shift[] {
  return (data ?? []).map(normalizeShift);
}

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

  return normalizeShifts(data as RawShift[] | null);
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

  return normalizeShifts(data as RawShift[] | null);
}

export async function checkShiftConflict(
  castId: string,
  roomId: string | null,
  workDate: string,
  startTime: string,
  endTime: string,
  excludeShiftId?: string
): Promise<ConflictResult> {
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
    const castData = getFirstRelation(
      castConflict.casts as CastRelation | CastRelation[] | null
    );

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
      const roomData = getFirstRelation(
        roomConflict.rooms as RoomRelation | RoomRelation[] | null
      );

      const castData = getFirstRelation(
        roomConflict.casts as CastRelation | CastRelation[] | null
      );

      const roomName = roomData?.name || "選択した部屋";

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

export async function getShiftsByCastId(
  castId: string
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
    .eq("cast_id", castId)
    .order("work_date", { ascending: false })
    .order("start_time", { ascending: true });

  if (error) {
    throw error;
  }

  return normalizeShifts(data as RawShift[] | null);
}