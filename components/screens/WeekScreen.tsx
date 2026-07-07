"use client";

import { useEffect, useState } from "react";
import { getShiftsByDateRange, type Shift } from "@/services/shift.service";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getWeekDates() {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);

  monday.setDate(today.getDate() - ((day + 6) % 7));

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

export default function WeekScreen() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const weekDates = getWeekDates();

  useEffect(() => {
    loadWeekShifts();
  }, []);

  async function loadWeekShifts() {
    try {
      const startDate = formatDate(weekDates[0]);
      const endDate = formatDate(weekDates[6]);
      const data = await getShiftsByDateRange(startDate, endDate);
      setShifts(data);
    } catch (error) {
      console.error(error);
      alert("週間シフトの取得に失敗しました");
    }
  }

  return (
    <>
      <header className="mb-5">
        <p className="text-sm text-gray-500">週間確認</p>
        <h1 className="text-2xl font-bold">今週のシフト</h1>
      </header>

      <section className="space-y-3">
        {weekDates.map((date) => {
          const dateText = formatDate(date);
          const dayShifts = shifts.filter(
            (shift) => shift.work_date === dateText
          );

          return (
            <div key={dateText} className="rounded-2xl border bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-bold">{dateText}</p>
                <p className="text-sm text-gray-500">
                  出勤 {dayShifts.length}名
                </p>
              </div>

              <div className="space-y-2">
                {dayShifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="rounded-xl bg-gray-100 p-3 text-sm"
                  >
                    <p className="font-bold">
                      {shift.casts?.display_name ||
                        shift.casts?.name ||
                        "未設定"}
                    </p>
                    <p className="text-gray-600">
                      {shift.start_time.slice(0, 5)}〜
                      {shift.end_time.slice(0, 5)}
                    </p>
                  </div>
                ))}

                {dayShifts.length === 0 && (
                  <p className="text-sm text-gray-400">
                    シフトなし
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}