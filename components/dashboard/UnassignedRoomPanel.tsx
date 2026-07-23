"use client";

import { useEffect, useState } from "react";
import {
  getActiveRooms,
  type Room,
} from "@/services/room.service";
import {
  checkShiftConflict,
  getShiftsByDateRange,
  updateShiftById,
  type Shift,
} from "@/services/shift.service";

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRange() {
  const start = new Date();
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: formatLocalDate(start),
    end: formatLocalDate(end),
  };
}

function getCastName(shift: Shift): string {
  return (
    shift.casts?.display_name ||
    shift.casts?.name ||
    "未設定"
  );
}

function formatDate(dateText: string): string {
  const [, month, day] = dateText.split("-");
  return `${Number(month)}/${Number(day)}`;
}

export default function UnassignedRoomPanel() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRooms, setSelectedRooms] = useState<
    Record<string, string>
  >({});
  const [savingShiftId, setSavingShiftId] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadData() {
    try {
      setIsLoading(true);
      setMessage("");
      const range = getRange();
      const [roomData, shiftData] = await Promise.all([
        getActiveRooms(),
        getShiftsByDateRange(range.start, range.end),
      ]);

      setRooms(roomData);
      setShifts(
        shiftData.filter(
          (shift) =>
            shift.status !== "holiday" && !shift.room_id
        )
      );
    } catch (error) {
      console.error("部屋未設定取得エラー:", error);
      setMessage("部屋未設定シフトを取得できませんでした。");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function assignRoom(shift: Shift) {
    const roomId = selectedRooms[shift.id];
    if (!roomId) {
      setMessage("割り当てる部屋を選択してください。");
      return;
    }

    try {
      setSavingShiftId(shift.id);
      setMessage("");

      const conflict = await checkShiftConflict(
        shift.cast_id,
        roomId,
        shift.work_date,
        shift.start_time,
        shift.end_time,
        shift.id
      );

      if (!conflict.ok) {
        setMessage(conflict.message);
        return;
      }

      await updateShiftById(shift.id, {
        room_id: roomId,
      });

      setShifts((current) =>
        current.filter((item) => item.id !== shift.id)
      );
      setSelectedRooms((current) => {
        const next = { ...current };
        delete next[shift.id];
        return next;
      });
      setMessage(
        `${getCastName(shift)}の部屋を設定しました。`
      );
    } catch (error) {
      console.error("部屋割当エラー:", error);
      setMessage("部屋の設定に失敗しました。");
    } finally {
      setSavingShiftId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">
            今後7日間
          </p>
          <h2 className="text-lg font-bold text-gray-900">
            部屋未設定を修正
          </h2>
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-600"
        >
          更新
        </button>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-gray-500">
          読み込み中...
        </p>
      ) : shifts.length === 0 ? (
        <p className="mt-4 rounded-xl bg-green-50 p-3 text-sm font-bold text-green-700">
          部屋未設定のシフトはありません。
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {shifts.map((shift) => (
            <div
              key={shift.id}
              className="rounded-2xl border border-yellow-100 bg-yellow-50 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-900">
                    {getCastName(shift)}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    {formatDate(shift.work_date)}・
                    {shift.start_time.slice(0, 5)}〜
                    {shift.end_time.slice(0, 5)}
                  </p>
                </div>
                {shift.status === "tentative" && (
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-yellow-700">
                    仮
                  </span>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <select
                  value={selectedRooms[shift.id] ?? ""}
                  onChange={(event) =>
                    setSelectedRooms((current) => ({
                      ...current,
                      [shift.id]: event.target.value,
                    }))
                  }
                  disabled={savingShiftId === shift.id}
                  className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white p-3 text-sm"
                >
                  <option value="">部屋を選択</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void assignRoom(shift)}
                  disabled={
                    savingShiftId === shift.id ||
                    !selectedRooms[shift.id]
                  }
                  className="shrink-0 rounded-xl bg-gray-900 px-4 text-sm font-bold text-white disabled:opacity-40"
                >
                  {savingShiftId === shift.id
                    ? "保存中"
                    : "設定"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {message && (
        <p
          role="status"
          className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-600"
        >
          {message}
        </p>
      )}
    </section>
  );
}
