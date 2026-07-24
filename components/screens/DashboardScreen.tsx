"use client";

import { useCallback, useEffect, useState } from "react";
import CastWorkloadPanel from "@/components/dashboard/CastWorkloadPanel";
import DailyShiftSharePanel from "@/components/dashboard/DailyShiftSharePanel";
import ShiftIssuePanel from "@/components/dashboard/ShiftIssuePanel";
import {
  getDashboardSummary,
  type DashboardSummary,
} from "@/services/dashboard.service";

type DashboardScreenProps = {
  canEdit?: boolean;
  onOpenToday?: () => void;
  onOpenWeek?: () => void;
  onOpenMonth?: () => void;
  onOpenRegister?: () => void;
  onOpenCasts?: () => void;
};

type MenuCardProps = {
  icon: string;
  title: string;
  description: string;
  onClick?: () => void;
};

function formatDateText(dateText: string) {
  const [year, month, day] = dateText.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function formatTime(time: string) {
  return time.slice(0, 5);
}

function MenuCard({
  icon,
  title,
  description,
  onClick,
}: MenuCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:bg-gray-50 active:scale-[0.99]"
    >
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className="text-gray-300">›</span>
      </div>
      <p className="mt-3 font-bold text-gray-900">{title}</p>
      <p className="mt-1 text-xs text-gray-500">
        {description}
      </p>
    </button>
  );
}

export default function DashboardScreen({
  canEdit = false,
  onOpenToday,
  onOpenWeek,
  onOpenMonth,
  onOpenRegister,
  onOpenCasts,
}: DashboardScreenProps) {
  const [summary, setSummary] =
    useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      setSummary(await getDashboardSummary());
    } catch (error) {
      console.error("ダッシュボード取得エラー:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "ダッシュボードの取得に失敗しました"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
          <p className="mt-3 text-sm text-gray-500">
            ダッシュボードを読み込んでいます...
          </p>
        </div>
      </div>
    );
  }

  if (!summary || errorMessage) {
    return (
      <section className="rounded-2xl border border-red-100 bg-red-50 p-5">
        <p className="font-bold text-red-700">
          データを取得できませんでした
        </p>
        <p className="mt-2 text-sm text-red-600">
          {errorMessage ||
            "ダッシュボードの取得に失敗しました"}
        </p>
        <button
          type="button"
          onClick={() => void loadDashboard()}
          className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white"
        >
          再読み込み
        </button>
      </section>
    );
  }

  const totalTodayCount = summary.workingCount;
  const latestWorkingShifts = summary.latestShifts.filter(
    (shift) =>
      shift.status !== "tentative" &&
      shift.status !== "holiday"
  );

  return (
    <>
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">店舗管理</p>
          <h1 className="text-2xl font-bold text-gray-900">
            ダッシュボード
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {formatDateText(summary.date)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadDashboard()}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-600 shadow-sm"
        >
          更新
        </button>
      </header>

      {canEdit ? (
        <button
          type="button"
          onClick={onOpenRegister}
          className="mb-5 flex w-full items-center justify-between rounded-2xl bg-gray-900 p-5 text-left text-white shadow-sm"
        >
          <div>
            <p className="text-sm text-gray-300">
              新しい予定を追加
            </p>
            <p className="mt-1 text-lg font-bold">
              シフトを登録する
            </p>
          </div>
          <span className="text-3xl">＋</span>
        </button>
      ) : (
        <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <p className="font-bold text-blue-800">
            閲覧専用
          </p>
          <p className="mt-1 text-sm text-blue-700">
            一般スタッフはシフトやキャストを確認できますが、登録・編集・削除はできません。
          </p>
        </div>
      )}

      <section className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">本日の状況</p>
            <h2 className="text-lg font-bold">
              シフト {totalTodayCount}件
            </h2>
          </div>
          <button
            type="button"
            onClick={onOpenToday}
            className="text-sm font-bold text-gray-600"
          >
            詳細を見る
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <div className="rounded-2xl bg-blue-50 p-4">
            <p className="text-xs font-bold text-blue-700">
              通常出勤
            </p>
            <p className="mt-2 text-2xl font-bold text-blue-800">
              {summary.workingCount}
              <span className="ml-1 text-sm">名</span>
            </p>
          </div>
        </div>
      </section>

      <section className="mb-5 grid grid-cols-1 gap-3">
        <div className="rounded-2xl bg-green-50 p-4">
          <p className="text-sm font-bold text-green-700">
            現在出勤中
          </p>
          <p className="mt-3 text-3xl font-bold text-green-800">
            {summary.workingNowCount}
            <span className="ml-1 text-base">名</span>
          </p>
        </div>
        
      </section>

      <section className="mb-5">
        <p className="text-sm text-gray-500">管理メニュー</p>
        <h2 className="mb-3 text-lg font-bold">
          クイックアクセス
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <MenuCard
            icon="📅"
            title="本日のシフト"
            description={`${totalTodayCount}件登録`}
            onClick={onOpenToday}
          />
          <MenuCard
            icon="🗓️"
            title="週間シフト"
            description={`今週 ${summary.weekShiftCount}件`}
            onClick={onOpenWeek}
          />
          <MenuCard
            icon="📆"
            title="月間カレンダー"
            description="月全体を確認"
            onClick={onOpenMonth}
          />
          <MenuCard
            icon="👤"
            title="キャスト管理"
            description={`有効 ${summary.activeCastCount}名`}
            onClick={onOpenCasts}
          />
          
          
        </div>
      </section>

      <section className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">最近の登録</p>
            <h2 className="text-lg font-bold">最新シフト</h2>
          </div>
          <button
            type="button"
            onClick={onOpenWeek}
            className="text-sm font-bold text-gray-600"
          >
            週間を見る
          </button>
        </div>

        <div className="space-y-2">
          {latestWorkingShifts.map((shift) => (
            <div
              key={shift.id}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-bold">
                    {shift.casts?.display_name ||
                      shift.casts?.name ||
                      "未設定"}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    {shift.work_date}{" "}
                    {formatTime(shift.start_time)}〜
                    {formatTime(shift.end_time)}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-bold text-gray-500">
                  通常出勤
                </span>
              </div>
            </div>
          ))}

          {latestWorkingShifts.length === 0 && (
            <p className="rounded-2xl bg-gray-50 p-5 text-center text-sm text-gray-500">
              登録されたシフトはありません
            </p>
          )}
        </div>
      </section>

      <div className="space-y-5">
        <CastWorkloadPanel />
        <DailyShiftSharePanel />
        <ShiftIssuePanel onOpenWeek={onOpenWeek} />
      </div>
    </>
  );
}
