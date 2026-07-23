"use client";

import { useEffect, useMemo, useState } from "react";
import EditShiftModal from "@/components/ui/EditShiftModal";
import { formatExtendedTime } from "@/lib/business-time";
import {
  deleteShiftById,
  getShiftsByDateRange,
  type Shift,
  type ShiftStatus,
} from "@/services/shift.service";

type StatusFilter = "all" | ShiftStatus;

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function displayDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}（${
    WEEKDAYS[date.getDay()]
  }）`;
}

function getMonday(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(
    result.getDate() - ((result.getDay() + 6) % 7)
  );
  return result;
}

function getWeekDates(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function getStatus(shift: Shift): ShiftStatus {
  return shift.status === "tentative" ||
    shift.status === "holiday"
    ? shift.status
    : "working";
}

function getCastName(shift: Shift): string {
  return (
    shift.casts?.display_name ||
    shift.casts?.name ||
    "未設定"
  );
}

function getStatusLabel(status: ShiftStatus): string {
  if (status === "tentative") return "仮シフト";
  if (status === "holiday") return "休み";
  return "通常出勤";
}

function getStatusClasses(status: ShiftStatus): string {
  if (status === "tentative") {
    return "border-yellow-200 bg-yellow-50";
  }
  if (status === "holiday") {
    return "border-gray-200 bg-gray-50";
  }
  return "border-blue-100 bg-blue-50";
}

export default function WeekScreen() {
  const [weekStart, setWeekStart] = useState(() =>
    getMonday(new Date())
  );
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [editingShift, setEditingShift] =
    useState<Shift | null>(null);
  const [expandedDate, setExpandedDate] = useState<
    string | null
  >(null);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(true);

  const weekDates = useMemo(
    () => getWeekDates(weekStart),
    [weekStart]
  );
  const startDate = formatDate(weekDates[0]);
  const endDate = formatDate(weekDates[6]);

  useEffect(() => {
    void loadWeekShifts();
  }, [startDate, endDate]);

  async function loadWeekShifts() {
    try {
      setIsLoading(true);
      setShifts(
        await getShiftsByDateRange(startDate, endDate)
      );
      const today = formatDate(new Date());
      setExpandedDate(
        today >= startDate && today <= endDate
          ? today
          : startDate
      );
    } catch (error) {
      console.error("週間シフト取得エラー:", error);
      alert("週間シフトの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }

  function moveWeek(amount: number) {
    setWeekStart((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + amount * 7);
      return next;
    });
    setExpandedDate(null);
    setEditingShift(null);
  }

  async function deleteShift(id: string) {
    if (!window.confirm("このシフトを削除しますか？")) {
      return;
    }
    try {
      await deleteShiftById(id);
      setEditingShift(null);
      await loadWeekShifts();
    } catch (error) {
      console.error("シフト削除エラー:", error);
      alert("削除に失敗しました");
    }
  }

  const filteredShifts = useMemo(() => {
    const keyword = searchText.trim().toLocaleLowerCase();
    return shifts.filter((shift) => {
      const matchesStatus =
        statusFilter === "all" ||
        getStatus(shift) === statusFilter;
      const searchable = [
        getCastName(shift),
        shift.rooms?.name || "",
        shift.memo || "",
      ]
        .join(" ")
        .toLocaleLowerCase();
      return (
        matchesStatus &&
        (!keyword || searchable.includes(keyword))
      );
    });
  }, [shifts, searchText, statusFilter]);

  const summary = useMemo(
    () => ({
      working: shifts.filter(
        (shift) => getStatus(shift) === "working"
      ).length,
      tentative: shifts.filter(
        (shift) => getStatus(shift) === "tentative"
      ).length,
      holiday: shifts.filter(
        (shift) => getStatus(shift) === "holiday"
      ).length,
      casts: new Set(
        shifts
          .filter((shift) => getStatus(shift) !== "holiday")
          .map((shift) => shift.cast_id)
      ).size,
    }),
    [shifts]
  );

  return (
    <>
      <header className="mb-5">
        <p className="text-sm text-gray-500">週間確認</p>
        <h1 className="text-2xl font-bold">週間シフト</h1>
        <p className="mt-1 text-sm text-gray-500">
          日付を押すと詳細を確認できます
        </p>
      </header>

      <section className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => moveWeek(-1)}
            className="rounded-xl bg-gray-100 px-3 py-2 text-sm font-bold"
          >
            前週
          </button>
          <div className="text-center">
            <p className="font-bold">
              {displayDate(weekDates[0])}
            </p>
            <p className="text-xs text-gray-500">
              〜 {displayDate(weekDates[6])}
            </p>
          </div>
          <button
            type="button"
            onClick={() => moveWeek(1)}
            className="rounded-xl bg-gray-100 px-3 py-2 text-sm font-bold"
          >
            次週
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setWeekStart(getMonday(new Date()));
            setExpandedDate(formatDate(new Date()));
          }}
          className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-600"
        >
          今週に戻る
        </button>
      </section>

      <section className="mb-4 grid grid-cols-2 gap-2">
        <Summary label="通常出勤" value={summary.working} color="blue" />
        <Summary label="仮シフト" value={summary.tentative} color="yellow" />
        <Summary label="休み" value={summary.holiday} color="gray" />
        <Summary label="出勤キャスト" value={summary.casts} color="green" unit="名" />
      </section>

      <section className="mb-4 rounded-2xl border border-gray-200 bg-white p-3">
        <input
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="キャスト名・部屋・メモで検索"
          className="w-full rounded-xl border border-gray-300 bg-gray-50 p-3 text-sm"
        />
        <div className="mt-3 grid grid-cols-4 gap-2">
          {[
            ["all", "すべて"],
            ["working", "通常"],
            ["tentative", "仮"],
            ["holiday", "休み"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() =>
                setStatusFilter(key as StatusFilter)
              }
              className={`rounded-xl px-2 py-2 text-xs font-bold ${
                statusFilter === key
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <p className="py-12 text-center text-sm text-gray-500">
          読み込み中...
        </p>
      ) : (
        <section className="space-y-3">
          {weekDates.map((date) => {
            const dateText = formatDate(date);
            const dayShifts = filteredShifts.filter(
              (shift) => shift.work_date === dateText
            );
            const isExpanded = expandedDate === dateText;
            const isToday = dateText === formatDate(new Date());

            return (
              <article
                key={dateText}
                className={`overflow-hidden rounded-2xl border bg-white ${
                  isToday
                    ? "border-blue-400"
                    : "border-gray-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedDate(
                      isExpanded ? null : dateText
                    )
                  }
                  className="flex w-full items-center justify-between p-4 text-left"
                >
                  <div>
                    <p className="font-bold">
                      {displayDate(date)}
                      {isToday && (
                        <span className="ml-2 rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                          今日
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      表示対象 {dayShifts.length}件
                    </p>
                  </div>
                  <span className="text-gray-400">
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </button>

                {isExpanded && (
                  <div className="space-y-2 border-t border-gray-100 p-4">
                    {dayShifts.map((shift) => {
                      const status = getStatus(shift);
                      return (
                        <div
                          key={shift.id}
                          className={`rounded-xl border p-3 ${getStatusClasses(
                            status
                          )}`}
                        >
                          <div className="flex justify-between gap-3">
                            <div>
                              <p className="font-bold">
                                {getCastName(shift)}
                              </p>
                              <p className="mt-1 text-sm text-gray-600">
                                {formatExtendedTime(
                                  shift.start_time,
                                  shift.end_time
                                )}
                              </p>
                              {status !== "holiday" &&
                                shift.rooms?.name && (
                                  <p className="text-xs text-gray-500">
                                    部屋：{shift.rooms.name}
                                  </p>
                                )}
                            </div>
                            <span className="text-xs font-bold text-gray-600">
                              {getStatusLabel(status)}
                            </span>
                          </div>
                          <div className="mt-3 flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingShift(shift)}
                              className="rounded-lg bg-white px-3 py-2 text-xs font-bold"
                            >
                              編集
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void deleteShift(shift.id)
                              }
                              className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600"
                            >
                              削除
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {dayShifts.length === 0 && (
                      <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                        条件に一致するシフトはありません。
                      </p>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      {editingShift && (
        <EditShiftModal
          shift={editingShift}
          onClose={() => setEditingShift(null)}
          onSaved={async () => {
            setEditingShift(null);
            await loadWeekShifts();
          }}
        />
      )}
    </>
  );
}

function Summary({
  label,
  value,
  color,
  unit = "件",
}: {
  label: string;
  value: number;
  color: "blue" | "yellow" | "gray" | "green";
  unit?: string;
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    yellow: "bg-yellow-50 text-yellow-700",
    gray: "bg-gray-100 text-gray-700",
    green: "bg-green-50 text-green-700",
  };
  return (
    <div className={`rounded-2xl p-3 ${colors[color]}`}>
      <p className="text-xs">{label}</p>
      <p className="mt-1 text-xl font-bold">
        {value}
        {unit}
      </p>
    </div>
  );
}
