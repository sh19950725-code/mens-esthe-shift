"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteShiftById,
  getShiftsByDateRange,
  updateShiftById,
  type Shift,
  type ShiftStatus,
} from "@/services/shift.service";
import { getActiveRooms } from "@/services/room.service";
import EditShiftModal from "@/components/ui/EditShiftModal";
import RoomWeeklyReportModal from "@/components/ui/RoomWeeklyReportModal";
import CopyDayShiftsModal from "@/components/ui/CopyDayShiftsModal";

type RoomTimelineScreenProps = {
  onBack?: () => void;
};

type ActiveRoom = Awaited<ReturnType<typeof getActiveRooms>>[number];

type TimeRange = {
  start: number;
  end: number;
};

type RoomRow = {
  room: ActiveRoom;
  shifts: Shift[];
  occupiedMinutes: number;
  utilizationRate: number;
};

type ConflictInfo = {
  shiftIds: Set<string>;
  roomConflictIds: Set<string>;
  castConflictIds: Set<string>;
  pairCount: number;
};

type RoomFilter = "all" | "active" | "available" | "conflict";

const START_HOUR = 9;
const END_HOUR = 29;
const HOUR_WIDTH = 72;
const ROW_HEIGHT = 72;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const TOTAL_MINUTES = TOTAL_HOURS * 60;
const TIMELINE_WIDTH = TOTAL_HOURS * HOUR_WIDTH;

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateText: string): Date {
  const [year, month, day] = dateText.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(dateText: string, amount: number): string {
  const date = parseLocalDate(dateText);
  date.setDate(date.getDate() + amount);
  return formatDate(date);
}

function formatDateHeading(dateText: string): string {
  const date = parseLocalDate(dateText);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${date.getMonth() + 1}月${date.getDate()}日（${weekdays[date.getDay()]}）`;
}

function timeToMinutes(time: string): number {
  const [rawHour, rawMinute] = time.slice(0, 5).split(":").map(Number);
  const hour = rawHour < START_HOUR ? rawHour + 24 : rawHour;
  return hour * 60 + rawMinute;
}

function getClippedTimeRange(shift: Shift): TimeRange | null {
  const timelineStart = START_HOUR * 60;
  const timelineEnd = END_HOUR * 60;
  const rawStart = timeToMinutes(shift.start_time);
  let rawEnd = timeToMinutes(shift.end_time);

  if (rawEnd <= rawStart) rawEnd += 24 * 60;

  const start = Math.max(rawStart, timelineStart);
  const end = Math.min(rawEnd, timelineEnd);
  return end > start ? { start, end } : null;
}

function getFullTimeRange(shift: Shift): TimeRange {
  const start = timeToMinutes(shift.start_time);
  let end = timeToMinutes(shift.end_time);
  if (end <= start) end += 24 * 60;
  return { start, end };
}

function rangesOverlap(first: TimeRange, second: TimeRange): boolean {
  return first.start < second.end && second.start < first.end;
}

function detectConflicts(shifts: Shift[]): ConflictInfo {
  const activeShifts = shifts.filter(
    (shift) => getStatus(shift) !== "holiday"
  );
  const shiftIds = new Set<string>();
  const roomConflictIds = new Set<string>();
  const castConflictIds = new Set<string>();
  let pairCount = 0;

  for (let firstIndex = 0; firstIndex < activeShifts.length; firstIndex += 1) {
    const first = activeShifts[firstIndex];
    const firstRange = getFullTimeRange(first);

    for (
      let secondIndex = firstIndex + 1;
      secondIndex < activeShifts.length;
      secondIndex += 1
    ) {
      const second = activeShifts[secondIndex];
      if (!rangesOverlap(firstRange, getFullTimeRange(second))) continue;

      const sameRoom =
        Boolean(first.room_id) && first.room_id === second.room_id;
      const sameCast = first.cast_id === second.cast_id;
      if (!sameRoom && !sameCast) continue;

      pairCount += 1;
      shiftIds.add(first.id);
      shiftIds.add(second.id);

      if (sameRoom) {
        roomConflictIds.add(first.id);
        roomConflictIds.add(second.id);
      }
      if (sameCast) {
        castConflictIds.add(first.id);
        castConflictIds.add(second.id);
      }
    }
  }

  return { shiftIds, roomConflictIds, castConflictIds, pairCount };
}

function mergeTimeRanges(ranges: TimeRange[]): TimeRange[] {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: TimeRange[] = [];

  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (!last || range.start > last.end) {
      merged.push({ ...range });
    } else {
      last.end = Math.max(last.end, range.end);
    }
  }

  return merged;
}

function calculateOccupiedMinutes(shifts: Shift[]): number {
  const ranges = shifts
    .map(getClippedTimeRange)
    .filter((range): range is TimeRange => range !== null);

  return mergeTimeRanges(ranges).reduce(
    (total, range) => total + range.end - range.start,
    0
  );
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}分`;
  if (remainingMinutes === 0) return `${hours}時間`;
  return `${hours}時間${remainingMinutes}分`;
}

function formatLogicalMinutes(minutes: number): string {
  const normalized = minutes % (24 * 60);
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function escapeCsv(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function formatHour(hour: number): string {
  return `${hour >= 24 ? hour - 24 : hour}:00`;
}

function formatTime(time: string): string {
  const [rawHour, minute] = time.slice(0, 5).split(":").map(Number);
  const hour = rawHour < START_HOUR ? rawHour + 24 : rawHour;
  return `${hour}:${String(minute).padStart(2, "0")}`;
}

function getStatus(shift: Shift): ShiftStatus {
  return shift.status ?? "working";
}

function getCastName(shift: Shift): string {
  return shift.casts?.display_name || shift.casts?.name || "未設定";
}

function getStatusClasses(status: ShiftStatus): string {
  switch (status) {
    case "tentative":
      return "border-yellow-300 bg-yellow-100 text-yellow-900";
    case "holiday":
      return "border-gray-300 bg-gray-200 text-gray-700";
    default:
      return "border-blue-300 bg-blue-100 text-blue-900";
  }
}

function getStatusLabel(status: ShiftStatus): string {
  switch (status) {
    case "tentative":
      return "仮";
    case "holiday":
      return "休";
    default:
      return "出";
  }
}

function getUtilizationClasses(rate: number): string {
  if (rate >= 70) return "bg-red-500";
  if (rate >= 40) return "bg-orange-500";
  if (rate > 0) return "bg-emerald-500";
  return "bg-gray-200";
}

function getShiftPosition(shift: Shift) {
  const range = getClippedTimeRange(shift);
  if (!range) return null;

  const timelineStart = START_HOUR * 60;
  return {
    left: ((range.start - timelineStart) / 60) * HOUR_WIDTH,
    width: Math.max(((range.end - range.start) / 60) * HOUR_WIDTH, 42),
  };
}

export default function RoomTimelineScreen({ onBack }: RoomTimelineScreenProps) {
  const [selectedDate, setSelectedDate] = useState(() => formatDate(new Date()));
  const [rooms, setRooms] = useState<ActiveRoom[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAssigningRoom, setIsAssigningRoom] = useState(false);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [searchText, setSearchText] = useState("");
  const [roomFilter, setRoomFilter] = useState<RoomFilter>("all");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showWeeklyReport, setShowWeeklyReport] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);

  const loadData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      else setIsRefreshing(true);
      setErrorMessage("");
      const [roomData, shiftData] = await Promise.all([
        getActiveRooms(),
        getShiftsByDateRange(selectedDate, selectedDate),
      ]);
      setRooms(roomData);
      setShifts(shiftData);
      setLastUpdatedAt(new Date());
    } catch (error) {
      console.error("部屋タイムライン取得エラー:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "部屋タイムラインの取得に失敗しました"
      );
    } finally {
      if (showLoading) setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      void loadData(false);
    }, 60_000);

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        setCurrentTime(new Date());
        void loadData(false);
      }
    }

    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(refreshTimer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadData]);

  const roomRows = useMemo<RoomRow[]>(
    () =>
      rooms.map((room) => {
        const roomShifts = shifts
          .filter(
            (shift) =>
              shift.room_id === room.id && getStatus(shift) !== "holiday"
          )
          .sort((a, b) => a.start_time.localeCompare(b.start_time));
        const occupiedMinutes = calculateOccupiedMinutes(roomShifts);

        return {
          room,
          shifts: roomShifts,
          occupiedMinutes,
          utilizationRate: Math.round((occupiedMinutes / TOTAL_MINUTES) * 100),
        };
      }),
    [rooms, shifts]
  );

  const unassignedShifts = useMemo(
    () =>
      shifts
        .filter((shift) => !shift.room_id && getStatus(shift) !== "holiday")
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [shifts]
  );

  const holidayShifts = useMemo(
    () =>
      shifts
        .filter((shift) => getStatus(shift) === "holiday")
        .sort((a, b) => getCastName(a).localeCompare(getCastName(b), "ja")),
    [shifts]
  );

  const utilizationSummary = useMemo(() => {
    const totalOccupiedMinutes = roomRows.reduce(
      (total, row) => total + row.occupiedMinutes,
      0
    );
    const capacityMinutes = rooms.length * TOTAL_MINUTES;
    const overallRate =
      capacityMinutes > 0
        ? Math.round((totalOccupiedMinutes / capacityMinutes) * 100)
        : 0;
    const busiestRoom = roomRows.reduce<RoomRow | null>(
      (best, row) =>
        !best || row.occupiedMinutes > best.occupiedMinutes ? row : best,
      null
    );

    return {
      totalOccupiedMinutes,
      overallRate,
      busiestRoom,
      usedRoomCount: roomRows.filter((row) => row.occupiedMinutes > 0).length,
    };
  }, [roomRows, rooms.length]);

  const hourlyUtilization = useMemo(() => {
    return Array.from({ length: TOTAL_HOURS }, (_, index) => {
      const hour = START_HOUR + index;
      const hourStart = hour * 60;
      const hourEnd = hourStart + 60;
      let occupiedMinutes = 0;
      let occupiedRoomCount = 0;

      for (const row of roomRows) {
        const mergedRanges = mergeTimeRanges(
          row.shifts
            .map(getClippedTimeRange)
            .filter((range): range is TimeRange => range !== null)
        );
        const roomMinutes = mergedRanges.reduce((total, range) => {
          const overlapStart = Math.max(range.start, hourStart);
          const overlapEnd = Math.min(range.end, hourEnd);
          return total + Math.max(overlapEnd - overlapStart, 0);
        }, 0);

        occupiedMinutes += roomMinutes;
        if (roomMinutes > 0) occupiedRoomCount += 1;
      }

      const capacityMinutes = rooms.length * 60;
      return {
        hour,
        occupiedMinutes,
        occupiedRoomCount,
        rate:
          capacityMinutes > 0
            ? Math.round((occupiedMinutes / capacityMinutes) * 100)
            : 0,
      };
    });
  }, [roomRows, rooms.length]);

  const peakHour = useMemo(
    () =>
      hourlyUtilization.reduce<(typeof hourlyUtilization)[number] | null>(
        (peak, item) =>
          !peak || item.occupiedMinutes > peak.occupiedMinutes ? item : peak,
        null
      ),
    [hourlyUtilization]
  );

  const highDemandHours = useMemo(
    () => hourlyUtilization.filter((item) => item.rate >= 80),
    [hourlyUtilization]
  );

  const conflicts = useMemo(() => detectConflicts(shifts), [shifts]);

  const todayText = formatDate(currentTime);
  const isToday = selectedDate === todayText;
  const currentMinutes =
    (currentTime.getHours() < START_HOUR
      ? currentTime.getHours() + 24
      : currentTime.getHours()) *
      60 +
    currentTime.getMinutes();
  const isCurrentTimeVisible =
    isToday &&
    currentMinutes >= START_HOUR * 60 &&
    currentMinutes <= END_HOUR * 60;
  const currentLineLeft =
    ((currentMinutes - START_HOUR * 60) / 60) * HOUR_WIDTH;

  const currentRoomUsage = useMemo(() => {
    if (!isToday) {
      return { occupiedRoomIds: new Set<string>(), occupiedCount: 0 };
    }

    const occupiedRoomIds = new Set(
      shifts
        .filter((shift) => {
          if (!shift.room_id || getStatus(shift) === "holiday") return false;
          const range = getFullTimeRange(shift);
          return currentMinutes >= range.start && currentMinutes < range.end;
        })
        .map((shift) => shift.room_id)
        .filter((roomId): roomId is string => Boolean(roomId))
    );

    return { occupiedRoomIds, occupiedCount: occupiedRoomIds.size };
  }, [currentMinutes, isToday, shifts]);

  const roomsBecomingAvailable = useMemo(() => {
    if (!isToday) return [];

    return roomRows
      .map((row) => {
        const mergedRanges = mergeTimeRanges(
          row.shifts
            .map(getClippedTimeRange)
            .filter((range): range is TimeRange => range !== null)
        );
        const activeRange = mergedRanges.find(
          (range) => currentMinutes >= range.start && currentMinutes < range.end
        );
        if (!activeRange) return null;

        return {
          roomId: row.room.id,
          roomName: row.room.name,
          availableAt: activeRange.end,
          remainingMinutes: activeRange.end - currentMinutes,
        };
      })
      .filter(
        (
          item
        ): item is {
          roomId: string;
          roomName: string;
          availableAt: number;
          remainingMinutes: number;
        } => item !== null
      )
      .sort((a, b) => a.availableAt - b.availableAt);
  }, [currentMinutes, isToday, roomRows]);

  const filteredRoomRows = useMemo(() => {
    const normalizedSearch = searchText.trim().toLocaleLowerCase("ja");

    return roomRows.filter((row) => {
      const matchesSearch =
        !normalizedSearch ||
        row.room.name.toLocaleLowerCase("ja").includes(normalizedSearch) ||
        row.shifts.some((shift) =>
          getCastName(shift).toLocaleLowerCase("ja").includes(normalizedSearch)
        );
      if (!matchesSearch) return false;

      const isActive = isToday
        ? currentRoomUsage.occupiedRoomIds.has(row.room.id)
        : row.shifts.length > 0;
      const hasConflict = row.shifts.some((shift) =>
        conflicts.roomConflictIds.has(shift.id)
      );

      switch (roomFilter) {
        case "active":
          return isActive;
        case "available":
          return !isActive;
        case "conflict":
          return hasConflict;
        default:
          return true;
      }
    });
  }, [
    conflicts.roomConflictIds,
    currentRoomUsage.occupiedRoomIds,
    isToday,
    roomFilter,
    roomRows,
    searchText,
  ]);

  const availableRoomsForSelectedShift = useMemo(() => {
    if (
      !selectedShift ||
      selectedShift.room_id ||
      getStatus(selectedShift) === "holiday"
    ) {
      return [];
    }

    const selectedRange = getFullTimeRange(selectedShift);
    return roomRows
      .filter((row) => {
      return !shifts.some((shift) => {
        if (
          shift.id === selectedShift.id ||
          shift.room_id !== row.room.id ||
          getStatus(shift) === "holiday"
        ) {
          return false;
        }
        return rangesOverlap(selectedRange, getFullTimeRange(shift));
      });
      })
      .sort((a, b) => a.occupiedMinutes - b.occupiedMinutes);
  }, [roomRows, selectedShift, shifts]);

  function moveDate(amount: number) {
    setSelectedDate((current) => addDays(current, amount));
    setSelectedShift(null);
  }

  function returnToToday() {
    setSelectedDate(formatDate(new Date()));
    setSelectedShift(null);
  }

  function exportUtilizationCsv() {
    const headers = [
      "日付",
      "部屋名",
      "稼働率",
      "稼働時間（分）",
      "稼働時間",
      "シフト件数",
      "重複シフト数",
    ];

    const rows = roomRows.map((row) => {
      const conflictCount = row.shifts.filter((shift) =>
        conflicts.roomConflictIds.has(shift.id)
      ).length;

      return [
        selectedDate,
        row.room.name,
        `${row.utilizationRate}%`,
        row.occupiedMinutes,
        formatDuration(row.occupiedMinutes),
        row.shifts.length,
        conflictCount,
      ];
    });

    const summaryRows = [
      [],
      ["全体稼働率", `${utilizationSummary.overallRate}%`],
      ["延べ稼働時間（分）", utilizationSummary.totalOccupiedMinutes],
      ["使用部屋数", utilizationSummary.usedRoomCount],
      ["部屋総数", rooms.length],
      ["部屋未設定シフト数", unassignedShifts.length],
      ["重複組数", conflicts.pairCount],
    ];

    const csv = [headers, ...rows, ...summaryRows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `room-utilization-${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function openEditor(shift: Shift) {
    setSelectedShift(null);
    setEditingShift(shift);
  }

  async function deleteSelectedShift() {
    if (!selectedShift || isDeleting) return;

    const confirmed = window.confirm(
      `${getCastName(selectedShift)}さんのシフトを削除しますか？`
    );
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      await deleteShiftById(selectedShift.id);
      setSelectedShift(null);
      await loadData();
    } catch (error) {
      console.error("シフト削除エラー:", error);
      window.alert(
        error instanceof Error ? error.message : "シフトの削除に失敗しました"
      );
    } finally {
      setIsDeleting(false);
    }
  }

  async function assignRoom(roomId: string) {
    if (!selectedShift || isAssigningRoom) return;

    try {
      setIsAssigningRoom(true);
      await updateShiftById(selectedShift.id, { room_id: roomId });
      setSelectedShift(null);
      await loadData(false);
    } catch (error) {
      console.error("部屋割り当てエラー:", error);
      window.alert(
        error instanceof Error ? error.message : "部屋の割り当てに失敗しました"
      );
    } finally {
      setIsAssigningRoom(false);
    }
  }

  async function autoAssignUnassignedShifts() {
    if (unassignedShifts.length === 0 || isAutoAssigning) return;
    const confirmed = window.confirm(
      `部屋未設定の${unassignedShifts.length}件を、空いている部屋へ自動割り当てしますか？`
    );
    if (!confirmed) return;

    const plannedShifts = shifts.filter(
      (shift) => Boolean(shift.room_id) && getStatus(shift) !== "holiday"
    );
    const assignedShiftIds: string[] = [];
    const skippedNames: string[] = [];

    try {
      setIsAutoAssigning(true);

      for (const shift of unassignedShifts) {
        const shiftRange = getFullTimeRange(shift);
        const candidates = rooms
          .filter((room) =>
            !plannedShifts.some(
              (planned) =>
                planned.room_id === room.id &&
                rangesOverlap(shiftRange, getFullTimeRange(planned))
            )
          )
          .map((room) => ({
            room,
            occupiedMinutes: calculateOccupiedMinutes(
              plannedShifts.filter((planned) => planned.room_id === room.id)
            ),
          }))
          .sort((a, b) => a.occupiedMinutes - b.occupiedMinutes);

        const recommended = candidates[0];
        if (!recommended) {
          skippedNames.push(getCastName(shift));
          continue;
        }

        await updateShiftById(shift.id, { room_id: recommended.room.id });
        assignedShiftIds.push(shift.id);
        plannedShifts.push({
          ...shift,
          room_id: recommended.room.id,
          rooms: { id: recommended.room.id, name: recommended.room.name },
        });
      }

      await loadData(false);
      window.alert(
        `${assignedShiftIds.length}件を自動割り当てしました。${
          skippedNames.length > 0
            ? `\n空きがなく未設定のまま：${skippedNames.join("、")}`
            : ""
        }`
      );
    } catch (error) {
      await Promise.all(
        assignedShiftIds.map((shiftId) =>
          updateShiftById(shiftId, { room_id: null })
        )
      );
      await loadData(false);
      console.error("部屋一括割り当てエラー:", error);
      window.alert(
        "自動割り当てに失敗したため、今回の変更を元に戻しました。"
      );
    } finally {
      setIsAutoAssigning(false);
    }
  }

  return (
    <>
      <header className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500">部屋稼働確認</p>
            <h1 className="text-2xl font-bold text-gray-900">部屋タイムライン</h1>
            <p className="mt-1 text-sm text-gray-500">9:00〜翌5:00の利用状況と稼働率</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => void loadData(false)}
              disabled={isRefreshing}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRefreshing ? "更新中" : "更新"}
            </button>
            {onBack && (
              <button type="button" onClick={onBack} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-600 shadow-sm">
                戻る
              </button>
            )}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
          <span className={`h-2 w-2 rounded-full ${isRefreshing ? "animate-pulse bg-orange-400" : "bg-emerald-500"}`} />
          <span>
            {isRefreshing
              ? "最新データを取得しています"
              : lastUpdatedAt
                ? `最終更新 ${String(lastUpdatedAt.getHours()).padStart(2, "0")}:${String(
                    lastUpdatedAt.getMinutes()
                  ).padStart(2, "0")}`
                : "データを読み込んでいます"}
          </span>
        </div>
      </header>

      <section className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => moveDate(-1)} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700">前日</button>
          <div className="text-center">
            <p className="font-bold text-gray-900">{formatDateHeading(selectedDate)}</p>
            <p className="mt-0.5 text-xs text-gray-500">{selectedDate}</p>
          </div>
          <button type="button" onClick={() => moveDate(1)} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700">翌日</button>
        </div>
        <button type="button" onClick={returnToToday} className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-600">今日に戻る</button>
      </section>

      <section className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-indigo-50 p-3">
          <p className="text-xs font-bold text-indigo-700">全体稼働率</p>
          <p className="mt-1 text-2xl font-bold text-indigo-800">{utilizationSummary.overallRate}%</p>
          <p className="mt-1 text-[10px] text-indigo-600">全{rooms.length}室・20時間を基準</p>
        </div>
        <div className="rounded-2xl bg-purple-50 p-3">
          <p className="text-xs font-bold text-purple-700">使用部屋</p>
          <p className="mt-1 text-2xl font-bold text-purple-800">
            {utilizationSummary.usedRoomCount}<span className="ml-1 text-sm">/ {rooms.length}室</span>
          </p>
          <p className="mt-1 text-[10px] text-purple-600">1件以上の利用予定</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 p-3">
          <p className="text-xs font-bold text-emerald-700">延べ稼働時間</p>
          <p className="mt-1 text-xl font-bold text-emerald-800">{formatDuration(utilizationSummary.totalOccupiedMinutes)}</p>
          <p className="mt-1 text-[10px] text-emerald-600">重複時間は二重計上しません</p>
        </div>
        <div className="rounded-2xl bg-orange-50 p-3">
          <p className="text-xs font-bold text-orange-700">最高稼働</p>
          <p className="mt-1 truncate text-lg font-bold text-orange-800">
            {utilizationSummary.busiestRoom?.occupiedMinutes
              ? utilizationSummary.busiestRoom.room.name
              : "なし"}
          </p>
          <p className="mt-1 text-[10px] text-orange-600">
            {utilizationSummary.busiestRoom?.occupiedMinutes
              ? `${utilizationSummary.busiestRoom.utilizationRate}%・${formatDuration(utilizationSummary.busiestRoom.occupiedMinutes)}`
              : "利用予定なし"}
          </p>
        </div>
      </section>

      <section className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-gray-900">時間帯別の稼働率</p>
            <p className="mt-0.5 text-xs text-gray-500">
              混みやすい時間を1時間単位で確認できます
            </p>
          </div>
          <div className="shrink-0 rounded-xl bg-rose-50 px-3 py-2 text-right">
            <p className="text-[10px] font-bold text-rose-700">ピーク時間</p>
            <p className="text-sm font-bold text-rose-900">
              {peakHour && peakHour.occupiedMinutes > 0
                ? `${formatHour(peakHour.hour)}〜${formatHour(peakHour.hour + 1)}`
                : "なし"}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max items-end gap-1.5">
            {hourlyUtilization.map((item) => {
              const isPeak =
                Boolean(peakHour?.occupiedMinutes) && item.hour === peakHour?.hour;
              return (
                <div key={item.hour} className="w-10 shrink-0 text-center">
                  <p className={`mb-1 text-[9px] font-bold ${isPeak ? "text-rose-700" : "text-gray-500"}`}>
                    {item.rate}%
                  </p>
                  <div className="flex h-20 items-end overflow-hidden rounded-lg bg-gray-100">
                    <div
                      className={`w-full rounded-lg transition-all ${
                        isPeak
                          ? "bg-rose-500"
                          : item.rate >= 70
                            ? "bg-orange-500"
                            : item.rate > 0
                              ? "bg-sky-500"
                              : "bg-gray-200"
                      }`}
                      style={{ height: `${Math.max(item.rate, item.rate > 0 ? 6 : 0)}%` }}
                      title={`${formatHour(item.hour)}〜${formatHour(item.hour + 1)}：${item.rate}%（最大${item.occupiedRoomCount}室）`}
                    />
                  </div>
                  <p className={`mt-1 text-[9px] font-bold ${isPeak ? "text-rose-700" : "text-gray-500"}`}>
                    {formatHour(item.hour).replace(":00", "時")}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
        {peakHour && peakHour.occupiedMinutes > 0 && (
          <p className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600">
            ピーク時間の平均稼働率は
            <span className="mx-1 font-bold text-gray-900">{peakHour.rate}%</span>
            です。
          </p>
        )}
      </section>

      {highDemandHours.length > 0 && (
        <section className="mb-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl" aria-hidden="true">⚠</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-orange-900">混雑が予想される時間帯</p>
              <p className="mt-1 text-xs text-orange-700">
                部屋稼働率が80%以上になる予定です。部屋割りを事前に確認してください。
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {highDemandHours.map((item) => (
                  <span
                    key={item.hour}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                      item.rate >= 95
                        ? "bg-red-600 text-white"
                        : "bg-orange-200 text-orange-900"
                    }`}
                  >
                    {formatHour(item.hour)}〜{formatHour(item.hour + 1)}・
                    {item.rate}%
                    {item.rate >= 95 ? " 満室見込み" : " 混雑注意"}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {isToday && (
        <section className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
                <p className="text-sm font-bold text-emerald-800">現在の部屋状況</p>
              </div>
              <p className="mt-1 text-xs text-emerald-700">
                {String(currentTime.getHours()).padStart(2, "0")}:{String(
                  currentTime.getMinutes()
                ).padStart(2, "0")} 時点・1分ごとに自動更新
              </p>
            </div>
            <div className="flex gap-4 text-right">
              <div>
                <p className="text-[10px] font-bold text-emerald-700">使用中</p>
                <p className="text-xl font-bold text-emerald-900">
                  {currentRoomUsage.occupiedCount}<span className="ml-1 text-xs">室</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-700">空き</p>
                <p className="text-xl font-bold text-emerald-900">
                  {Math.max(rooms.length - currentRoomUsage.occupiedCount, 0)}
                  <span className="ml-1 text-xs">室</span>
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {isToday && roomsBecomingAvailable.length > 0 && (
        <section className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-sky-900">次に空く部屋</p>
              <p className="mt-0.5 text-xs text-sky-700">現在使用中の部屋を、空く時刻順に表示</p>
            </div>
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-800">
              {roomsBecomingAvailable.length}室
            </span>
          </div>
          <div className="space-y-2">
            {roomsBecomingAvailable.slice(0, 3).map((item, index) => (
              <div
                key={item.roomId}
                className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <p className="truncate text-sm font-bold text-gray-900">{item.roomName}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-sky-900">
                    {formatLogicalMinutes(item.availableAt)}に空き予定
                  </p>
                  <p className="text-[10px] text-sky-700">
                    あと{formatDuration(item.remainingMinutes)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {roomsBecomingAvailable.length > 3 && (
            <p className="mt-2 text-center text-xs text-sky-700">
              ほか{roomsBecomingAvailable.length - 3}室はタイムラインで確認できます
            </p>
          )}
        </section>
      )}

      <section className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
        <label htmlFor="room-timeline-search" className="text-sm font-bold text-gray-700">
          部屋・キャストを検索
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="room-timeline-search"
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="例：Room3、あい"
            className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gray-900"
          />
          {searchText && (
            <button
              type="button"
              onClick={() => setSearchText("")}
              className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-600"
            >
              クリア
            </button>
          )}
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {(
            [
              ["all", "すべて"],
              ["active", isToday ? "使用中" : "予定あり"],
              ["available", isToday ? "空き" : "予定なし"],
              ["conflict", "重複あり"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setRoomFilter(value)}
              className={`rounded-xl px-2 py-2 text-[11px] font-bold transition ${
                roomFilter === value
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-right text-xs text-gray-500">
          {filteredRoomRows.length} / {roomRows.length}室を表示
        </p>
      </section>

      <button
        type="button"
        onClick={exportUtilizationCsv}
        disabled={isLoading || rooms.length === 0}
        className="mb-4 flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div>
          <p className="text-sm font-bold text-gray-900">稼働実績をCSV保存</p>
          <p className="mt-0.5 text-xs text-gray-500">
            Excelで開ける日別レポートを作成します
          </p>
        </div>
        <span className="rounded-xl bg-gray-900 px-3 py-2 text-xs font-bold text-white">
          ダウンロード
        </span>
      </button>

      <button
        type="button"
        onClick={() => setShowCopyModal(true)}
        disabled={isLoading || shifts.length === 0}
        className="mb-4 flex w-full items-center justify-between rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-left shadow-sm transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div>
          <p className="text-sm font-bold text-blue-900">この日のシフトをコピー</p>
          <p className="mt-0.5 text-xs text-blue-700">
            翌日・1週間後・指定日へまとめて登録
          </p>
        </div>
        <span className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white">
          {shifts.length}件
        </span>
      </button>

      <button
        type="button"
        onClick={() => setShowWeeklyReport(true)}
        disabled={isLoading || rooms.length === 0}
        className="mb-4 flex w-full items-center justify-between rounded-2xl bg-indigo-600 px-4 py-3 text-left text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div>
          <p className="text-sm font-bold">直近7日間の稼働レポート</p>
          <p className="mt-0.5 text-xs text-indigo-100">
            日別比較と部屋ランキングを確認
          </p>
        </div>
        <span className="text-xl" aria-hidden="true">›</span>
      </button>

      {conflicts.pairCount > 0 && (
        <section className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl" aria-hidden="true">⚠</span>
            <div>
              <p className="font-bold text-red-800">
                時間の重複が{conflicts.pairCount}件あります
              </p>
              <p className="mt-1 text-sm text-red-700">
                赤いシフトをタップし、部屋または時間を確認してください。
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-red-700">
                <span className="rounded-full bg-red-100 px-2.5 py-1">
                  部屋重複 {conflicts.roomConflictIds.size}シフト
                </span>
                <span className="rounded-full bg-red-100 px-2.5 py-1">
                  キャスト重複 {conflicts.castConflictIds.size}シフト
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {errorMessage && (
        <section className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="font-bold text-red-700">データを取得できませんでした</p>
          <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
          <button type="button" onClick={() => void loadData()} className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white">再読み込み</button>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {isLoading ? (
          <div className="flex min-h-80 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
              <p className="mt-3 text-sm text-gray-500">読み込み中...</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-max" style={{ width: `${160 + TIMELINE_WIDTH}px` }}>
              <div className="sticky top-0 z-20 flex border-b border-gray-200 bg-gray-50">
                <div className="sticky left-0 z-30 flex h-12 w-40 shrink-0 items-center border-r border-gray-200 bg-gray-50 px-3">
                  <span className="text-xs font-bold text-gray-500">部屋・稼働率</span>
                </div>
                <div className="relative h-12 shrink-0" style={{ width: `${TIMELINE_WIDTH}px` }}>
                  {Array.from({ length: TOTAL_HOURS + 1 }, (_, index) => {
                    const hour = START_HOUR + index;
                    return (
                      <div key={hour} className="absolute top-0 h-full border-l border-gray-200" style={{ left: `${index * HOUR_WIDTH}px` }}>
                        <span className="absolute left-1 top-3 whitespace-nowrap text-[10px] font-bold text-gray-500">{formatHour(hour)}</span>
                      </div>
                    );
                  })}
                  {isCurrentTimeVisible && (
                    <div
                      className="pointer-events-none absolute top-0 z-20 h-full w-0.5 bg-red-500"
                      style={{ left: `${currentLineLeft}px` }}
                    >
                      <span className="absolute -left-3 top-0 rounded bg-red-500 px-1 text-[9px] font-bold text-white">
                        NOW
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {filteredRoomRows.map((row) => (
                <div key={row.room.id} className="flex border-b border-gray-100">
                  <div className="sticky left-0 z-10 flex w-40 shrink-0 items-center border-r border-gray-200 bg-white px-3" style={{ height: `${ROW_HEIGHT}px` }}>
                    <div className="min-w-0 w-full">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-bold text-gray-900">{row.room.name}</p>
                        {isToday && currentRoomUsage.occupiedRoomIds.has(row.room.id) ? (
                          <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">使用中</span>
                        ) : (
                          <span className="text-[10px] font-bold text-gray-600">{row.utilizationRate}%</span>
                        )}
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div className={`h-full rounded-full ${getUtilizationClasses(row.utilizationRate)}`} style={{ width: `${row.utilizationRate}%` }} />
                      </div>
                      <p className="mt-1 text-[10px] text-gray-500">
                        {row.occupiedMinutes > 0 ? `${formatDuration(row.occupiedMinutes)}・${row.shifts.length}件` : "空き"}
                      </p>
                    </div>
                  </div>

                  <div className="relative shrink-0 bg-white" style={{ width: `${TIMELINE_WIDTH}px`, height: `${ROW_HEIGHT}px` }}>
                    {Array.from({ length: TOTAL_HOURS + 1 }, (_, index) => (
                      <div key={index} className="absolute top-0 h-full border-l border-gray-100" style={{ left: `${index * HOUR_WIDTH}px` }} />
                    ))}
                    {isCurrentTimeVisible && (
                      <div
                        className="pointer-events-none absolute top-0 z-20 h-full w-0.5 bg-red-500/80"
                        style={{ left: `${currentLineLeft}px` }}
                      />
                    )}
                    {row.shifts.map((shift) => {
                      const position = getShiftPosition(shift);
                      if (!position) return null;
                      const status = getStatus(shift);
                      const hasConflict = conflicts.shiftIds.has(shift.id);
                      return (
                        <button
                          key={shift.id}
                          type="button"
                          onClick={() => setSelectedShift(shift)}
                          className={`absolute top-3 h-12 overflow-hidden rounded-xl border px-2 text-left shadow-sm transition hover:brightness-95 ${
                            hasConflict
                              ? "z-10 border-2 border-red-600 bg-red-100 text-red-900 ring-2 ring-red-300"
                              : getStatusClasses(status)
                          }`}
                          style={{ left: `${position.left}px`, width: `${position.width}px` }}
                        >
                          <p className="truncate text-xs font-bold">
                            {hasConflict ? "⚠" : getStatusLabel(status)} {getCastName(shift)}
                          </p>
                          <p className="mt-0.5 truncate text-[10px]">{formatTime(shift.start_time)}〜{formatTime(shift.end_time)}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {filteredRoomRows.length === 0 && (
                <div className="p-8 text-center">
                  <p className="text-sm font-bold text-gray-700">
                    条件に一致する部屋がありません
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchText("");
                      setRoomFilter("all");
                    }}
                    className="mt-3 rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-600"
                  >
                    絞り込みを解除
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <p className="mt-2 text-xs text-gray-400">稼働率は9:00〜翌5:00の20時間を100%として計算します。仮シフトを含み、休みは含みません。</p>

      {unassignedShifts.length > 0 && (
        <section className="mt-5">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-sm text-gray-500">要確認</p>
              <h2 className="text-lg font-bold text-gray-900">部屋未設定</h2>
            </div>
            <button
              type="button"
              onClick={() => void autoAssignUnassignedShifts()}
              disabled={isAutoAssigning || rooms.length === 0}
              className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAutoAssigning ? "割当中..." : "まとめて自動割当"}
            </button>
          </div>
          <div className="space-y-2">
            {unassignedShifts.map((shift) => (
              <button key={shift.id} type="button" onClick={() => setSelectedShift(shift)} className="w-full rounded-2xl border border-orange-200 bg-orange-50 p-4 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-bold text-orange-900">{getCastName(shift)}</p><p className="mt-1 text-sm text-orange-700">{formatTime(shift.start_time)}〜{formatTime(shift.end_time)}</p></div>
                  <span className="rounded-full bg-orange-200 px-2.5 py-1 text-xs font-bold text-orange-800">{getStatusLabel(getStatus(shift))}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {holidayShifts.length > 0 && (
        <section className="mt-5">
          <div className="mb-3"><p className="text-sm text-gray-500">休み登録</p><h2 className="text-lg font-bold text-gray-900">休みキャスト</h2></div>
          <div className="flex flex-wrap gap-2">
            {holidayShifts.map((shift) => <span key={shift.id} className="rounded-full bg-gray-200 px-3 py-2 text-sm font-bold text-gray-700">{getCastName(shift)}</span>)}
          </div>
        </section>
      )}

      {selectedShift && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setSelectedShift(null)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-sm text-gray-500">シフト詳細</p><h2 className="mt-1 text-xl font-bold text-gray-900">{getCastName(selectedShift)}</h2></div>
              <button type="button" onClick={() => setSelectedShift(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-lg text-gray-600" aria-label="閉じる">×</button>
            </div>
            <div className="mt-5 space-y-3 rounded-2xl bg-gray-50 p-4">
              <div className="flex justify-between gap-3"><span className="text-sm text-gray-500">日付</span><span className="text-sm font-bold text-gray-900">{selectedShift.work_date}</span></div>
              <div className="flex justify-between gap-3"><span className="text-sm text-gray-500">時間</span><span className="text-sm font-bold text-gray-900">{formatTime(selectedShift.start_time)}〜{formatTime(selectedShift.end_time)}</span></div>
              <div className="flex justify-between gap-3"><span className="text-sm text-gray-500">部屋</span><span className="text-sm font-bold text-gray-900">{selectedShift.rooms?.name || "未設定"}</span></div>
              <div className="flex justify-between gap-3"><span className="text-sm text-gray-500">ステータス</span><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusClasses(getStatus(selectedShift))}`}>{getStatusLabel(getStatus(selectedShift))}</span></div>
            </div>
            {conflicts.shiftIds.has(selectedShift.id) && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="font-bold text-red-800">⚠ 重複を確認してください</p>
                <ul className="mt-2 space-y-1 text-sm text-red-700">
                  {conflicts.roomConflictIds.has(selectedShift.id) && (
                    <li>・同じ部屋に時間が重なるシフトがあります</li>
                  )}
                  {conflicts.castConflictIds.has(selectedShift.id) && (
                    <li>・同じキャストに時間が重なるシフトがあります</li>
                  )}
                </ul>
              </div>
            )}
            {!selectedShift.room_id && getStatus(selectedShift) !== "holiday" && (
              <section className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <p className="font-bold text-blue-900">空いている部屋を割り当て</p>
                <p className="mt-1 text-xs text-blue-700">
                  このシフトの時間と重ならない部屋だけを表示しています。
                </p>
                {availableRoomsForSelectedShift.length > 0 ? (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() =>
                        void assignRoom(availableRoomsForSelectedShift[0].room.id)
                      }
                      disabled={isAssigningRoom}
                      className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isAssigningRoom
                        ? "割り当てています..."
                        : `おすすめの「${availableRoomsForSelectedShift[0].room.name}」へ自動割当`}
                    </button>
                    <p className="mt-3 text-xs font-bold text-blue-800">
                      ほかの候補から選ぶ
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                    {availableRoomsForSelectedShift.map((row, index) => (
                      <button
                        key={row.room.id}
                        type="button"
                        onClick={() => void assignRoom(row.room.id)}
                        disabled={isAssigningRoom}
                        className="rounded-xl bg-white px-3 py-2 text-left shadow-sm transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-bold text-blue-800">
                            {isAssigningRoom ? "割当中..." : row.room.name}
                          </span>
                          {index === 0 && !isAssigningRoom && (
                            <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                              おすすめ
                            </span>
                          )}
                        </div>
                        {!isAssigningRoom && (
                          <p className="mt-1 text-[10px] text-gray-500">
                            本日の稼働率 {row.utilizationRate}%
                          </p>
                        )}
                      </button>
                    ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl bg-white/70 p-3 text-sm text-orange-700">
                    この時間帯に割り当て可能な部屋はありません。
                  </p>
                )}
              </section>
            )}
            {selectedShift.memo && <div className="mt-4 rounded-2xl border border-gray-200 p-4"><p className="text-xs font-bold text-gray-500">メモ</p><p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{selectedShift.memo}</p></div>}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => openEditor(selectedShift)}
                disabled={isDeleting}
                className="rounded-2xl bg-gray-900 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                編集する
              </button>
              <button
                type="button"
                onClick={() => void deleteSelectedShift()}
                disabled={isDeleting}
                className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? "削除中..." : "削除する"}
              </button>
            </div>
            <button type="button" onClick={() => setSelectedShift(null)} disabled={isDeleting || isAssigningRoom} className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-600 disabled:opacity-50">閉じる</button>
          </div>
        </div>
      )}

      {editingShift && (
        <EditShiftModal
          shift={editingShift}
          onClose={() => setEditingShift(null)}
          onSaved={async () => {
            setEditingShift(null);
            await loadData();
          }}
        />
      )}

      {showWeeklyReport && (
        <RoomWeeklyReportModal
          rooms={rooms}
          anchorDate={selectedDate}
          onClose={() => setShowWeeklyReport(false)}
        />
      )}

      {showCopyModal && (
        <CopyDayShiftsModal
          sourceDate={selectedDate}
          shifts={shifts}
          onClose={() => setShowCopyModal(false)}
          onCopied={async (targetDate) => {
            setShowCopyModal(false);
            setSelectedDate(targetDate);
          }}
        />
      )}
    </>
  );
}
