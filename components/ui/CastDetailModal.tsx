"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import {
  getShiftsByCastId,
  type Shift,
} from "@/services/shift.service";
import type { Cast } from "@/services/cast.service";

type CastDetailModalProps = {
  cast: Cast;
  onClose: () => void;
  onEdit: () => void;
};

function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  function formatDate(date: Date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
  }

  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}

function calculateMinutes(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime
    .slice(0, 5)
    .split(":")
    .map(Number);

  const [endHour, endMinute] = endTime
    .slice(0, 5)
    .split(":")
    .map(Number);

  const start = startHour * 60 + startMinute;
  let end = endHour * 60 + endMinute;

  if (end <= start) {
    end += 24 * 60;
  }

  return end - start;
}

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours}時間`;
  }

  return `${hours}時間${minutes}分`;
}

export default function CastDetailModal({
  cast,
  onClose,
  onEdit,
}: CastDetailModalProps) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadShifts();
  }, [cast.id]);

  async function loadShifts() {
    try {
      setIsLoading(true);

      const data = await getShiftsByCastId(cast.id);
      setShifts(data);
    } catch (error) {
      console.error(error);
      alert("キャストのシフト履歴取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }

  const currentMonthShifts = useMemo(() => {
    const { startDate, endDate } = getCurrentMonthRange();

    return shifts.filter(
      (shift) =>
        shift.work_date >= startDate &&
        shift.work_date <= endDate
    );
  }, [shifts]);

  const currentMonthMinutes = useMemo(() => {
    return currentMonthShifts.reduce((total, shift) => {
      return (
        total +
        calculateMinutes(
          shift.start_time,
          shift.end_time
        )
      );
    }, 0);
  }, [currentMonthShifts]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
      <div className="mx-auto my-6 w-full max-w-md rounded-3xl bg-white p-5 shadow-xl">
        <header className="mb-5">
          <p className="text-sm text-gray-500">
            キャスト詳細
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            {cast.display_name || cast.name}
          </h2>

          {cast.display_name &&
            cast.display_name !== cast.name && (
              <p className="mt-1 text-sm text-gray-400">
                管理名：{cast.name}
              </p>
            )}
        </header>

        <section className="mb-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-gray-100 p-4">
            <p className="text-xs text-gray-500">
              今月の出勤
            </p>

            <p className="mt-1 text-2xl font-bold">
              {currentMonthShifts.length}日
            </p>
          </div>

          <div className="rounded-2xl bg-blue-50 p-4">
            <p className="text-xs text-blue-700">
              今月の勤務時間
            </p>

            <p className="mt-1 text-lg font-bold text-blue-700">
              {formatMinutes(currentMonthMinutes)}
            </p>
          </div>
        </section>

        {cast.memo && (
          <section className="mb-5">
            <p className="mb-2 text-sm font-bold text-gray-700">
              メモ
            </p>

            <p className="rounded-xl bg-gray-100 p-3 text-sm text-gray-600">
              {cast.memo}
            </p>
          </section>
        )}

        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-bold">
              シフト履歴
            </h3>

            <span className="text-sm text-gray-500">
              全{shifts.length}件
            </span>
          </div>

          {isLoading ? (
            <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
              読み込み中...
            </p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {shifts.map((shift) => (
                <div
                  key={shift.id}
                  className="rounded-xl border bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">
                        {shift.work_date}
                      </p>

                      <p className="mt-1 text-sm text-gray-600">
                        {shift.start_time.slice(0, 5)}〜
                        {shift.end_time.slice(0, 5)}
                      </p>
                    </div>

                    <p className="text-xs text-gray-500">
                      {shift.rooms?.name || "部屋未設定"}
                    </p>
                  </div>

                  {shift.memo && (
                    <p className="mt-2 rounded-lg bg-gray-100 p-2 text-xs text-gray-600">
                      {shift.memo}
                    </p>
                  )}
                </div>
              ))}

              {shifts.length === 0 && (
                <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                  シフト履歴はありません。
                </p>
              )}
            </div>
          )}
        </section>

        <div className="flex gap-3">
          <Button
            onClick={onEdit}
            className="flex-1"
          >
            編集する
          </Button>

          <Button
            onClick={onClose}
            variant="secondary"
            className="flex-1"
          >
            閉じる
          </Button>
        </div>
      </div>
    </div>
  );
}