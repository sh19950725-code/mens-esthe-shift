"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import {
  checkShiftConflict,
  updateShiftById,
  type Shift,
} from "@/services/shift.service";
import {
  getActiveRooms,
  type Room,
} from "@/services/room.service";

type EditShiftModalProps = {
  shift: Shift;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

export default function EditShiftModal({
  shift,
  onClose,
  onSaved,
}: EditShiftModalProps) {
  const [rooms, setRooms] = useState<Room[]>([]);

  const [workDate, setWorkDate] = useState(shift.work_date);
  const [roomId, setRoomId] = useState(shift.room_id || "");
  const [startTime, setStartTime] = useState(
    shift.start_time.slice(0, 5)
  );
  const [endTime, setEndTime] = useState(
    shift.end_time.slice(0, 5)
  );
  const [memo, setMemo] = useState(shift.memo || "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadRooms();
  }, []);

  async function loadRooms() {
    try {
      const data = await getActiveRooms();
      setRooms(data);
    } catch (error) {
      console.error(error);
      alert("部屋情報の取得に失敗しました");
    }
  }

  async function saveShift() {
    if (!workDate) {
      alert("日付を選択してください");
      return;
    }

    if (!startTime || !endTime) {
      alert("出勤時間と退勤時間を入力してください");
      return;
    }

    if (startTime === endTime) {
      alert("出勤時間と退勤時間を同じにはできません");
      return;
    }

    try {
      setIsSaving(true);

      const result = await checkShiftConflict(
        shift.cast_id,
        roomId || null,
        workDate,
        startTime,
        endTime,
        shift.id
      );

      if (!result.ok) {
        alert(result.message);
        return;
      }

      await updateShiftById(shift.id, {
        work_date: workDate,
        room_id: roomId || null,
        start_time: startTime,
        end_time: endTime,
        memo: memo.trim() || null,
      });

      await onSaved();
      onClose();
    } catch (error) {
      console.error(error);
      alert("シフトの保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 px-4 py-8">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-5 shadow-xl">
        <header className="mb-5">
          <p className="text-sm text-gray-500">シフト編集</p>

          <h2 className="text-xl font-bold">
            {shift.casts?.display_name ||
              shift.casts?.name ||
              "未設定"}
          </h2>
        </header>

        <section className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">
              日付
            </label>

            <Input
              type="date"
              value={workDate}
              onChange={(event) => setWorkDate(event.target.value)}
            />
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
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">
              退勤時間
            </label>

            <Input
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
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
              placeholder="メモ"
            />
          </div>

          <Button
            onClick={saveShift}
            disabled={isSaving}
            className={isSaving ? "cursor-not-allowed opacity-50" : ""}
          >
            {isSaving ? "保存中..." : "保存する"}
          </Button>

          <Button
            onClick={onClose}
            variant="secondary"
            disabled={isSaving}
          >
            キャンセル
          </Button>
        </section>
      </div>
    </div>
  );
}