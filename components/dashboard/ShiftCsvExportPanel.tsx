"use client";

import { useState } from "react";
import {
  getShiftsByDateRange,
  type Shift,
  type ShiftStatus,
} from "@/services/shift.service";

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getInitialRange() {
  const today = new Date();
  return {
    start: formatLocalDate(
      new Date(today.getFullYear(), today.getMonth(), 1)
    ),
    end: formatLocalDate(
      new Date(today.getFullYear(), today.getMonth() + 1, 0)
    ),
  };
}

function getStatusLabel(status: ShiftStatus | null): string {
  switch (status) {
    case "tentative":
      return "仮シフト";
    case "holiday":
      return "休み";
    case "working":
    default:
      return "通常出勤";
  }
}

function protectSpreadsheetFormula(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function escapeCsv(value: string | null | undefined): string {
  const safeValue = protectSpreadsheetFormula(value ?? "");
  return `"${safeValue.replace(/"/g, '""')}"`;
}

function getCastName(shift: Shift): string {
  return (
    shift.casts?.display_name ||
    shift.casts?.name ||
    "未設定"
  );
}

function createCsv(shifts: Shift[]): string {
  const header = [
    "日付",
    "キャスト名",
    "出勤時間",
    "退勤時間",
    "状態",
    "メモ",
  ];

  const rows = shifts.map((shift) => [
    shift.work_date,
    getCastName(shift),
    shift.start_time.slice(0, 5),
    shift.end_time.slice(0, 5),
    getStatusLabel(shift.status),
    shift.memo ?? "",
  ]);

  return [header, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\r\n");
}

function downloadCsv(
  csv: string,
  startDate: string,
  endDate: string
) {
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `シフト_${startDate}_${endDate}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ShiftCsvExportPanel() {
  const initialRange = getInitialRange();
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState("");

  async function exportShifts() {
    if (!startDate || !endDate) {
      setMessage("開始日と終了日を選択してください。");
      return;
    }

    if (startDate > endDate) {
      setMessage("終了日は開始日以降を選択してください。");
      return;
    }

    try {
      setIsExporting(true);
      setMessage("");

      const shifts = await getShiftsByDateRange(
        startDate,
        endDate
      );

      if (shifts.length === 0) {
        setMessage("選択した期間にシフトはありません。");
        return;
      }

      downloadCsv(createCsv(shifts), startDate, endDate);
      setMessage(`${shifts.length}件を出力しました。`);
    } catch (error) {
      console.error("CSV出力エラー:", error);
      setMessage("CSVの作成に失敗しました。");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm text-gray-500">データ出力</p>
        <h2 className="text-lg font-bold text-gray-900">
          シフトをCSVで保存
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          指定期間のシフトをExcelで確認できます
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="text-sm font-bold text-gray-700">
          開始日
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 font-normal outline-none focus:border-gray-900"
          />
        </label>

        <label className="text-sm font-bold text-gray-700">
          終了日
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3 font-normal outline-none focus:border-gray-900"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => void exportShifts()}
        disabled={isExporting}
        className="mt-4 w-full rounded-xl bg-gray-900 px-4 py-3 font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isExporting ? "作成中..." : "CSVをダウンロード"}
      </button>

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
