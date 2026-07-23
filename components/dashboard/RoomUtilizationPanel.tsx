"use client";

import { useState } from "react";
import {
  getActiveRooms,
  type Room,
} from "@/services/room.service";
import {
  getShiftsByDateRange,
  type Shift,
} from "@/services/shift.service";

const OPEN_MINUTES = 9 * 60;
const CLOSE_MINUTES = 29 * 60;
const DAILY_CAPACITY_MINUTES =
  CLOSE_MINUTES - OPEN_MINUTES;

type RoomResult = {
  id: string;
  name: string;
  usedMinutes: number;
  capacityMinutes: number;
  utilization: number;
};

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getInitialRange() {
  const today = new Date();
  return {
    start: formatLocalDate(
      new Date(today.getFullYear(), today.getMonth(), 1)
    ),
    end: formatLocalDate(
      new Date(today.getFullYear(), today.getMonth() + 1, 0)
    ),
  };
}

function parseDate(dateText: string): Date {
  const [year, month, day] = dateText.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function countDays(startDate: string, endDate: string): number {
  const difference =
    parseDate(endDate).getTime() -
    parseDate(startDate).getTime();
  return Math.floor(difference / 86_400_000) + 1;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function getShiftInterval(shift: Shift): [number, number] | null {
  let start = timeToMinutes(shift.start_time);
  let end = timeToMinutes(shift.end_time);

  if (end <= start) {
    end += 24 * 60;
  }

  start = Math.max(start, OPEN_MINUTES);
  end = Math.min(end, CLOSE_MINUTES);

  return end > start ? [start, end] : null;
}

function mergeMinutes(intervals: [number, number][]): number {
  if (intervals.length === 0) return 0;

  const sorted = [...intervals].sort(
    (a, b) => a[0] - b[0]
  );
  let [currentStart, currentEnd] = sorted[0];
  let total = 0;

  for (const [start, end] of sorted.slice(1)) {
    if (start <= currentEnd) {
      currentEnd = Math.max(currentEnd, end);
    } else {
      total += currentEnd - currentStart;
      currentStart = start;
      currentEnd = end;
    }
  }

  return total + currentEnd - currentStart;
}

function calculateResults(
  rooms: Room[],
  shifts: Shift[],
  days: number
): RoomResult[] {
  return rooms
    .map((room) => {
      const shiftsByDate = new Map<
        string,
        [number, number][]
      >();

      shifts
        .filter(
          (shift) =>
            shift.room_id === room.id &&
            shift.status !== "holiday"
        )
        .forEach((shift) => {
          const interval = getShiftInterval(shift);
          if (!interval) return;

          const current =
            shiftsByDate.get(shift.work_date) ?? [];
          current.push(interval);
          shiftsByDate.set(shift.work_date, current);
        });

      const usedMinutes = [...shiftsByDate.values()].reduce(
        (total, intervals) =>
          total + mergeMinutes(intervals),
        0
      );
      const capacityMinutes =
        days * DAILY_CAPACITY_MINUTES;

      return {
        id: room.id,
        name: room.name,
        usedMinutes,
        capacityMinutes,
        utilization:
          capacityMinutes === 0
            ? 0
            : (usedMinutes / capacityMinutes) * 100,
      };
    })
    .sort((a, b) => b.utilization - a.utilization);
}

function formatHours(minutes: number): string {
  return `${(minutes / 60).toFixed(1)}時間`;
}

export default function RoomUtilizationPanel() {
  const initialRange = getInitialRange();
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [results, setResults] = useState<RoomResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(
    "期間を選んで集計してください。"
  );

  async function calculate() {
    if (!startDate || !endDate) {
      setMessage("開始日と終了日を選択してください。");
      return;
    }

    if (startDate > endDate) {
      setMessage("終了日は開始日以降を選択してください。");
      return;
    }

    try {
      setIsLoading(true);
      setMessage("");

      const [rooms, shifts] = await Promise.all([
        getActiveRooms(),
        getShiftsByDateRange(startDate, endDate),
      ]);
      const calculated = calculateResults(
        rooms,
        shifts,
        countDays(startDate, endDate)
      );

      setResults(calculated);
      setMessage(
        rooms.length === 0
          ? "有効な部屋が登録されていません。"
          : `${rooms.length}室を集計しました。`
      );
    } catch (error) {
      console.error("部屋稼働率の取得エラー:", error);
      setMessage("部屋稼働率の集計に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }

  const totalUsedMinutes = results.reduce(
    (total, room) => total + room.usedMinutes,
    0
  );
  const totalCapacityMinutes = results.reduce(
    (total, room) => total + room.capacityMinutes,
    0
  );
  const overallUtilization =
    totalCapacityMinutes === 0
      ? 0
      : (totalUsedMinutes / totalCapacityMinutes) * 100;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm text-gray-500">運営レポート</p>
        <h2 className="text-lg font-bold text-gray-900">
          部屋稼働率
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          営業時間9:00〜翌5:00を基準に集計します
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="text-sm font-bold text-gray-700">
          開始日
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-300 p-3 font-normal"
          />
        </label>
        <label className="text-sm font-bold text-gray-700">
          終了日
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-300 p-3 font-normal"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => void calculate()}
        disabled={isLoading}
        className="mt-4 w-full rounded-xl bg-purple-700 px-4 py-3 font-bold text-white disabled:opacity-50"
      >
        {isLoading ? "集計中..." : "稼働率を集計"}
      </button>

      {results.length > 0 && (
        <>
          <div className="mt-4 rounded-2xl bg-purple-50 p-4">
            <p className="text-sm font-bold text-purple-700">
              全部屋の平均稼働率
            </p>
            <p className="mt-1 text-3xl font-bold text-purple-900">
              {overallUtilization.toFixed(1)}%
            </p>
            <p className="mt-1 text-xs text-purple-700">
              使用時間 {formatHours(totalUsedMinutes)}
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {results.map((room, index) => (
              <div key={room.id}>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-900">
                      {index === 0 && room.usedMinutes > 0
                        ? "★ "
                        : ""}
                      {room.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatHours(room.usedMinutes)}
                    </p>
                  </div>
                  <p className="font-bold text-gray-700">
                    {room.utilization.toFixed(1)}%
                  </p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-purple-600"
                    style={{
                      width: `${Math.min(
                        room.utilization,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {message && (
        <p
          role="status"
          className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-600"
        >
          {message}
        </p>
      )}
    </section>
  );
}
