"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getShiftsByDate,
  type Shift,
} from "@/services/shift.service";

function getTodayText(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatJapaneseDate(dateText: string): string {
  const [year, month, day] = dateText.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${year}年${month}月${day}日（${
    weekdays[date.getDay()]
  }）`;
}

function getCastName(shift: Shift): string {
  return (
    shift.casts?.display_name ||
    shift.casts?.name ||
    "未設定"
  );
}

function getStatusLabel(shift: Shift): string {
  if (shift.status === "tentative") return "仮";
  if (shift.status === "holiday") return "休み";
  return "出勤";
}

function formatTime(shift: Shift): string {
  if (shift.status === "holiday") return "休み";
  return `${shift.start_time.slice(0, 5)}〜${shift.end_time.slice(
    0,
    5
  )}`;
}

function createShareText(date: string, shifts: Shift[]): string {
  const working = shifts.filter(
    (shift) => shift.status !== "holiday"
  );
  const holidays = shifts.filter(
    (shift) => shift.status === "holiday"
  );
  const lines = [
    `【${formatJapaneseDate(date)} シフト】`,
    `出勤予定：${working.length}名`,
    "",
  ];

  working.forEach((shift) => {
    const room = shift.rooms?.name
      ? ` / ${shift.rooms.name}`
      : " / 部屋未設定";
    const tentative =
      shift.status === "tentative" ? "（仮）" : "";
    lines.push(
      `・${getCastName(shift)}${tentative} ${formatTime(
        shift
      )}${room}`
    );
  });

  if (holidays.length > 0) {
    lines.push("", `休み：${holidays.map(getCastName).join("、")}`);
  }

  return lines.join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function createPrintHtml(date: string, shifts: Shift[]): string {
  const rows = shifts
    .map(
      (shift) => `
        <tr>
          <td>${escapeHtml(getCastName(shift))}</td>
          <td>${escapeHtml(getStatusLabel(shift))}</td>
          <td>${escapeHtml(formatTime(shift))}</td>
          <td>${escapeHtml(
            shift.status === "holiday"
              ? ""
              : shift.rooms?.name || "未設定"
          )}</td>
          <td>${escapeHtml(shift.memo || "")}</td>
        </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <title>${escapeHtml(date)} シフト表</title>
    <style>
      body { font-family: sans-serif; padding: 24px; color: #111; }
      h1 { font-size: 22px; margin-bottom: 6px; }
      p { color: #555; margin-top: 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #bbb; padding: 9px; text-align: left; }
      th { background: #f2f2f2; }
      @media print { body { padding: 0; } }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(formatJapaneseDate(date))} シフト表</h1>
    <p>登録 ${shifts.length}件</p>
    <table>
      <thead>
        <tr>
          <th>キャスト</th><th>状態</th><th>時間</th>
          <th>部屋</th><th>メモ</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <script>window.addEventListener("load", () => window.print());</script>
  </body>
</html>`;
}

export default function DailyShiftSharePanel() {
  const [date, setDate] = useState(getTodayText());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadShifts(targetDate = date) {
    try {
      setIsLoading(true);
      setMessage("");
      setShifts(await getShiftsByDate(targetDate));
    } catch (error) {
      console.error("共有用シフト取得エラー:", error);
      setMessage("シフトを取得できませんでした。");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadShifts(date);
  }, [date]);

  const shareText = useMemo(
    () => createShareText(date, shifts),
    [date, shifts]
  );

  async function copyText() {
    if (shifts.length === 0) {
      setMessage("この日のシフトはありません。");
      return;
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setMessage("共有用テキストをコピーしました。");
    } catch (error) {
      console.error("コピーエラー:", error);
      setMessage("コピーできませんでした。");
    }
  }

  function printTable() {
    if (shifts.length === 0) {
      setMessage("この日のシフトはありません。");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setMessage("印刷画面を開けませんでした。");
      return;
    }

    printWindow.opener = null;
    printWindow.document.write(createPrintHtml(date, shifts));
    printWindow.document.close();
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm text-gray-500">日次業務</p>
        <h2 className="text-lg font-bold text-gray-900">
          シフト共有・印刷
        </h2>
      </div>

      <input
        type="date"
        value={date}
        onChange={(event) => setDate(event.target.value)}
        className="mt-4 w-full rounded-xl border border-gray-300 p-3"
      />

      <div className="mt-3 rounded-xl bg-gray-50 p-3">
        <p className="text-sm font-bold text-gray-700">
          {isLoading
            ? "読み込み中..."
            : `${shifts.length}件のシフト`}
        </p>
        {!isLoading && shifts.length > 0 && (
          <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap font-sans text-xs text-gray-600">
            {shareText}
          </pre>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => void copyText()}
          disabled={isLoading}
          className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          テキストをコピー
        </button>
        <button
          type="button"
          onClick={printTable}
          disabled={isLoading}
          className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          シフト表を印刷
        </button>
      </div>

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
