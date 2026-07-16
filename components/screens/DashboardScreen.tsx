"use client";

import { useEffect, useState } from "react";
import { getActiveCasts } from "@/services/cast.service";
import { getActiveRooms } from "@/services/room.service";
import {
  getShiftsByDate,
  type Shift,
} from "@/services/shift.service";
import { getShiftStatus } from "@/lib/time";

type DashboardScreenProps = {
  onOpenRooms: () => void;
};

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function DashboardScreen({
  onOpenRooms,
}: DashboardScreenProps) {
  const [todayShifts, setTodayShifts] = useState<Shift[]>([]);
  const [tomorrowShifts, setTomorrowShifts] = useState<Shift[]>([]);
  const [castCount, setCastCount] = useState(0);
  const [roomCount, setRoomCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const today = new Date();

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const todayText = formatLocalDate(today);
  const tomorrowText = formatLocalDate(tomorrow);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setIsLoading(true);

      const [casts, rooms, todayData, tomorrowData] =
        await Promise.all([
          getActiveCasts(),
          getActiveRooms(),
          getShiftsByDate(todayText),
          getShiftsByDate(tomorrowText),
        ]);

      setCastCount(casts.length);
      setRoomCount(rooms.length);
      setTodayShifts(todayData);
      setTomorrowShifts(tomorrowData);
    } catch (error) {
      console.error(error);
      alert("ダッシュボードの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }

  const workingCount = todayShifts.filter((shift) => {
    const result = getShiftStatus(
      shift.work_date,
      shift.start_time,
      shift.end_time
    );

    return result.status === "working";
  }).length;

  const usedRoomCount = new Set(
    todayShifts
      .map((shift) => shift.room_id)
      .filter((roomId): roomId is string => Boolean(roomId))
  ).size;

  const vacantRoomCount = Math.max(
    roomCount - usedRoomCount,
    0
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-gray-500">
          読み込み中...
        </p>
      </div>
    );
  }

  return (
    <>
      <header className="mb-6">
        <p className="text-sm text-gray-500">
          店舗ダッシュボード
        </p>

        <h1 className="text-3xl font-bold">
          ホーム
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          {todayText}
        </p>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-gray-100 p-4">
          <p className="text-xs text-gray-500">
            在籍キャスト
          </p>

          <p className="mt-1 text-2xl font-bold">
            {castCount}名
          </p>
        </div>

        <div className="rounded-2xl bg-blue-50 p-4">
          <p className="text-xs text-blue-700">
            本日の出勤
          </p>

          <p className="mt-1 text-2xl font-bold text-blue-700">
            {todayShifts.length}名
          </p>
        </div>

        <div className="rounded-2xl bg-green-50 p-4">
          <p className="text-xs text-green-700">
            現在出勤中
          </p>

          <p className="mt-1 text-2xl font-bold text-green-700">
            {workingCount}名
          </p>
        </div>

        <div className="rounded-2xl bg-yellow-50 p-4">
          <p className="text-xs text-yellow-700">
            空き部屋
          </p>

          <p className="mt-1 text-2xl font-bold text-yellow-700">
            {vacantRoomCount}室
          </p>

          <p className="mt-1 text-xs text-yellow-700">
            使用予定 {usedRoomCount}/{roomCount}室
          </p>
        </div>
      </section>

      <section className="mb-6 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500">
              明日の予定
            </p>

            <p className="mt-1 text-xl font-bold">
              出勤 {tomorrowShifts.length}名
            </p>
          </div>

          <p className="text-sm font-medium text-gray-500">
            {tomorrowText}
          </p>
        </div>
      </section>

      <section className="mb-6">
        <button
          type="button"
          onClick={onOpenRooms}
          className="flex w-full items-center justify-between rounded-2xl border bg-white p-4 text-left shadow-sm"
        >
          <div>
            <p className="text-sm text-gray-500">
              店舗設備
            </p>

            <p className="mt-1 text-lg font-bold">
              部屋管理
            </p>

            <p className="mt-1 text-xs text-gray-500">
              部屋の追加・検索・非表示
            </p>
          </div>

          <span className="text-2xl">
            ›
          </span>
        </button>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            本日のシフト
          </h2>

          <span className="text-sm text-gray-500">
            {todayShifts.length}名
          </span>
        </div>

        <div className="space-y-2">
          {todayShifts.slice(0, 5).map((shift) => {
            const status = getShiftStatus(
              shift.work_date,
              shift.start_time,
              shift.end_time
            );

            return (
              <div
                key={shift.id}
                className="rounded-xl border bg-white p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">
                      {shift.casts?.display_name ||
                        shift.casts?.name ||
                        "未設定"}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {shift.start_time.slice(0, 5)}〜
                      {shift.end_time.slice(0, 5)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-medium text-gray-500">
                      {shift.rooms?.name || "部屋未設定"}
                    </p>

                    <p
                      className={`mt-1 text-xs font-bold ${
                        status.status === "working"
                          ? "text-green-600"
                          : status.status === "soon"
                            ? "text-yellow-600"
                            : "text-gray-500"
                      }`}
                    >
                      {status.label}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {todayShifts.length === 0 && (
            <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
              本日のシフトはまだ登録されていません。
            </p>
          )}

          {todayShifts.length > 5 && (
            <p className="text-center text-sm text-gray-500">
              ほか {todayShifts.length - 5}名
            </p>
          )}
        </div>
      </section>
    </>
  );
}