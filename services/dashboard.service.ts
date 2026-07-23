import { supabase } from "@/lib/supabase";
import type {
  Shift,
  ShiftStatus,
} from "@/services/shift.service";

type RawDashboardShift = {
  id: string;
  cast_id: string;
  room_id: string | null;
  work_date: string;
  start_time: string;
  end_time: string;
  status: ShiftStatus | null;
  memo: string | null;
  created_at?: string;
  casts:
    | {
        id: string;
        name: string;
        display_name: string | null;
      }
    | {
        id: string;
        name: string;
        display_name: string | null;
      }[]
    | null;
  rooms:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
};

type CountResponse = {
  count: number | null;
  error: {
    message: string;
  } | null;
};

export type DashboardSummary = {
  date: string;
  workingCount: number;
  tentativeCount: number;
  holidayCount: number;
  workingNowCount: number;
  usedRoomCount: number;
  totalRoomCount: number;
  availableRoomCount: number;
  activeCastCount: number;
  weekShiftCount: number;
  latestShifts: Shift[];
};

function getLocalDateText(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getLocalTimeText(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}:00`;
}

function getMonday(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const difference = (day + 6) % 7;

  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - difference);

  return result;
}

function getSunday(date: Date): Date {
  const monday = getMonday(date);
  const sunday = new Date(monday);

  sunday.setDate(monday.getDate() + 6);

  return sunday;
}

function normalizeRelation<T>(
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

function normalizeShift(
  shift: RawDashboardShift
): Shift {
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
    casts: normalizeRelation(shift.casts),
    rooms: normalizeRelation(shift.rooms),
  };
}

function checkCountResponse(
  response: CountResponse,
  label: string
): number {
  if (response.error) {
    throw new Error(
      `${label}の取得に失敗しました: ${response.error.message}`
    );
  }

  return response.count ?? 0;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const now = new Date();
  const today = getLocalDateText(now);
  const currentTime = getLocalTimeText(now);
  const weekStart = getLocalDateText(getMonday(now));
  const weekEnd = getLocalDateText(getSunday(now));

  const [
    todayShiftResponse,
    workingNowResponse,
    activeRoomResponse,
    activeCastResponse,
    weekShiftResponse,
    latestShiftResponse,
  ] = await Promise.all([
    supabase
      .from("shifts")
      .select(
        `
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
        `
      )
      .eq("work_date", today)
      .order("start_time", {
        ascending: true,
      }),

    supabase
      .from("shifts")
      .select("id, room_id", {
        count: "exact",
      })
      .eq("work_date", today)
      .neq("status", "holiday")
      .lte("start_time", currentTime)
      .gt("end_time", currentTime),

    supabase
      .from("rooms")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "active"),

    supabase
      .from("casts")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("status", "active"),

    supabase
      .from("shifts")
      .select("id", {
        count: "exact",
        head: true,
      })
      .gte("work_date", weekStart)
      .lte("work_date", weekEnd)
      .neq("status", "holiday"),

    supabase
      .from("shifts")
      .select(
        `
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
        `
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(5),
  ]);

  if (todayShiftResponse.error) {
    throw new Error(
      `本日のシフト取得に失敗しました: ${todayShiftResponse.error.message}`
    );
  }

  if (workingNowResponse.error) {
    throw new Error(
      `現在出勤中の取得に失敗しました: ${workingNowResponse.error.message}`
    );
  }

  if (latestShiftResponse.error) {
    throw new Error(
      `最近のシフト取得に失敗しました: ${latestShiftResponse.error.message}`
    );
  }

  const todayShifts = (
    todayShiftResponse.data ?? []
  ).map((shift) =>
    normalizeShift(
      shift as unknown as RawDashboardShift
    )
  );

  const latestShifts = (
    latestShiftResponse.data ?? []
  ).map((shift) =>
    normalizeShift(
      shift as unknown as RawDashboardShift
    )
  );

  const workingCount = todayShifts.filter(
    (shift) =>
      (shift.status ?? "working") === "working"
  ).length;

  const tentativeCount = todayShifts.filter(
    (shift) => shift.status === "tentative"
  ).length;

  const holidayCount = todayShifts.filter(
    (shift) => shift.status === "holiday"
  ).length;

  const usedRoomIds = new Set(
    (workingNowResponse.data ?? [])
      .map((shift) => shift.room_id)
      .filter(
        (roomId): roomId is string =>
          Boolean(roomId)
      )
  );

  const totalRoomCount = checkCountResponse(
    activeRoomResponse,
    "有効部屋数"
  );

  const activeCastCount = checkCountResponse(
    activeCastResponse,
    "有効キャスト数"
  );

  const weekShiftCount = checkCountResponse(
    weekShiftResponse,
    "週間シフト数"
  );

  const usedRoomCount = usedRoomIds.size;

  return {
    date: today,
    workingCount,
    tentativeCount,
    holidayCount,
    workingNowCount:
      workingNowResponse.data?.length ?? 0,
    usedRoomCount,
    totalRoomCount,
    availableRoomCount: Math.max(
      totalRoomCount - usedRoomCount,
      0
    ),
    activeCastCount,
    weekShiftCount,
    latestShifts,
  };
}
