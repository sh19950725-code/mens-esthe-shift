"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAuditLogs,
  type AuditAction,
  type AuditLog,
} from "@/services/audit.service";

type AuditLogScreenProps = {
  onBack?: () => void;
};

type TableFilter = "all" | "shifts" | "casts" | "profiles";
type ActionFilter = "all" | AuditAction;

const hiddenFields = new Set(["created_at", "updated_at"]);

function getActionLabel(action: AuditAction): string {
  switch (action) {
    case "INSERT":
      return "追加";
    case "UPDATE":
      return "編集";
    case "DELETE":
      return "削除";
  }
}

function getActionClasses(action: AuditAction): string {
  switch (action) {
    case "INSERT":
      return "bg-emerald-100 text-emerald-700";
    case "UPDATE":
      return "bg-blue-100 text-blue-700";
    case "DELETE":
      return "bg-red-100 text-red-700";
  }
}

function getTableLabel(tableName: string): string {
  switch (tableName) {
    case "shifts":
      return "シフト";
    case "casts":
      return "キャスト";
    case "profiles":
      return "スタッフ権限";
    default:
      return tableName;
  }
}

function formatDateTime(dateText: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(dateText));
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "未設定";
  if (typeof value === "boolean") return value ? "はい" : "いいえ";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function getRecordSummary(log: AuditLog): string {
  const data = log.new_data ?? log.old_data ?? {};

  if (log.table_name === "casts") {
    return formatValue(data.display_name || data.name);
  }
  if (log.table_name === "profiles") {
    const email = formatValue(data.email);
    const role = data.role === "admin" ? "管理者" : "一般スタッフ";
    return `${email}（${role}）`;
  }
  if (log.table_name === "shifts") {
    const date = formatValue(data.work_date);
    const start = formatValue(data.start_time).slice(0, 5);
    const end = formatValue(data.end_time).slice(0, 5);
    return `${date} ${start}〜${end}`;
  }
  return `ID: ${log.record_id.slice(0, 8)}`;
}

function getChangedFields(log: AuditLog) {
  const oldData = log.old_data ?? {};
  const newData = log.new_data ?? {};
  const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

  return [...keys]
    .filter((key) => !hiddenFields.has(key))
    .filter(
      (key) =>
        log.action !== "UPDATE" ||
        JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])
    )
    .map((key) => ({
      key,
      before: oldData[key],
      after: newData[key],
    }));
}

export default function AuditLogScreen({ onBack }: AuditLogScreenProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [tableFilter, setTableFilter] = useState<TableFilter>("all");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      setLogs(await getAuditLogs());
    } catch (error) {
      console.error("操作履歴取得エラー:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "操作履歴の取得に失敗しました"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const filteredLogs = useMemo(() => {
    const search = searchText.trim().toLocaleLowerCase("ja");
    return logs.filter((log) => {
      if (tableFilter !== "all" && log.table_name !== tableFilter) return false;
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (!search) return true;

      return (
        (log.actor_email ?? "").toLocaleLowerCase("ja").includes(search) ||
        getRecordSummary(log).toLocaleLowerCase("ja").includes(search)
      );
    });
  }, [actionFilter, logs, searchText, tableFilter]);

  return (
    <>
      <header className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500">セキュリティ・確認</p>
            <h1 className="text-2xl font-bold text-gray-900">操作履歴</h1>
            <p className="mt-1 text-sm text-gray-500">
              最新200件の追加・編集・削除を表示します
            </p>
          </div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-600 shadow-sm"
            >
              戻る
            </button>
          )}
        </div>
      </header>

      <section className="mb-4 rounded-2xl border border-gray-200 bg-white p-4">
        <input
          type="search"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="スタッフのメール・対象データを検索"
          className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-900"
        />
        <div className="mt-3 grid grid-cols-5 gap-1.5">
          {(
            [
              ["all", "すべて"],
              ["shifts", "シフト"],
              ["casts", "キャスト"],
              ["profiles", "権限"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTableFilter(value)}
              className={`rounded-xl px-2 py-2 text-xs font-bold ${
                tableFilter === value
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {(
            [
              ["all", "全操作"],
              ["INSERT", "追加"],
              ["UPDATE", "編集"],
              ["DELETE", "削除"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setActionFilter(value)}
              className={`rounded-xl px-2 py-2 text-xs font-bold ${
                actionFilter === value
                  ? "bg-blue-600 text-white"
                  : "bg-blue-50 text-blue-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {errorMessage && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{errorMessage}</p>
          <button
            type="button"
            onClick={() => void loadLogs()}
            className="mt-3 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white"
          >
            再読み込み
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-72 items-center justify-center">
          <p className="text-sm text-gray-500">操作履歴を読み込んでいます...</p>
        </div>
      ) : (
        <section className="space-y-2">
          {filteredLogs.map((log) => (
            <button
              key={log.id}
              type="button"
              onClick={() => setSelectedLog(log)}
              className="w-full rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:bg-gray-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">
                      {getTableLabel(log.table_name)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getActionClasses(
                        log.action
                      )}`}
                    >
                      {getActionLabel(log.action)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-gray-700">
                    {getRecordSummary(log)}
                  </p>
                  <p className="mt-1 truncate text-xs text-gray-500">
                    {log.actor_email || "システム処理"}
                  </p>
                </div>
                <p className="shrink-0 text-[10px] text-gray-400">
                  {formatDateTime(log.created_at)}
                </p>
              </div>
            </button>
          ))}

          {filteredLogs.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <p className="text-sm text-gray-500">
                条件に一致する操作履歴はありません
              </p>
            </div>
          )}
        </section>
      )}

      {selectedLog && (
        <div
          className="fixed inset-0 z-[90] overflow-y-auto bg-black/50 px-4 py-8"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="mx-auto max-w-md rounded-3xl bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500">
                  {getTableLabel(selectedLog.table_name)}
                </p>
                <h2 className="text-xl font-bold text-gray-900">
                  {getActionLabel(selectedLog.action)}の詳細
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-lg"
              >
                ×
              </button>
            </div>

            <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-sm">
              <p>
                <span className="text-gray-500">日時：</span>
                {formatDateTime(selectedLog.created_at)}
              </p>
              <p className="mt-2 break-all">
                <span className="text-gray-500">担当：</span>
                {selectedLog.actor_email || "システム処理"}
              </p>
              <p className="mt-2">
                <span className="text-gray-500">対象：</span>
                {getRecordSummary(selectedLog)}
              </p>
            </div>

            <section className="mt-4">
              <h3 className="text-sm font-bold text-gray-700">変更内容</h3>
              <div className="mt-2 space-y-2">
                {getChangedFields(selectedLog).map((field) => (
                  <div
                    key={field.key}
                    className="rounded-xl border border-gray-200 p-3"
                  >
                    <p className="text-xs font-bold text-gray-500">{field.key}</p>
                    {selectedLog.action !== "INSERT" && (
                      <p className="mt-1 break-all text-xs text-red-600">
                        変更前：{formatValue(field.before)}
                      </p>
                    )}
                    {selectedLog.action !== "DELETE" && (
                      <p className="mt-1 break-all text-xs text-emerald-700">
                        変更後：{formatValue(field.after)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
