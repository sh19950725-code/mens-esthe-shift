"use client";

import { useState } from "react";
import { getActiveCasts } from "@/services/cast.service";
import { getCurrentProfile } from "@/services/profile.service";
import { getActiveRooms } from "@/services/room.service";
import { getShiftsByDate } from "@/services/shift.service";

type CheckStatus = "ok" | "error";

type CheckResult = {
  key: string;
  label: string;
  status: CheckStatus;
  detail: string;
};

function getTodayText(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function runCheck<T>(
  key: string,
  label: string,
  action: () => Promise<T>,
  getDetail: (value: T) => string
): Promise<CheckResult> {
  try {
    const value = await action();
    return {
      key,
      label,
      status: "ok",
      detail: getDetail(value),
    };
  } catch (error) {
    return {
      key,
      label,
      status: "error",
      detail:
        error instanceof Error
          ? error.message
          : "確認に失敗しました",
    };
  }
}

export default function SystemHealthPanel() {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] =
    useState<Date | null>(null);

  async function checkSystem() {
    setIsChecking(true);

    const onlineResult: CheckResult = {
      key: "network",
      label: "インターネット接続",
      status: navigator.onLine ? "ok" : "error",
      detail: navigator.onLine
        ? "オンラインです"
        : "オフラインです",
    };

    const checked = await Promise.all([
      runCheck(
        "profile",
        "ログイン・権限",
        getCurrentProfile,
        (profile) =>
          profile
            ? `ログイン済み（${
                profile.role === "admin"
                  ? "管理者"
                  : "スタッフ"
              }）`
            : "プロフィール未設定"
      ),
      runCheck(
        "casts",
        "キャストデータ",
        getActiveCasts,
        (casts) => `${casts.length}名を取得`
      ),
      runCheck(
        "rooms",
        "部屋データ",
        getActiveRooms,
        (rooms) => `${rooms.length}室を取得`
      ),
      runCheck(
        "shifts",
        "シフトデータ",
        () => getShiftsByDate(getTodayText()),
        (shifts) => `本日分を${shifts.length}件取得`
      ),
    ]);

    setResults([onlineResult, ...checked]);
    setLastCheckedAt(new Date());
    setIsChecking(false);
  }

  const errorCount = results.filter(
    (result) => result.status === "error"
  ).length;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm text-gray-500">
          トラブル確認
        </p>
        <h2 className="text-lg font-bold text-gray-900">
          システム診断
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          接続や主要データを変更せずに確認します
        </p>
      </div>

      <button
        type="button"
        onClick={() => void checkSystem()}
        disabled={isChecking}
        className="mt-4 w-full rounded-xl bg-gray-900 px-4 py-3 font-bold text-white disabled:opacity-50"
      >
        {isChecking ? "診断中..." : "診断を開始"}
      </button>

      {results.length > 0 && (
        <>
          <div
            className={`mt-4 rounded-2xl p-4 ${
              errorCount === 0
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            <p className="font-bold">
              {errorCount === 0
                ? "すべて正常です"
                : `${errorCount}項目で問題が見つかりました`}
            </p>
            {lastCheckedAt && (
              <p className="mt-1 text-xs opacity-80">
                確認時刻{" "}
                {lastCheckedAt.toLocaleTimeString("ja-JP", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>

          <div className="mt-3 space-y-2">
            {results.map((result) => (
              <div
                key={result.key}
                className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                    result.status === "ok"
                      ? "bg-green-500"
                      : "bg-red-500"
                  }`}
                >
                  {result.status === "ok" ? "✓" : "!"}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800">
                    {result.label}
                  </p>
                  <p className="mt-1 break-words text-xs text-gray-500">
                    {result.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
