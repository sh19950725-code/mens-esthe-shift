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
  canEdit?: boolean;
};

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCurrentMonthRange() {
  const now = new Date();

  return {
    startDate: formatLocalDate(
      new Date(now.getFullYear(), now.getMonth(), 1)
    ),
    endDate: formatLocalDate(
      new Date(now.getFullYear(), now.getMonth() + 1, 0)
    ),
  };
}

function calculateMinutes(
  startTime: string,
  endTime: string
): number {
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

function formatMinutes(totalMinutes: number): string {
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
  canEdit = false,
}: CastDetailModalProps) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function loadShifts() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const data = await getShiftsByCastId(cast.id);

        if (!isCancelled) {
          setShifts(
            data.filter(
              (shift) =>
                (shift.status ?? "working") === "working"
            )
          );
        }
      } catch (error) {
        console.error("キャストのシフト履歴取得エラー:", error);

        if (!isCancelled) {
          setErrorMessage(
            "キャストのシフト履歴取得に失敗しました"
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadShifts();

    return () => {
      isCancelled = true;
    };
  }, [cast.id]);

  const currentMonthShifts = useMemo(() => {
    const { startDate, endDate } = getCurrentMonthRange();

    return shifts.filter(
      (shift) =>
        shift.work_date >= startDate &&
        shift.work_date <= endDate
    );
  }, [shifts]);

  const currentMonthWorkingShifts = currentMonthShifts;

  const currentMonthMinutes = useMemo(
    () =>
      currentMonthWorkingShifts.reduce(
        (total, shift) =>
          total +
          calculateMinutes(
            shift.start_time,
            shift.end_time
          ),
        0
      ),
    [currentMonthWorkingShifts]
  );

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="mx-auto my-6 w-full max-w-md rounded-3xl bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
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
              {currentMonthWorkingShifts.length}日
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

            <p className="whitespace-pre-wrap rounded-xl bg-gray-100 p-3 text-sm text-gray-600">
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

          {errorMessage && (
            <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {errorMessage}
            </p>
          )}

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

                    <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                      通常出勤
                    </span>
                  </div>

                  {shift.memo && (
                    <p className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-100 p-2 text-xs text-gray-600">
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
          {canEdit && (
            <Button onClick={onEdit} className="flex-1">
              編集する
            </Button>
          )}

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
