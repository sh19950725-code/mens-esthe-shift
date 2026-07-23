"use client";

import { useState } from "react";
import CastWorkloadPanel from "@/components/dashboard/CastWorkloadPanel";
import DailyShiftSharePanel from "@/components/dashboard/DailyShiftSharePanel";
import InstallAppPanel from "@/components/dashboard/InstallAppPanel";
import ShiftIssuePanel from "@/components/dashboard/ShiftIssuePanel";
import SystemHealthPanel from "@/components/dashboard/SystemHealthPanel";

type ReportKey =
  | "issues"
  | "install"
  | "health"
  | "share"
  | "casts";

type DashboardReportsProps = {
  onOpenWeek?: () => void;
};

const REPORTS: {
  key: ReportKey;
  icon: string;
  title: string;
  description: string;
}[] = [
  {
    key: "issues",
    icon: "⚠️",
    title: "登録内容チェック",
    description: "未設定や時間重複を確認",
  },
  {
    key: "install",
    icon: "📱",
    title: "スマホへ追加",
    description: "アプリのようにホームから起動",
  },
  {
    key: "health",
    icon: "🩺",
    title: "システム診断",
    description: "接続やデータ取得を確認",
  },
  {
    key: "share",
    icon: "📤",
    title: "シフト共有・印刷",
    description: "LINE用文章や日次表を作成",
  },
  {
    key: "casts",
    icon: "📈",
    title: "キャスト勤務集計",
    description: "勤務日数と勤務時間を集計",
  },
];

export default function DashboardReports({
  onOpenWeek,
}: DashboardReportsProps) {
  const [activeReport, setActiveReport] =
    useState<ReportKey | null>("issues");

  function renderReport() {
    switch (activeReport) {
      case "issues":
        return <ShiftIssuePanel onOpenWeek={onOpenWeek} />;
      case "install":
        return <InstallAppPanel />;
      case "health":
        return <SystemHealthPanel />;
      case "share":
        return <DailyShiftSharePanel />;
      case "casts":
        return <CastWorkloadPanel />;
      default:
        return null;
    }
  }

  return (
    <section className="mt-5">
      <div className="mb-3">
        <p className="text-sm text-gray-500">
          運営サポート
        </p>
        <h2 className="text-lg font-bold text-gray-900">
          レポート・便利機能
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          必要な項目だけ開いて確認できます
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {REPORTS.map((report) => {
          const isActive = activeReport === report.key;

          return (
            <button
              key={report.key}
              type="button"
              onClick={() =>
                setActiveReport((current) =>
                  current === report.key ? null : report.key
                )
              }
              aria-expanded={isActive}
              className={`rounded-2xl border p-3 text-left transition ${
                isActive
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-900 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">{report.icon}</span>
                <span
                  className={
                    isActive
                      ? "text-white"
                      : "text-gray-300"
                  }
                >
                  {isActive ? "−" : "＋"}
                </span>
              </div>
              <p className="mt-2 text-sm font-bold">
                {report.title}
              </p>
              <p
                className={`mt-1 text-[11px] ${
                  isActive
                    ? "text-gray-300"
                    : "text-gray-500"
                }`}
              >
                {report.description}
              </p>
            </button>
          );
        })}
      </div>

      {activeReport && (
        <div className="mt-4">{renderReport()}</div>
      )}
    </section>
  );
}
