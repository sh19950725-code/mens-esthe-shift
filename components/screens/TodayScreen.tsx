"use client";

import { useEffect, useState } from "react";
import ShiftCard from "@/components/cards/ShiftCard";
import EditShiftModal from "@/components/ui/EditShiftModal";
import { getShiftStatus } from "@/lib/time";
import {
  deleteShiftById,
  getShiftsByDate,
  type Shift,
} from "@/services/shift.service";

export default function TodayScreen() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [workDate, setWorkDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [editingShift, setEditingShift] = useState<Shift | null>(null);

  useEffect(() => {
    loadShifts();
  }, [workDate]);

  async function loadShifts() {
    try {
      const data = await getShiftsByDate(workDate);
      setShifts(data);
    } catch (error) {
      console.error(error);
      alert("シフトの取得に失敗しました");
    }
  }

  async function deleteShift(id: string) {
    const ok = confirm("このシフトを削除しますか？");

    if (!ok) return;

    try {
      await deleteShiftById(id);
      await loadShifts();
    } catch (error) {
      console.error(error);
      alert("削除に失敗しました");
    }
  }

  const workingCount = shifts.filter((shift) => {
  const status = getShiftStatus(
    shift.work_date,
    shift.start_time,
    shift.end_time
  );

  return status.status === "working";
}).length;

const activeRoomCount = new Set(
  shifts
    .map((shift) => shift.rooms?.name)
    .filter((roomName): roomName is string => Boolean(roomName))
).size;

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

      <section className="mb-4 grid grid-cols-3 gap-2">
  <div className="rounded-2xl bg-gray-100 p-3">
    <p className="text-xs text-gray-500">出勤予定</p>
    <p className="mt-1 text-xl font-bold">{shifts.length}名</p>
  </div>

  <div className="rounded-2xl bg-green-50 p-3">
    <p className="text-xs text-green-700">出勤中</p>
    <p className="mt-1 text-xl font-bold text-green-700">
      {workingCount}名
    </p>
  </div>

  <div className="rounded-2xl bg-blue-50 p-3">
    <p className="text-xs text-blue-700">使用部屋</p>
    <p className="mt-1 text-xl font-bold text-blue-700">
      {activeRoomCount}室
    </p>
  </div>
</section>

      <section className="space-y-3">
        {shifts.map((shift) => {
  const shiftStatus = getShiftStatus(
    shift.work_date,
    shift.start_time,
    shift.end_time
  );

  return (
    <ShiftCard
      key={shift.id}
      name={
        shift.casts?.display_name ||
        shift.casts?.name ||
        "未設定"
      }
      room={shift.rooms?.name || null}
      time={`${shift.start_time.slice(0, 5)}〜${shift.end_time.slice(
        0,
        5
      )}`}
      status={shiftStatus.status}
      statusLabel={shiftStatus.label}
      memo={shift.memo}
      onEdit={() => setEditingShift(shift)}
      onDelete={() => deleteShift(shift.id)}
    />
  );
})}

        {shifts.length === 0 && (
          <p className="text-sm text-gray-500">
            この日のシフトはまだ登録されていません。
          </p>
        )}
      </section>

      {editingShift && (
        <EditShiftModal
          shift={editingShift}
          onClose={() => setEditingShift(null)}
          onSaved={loadShifts}
        />
      )}
    </>
  );
}