"use client";

import { useEffect, useMemo, useState } from "react";
import { formatExtendedTime } from "@/lib/business-time";
import {
  getShiftsByDateRange,
  type Shift,
  type ShiftStatus,
} from "@/services/shift.service";

type MonthScreenProps = {
  onOpenDate?: (date: string) => void;
};

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDate(dateText: string): Date {
  const [year, month, day] = dateText.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getCalendarStart(date: Date): Date {
  const firstDay = getMonthStart(date);
  const weekday = firstDay.getDay();
  const difference = (weekday + 6) % 7;

  const result = new Date(firstDay);
  result.setDate(firstDay.getDate() - difference);

  return result;
}

function getCalendarDates(date: Date): Date[] {
  const calendarStart = getCalendarStart(date);

  return Array.from({ length: 42 }, (_, index) => {
    const result = new Date(calendarStart);
    result.setDate(calendarStart.getDate() + index);
    return result;
  });
}

function getStatus(shift: Shift): ShiftStatus {
  return shift.status ?? "working";
}

function getCastName(shift: Shift): string {
  return shift.casts?.display_name || shift.casts?.name || "未設定";
}

function getStatusLabel(status: ShiftStatus): string {
  switch (status) {
    case "tentative":
      return "仮シフト";
    case "holiday":
      return "休み";
    case "working":
    default:
      return "通常出勤";
  }
}

function getStatusClasses(status: ShiftStatus): string {
  switch (status) {
    case "tentative":
      return "bg-yellow-100 text-yellow-700";
    case "holiday":
      return "bg-gray-200 text-gray-600";
    case "working":
    default:
      return "bg-blue-100 text-blue-700";
  }
}

export default function MonthScreen({
  onOpenDate,
}: MonthScreenProps) {
  const [currentMonth, setCurrentMonth] = useState(
    () => getMonthStart(new Date())
  );

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const calendarDates = useMemo(
    () => getCalendarDates(currentMonth),
    [currentMonth]
  );

  const fetchStartDate = formatDate(calendarDates[0]);
  const fetchEndDate = formatDate(
    calendarDates[calendarDates.length - 1]
  );

  const currentYear = currentMonth.getFullYear();
  const currentMonthNumber = currentMonth.getMonth();

  useEffect(() => {
    void loadMonthShifts();
  }, [fetchStartDate, fetchEndDate]);

  async function loadMonthShifts() {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const data = await getShiftsByDateRange(
        fetchStartDate,
        fetchEndDate
      );

      setShifts(data);
    } catch (error) {
      console.error("月間シフト取得エラー:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "月間シフトの取得に失敗しました"
      );
    } finally {
      setIsLoading(false);
    }
  }

  function moveMonth(amount: number) {
    setCurrentMonth(
      new Date(currentYear, currentMonthNumber + amount, 1)
    );
    setSelectedDate(null);
  }

  function returnToCurrentMonth() {
    setCurrentMonth(getMonthStart(new Date()));
    setSelectedDate(formatDate(new Date()));
  }

  function selectDate(dateText: string) {
    setSelectedDate((current) =>
      current === dateText ? null : dateText
    );
  }

  const monthShifts = useMemo(() => {
    return shifts.filter((shift) => {
      const shiftDate = parseDate(shift.work_date);

      return (
        shiftDate.getFullYear() === currentYear &&
        shiftDate.getMonth() === currentMonthNumber
      );
    });
  }, [shifts, currentYear, currentMonthNumber]);

  const monthSummary = useMemo(() => {
    const workingCount = monthShifts.filter(
      (shift) => getStatus(shift) === "working"
    ).length;

    const tentativeCount = monthShifts.filter(
      (shift) => getStatus(shift) === "tentative"
    ).length;

    const holidayCount = monthShifts.filter(
      (shift) => getStatus(shift) === "holiday"
    ).length;

    const uniqueCastCount = new Set(
      monthShifts
        .filter((shift) => getStatus(shift) !== "holiday")
        .map((shift) => shift.cast_id)
    ).size;

    return {
      workingCount,
      tentativeCount,
      holidayCount,
      uniqueCastCount,
    };
  }, [monthShifts]);

  const selectedDateShifts = useMemo(() => {
    if (!selectedDate) {
      return [];
    }

    return shifts
      .filter((shift) => shift.work_date === selectedDate)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [shifts, selectedDate]);

  return (
    <>
      <header className="mb-5">
        <p className="text-sm text-gray-500">月間確認</p>

        <h1 className="text-2xl font-bold text-gray-900">
          月間カレンダー
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          月全体の出勤状況を確認できます
        </p>
      </header>

      <section className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700"
          >
            前月
          </button>

          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">
              {currentYear}年{currentMonthNumber + 1}月
            </p>
          </div>

          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-bold text-gray-700"
          >
            次月
          </button>
        </div>

        <button
          type="button"
          onClick={returnToCurrentMonth}
          className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-600"
        >
          今月に戻る
        </button>
      </section>

      <section className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-blue-50 p-3">
          <p className="text-xs font-bold text-blue-700">
            通常出勤
          </p>
          <p className="mt-1 text-xl font-bold text-blue-800">
            {monthSummary.workingCount}件
          </p>
        </div>

        <div className="rounded-2xl bg-yellow-50 p-3">
          <p className="text-xs font-bold text-yellow-700">
            仮シフト
          </p>
          <p className="mt-1 text-xl font-bold text-yellow-800">
            {monthSummary.tentativeCount}件
          </p>
        </div>

        <div className="rounded-2xl bg-gray-100 p-3">
          <p className="text-xs font-bold text-gray-600">休み</p>
          <p className="mt-1 text-xl font-bold text-gray-700">
            {monthSummary.holidayCount}件
          </p>
        </div>

        <div className="rounded-2xl bg-green-50 p-3">
          <p className="text-xs font-bold text-green-700">
            出勤キャスト
          </p>
          <p className="mt-1 text-xl font-bold text-green-800">
            {monthSummary.uniqueCastCount}名
          </p>
        </div>
      </section>

      {errorMessage && (
        <section className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="font-bold text-red-700">
            データを取得できませんでした
          </p>

          <p className="mt-1 text-sm text-red-600">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={() => void loadMonthShifts()}
            className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white"
          >
            再読み込み
          </button>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {WEEKDAYS.map((weekday, index) => (
            <div
              key={weekday}
              className={`py-2 text-center text-xs font-bold ${
                index === 5
                  ? "text-blue-600"
                  : index === 6
                    ? "text-red-600"
                    : "text-gray-500"
              }`}
            >
              {weekday}
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex min-h-72 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
              <p className="mt-3 text-sm text-gray-500">
                読み込み中...
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {calendarDates.map((date) => {
              const dateText = formatDate(date);
              const dayShifts = shifts.filter(
                (shift) => shift.work_date === dateText
              );

              const workingCount = dayShifts.filter(
                (shift) => getStatus(shift) === "working"
              ).length;

              const tentativeCount = dayShifts.filter(
                (shift) => getStatus(shift) === "tentative"
              ).length;

              const holidayCount = dayShifts.filter(
                (shift) => getStatus(shift) === "holiday"
              ).length;

              const roomCount = new Set(
                dayShifts
                  .filter((shift) => getStatus(shift) !== "holiday")
                  .map((shift) => shift.room_id)
                  .filter(
                    (roomId): roomId is string => Boolean(roomId)
                  )
              ).size;

              const isCurrentMonth =
                date.getMonth() === currentMonthNumber &&
                date.getFullYear() === currentYear;

              const isToday = dateText === formatDate(new Date());
              const isSelected = selectedDate === dateText;
              const weekdayIndex = (date.getDay() + 6) % 7;

              return (
                <button
                  key={dateText}
                  type="button"
                  onClick={() => selectDate(dateText)}
                  className={`min-h-24 border-b border-r border-gray-100 p-1.5 text-left align-top transition ${
                    isSelected
                      ? "bg-gray-900 text-white"
                      : isToday
                        ? "bg-blue-50"
                        : "bg-white"
                  } ${isCurrentMonth ? "" : "opacity-35"}`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        isSelected
                          ? "bg-white text-gray-900"
                          : isToday
                            ? "bg-blue-600 text-white"
                            : weekdayIndex === 5
                              ? "text-blue-600"
                              : weekdayIndex === 6
                                ? "text-red-600"
                                : "text-gray-700"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  </div>

                  <div className="space-y-0.5 text-[10px] leading-tight">
                    {workingCount > 0 && (
                      <p
                        className={
                          isSelected
                            ? "text-blue-200"
                            : "text-blue-700"
                        }
                      >
                        出 {workingCount}
                      </p>
                    )}

                    {tentativeCount > 0 && (
                      <p
                        className={
                          isSelected
                            ? "text-yellow-200"
                            : "text-yellow-700"
                        }
                      >
                        仮 {tentativeCount}
                      </p>
                    )}

                    {holidayCount > 0 && (
                      <p
                        className={
                          isSelected
                            ? "text-gray-200"
                            : "text-gray-500"
                        }
                      >
                        休 {holidayCount}
                      </p>
                    )}

                    {roomCount > 0 && (
                      <p
                        className={
                          isSelected
                            ? "text-purple-200"
                            : "text-purple-700"
                        }
                      >
                        室 {roomCount}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selectedDate && (
        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">選択した日</p>

              <h2 className="text-lg font-bold text-gray-900">
                {Number(selectedDate.slice(5, 7))}月
                {Number(selectedDate.slice(8, 10))}日
              </h2>
            </div>

            {onOpenDate && (
              <button
                type="button"
                onClick={() => onOpenDate(selectedDate)}
                className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white"
              >
                詳細を見る
              </button>
            )}
          </div>

          <div className="space-y-2">
            {selectedDateShifts.map((shift) => {
              const status = getStatus(shift);

              return (
                <div
                  key={shift.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-gray-900">
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
                          <p className="mt-1 text-sm text-gray-500">
                            部屋：{shift.rooms.name}
                          </p>
                        )}

                      {shift.memo && (
                        <p className="mt-2 whitespace-pre-wrap text-xs text-gray-500">
                          {shift.memo}
                        </p>
                      )}
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${getStatusClasses(
                        status
                      )}`}
                    >
                      {getStatusLabel(status)}
                    </span>
                  </div>
                </div>
              );
            })}

            {selectedDateShifts.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                <p className="text-sm text-gray-500">
                  この日のシフトはありません
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
