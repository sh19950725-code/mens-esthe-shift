"use client";

import { useEffect, useState } from "react";
import ShiftCard from "@/components/cards/ShiftCard";
import { supabase } from "@/lib/supabase";

type Shift = {
  id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  memo: string | null;
  casts: {
    name: string;
    display_name: string | null;
  } | null;
};

export default function TodayScreen() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [workDate, setWorkDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  useEffect(() => {
    loadShifts();
  }, [workDate]);

  async function loadShifts() {
    const { data, error } = await supabase
      .from("shifts")
      .select(
        `
        id,
        work_date,
        start_time,
        end_time,
        memo,
        casts (
          name,
          display_name
        )
      `
      )
      .eq("work_date", workDate)
      .order("start_time", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setShifts((data as Shift[]) || []);
  }

  async function deleteShift(id: string) {
    const ok = confirm("このシフトを削除しますか？");

    if (!ok) return;

    const { error } = await supabase
      .from("shifts")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("削除に失敗しました");
      return;
    }

    await loadShifts();
  }

  return (
    <>
      <header className="mb-5">
        <p className="text-sm text-gray-500">独立型シフト管理</p>
        <h1 className="text-2xl font-bold">本日のシフト</h1>
      </header>

      <section className="mb-4">
        <input
          value={workDate}
          onChange={(e) => setWorkDate(e.target.value)}
          className="w-full rounded-xl border p-4"
          type="date"
        />
      </section>

      <section className="mb-4 rounded-2xl bg-gray-100 p-4">
        <p className="text-sm text-gray-500">{workDate}</p>
        <p className="mt-1 text-xl font-bold">
          出勤 {shifts.length}名
        </p>
      </section>

      <section className="space-y-3">
        {shifts.map((shift) => (
          <ShiftCard
            key={shift.id}
            name={shift.casts?.display_name || shift.casts?.name || "未設定"}
            time={`${shift.start_time.slice(0, 5)}〜${shift.end_time.slice(
              0,
              5
            )}`}
            memo={shift.memo}
            onDelete={() => deleteShift(shift.id)}
          />
        ))}

        {shifts.length === 0 && (
          <p className="text-sm text-gray-500">
            この日のシフトはまだ登録されていません。
          </p>
        )}
      </section>
    </>
  );
}