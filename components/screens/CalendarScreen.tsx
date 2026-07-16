"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getShiftsByDateRange,
  type Shift,
} from "@/services/shift.service";

function formatLocalDate(date: Date) {
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
  const today = new Date();

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedDate, setSelectedDate] = useState(
    formatLocalDate(today)
  );

  useEffect(() => {
    loadMonthShifts();
  }, [currentYear, currentMonth]);

  async function loadMonthShifts() {
    try {
      const { startDate, endDate } = getMonthRange(
        currentYear,
        currentMonth
      );

      const data = await getShiftsByDateRange(startDate, endDate);
      setShifts(data);
    } catch (error) {
      console.error(error);
      alert("月間シフトの取得に失敗しました");
    }
  }

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);

    const mondayStartOffset = (firstDay.getDay() + 6) % 7;
    const days: Array<Date | null> = [];

    for (let i = 0; i < mondayStartOffset; i += 1) {
      days.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      days.push(new Date(currentYear, currentMonth, day));
    }

    return days;
  }, [currentYear, currentMonth]);

  const selectedShifts = shifts.filter(
    (shift) => shift.work_date === selectedDate
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
            onClick={goToPreviousMonth}
            className="rounded-lg bg-gray-100 px-4 py-2 font-bold"
          >
            ←
          </button>

          <h2 className="text-lg font-bold">
            {currentYear}年{currentMonth + 1}月
          </h2>

          <button
            onClick={goToNextMonth}
            className="rounded-lg bg-gray-100 px-4 py-2 font-bold"
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
          <span>土</span>
          <span>日</span>
        </div>

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
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-bold">
          {shift.casts?.display_name ||
            shift.casts?.name ||
            "未設定"}
        </p>

        {shift.rooms?.name && (
          <p className="mt-1 text-xs font-medium text-gray-500">
            🏠 {shift.rooms.name}
          </p>
        )}

        <p className="mt-1 text-sm text-gray-600">
          🕒 {shift.start_time.slice(0, 5)}〜
          {shift.end_time.slice(0, 5)}
        </p>

        {shift.memo && (
          <p className="mt-2 rounded-lg bg-gray-100 p-2 text-xs text-gray-600">
            {shift.memo}
          </p>
        )}
      </div>
    </div>
  </div>
))}

          {selectedShifts.length === 0 && (
            <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
              この日のシフトはありません。
            </p>
          )}
        </div>
      </section>
    </>
  );
}