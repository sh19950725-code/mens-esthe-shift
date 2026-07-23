"use client";

import { useMemo, useState } from "react";
import {
  checkShiftConflict,
  createShift,
  deleteShiftById,
  type Shift,
} from "@/services/shift.service";

type CopyDayShiftsModalProps = {
  sourceDate: string;
  shifts: Shift[];
  onClose: () => void;
  onCopied: (targetDate: string) => Promise<void> | void;
};

function parseDate(dateText: string): Date {
  const [year, month, day] = dateText.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateText: string, amount: number): string {
  const date = parseDate(dateText);
  date.setDate(date.getDate() + amount);
  return formatDate(date);
}

function getCastName(shift: Shift): string {
  return shift.casts?.display_name || shift.casts?.name || "未設定";
}

export default function CopyDayShiftsModal({
  sourceDate,
  shifts,
  onClose,
  onCopied,
}: CopyDayShiftsModalProps) {
  const [targetDate, setTargetDate] = useState(() => addDays(sourceDate, 7));
  const [isCopying, setIsCopying] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    copiedCount: number;
    skippedNames: string[];
    createdIds: string[];
  } | null>(null);
  const [undoCompleted, setUndoCompleted] = useState(false);
  const [preview, setPreview] = useState<{
    copyableCount: number;
    conflicts: string[];
  } | null>(null);

  const copyableShifts = useMemo(
    () => [...shifts].sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [shifts]
  );
  const [selectedShiftIds, setSelectedShiftIds] = useState<Set<string>>(
    () => new Set(shifts.map((shift) => shift.id))
  );
  const selectedShifts = useMemo(
    () => copyableShifts.filter((shift) => selectedShiftIds.has(shift.id)),
    [copyableShifts, selectedShiftIds]
  );

  function toggleShift(shiftId: string) {
    setSelectedShiftIds((current) => {
      const next = new Set(current);
      if (next.has(shiftId)) next.delete(shiftId);
      else next.add(shiftId);
      return next;
    });
    setResult(null);
    setPreview(null);
  }

  async function checkCopyPlan() {
    if (!targetDate) {
      window.alert("コピー先の日付を選択してください");
      return;
    }
    if (targetDate === sourceDate) {
      window.alert("コピー元とは別の日付を選択してください");
      return;
    }
    if (selectedShifts.length === 0 || isChecking) return;

    try {
      setIsChecking(true);
      setPreview(null);
      const conflicts: string[] = [];

      for (const shift of selectedShifts) {
        const status = shift.status ?? "working";
        const result = await checkShiftConflict(
          shift.cast_id,
          status === "holiday" ? null : shift.room_id,
          targetDate,
          shift.start_time,
          shift.end_time
        );
        if (!result.ok) conflicts.push(getCastName(shift));
      }

      setPreview({
        copyableCount: selectedShifts.length - conflicts.length,
        conflicts,
      });
    } catch (error) {
      console.error("コピー事前確認エラー:", error);
      window.alert(
        error instanceof Error ? error.message : "重複の確認に失敗しました"
      );
    } finally {
      setIsChecking(false);
    }
  }

  async function copyShifts() {
    if (!targetDate) {
      window.alert("コピー先の日付を選択してください");
      return;
    }
    if (targetDate === sourceDate) {
      window.alert("コピー元とは別の日付を選択してください");
      return;
    }
    if (selectedShifts.length === 0 || isCopying) return;

    const confirmed = window.confirm(
      `${sourceDate}の選択した${selectedShifts.length}件を${targetDate}へコピーしますか？`
    );
    if (!confirmed) return;

    try {
      setIsCopying(true);
      setProgress(0);
      setResult(null);
      let copiedCount = 0;
      const skippedNames: string[] = [];
      const createdIds: string[] = [];

      for (let index = 0; index < selectedShifts.length; index += 1) {
        const shift = selectedShifts[index];
        const status = shift.status ?? "working";
        const conflict = await checkShiftConflict(
          shift.cast_id,
          status === "holiday" ? null : shift.room_id,
          targetDate,
          shift.start_time,
          shift.end_time
        );

        if (!conflict.ok) {
          skippedNames.push(getCastName(shift));
        } else {
          const createdShift = await createShift({
            cast_id: shift.cast_id,
            room_id: status === "holiday" ? null : shift.room_id,
            work_date: targetDate,
            start_time: shift.start_time.slice(0, 5),
            end_time: shift.end_time.slice(0, 5),
            status,
            memo: shift.memo,
          });
          createdIds.push(createdShift.id);
          copiedCount += 1;
        }

        setProgress(index + 1);
      }

      setResult({ copiedCount, skippedNames, createdIds });
      setUndoCompleted(false);
    } catch (error) {
      console.error("シフトコピーエラー:", error);
      window.alert(
        error instanceof Error ? error.message : "シフトのコピーに失敗しました"
      );
    } finally {
      setIsCopying(false);
    }
  }

  async function undoCopy() {
    if (!result || result.createdIds.length === 0 || isUndoing) return;
    const confirmed = window.confirm(
      `今回コピーした${result.createdIds.length}件をすべて削除して元に戻しますか？`
    );
    if (!confirmed) return;

    try {
      setIsUndoing(true);
      await Promise.all(result.createdIds.map((id) => deleteShiftById(id)));
      setResult({ copiedCount: 0, skippedNames: [], createdIds: [] });
      setUndoCompleted(true);
    } catch (error) {
      console.error("コピー取り消しエラー:", error);
      window.alert(
        error instanceof Error ? error.message : "コピーの取り消しに失敗しました"
      );
    } finally {
      setIsUndoing(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto bg-black/50 px-4 py-8"
      onClick={isCopying || isUndoing ? undefined : onClose}
    >
      <div
        className="mx-auto max-w-md rounded-3xl bg-white p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500">入力時間を短縮</p>
            <h2 className="text-xl font-bold text-gray-900">1日分をコピー</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isCopying || isUndoing}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-lg text-gray-600 disabled:opacity-50"
            aria-label="閉じる"
          >
            ×
          </button>
        </header>

        <section className="mt-5 rounded-2xl bg-gray-50 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">コピー元</span>
            <span className="font-bold text-gray-900">{sourceDate}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-gray-500">対象シフト</span>
            <span className="font-bold text-gray-900">
              {selectedShifts.length} / {copyableShifts.length}件
            </span>
          </div>
        </section>

        <section className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-gray-700">コピーするシフト</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedShiftIds(new Set(copyableShifts.map((shift) => shift.id)));
                  setResult(null);
                  setPreview(null);
                }}
                disabled={isCopying}
                className="text-xs font-bold text-blue-700 disabled:opacity-50"
              >
                すべて選択
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedShiftIds(new Set());
                  setResult(null);
                  setPreview(null);
                }}
                disabled={isCopying}
                className="text-xs font-bold text-gray-500 disabled:opacity-50"
              >
                解除
              </button>
            </div>
          </div>
          <div className="mt-2 max-h-52 space-y-2 overflow-y-auto rounded-2xl border border-gray-200 p-2">
            {copyableShifts.map((shift) => {
              const checked = selectedShiftIds.has(shift.id);
              return (
                <label
                  key={shift.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition ${
                    checked ? "bg-blue-50" : "bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleShift(shift.id)}
                    disabled={isCopying}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-gray-900">
                      {getCastName(shift)}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {shift.start_time.slice(0, 5)}〜{shift.end_time.slice(0, 5)}
                      {shift.rooms?.name ? `・${shift.rooms.name}` : ""}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        <div className="mt-4">
          <label htmlFor="copy-target-date" className="mb-1 block text-sm font-bold text-gray-700">
            コピー先の日付
          </label>
          <input
            id="copy-target-date"
            type="date"
            value={targetDate}
            onChange={(event) => {
              setTargetDate(event.target.value);
              setResult(null);
              setPreview(null);
            }}
            disabled={isCopying}
            className="w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:border-gray-900 disabled:opacity-50"
          />
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[
              { label: "翌日", days: 1 },
              { label: "1週間後", days: 7 },
              { label: "2週間後", days: 14 },
            ].map((item) => (
              <button
                key={item.days}
                type="button"
                onClick={() => {
                  setTargetDate(addDays(sourceDate, item.days));
                  setResult(null);
                  setPreview(null);
                }}
                disabled={isCopying}
                className="rounded-xl bg-gray-100 px-2 py-2 text-xs font-bold text-gray-600 disabled:opacity-50"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {isCopying && (
          <div className="mt-4 rounded-2xl bg-blue-50 p-4">
            <div className="flex justify-between text-xs font-bold text-blue-700">
              <span>コピーしています...</span>
              <span>{progress}/{selectedShifts.length}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{
                  width: `${selectedShifts.length > 0 ? (progress / selectedShifts.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        {preview && !result && (
          <section
            className={`mt-4 rounded-2xl border p-4 ${
              preview.conflicts.length > 0
                ? "border-orange-200 bg-orange-50"
                : "border-emerald-200 bg-emerald-50"
            }`}
          >
            <p className="font-bold text-gray-900">事前確認が完了しました</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-white/70 p-2">
                <p className="text-[10px] text-gray-500">コピー可能</p>
                <p className="text-lg font-bold text-emerald-700">
                  {preview.copyableCount}件
                </p>
              </div>
              <div className="rounded-xl bg-white/70 p-2">
                <p className="text-[10px] text-gray-500">重複でスキップ</p>
                <p className="text-lg font-bold text-orange-700">
                  {preview.conflicts.length}件
                </p>
              </div>
            </div>
            {preview.conflicts.length > 0 && (
              <p className="mt-2 text-xs text-orange-700">
                対象：{preview.conflicts.join("、")}
              </p>
            )}
          </section>
        )}

        {result && (
          <section className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            {undoCompleted ? (
              <>
                <p className="font-bold text-emerald-900">コピーを取り消しました</p>
                <p className="mt-1 text-sm text-emerald-800">
                  今回作成したシフトは削除され、コピー前の状態に戻りました。
                </p>
              </>
            ) : (
              <>
                <p className="font-bold text-emerald-900">コピーが完了しました</p>
                <p className="mt-1 text-sm text-emerald-800">
                  {result.copiedCount}件を登録、{result.skippedNames.length}件をスキップしました。
                </p>
                {result.skippedNames.length > 0 && (
                  <p className="mt-2 text-xs text-orange-700">
                    重複のためスキップ：{result.skippedNames.join("、")}
                  </p>
                )}
              </>
            )}
          </section>
        )}

        {!result ? (
          preview ? (
            <button
              type="button"
              onClick={() => void copyShifts()}
              disabled={isCopying || preview.copyableCount === 0}
              className="mt-5 w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCopying ? "コピー中..." : `${preview.copyableCount}件をコピーする`}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void checkCopyPlan()}
              disabled={isChecking || selectedShifts.length === 0}
              className="mt-5 w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isChecking ? "重複を確認中..." : `${selectedShifts.length}件を事前確認する`}
            </button>
          )
        ) : (
          <div className="mt-5 space-y-2">
            {!undoCompleted && result.createdIds.length > 0 && (
              <button
                type="button"
                onClick={() => void onCopied(targetDate)}
                disabled={isUndoing}
                className="w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                コピー先の日付を表示
              </button>
            )}
            {!undoCompleted && result.createdIds.length > 0 && (
              <button
                type="button"
                onClick={() => void undoCopy()}
                disabled={isUndoing}
                className="w-full rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUndoing ? "取り消しています..." : "今回のコピーを取り消す"}
              </button>
            )}
            {undoCompleted && (
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-bold text-white"
              >
                閉じる
              </button>
            )}
          </div>
        )}

        <p className="mt-3 text-xs text-gray-500">
          コピー先でキャストまたは部屋の時間が重なるシフトは、安全のため登録せずスキップします。
        </p>
      </div>
    </div>
  );
}
