"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getShiftsByDateRange,
  type Shift,
} from "@/services/shift.service";

type ShiftIssue = {
  key: string;
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
  const [hours, minutes] = time
    .slice(0, 5)
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
}

function getInterval(shift: Shift): [number, number] {
  const start = timeToMinutes(shift.start_time);
  let end = timeToMinutes(shift.end_time);

  if (end <= start) {
    end += 24 * 60;
  }

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

function formatDate(date: string): string {
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function formatTimeRange(shift: Shift): string {
  const start = shift.start_time.slice(0, 5);
  const end = shift.end_time.slice(0, 5);

  return `${start}〜${end}`;
}

function findCastConflicts(shifts: Shift[]): ShiftIssue[] {
  const issues: ShiftIssue[] = [];
  const activeShifts = shifts.filter(
    (shift) =>
      (shift.status ?? "working") === "working"
  );
  const shiftsByDate = new Map<string, Shift[]>();

  activeShifts.forEach((shift) => {
    const current =
      shiftsByDate.get(shift.work_date) ?? [];

    current.push(shift);
    shiftsByDate.set(shift.work_date, current);
  });

  shiftsByDate.forEach((dayShifts, date) => {
    for (
      let firstIndex = 0;
      firstIndex < dayShifts.length;
      firstIndex += 1
    ) {
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < dayShifts.length;
        secondIndex += 1
      ) {
        const first = dayShifts[firstIndex];
        const second = dayShifts[secondIndex];

        if (first.cast_id !== second.cast_id) {
          continue;
        }

        if (!overlaps(first, second)) {
          continue;
        }

        issues.push({
          key: `cast-${first.id}-${second.id}`,
          date,
          title: "キャストの時間が重複しています",
          detail:
            `${getCastName(first)}・` +
            `${formatTimeRange(first)} / ` +
            formatTimeRange(second),
        });
      }
    }
  });

  return issues.sort((first, second) =>
    first.date.localeCompare(second.date)
  );
}

export default function ShiftIssuePanel({
  onOpenWeek,
}: ShiftIssuePanelProps) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const range = useMemo(() => getDateRange(), []);

  const loadIssues = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const data = await getShiftsByDateRange(
        range.start,
        range.end
      );

      setShifts(data);
    } catch (error) {
      console.error("シフト確認エラー:", error);
      setErrorMessage("シフトの確認に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }, [range.end, range.start]);

  useEffect(() => {
    void loadIssues();
  }, [loadIssues]);

  const issues = useMemo(
    () => findCastConflicts(shifts),
    [shifts]
  );
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
          disabled={isLoading}
          className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-600 disabled:opacity-50"
        >
          更新
        </button>
      </div>

      {isLoading && (
        <p className="mt-4 text-sm text-gray-500">
          確認中...
        </p>
      )}

      {!isLoading && errorMessage && (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      {!isLoading &&
        !errorMessage &&
        issues.length === 0 && (
          <div className="mt-4 rounded-xl bg-green-50 p-4">
            <p className="font-bold text-green-700">
              重複はありません
            </p>
            <p className="mt-1 text-xs text-green-600">
              キャストの時間重複は見つかりませんでした。
            </p>
          </div>
        )}

      {!isLoading &&
        !errorMessage &&
        visibleIssues.length > 0 && (
          <div className="mt-4 space-y-2">
            {visibleIssues.map((issue) => (
              <button
                key={issue.key}
                type="button"
                onClick={onOpenWeek}
                className="w-full rounded-xl border border-orange-100 bg-orange-50 p-3 text-left text-orange-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold">
                      {issue.title}
                    </p>
                    <p className="mt-1 text-xs">
                      {issue.detail}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-bold">
                    {formatDate(issue.date)}
                  </span>
                </div>
              </button>
            ))}

            {issues.length > visibleIssues.length && (
              <p className="pt-1 text-center text-xs text-gray-500">
                ほか {issues.length - visibleIssues.length}
                件あります
              </p>
            )}
          </div>
        )}
    </section>
  );
}
