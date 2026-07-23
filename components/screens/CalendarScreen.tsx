"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getShiftsByDateRange,
  type Shift,
} from "@/services/shift.service";

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getMonthRange(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  return {
    startDate: formatLocalDate(firstDay),
    endDate: formatLocalDate(lastDay),
  };
}

export default function CalendarScreen() {
  const [currentYear, setCurrentYear] = useState(
    () => new Date().getFullYear()
  );
  const [currentMonth, setCurrentMonth] = useState(
    () => new Date().getMonth()
  );
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    () => formatLocalDate(new Date())
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function loadMonthShifts() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const { startDate, endDate } = getMonthRange(
          currentYear,
          currentMonth
        );

        const data = await getShiftsByDateRange(startDate, endDate);

        if (!isCancelled) {
          setShifts(data);
        }
      } catch (error) {
        console.error("月間シフト取得エラー:", error);

        if (!isCancelled) {
          setErrorMessage("月間シフトの取得に失敗しました");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadMonthShifts();

    return () => {
      isCancelled = true;
    };
  }, [currentYear, currentMonth]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const mondayStartOffset = (firstDay.getDay() + 6) % 7;
    const days: Array<Date | null> = [];

    for (let index = 0; index < mondayStartOffset; index += 1) {
      days.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      days.push(new Date(currentYear, currentMonth, day));
    }

    return days;
  }, [currentYear, currentMonth]);

  const selectedShifts = useMemo(
    () =>
      shifts
        .filter((shift) => shift.work_date === selectedDate)
        .sort((first, second) =>
          first.start_time.localeCompare(second.start_time)
        ),
    [selectedDate, shifts]
  );

  function goToPreviousMonth() {
    if (currentMonth === 0) {
      setCurrentYear((year) => year - 1);
      setCurrentMonth(11);
      return;
    }

    setCurrentMonth((month) => month - 1);
  }

  function goToNextMonth() {
    if (currentMonth === 11) {
      setCurrentYear((year) => year + 1);
      setCurrentMonth(0);
      return;
    }

    setCurrentMonth((month) => month + 1);
  }

  return (
    <>
      <header className="mb-5">
        <p className="text-sm text-gray-500">月間確認</p>
        <h1 className="text-2xl font-bold">シフトカレンダー</h1>
      </header>

      <section className="mb-4 rounded-2xl border bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="rounded-lg bg-gray-100 px-4 py-2 font-bold"
            aria-label="前月を表示"
          >
            ←
          </button>

          <h2 className="text-lg font-bold">
            {currentYear}年{currentMonth + 1}月
          </h2>

          <button
            type="button"
            onClick={goToNextMonth}
            className="rounded-lg bg-gray-100 px-4 py-2 font-bold"
            aria-label="翌月を表示"
          >
            →
          </button>
        </div>

        <div className="mb-2 grid grid-cols-7 text-center text-xs font-bold text-gray-500">
          <span>月</span>
          <span>火</span>
          <span>水</span>
          <span>木</span>
          <span>金</span>
          <span className="text-blue-600">土</span>
          <span className="text-red-600">日</span>
        </div>

        {errorMessage && (
          <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        {isLoading ? (
          <div className="flex min-h-60 items-center justify-center">
            <p className="text-sm text-gray-500">読み込み中...</p>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="h-14" />;
              }

              const dateText = formatLocalDate(date);
              const shiftCount = shifts.filter(
                (shift) => shift.work_date === dateText
              ).length;
              const isSelected = selectedDate === dateText;

              return (
                <button
                  key={dateText}
                  type="button"
                  onClick={() => setSelectedDate(dateText)}
                  className={`flex h-14 flex-col items-center justify-center rounded-xl text-sm ${
                    isSelected
                      ? "bg-black text-white"
                      : "bg-gray-50 text-black"
                  }`}
                >
                  <span className="font-bold">{date.getDate()}</span>

                  {shiftCount > 0 && (
                    <span
                      className={`mt-1 text-[10px] ${
                        isSelected ? "text-white" : "text-gray-500"
                      }`}
                    >
                      {shiftCount}名
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">{selectedDate}</h2>
          <span className="text-sm text-gray-500">
            出勤 {selectedShifts.length}名
          </span>
        </div>

        <div className="space-y-2">
          {selectedShifts.map((shift) => (
            <div
              key={shift.id}
              className="rounded-xl border bg-white p-3"
            >
              <p className="font-bold">
                {shift.casts?.display_name ||
                  shift.casts?.name ||
                  "未設定"}
              </p>

              <p className="mt-1 text-sm text-gray-600">
                {shift.start_time.slice(0, 5)}〜
                {shift.end_time.slice(0, 5)}
              </p>

              {shift.memo && (
                <p className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-100 p-2 text-xs text-gray-600">
                  {shift.memo}
                </p>
              )}
            </div>
          ))}

          {!isLoading && selectedShifts.length === 0 && (
            <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
              この日のシフトはありません。
            </p>
          )}
        </div>
      </section>
    </>
  );
}
