"use client";

import { useEffect, useMemo, useState } from "react";
import { getShiftsByDateRange, type Shift } from "@/services/shift.service";
import type { Room } from "@/services/room.service";

type RoomWeeklyReportModalProps = {
  rooms: Room[];
  anchorDate: string;
  onClose: () => void;
};

type Range = { start: number; end: number };

const START_HOUR = 9;
const END_HOUR = 29;
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;

function parseDate(dateText: string): Date {
  const [year, month, day] = dateText.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateText: string, amount: number): string {
  const date = parseDate(dateText);
  date.setDate(date.getDate() + amount);
  return formatDate(date);
}

function formatShortDate(dateText: string): string {
  const date = parseDate(dateText);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${date.getMonth() + 1}/${date.getDate()}（${weekdays[date.getDay()]}）`;
}

function timeToMinutes(time: string): number {
  const [rawHour, minute] = time.slice(0, 5).split(":").map(Number);
  const hour = rawHour < START_HOUR ? rawHour + 24 : rawHour;
  return hour * 60 + minute;
}

function getRange(shift: Shift): Range | null {
  const timelineStart = START_HOUR * 60;
  const timelineEnd = END_HOUR * 60;
  const rawStart = timeToMinutes(shift.start_time);
  let rawEnd = timeToMinutes(shift.end_time);
  if (rawEnd <= rawStart) rawEnd += 24 * 60;
  const start = Math.max(rawStart, timelineStart);
  const end = Math.min(rawEnd, timelineEnd);
  return end > start ? { start, end } : null;
}

function mergedMinutes(shifts: Shift[]): number {
  const ranges = shifts
    .map(getRange)
    .filter((range): range is Range => range !== null)
    .sort((a, b) => a.start - b.start);
  const merged: Range[] = [];

  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (!last || range.start > last.end) merged.push({ ...range });
    else last.end = Math.max(last.end, range.end);
  }

  return merged.reduce((total, range) => total + range.end - range.start, 0);
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}分`;
  if (rest === 0) return `${hours}時間`;
  return `${hours}時間${rest}分`;
}

function escapeCsv(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export default function RoomWeeklyReportModal({
  rooms,
  anchorDate,
  onClose,
}: RoomWeeklyReportModalProps) {
  const [reportEndDate, setReportEndDate] = useState(anchorDate);
  const startDate = addDays(reportEndDate, -6);
  const previousStartDate = addDays(reportEndDate, -13);
  const previousEndDate = addDays(reportEndDate, -7);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadReport() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        setShifts(await getShiftsByDateRange(previousStartDate, reportEndDate));
      } catch (error) {
        console.error("週間部屋稼働レポート取得エラー:", error);
        setErrorMessage(
          error instanceof Error ? error.message : "週間レポートの取得に失敗しました"
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadReport();
  }, [previousStartDate, reportEndDate]);

  useEffect(() => {
    setReportEndDate(anchorDate);
  }, [anchorDate]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const activeShifts = useMemo(
    () => shifts.filter((shift) => (shift.status ?? "working") !== "holiday"),
    [shifts]
  );

  const dailyRows = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => addDays(startDate, index)).map(
        (date) => {
          const dateShifts = activeShifts.filter((shift) => shift.work_date === date);
          const occupiedMinutes = rooms.reduce((total, room) => {
            return (
              total +
              mergedMinutes(dateShifts.filter((shift) => shift.room_id === room.id))
            );
          }, 0);
          const capacity = rooms.length * TOTAL_MINUTES;
          return {
            date,
            shiftCount: dateShifts.length,
            occupiedMinutes,
            rate: capacity > 0 ? Math.round((occupiedMinutes / capacity) * 100) : 0,
          };
        }
      ),
    [activeShifts, rooms, startDate]
  );

  const previousDailyRows = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        addDays(previousStartDate, index)
      ).map((date) => {
        const dateShifts = activeShifts.filter((shift) => shift.work_date === date);
        const occupiedMinutes = rooms.reduce((total, room) => {
          return (
            total +
            mergedMinutes(dateShifts.filter((shift) => shift.room_id === room.id))
          );
        }, 0);
        return { date, occupiedMinutes };
      }),
    [activeShifts, previousStartDate, rooms]
  );

  const roomRanking = useMemo(
    () =>
      rooms
        .map((room) => {
          const occupiedMinutes = dailyRows.reduce((total, day) => {
            const dayShifts = activeShifts.filter(
              (shift) => shift.work_date === day.date && shift.room_id === room.id
            );
            return total + mergedMinutes(dayShifts);
          }, 0);
          return {
            room,
            occupiedMinutes,
            rate: Math.round((occupiedMinutes / (TOTAL_MINUTES * 7)) * 100),
          };
        })
        .sort((a, b) => b.occupiedMinutes - a.occupiedMinutes),
    [activeShifts, dailyRows, rooms]
  );

  const totalMinutes = dailyRows.reduce(
    (total, day) => total + day.occupiedMinutes,
    0
  );
  const weeklyCapacity = rooms.length * TOTAL_MINUTES * 7;
  const weeklyRate =
    weeklyCapacity > 0 ? Math.round((totalMinutes / weeklyCapacity) * 100) : 0;
  const previousTotalMinutes = previousDailyRows.reduce(
    (total, day) => total + day.occupiedMinutes,
    0
  );
  const previousWeeklyRate =
    weeklyCapacity > 0
      ? Math.round((previousTotalMinutes / weeklyCapacity) * 100)
      : 0;
  const weeklyRateChange = weeklyRate - previousWeeklyRate;
  const busiestDay = dailyRows.reduce<(typeof dailyRows)[number] | null>(
    (best, day) => (!best || day.occupiedMinutes > best.occupiedMinutes ? day : best),
    null
  );

  function exportWeeklyCsv() {
    const dailySection: Array<Array<string | number>> = [
      ["週間部屋稼働レポート"],
      ["集計期間", `${startDate}〜${reportEndDate}`],
      ["週間稼働率", `${weeklyRate}%`],
      ["前の7日間の稼働率", `${previousWeeklyRate}%`],
      ["前期間比（ポイント）", weeklyRateChange],
      ["延べ稼働時間（分）", totalMinutes],
      [],
      ["日付", "稼働率", "稼働時間（分）", "シフト件数"],
      ...dailyRows.map((day) => [
        day.date,
        `${day.rate}%`,
        day.occupiedMinutes,
        day.shiftCount,
      ]),
    ];

    const roomSection: Array<Array<string | number>> = [
      [],
      ["部屋別ランキング"],
      ["順位", "部屋名", "7日間稼働率", "稼働時間（分）"],
      ...roomRanking.map((item, index) => [
        index + 1,
        item.room.name,
        `${item.rate}%`,
        item.occupiedMinutes,
      ]),
    ];

    const csv = [...dailySection, ...roomSection]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `room-weekly-report-${startDate}-${reportEndDate}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto bg-black/50 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="mx-auto max-w-md rounded-3xl bg-gray-50 p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500">{startDate}〜{reportEndDate}</p>
            <h2 className="text-xl font-bold text-gray-900">直近7日間の部屋稼働</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg text-gray-600 shadow-sm"
            aria-label="閉じる"
          >
            ×
          </button>
        </header>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setReportEndDate((current) => addDays(current, -7))}
            disabled={isLoading}
            className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-gray-700 shadow-sm disabled:opacity-50"
          >
            前の7日
          </button>
          <button
            type="button"
            onClick={() => setReportEndDate(anchorDate)}
            disabled={isLoading || reportEndDate === anchorDate}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 disabled:opacity-40"
          >
            基準日に戻る
          </button>
          <button
            type="button"
            onClick={() => setReportEndDate((current) => addDays(current, 7))}
            disabled={isLoading}
            className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-gray-700 shadow-sm disabled:opacity-50"
          >
            次の7日
          </button>
        </div>

        {isLoading ? (
          <div className="flex min-h-72 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
              <p className="mt-3 text-sm text-gray-500">集計しています...</p>
            </div>
          </div>
        ) : errorMessage ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : (
          <>
            <section className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-indigo-50 p-4">
                <p className="text-xs font-bold text-indigo-700">週間稼働率</p>
                <p className="mt-1 text-2xl font-bold text-indigo-900">{weeklyRate}%</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-xs font-bold text-emerald-700">延べ稼働時間</p>
                <p className="mt-1 text-lg font-bold text-emerald-900">
                  {formatDuration(totalMinutes)}
                </p>
              </div>
              <div
                className={`col-span-2 rounded-2xl p-4 ${
                  weeklyRateChange > 0
                    ? "bg-blue-50"
                    : weeklyRateChange < 0
                      ? "bg-orange-50"
                      : "bg-gray-100"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p
                      className={`text-xs font-bold ${
                        weeklyRateChange > 0
                          ? "text-blue-700"
                          : weeklyRateChange < 0
                            ? "text-orange-700"
                            : "text-gray-600"
                      }`}
                    >
                      前の7日間との比較
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {previousStartDate}〜{previousEndDate}：{previousWeeklyRate}%
                    </p>
                  </div>
                  <p
                    className={`text-2xl font-bold ${
                      weeklyRateChange > 0
                        ? "text-blue-800"
                        : weeklyRateChange < 0
                          ? "text-orange-800"
                          : "text-gray-700"
                    }`}
                  >
                    {weeklyRateChange > 0 ? "+" : ""}
                    {weeklyRateChange}
                    <span className="ml-1 text-sm">pt</span>
                  </p>
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  {weeklyRateChange > 0
                    ? "前の7日間より部屋稼働率が上昇しています。"
                    : weeklyRateChange < 0
                      ? "前の7日間より部屋稼働率が低下しています。"
                      : "前の7日間と同じ稼働率です。"}
                </p>
              </div>
              <div className="col-span-2 rounded-2xl bg-rose-50 p-4">
                <p className="text-xs font-bold text-rose-700">最も忙しかった日</p>
                <p className="mt-1 text-lg font-bold text-rose-900">
                  {busiestDay?.occupiedMinutes
                    ? `${formatShortDate(busiestDay.date)}・稼働率${busiestDay.rate}%`
                    : "利用実績なし"}
                </p>
              </div>
            </section>

            <section className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
              <h3 className="font-bold text-gray-900">日別の稼働率</h3>
              <div className="mt-3 space-y-3">
                {dailyRows.map((day) => (
                  <div key={day.date}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-700">{formatShortDate(day.date)}</span>
                      <span className="text-gray-500">{day.rate}%・{day.shiftCount}件</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${day.rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
              <h3 className="font-bold text-gray-900">部屋別ランキング</h3>
              <div className="mt-3 space-y-2">
                {roomRanking.map((item, index) => (
                  <div
                    key={item.room.id}
                    className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <span className="truncate text-sm font-bold text-gray-800">
                        {item.room.name}
                      </span>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-gray-900">{item.rate}%</p>
                      <p className="text-[10px] text-gray-500">
                        {formatDuration(item.occupiedMinutes)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <button
              type="button"
              onClick={exportWeeklyCsv}
              className="mt-5 flex w-full items-center justify-between rounded-2xl bg-gray-900 px-4 py-3 text-left text-white shadow-sm transition hover:bg-black"
            >
              <div>
                <p className="text-sm font-bold">週間レポートをCSV保存</p>
                <p className="mt-0.5 text-xs text-gray-300">
                  日別推移と部屋別ランキングを出力
                </p>
              </div>
              <span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">
                ダウンロード
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
