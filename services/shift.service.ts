import { supabase } from "@/lib/supabase";

type CastRelation = {
  id?: string;
  name: string;
  display_name: string | null;
};

type RoomRelation = {
  id?: string;
  name: string;
};

export type ShiftStatus =
  | "working"
  | "tentative"
  | "holiday";

type RawShift = {
  id: string;
  cast_id: string;
  room_id: string | null;
  work_date: string;
  start_time: string;
  end_time: string;
  status: ShiftStatus | null;
  memo: string | null;
  created_at?: string;
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
  status: ShiftStatus | null;
  memo: string | null;
  created_at?: string;

  casts?: CastRelation | null;
  rooms?: RoomRelation | null;
};

export type CreateShiftInput = {
  cast_id: string;
  room_id: string | null;
  work_date: string;
  start_time: string;
  end_time: string;
  status: ShiftStatus;
  memo: string | null;
};

export type BulkCreateShiftInput = {
  cast_id: string;
  room_id: string | null;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  status: ShiftStatus;
  memo: string | null;
  weekdays: number[];
};

export type BulkCreateResult = {
  createdCount: number;
  skippedDates: string[];
};

export type UpdateShiftInput = {
  cast_id?: string;
  room_id?: string | null;
  work_date?: string;
  start_time?: string;
  end_time?: string;
  status?: ShiftStatus;
  memo?: string | null;
};

type ConflictResult = {
  ok: boolean;
  message: string;
};

function getFirstRelation<T>(
  relation: T | T[] | null
): T | null {
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
    status: shift.status ?? "working",
    memo: shift.memo,
    created_at: shift.created_at,
    casts: getFirstRelation(shift.casts),
    rooms: getFirstRelation(shift.rooms),
  };
}

function normalizeShifts(
  data: RawShift[] | null
): Shift[] {
  return (data ?? []).map(normalizeShift);
}

function parseLocalDate(dateText: string): Date {
  const [year, month, day] = dateText
    .split("-")
    .map(Number);

  return new Date(year, month - 1, day);
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(date.getDate()).padStart(
    2,
    "0"
  );

  return `${year}-${month}-${day}`;
}

function getDatesInRange(
  startDate: string,
  endDate: string,
  weekdays: number[]
): string[] {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const dates: string[] = [];

  const current = new Date(start);

  while (current <= end) {
    if (weekdays.includes(current.getDay())) {
      dates.push(formatLocalDate(current));
    }

    current.setDate(current.getDate() + 1);
  }

  return dates;
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
      status,
      memo,
      created_at,
      casts (
        id,
        name,
        display_name
      ),
      rooms (
        id,
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
      status,
      memo,
      created_at,
      casts (
        id,
        name,
        display_name
      ),
      rooms (
        id,
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
      status,
      memo,
      created_at,
      casts (
        id,
        name,
        display_name
      ),
      rooms (
        id,
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
      status,
      casts (
        name,
        display_name
      ),
      rooms (
        name
      )
    `)
    .eq("work_date", workDate)
    .neq("status", "holiday");

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
      castConflict.casts as
        | CastRelation
        | CastRelation[]
        | null
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
        roomConflict.rooms as
          | RoomRelation
          | RoomRelation[]
          | null
      );

      const castData = getFirstRelation(
        roomConflict.casts as
          | CastRelation
          | CastRelation[]
          | null
      );

      const roomName =
        roomData?.name || "選択した部屋";

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
): Promise<Shift> {
  const { data, error } = await supabase
    .from("shifts")
    .insert({
      cast_id: input.cast_id,
      room_id:
        input.status === "holiday"
          ? null
          : input.room_id,
      work_date: input.work_date,
      start_time: input.start_time,
      end_time: input.end_time,
      status: input.status,
      memo: input.memo,
    })
    .select(`
      id,
      cast_id,
      room_id,
      work_date,
      start_time,
      end_time,
      status,
      memo,
      created_at,
      casts (
        id,
        name,
        display_name
      ),
      rooms (
        id,
        name
      )
    `)
    .single();

  if (error) {
    throw error;
  }

  return normalizeShift(data as RawShift);
}

export async function createShiftsBulk(
  input: BulkCreateShiftInput
): Promise<BulkCreateResult> {
  if (input.start_date > input.end_date) {
    throw new Error(
      "終了日は開始日以降に設定してください"
    );
  }

  if (input.weekdays.length === 0) {
    throw new Error(
      "登録する曜日を選択してください"
    );
  }

  const targetDates = getDatesInRange(
    input.start_date,
    input.end_date,
    input.weekdays
  );

  const shiftsToInsert: CreateShiftInput[] = [];
  const skippedDates: string[] = [];

  for (const workDate of targetDates) {
    if (input.status !== "holiday") {
      const conflictResult =
        await checkShiftConflict(
          input.cast_id,
          input.room_id,
          workDate,
          input.start_time,
          input.end_time
        );

      if (!conflictResult.ok) {
        skippedDates.push(workDate);
        continue;
      }
    }

    shiftsToInsert.push({
      cast_id: input.cast_id,
      room_id:
        input.status === "holiday"
          ? null
          : input.room_id,
      work_date: workDate,
      start_time: input.start_time,
      end_time: input.end_time,
      status: input.status,
      memo: input.memo,
    });
  }

  if (shiftsToInsert.length === 0) {
    return {
      createdCount: 0,
      skippedDates,
    };
  }

  const { error } = await supabase
    .from("shifts")
    .insert(shiftsToInsert);

  if (error) {
    throw error;
  }

  return {
    createdCount: shiftsToInsert.length,
    skippedDates,
  };
}

export async function updateShiftById(
  id: string,
  input: UpdateShiftInput
): Promise<void> {
  const updateData = {
    ...input,
    room_id:
      input.status === "holiday"
        ? null
        : input.room_id,
  };

  const { error } = await supabase
    .from("shifts")
    .update(updateData)
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