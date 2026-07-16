"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { getActiveCasts, type Cast } from "@/services/cast.service";
import { getActiveRooms, type Room } from "@/services/room.service";
import {
  checkShiftConflict,
  createShift,
} from "@/services/shift.service";

export default function RegisterScreen() {
  const [casts, setCasts] = useState<Cast[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  const [castId, setCastId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [workDate, setWorkDate] = useState("");
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("20:00");
  const [memo, setMemo] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadCasts();
    loadRooms();
    setWorkDate(getTodayDate());
  }, []);

  function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  async function loadCasts() {
    try {
      const data = await getActiveCasts();
      setCasts(data);
    } catch (error) {
      console.error(error);
      alert("キャスト情報の取得に失敗しました");
    }
  }

  async function loadRooms() {
    try {
      const data = await getActiveRooms();
      setRooms(data);
    } catch (error) {
      console.error(error);
      alert("部屋情報の取得に失敗しました");
    }
  }

  async function addShift() {
  if (!workDate) {
    alert("日付を選択してください");
    return;
  }

  if (!castId) {
    alert("キャストを選択してください");
    return;
  }

  if (!startTime || !endTime) {
    alert("出勤時間と退勤時間を入力してください");
    return;
  }

  if (startTime >= endTime) {
    alert("退勤時間は出勤時間より後に設定してください");
    return;
  }

  try {
    setIsSubmitting(true);

    const result = await checkShiftConflict(
      castId,
      roomId || null,
      workDate,
      startTime,
      endTime
    );

    if (!result.ok) {
      alert(result.message);
      return;
    }

    await createShift({
      cast_id: castId,
      room_id: roomId || null,
      work_date: workDate,
      start_time: startTime,
      end_time: endTime,
      memo: memo.trim() || null,
    });

    alert("シフトを登録しました");

    setCastId("");
    setRoomId("");
    setMemo("");
  } catch (error) {
    console.error(error);
    alert("シフト登録に失敗しました");
  } finally {
    setIsSubmitting(false);
  }
}

  return (
    <>
      <header className="mb-5">
        <p className="text-sm text-gray-500">シフト追加</p>
        <h1 className="text-2xl font-bold">シフト登録</h1>
      </header>

      <section className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-bold text-gray-700">
            日付
          </label>

          <Input
            value={workDate}
            onChange={(event) => setWorkDate(event.target.value)}
            type="date"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-gray-700">
            キャスト
          </label>

          <Select
            value={castId}
            onChange={(event) => setCastId(event.target.value)}
          >
            <option value="">キャストを選択</option>

            {casts.map((cast) => (
              <option key={cast.id} value={cast.id}>
                {cast.display_name || cast.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-gray-700">
            部屋
          </label>

          <Select
            value={roomId}
            onChange={(event) => setRoomId(event.target.value)}
          >
            <option value="">部屋を選択</option>

            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-gray-700">
            出勤時間
          </label>

          <Input
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            type="time"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-gray-700">
            退勤時間
          </label>

          <Input
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            type="time"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-bold text-gray-700">
            メモ
          </label>

          <textarea
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            className="min-h-28 w-full rounded-xl border p-4"
            placeholder="新人、遅出など"
          />
        </div>

        <Button
          onClick={addShift}
          disabled={isSubmitting}
          className={isSubmitting ? "cursor-not-allowed opacity-50" : ""}
        >
          {isSubmitting ? "登録中..." : "登録する"}
        </Button>
      </section>
    </>
  );
}