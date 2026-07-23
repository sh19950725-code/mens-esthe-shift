"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getShiftsByDateRange,
  type Shift,
} from "@/services/shift.service";

type IssueType = "missing-room" | "cast-conflict" | "room-conflict";

type ShiftIssue = {
  key: string;
  type: IssueType;
  date: string;
  title: string;
  detail: string;
};

type ShiftIssuePanelProps = {
  onOpenWeek?: () => void;
};

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateRange() {
  const start = new Date();
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: formatLocalDate(start),
    end: formatLocalDate(end),
  };
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function getInterval(shift: Shift): [number, number] {
  const start = timeToMinutes(shift.start_time);
  let end = timeToMinutes(shift.end_time);
  if (end <= start) end += 24 * 60;
  return [start, end];
}

function overlaps(first: Shift, second: Shift): boolean {
  const [firstStart, firstEnd] = getInterval(first);
  const [secondStart, secondEnd] = getInterval(second);
  return firstStart < secondEnd && secondStart < firstEnd;
}

function getCastName(shift: Shift): string {
  return (
    shift.casts?.display_name ||
    shift.casts?.name ||
    "未設定"
  );
}

function getRoomName(shift: Shift): string {
  return shift.rooms?.name || "未設定";
}

function formatDate(date: string): string {
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function formatTimeRange(shift: Shift): string {
  return `${shift.start_time.slice(0, 5)}〜${shift.end_time.slice(
    0,
    5
  )}`;
}

function findIssues(shifts: Shift[]): ShiftIssue[] {
  const issues: ShiftIssue[] = [];
  const activeShifts = shifts.filter(
    (shift) => shift.status !== "holiday"
  );

  activeShifts.forEach((shift) => {
    if (!shift.room_id) {
      issues.push({
        key: `missing-${shift.id}`,
        type: "missing-room",
        date: shift.work_date,
        title: "部屋が未設定です",
        detail: `${getCastName(shift)}・${formatTimeRange(
          shift
        )}`,
      });
    }
  });

  const shiftsByDate = new Map<string, Shift[]>();
  activeShifts.forEach((shift) => {
    const current = shiftsByDate.get(shift.work_date) ?? [];
    current.push(shift);
    shiftsByDate.set(shift.work_date, current);
  });

  shiftsByDate.forEach((dayShifts, date) => {
    for (let firstIndex = 0; firstIndex < dayShifts.length; firstIndex += 1) {
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < dayShifts.length;
        secondIndex += 1
      ) {
        const first = dayShifts[firstIndex];
        const second = dayShifts[secondIndex];
        if (!overlaps(first, second)) continue;

        if (first.cast_id === second.cast_id) {
          issues.push({
            key: `cast-${first.id}-${second.id}`,
            type: "cast-conflict",
            date,
            title: "キャストの時間が重複しています",
            detail: `${getCastName(first)}・${formatTimeRange(
              first
            )} / ${formatTimeRange(second)}`,
          });
        }

        if (
          first.room_id &&
          first.room_id === second.room_id
        ) {
          issues.push({
            key: `room-${first.id}-${second.id}`,
            type: "room-conflict",
            date,
            title: "部屋の時間が重複しています",
            detail: `${getRoomName(first)}・${getCastName(
              first
            )} / ${getCastName(second)}`,
          });
        }
      }
    }
  });

  return issues.sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

function getIssueClasses(type: IssueType): string {
  switch (type) {
    case "room-conflict":
      return "border-red-100 bg-red-50 text-red-700";
    case "cast-conflict":
      return "border-orange-100 bg-orange-50 text-orange-700";
    case "missing-room":
    default:
      return "border-yellow-100 bg-yellow-50 text-yellow-700";
  }
}

export default function ShiftIssuePanel({
  onOpenWeek,
}: ShiftIssuePanelProps) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const range = useMemo(() => getDateRange(), []);

  async function loadIssues() {
    try {
      setIsLoading(true);
      setErrorMessage("");
      setShifts(
        await getShiftsByDateRange(range.start, range.end)
      );
    } catch (error) {
      console.error("シフト確認エラー:", error);
      setErrorMessage("シフトの確認に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadIssues();
  }, []);

  const issues = useMemo(() => findIssues(shifts), [shifts]);
  const visibleIssues = issues.slice(0, 8);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">
            今後7日間
          </p>
          <h2 className="text-lg font-bold text-gray-900">
            シフト確認アラート
          </h2>
        </div>
        <button
          type="button"
          onClick={() => void loadIssues()}
          className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-600"
        >
          更新
        </button>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-gray-500">
          確認しています...
        </p>
      ) : errorMessage ? (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
          {errorMessage}
        </p>
      ) : issues.length === 0 ? (
        <p className="mt-4 rounded-xl bg-green-50 p-3 text-sm font-bold text-green-700">
          登録ミスや時間重複は見つかりませんでした。
        </p>
      ) : (
        <>
          <div className="mt-4 rounded-xl bg-red-50 p-3">
            <p className="text-sm font-bold text-red-700">
              確認が必要な項目が {issues.length}件あります
            </p>
          </div>

          <div className="mt-3 space-y-2">
            {visibleIssues.map((issue) => (
              <div
                key={issue.key}
                className={`rounded-xl border p-3 ${getIssueClasses(
                  issue.type
                )}`}
              >
                <div className="flex items-start gap-3">
                  <span className="shrink-0 rounded-lg bg-white px-2 py-1 text-xs font-bold">
                    {formatDate(issue.date)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold">
                      {issue.title}
                    </p>
                    <p className="mt-1 text-xs opacity-80">
                      {issue.detail}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {issues.length > visibleIssues.length && (
            <p className="mt-3 text-center text-xs text-gray-500">
              ほか {issues.length - visibleIssues.length}件
            </p>
          )}

          {onOpenWeek && (
            <button
              type="button"
              onClick={onOpenWeek}
              className="mt-4 w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white"
            >
              週間シフトを確認
            </button>
          )}
        </>
      )}
    </section>
  );
}
