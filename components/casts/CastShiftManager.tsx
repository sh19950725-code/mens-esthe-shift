"use client";

import { useEffect, useMemo, useState } from "react";
import { formatExtendedTime } from "@/lib/business-time";
import type { Cast } from "@/services/cast.service";
import {
  deleteShiftById,
  getShiftsByCastId,
  type Shift,
} from "@/services/shift.service";

type ShiftPeriod = "all" | "future" | "past";

type CastShiftManagerProps = {
  casts: Cast[];
  canEdit?: boolean;
};

function getToday(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateText: string): string {
  const [year, month, day] = dateText.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  return `${year}年${month}月${day}日（${weekdays[date.getDay()]}）`;
}

export default function CastShiftManager({
  casts,
  canEdit = false,
}: CastShiftManagerProps) {
  const [selectedCastId, setSelectedCastId] = useState("");
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [period, setPeriod] = useState<ShiftPeriod>("future");
  const [selectedShiftIds, setSelectedShiftIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const sortedCasts = useMemo(
    () =>
      [...casts].sort((a, b) =>
        (a.display_name || a.name).localeCompare(
          b.display_name || b.name,
          "ja"
        )
      ),
    [casts]
  );

  const selectedCast = casts.find(
    (cast) => cast.id === selectedCastId
  );

  useEffect(() => {
    if (!selectedCastId) {
      setShifts([]);
      setSelectedShiftIds([]);
      setErrorMessage("");
      return;
    }

    void loadShifts(selectedCastId);
  }, [selectedCastId]);

  async function loadShifts(castId: string) {
    try {
      setIsLoading(true);
      setErrorMessage("");
      setSelectedShiftIds([]);
      const data = await getShiftsByCastId(castId);
      setShifts(data);
    } catch (error) {
      console.error("キャスト別シフト取得エラー:", error);
      setErrorMessage("シフト一覧の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }

  const visibleShifts = useMemo(() => {
    const today = getToday();

    return shifts.filter((shift) => {
      if (period === "future") {
        return shift.work_date >= today;
      }
      if (period === "past") {
        return shift.work_date < today;
      }
      return true;
    });
  }, [period, shifts]);

  const selectedVisibleCount = visibleShifts.filter((shift) =>
    selectedShiftIds.includes(shift.id)
  ).length;

  const allVisibleSelected =
    visibleShifts.length > 0 &&
    selectedVisibleCount === visibleShifts.length;

  function toggleShift(id: string) {
    setSelectedShiftIds((current) =>
      current.includes(id)
        ? current.filter((shiftId) => shiftId !== id)
        : [...current, id]
    );
  }

  function toggleAllVisible() {
    const visibleIds = visibleShifts.map((shift) => shift.id);

    setSelectedShiftIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleIds.includes(id));
      }
      return Array.from(new Set([...current, ...visibleIds]));
    });
  }

  async function deleteSelectedShifts() {
    if (!canEdit || selectedShiftIds.length === 0 || isDeleting) {
      return;
    }

    const castName =
      selectedCast?.display_name || selectedCast?.name || "選択したキャスト";
    const confirmed = window.confirm(
      `${castName}のシフトを${selectedShiftIds.length}件削除しますか？\n\nこの操作は取り消せません。`
    );

    if (!confirmed) return;

    try {
      setIsDeleting(true);
      const deleteCount = selectedShiftIds.length;
      await Promise.all(
        selectedShiftIds.map((shiftId) => deleteShiftById(shiftId))
      );
      await loadShifts(selectedCastId);
      alert(`${deleteCount}件のシフトを削除しました`);
    } catch (error) {
      console.error("シフト一括削除エラー:", error);
      alert(
        "一部またはすべての削除に失敗しました。画面を再読み込みして確認してください。"
      );
      await loadShifts(selectedCastId);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <p className="text-xs font-bold text-blue-600">
          キャスト別シフト
        </p>
        <h2 className="mt-1 text-lg font-bold text-gray-900">
          シフト一覧の確認・一括削除
        </h2>
        <p className="mt-1 text-xs text-gray-600">
          キャストを選ぶと、登録済みのシフトをまとめて確認できます。
        </p>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-bold text-gray-800">
          キャスト
        </span>
        <select
          value={selectedCastId}
          onChange={(event) => setSelectedCastId(event.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm text-gray-900 outline-none focus:border-black"
        >
          <option value="">キャストを選択してください</option>
          {sortedCasts.map((cast) => (
            <option key={cast.id} value={cast.id}>
              {cast.display_name || cast.name}
              {cast.status !== "active" ? "（退店済み）" : ""}
            </option>
          ))}
        </select>
      </label>

      {selectedCastId && (
        <>
          <div className="mt-4 grid grid-cols-3 rounded-xl bg-gray-100 p-1">
            {(
              [
                ["future", "今後"],
                ["past", "過去"],
                ["all", "すべて"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setPeriod(value);
                  setSelectedShiftIds([]);
                }}
                className={`rounded-lg px-2 py-2 text-xs font-bold ${
                  period === value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <p className="py-8 text-center text-sm text-gray-600">
              読み込み中...
            </p>
          ) : errorMessage ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-bold text-red-700">
                {errorMessage}
              </p>
              <button
                type="button"
                onClick={() => void loadShifts(selectedCastId)}
                className="mt-3 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white"
              >
                再読み込み
              </button>
            </div>
          ) : (
            <>
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-gray-800">
                  {visibleShifts.length}件
                </p>

                {canEdit && visibleShifts.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleAllVisible}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700"
                  >
                    {allVisibleSelected
                      ? "選択を解除"
                      : "表示中を全選択"}
                  </button>
                )}
              </div>

              <div className="mt-3 max-h-[55vh] space-y-2 overflow-y-auto pr-1">
                {visibleShifts.map((shift) => {
                  const checked = selectedShiftIds.includes(shift.id);

                  return (
                    <label
                      key={shift.id}
                      className={`flex gap-3 rounded-xl border p-3 ${
                        checked
                          ? "border-blue-400 bg-blue-50"
                          : "border-gray-200 bg-white"
                      } ${canEdit ? "cursor-pointer" : ""}`}
                    >
                      {canEdit && (
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleShift(shift.id)}
                          className="mt-1 h-5 w-5 shrink-0 rounded border-gray-300"
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-900">
                          {formatDate(shift.work_date)}
                        </p>
                        <p className="mt-1 text-sm text-blue-700">
                          {formatExtendedTime(
                            shift.start_time,
                            shift.end_time
                          )}
                        </p>
                        {shift.memo && (
                          <p className="mt-1 whitespace-pre-wrap text-xs text-gray-600">
                            {shift.memo}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}

                {visibleShifts.length === 0 && (
                  <div className="rounded-xl bg-gray-50 p-5 text-center">
                    <p className="text-sm text-gray-600">
                      対象期間のシフトはありません。
                    </p>
                  </div>
                )}
              </div>

              {canEdit && selectedShiftIds.length > 0 && (
                <div className="sticky bottom-2 mt-4 rounded-xl border border-red-200 bg-white p-3 shadow-lg">
                  <p className="mb-2 text-center text-sm font-bold text-gray-900">
                    {selectedShiftIds.length}件選択中
                  </p>
                  <button
                    type="button"
                    onClick={() => void deleteSelectedShifts()}
                    disabled={isDeleting}
                    className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isDeleting
                      ? "削除中..."
                      : "選択したシフトを一括削除"}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
