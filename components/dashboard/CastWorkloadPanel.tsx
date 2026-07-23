"use client";

import { useState } from "react";
import {
  getShiftsByDateRange,
  type Shift,
} from "@/services/shift.service";

type CastWorkload = {
  castId: string;
  name: string;
  workDates: number;
  workingMinutes: number;
  workingShifts: number;
  tentativeShifts: number;
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

function getCastName(shift: Shift): string {
  return (
    shift.casts?.display_name ||
    shift.casts?.name ||
    "未設定"
  );
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function getShiftMinutes(shift: Shift): number {
  const start = timeToMinutes(shift.start_time);
  let end = timeToMinutes(shift.end_time);
  if (end <= start) end += 24 * 60;
  return Math.max(end - start, 0);
}

function calculateWorkloads(shifts: Shift[]): CastWorkload[] {
  const map = new Map<
    string,
    {
      name: string;
      dates: Set<string>;
      workingMinutes: number;
      workingShifts: number;
      tentativeShifts: number;
    }
  >();

  shifts
    .filter((shift) => shift.status !== "holiday")
    .forEach((shift) => {
      const current = map.get(shift.cast_id) ?? {
        name: getCastName(shift),
        dates: new Set<string>(),
        workingMinutes: 0,
        workingShifts: 0,
        tentativeShifts: 0,
      };

      current.dates.add(shift.work_date);
      if (shift.status === "tentative") {
        current.tentativeShifts += 1;
      } else {
        current.workingShifts += 1;
        current.workingMinutes += getShiftMinutes(shift);
      }
      map.set(shift.cast_id, current);
    });

  return [...map.entries()]
    .map(([castId, data]) => ({
      castId,
      name: data.name,
      workDates: data.dates.size,
      workingMinutes: data.workingMinutes,
      workingShifts: data.workingShifts,
      tentativeShifts: data.tentativeShifts,
    }))
    .sort((a, b) => b.workingMinutes - a.workingMinutes);
}

function formatHours(minutes: number): string {
  return `${(minutes / 60).toFixed(1)}時間`;
}

export default function CastWorkloadPanel() {
  const initialRange = getInitialRange();
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [workloads, setWorkloads] = useState<CastWorkload[]>([]);
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
      const shifts = await getShiftsByDateRange(
        startDate,
        endDate
      );
      const calculated = calculateWorkloads(shifts);
      setWorkloads(calculated);
      setMessage(
        calculated.length > 0
          ? `${calculated.length}名を集計しました。`
          : "選択した期間に出勤シフトはありません。"
      );
    } catch (error) {
      console.error("キャスト勤務集計エラー:", error);
      setMessage("勤務状況の集計に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }

  const totalMinutes = workloads.reduce(
    (total, cast) => total + cast.workingMinutes,
    0
  );
  const averageMinutes =
    workloads.length === 0 ? 0 : totalMinutes / workloads.length;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm text-gray-500">運営レポート</p>
        <h2 className="text-lg font-bold text-gray-900">
          キャスト勤務集計
        </h2>
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
        className="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-3 font-bold text-white disabled:opacity-50"
      >
        {isLoading ? "集計中..." : "勤務状況を集計"}
      </button>

      {workloads.length > 0 && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs font-bold text-emerald-700">
                合計勤務時間
              </p>
              <p className="mt-1 text-xl font-bold text-emerald-900">
                {formatHours(totalMinutes)}
              </p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-4">
              <p className="text-xs font-bold text-blue-700">
                1人平均
              </p>
              <p className="mt-1 text-xl font-bold text-blue-900">
                {formatHours(averageMinutes)}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {workloads.map((cast, index) => (
              <div
                key={cast.castId}
                className="rounded-xl border border-gray-100 bg-gray-50 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-gray-900">
                      {index < 3 ? `${index + 1}. ` : ""}
                      {cast.name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      出勤 {cast.workDates}日・確定{" "}
                      {cast.workingShifts}件
                      {cast.tentativeShifts > 0 &&
                        `・仮 ${cast.tentativeShifts}件`}
                    </p>
                  </div>
                  <p className="shrink-0 font-bold text-emerald-700">
                    {formatHours(cast.workingMinutes)}
                  </p>
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
