"use client";

import { useEffect, useState } from "react";
import { getActiveCasts, type Cast } from "@/services/cast.service";
import { createShift } from "@/services/shift.service";

export default function RegisterScreen() {
  const [casts, setCasts] = useState<Cast[]>([]);
  const [castId, setCastId] = useState("");
  const [workDate, setWorkDate] = useState("");
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("20:00");
  const [memo, setMemo] = useState("");

  useEffect(() => {
    loadCasts();
    setWorkDate(new Date().toISOString().slice(0, 10));
  }, []);

  async function loadCasts() {
    try {
      const data = await getActiveCasts();
      setCasts(data);
    } catch (error) {
      console.error(error);
      alert("キャスト取得に失敗しました");
    }
  }

  async function addShift() {
    if (!castId || !workDate || !startTime || !endTime) {
      alert("未入力の項目があります");
      return;
    }

    try {
      await createShift({
        cast_id: castId,
        work_date: workDate,
        start_time: startTime,
        end_time: endTime,
        memo: memo || null,
      });

      alert("シフトを登録しました");
      setCastId("");
      setMemo("");
    } catch (error) {
      console.error(error);
      alert("シフト登録に失敗しました");
    }
  }

  return (
    <>
      <header className="mb-5">
        <p className="text-sm text-gray-500">シフト追加</p>
        <h1 className="text-2xl font-bold">シフト登録</h1>
      </header>

      <section className="space-y-4">
        <select
          value={castId}
          onChange={(e) => setCastId(e.target.value)}
          className="w-full rounded-xl border p-4"
        >
          <option value="">キャストを選択</option>
          {casts.map((cast) => (
            <option key={cast.id} value={cast.id}>
              {cast.display_name || cast.name}
            </option>
          ))}
        </select>

        <input
          value={workDate}
          onChange={(e) => setWorkDate(e.target.value)}
          className="w-full rounded-xl border p-4"
          type="date"
        />

        <input
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="w-full rounded-xl border p-4"
          type="time"
        />

        <input
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="w-full rounded-xl border p-4"
          type="time"
        />

        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          className="w-full rounded-xl border p-4"
          placeholder="メモ"
        />

        <button
          onClick={addShift}
          className="w-full rounded-xl bg-black p-4 font-bold text-white"
        >
          登録する
        </button>
      </section>
    </>
  );
}