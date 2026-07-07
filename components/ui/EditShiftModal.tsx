import { useState } from "react";
import type { Shift } from "@/services/shift.service";
import { updateShiftById } from "@/services/shift.service";

type EditShiftModalProps = {
  shift: Shift;
  onClose: () => void;
  onSaved: () => void;
};

export default function EditShiftModal({
  shift,
  onClose,
  onSaved,
}: EditShiftModalProps) {
  const [startTime, setStartTime] = useState(shift.start_time.slice(0, 5));
  const [endTime, setEndTime] = useState(shift.end_time.slice(0, 5));
  const [memo, setMemo] = useState(shift.memo || "");

  async function saveShift() {
    try {
      await updateShiftById(shift.id, {
        start_time: startTime,
        end_time: endTime,
        memo: memo || null,
      });

      await onSaved();
      onClose();
    } catch (error) {
      console.error(error);
      alert("保存に失敗しました");
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 px-4 py-10">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-5">
        <header className="mb-5">
          <p className="text-sm text-gray-500">シフト編集</p>
          <h2 className="text-xl font-bold">
            {shift.casts?.display_name || shift.casts?.name || "未設定"}
          </h2>
        </header>

        <section className="space-y-4">
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
            onClick={saveShift}
            className="w-full rounded-xl bg-black p-4 font-bold text-white"
          >
            保存する
          </button>

          <button
            onClick={onClose}
            className="w-full rounded-xl bg-gray-100 p-4 font-bold"
          >
            キャンセル
          </button>
        </section>
      </div>
    </div>
  );
}