/* eslint-disable react-hooks/immutability */
"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { formatExtendedTime } from "@/lib/business-time";
import {
  getActiveCasts,
  type Cast,
} from "@/services/cast.service";
import {
  checkShiftConflict,
  createShift,
  createShiftsBulk,
  type ShiftStatus,
} from "@/services/shift.service";

type RegisterMode = "single" | "bulk";
const KEEP_SELECTION_KEY =
  "register-keep-cast-room-selection-v1";
const DRAFT_KEY = "shift-register-draft-v1";

const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayDate(): string {
  return formatLocalDate(new Date());
}

function getOneWeekLaterDate(dateText: string): string {
  const [year, month, day] = dateText.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + 7);
  return formatLocalDate(date);
}

function normalizeDirectInput(value: string): string {
  return value
    .replace(/[０-９]/g, (character) =>
      String.fromCharCode(character.charCodeAt(0) - 0xfee0)
    )
    .replace(/[：]/g, ":")
    .replace(/[／]/g, "/")
    .trim();
}

function normalizeTimeInput(value: string): string {
  const normalized = normalizeDirectInput(value);
  const digitsOnly = normalized.replace(/\D/g, "");

  if (/^\d{3,4}$/.test(digitsOnly)) {
    const minuteText = digitsOnly.slice(-2);
    const hourText = digitsOnly.slice(0, -2);
    return `${hourText.padStart(2, "0")}:${minuteText}`;
  }

  const match = normalized.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return normalized;

  return `${match[1].padStart(2, "0")}:${match[2].padStart(
    2,
    "0"
  )}`;
}

function isValidDateInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function isValidTimeInput(value: string): boolean {
  const match = value.match(/^(\d{1,2}):([0-5]\d)$/);
  if (!match) return false;

  const hour = Number(match[1]);
  return hour >= 0 && hour <= 47;
}

function normalizeTimeForStorage(value: string): string {
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText) % 24;
  return `${String(hour).padStart(2, "0")}:${minuteText}`;
}

export default function RegisterScreen() {
  const [mode, setMode] = useState<RegisterMode>("single");
  const [casts, setCasts] = useState<Cast[]>([]);
  const [castId, setCastId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [workDate, setWorkDate] = useState(getTodayDate());
  const [startDate, setStartDate] = useState(getTodayDate());
  const [endDate, setEndDate] = useState(
    () => getOneWeekLaterDate(getTodayDate())
  );
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [status, setStatus] =
    useState<ShiftStatus>("working");
  const [memo, setMemo] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keepSelection, setKeepSelection] = useState(false);
  const [preferenceLoaded, setPreferenceLoaded] =
    useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    setKeepSelection(
      window.localStorage.getItem(KEEP_SELECTION_KEY) ===
        "true"
    );
    setPreferenceLoaded(true);

    try {
      const savedDraft = window.localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft) as {
          mode?: RegisterMode;
          castId?: string;
          roomId?: string;
          workDate?: string;
          startDate?: string;
          endDate?: string;
          startTime?: string;
          endTime?: string;
          status?: ShiftStatus;
          memo?: string;
        };

        if (draft.mode === "single" || draft.mode === "bulk") {
          setMode(draft.mode);
        }
        if (typeof draft.castId === "string") {
          setCastId(draft.castId);
        }
        if (typeof draft.roomId === "string") {
          setRoomId(draft.roomId);
        }
        if (typeof draft.workDate === "string") {
          setWorkDate(draft.workDate);
        }
        if (typeof draft.startDate === "string") {
          setStartDate(draft.startDate);
        }
        if (typeof draft.endDate === "string") {
          setEndDate(draft.endDate);
        }
        if (typeof draft.startTime === "string") {
          setStartTime(draft.startTime);
        }
        if (typeof draft.endTime === "string") {
          setEndTime(draft.endTime);
        }
        if (
          draft.status === "working" ||
          draft.status === "tentative" ||
          draft.status === "holiday"
        ) {
          setStatus(draft.status);
        }
        if (typeof draft.memo === "string") {
          setMemo(draft.memo);
        }
        setDraftRestored(true);
      }
    } catch (error) {
      console.error("下書き復元エラー:", error);
      window.localStorage.removeItem(DRAFT_KEY);
    } finally {
      setDraftLoaded(true);
    }

    void loadInitialData();
  }, []);

  useEffect(() => {
    if (!preferenceLoaded) return;
    window.localStorage.setItem(
      KEEP_SELECTION_KEY,
      String(keepSelection)
    );
  }, [keepSelection, preferenceLoaded]);

  async function loadInitialData() {
    try {
      setIsLoading(true);
      const castData = await getActiveCasts();
      setCasts(castData);
    } catch (error) {
      console.error("登録画面データ取得エラー:", error);
      alert("キャストまたは部屋情報の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }

  function resetCommonFields() {
    if (!keepSelection) {
      setCastId("");
      setRoomId("");
    }
    setStartTime("");
    setEndTime("");
    setStatus("working");
    setMemo("");
  }

  function resetSingleForm() {
    resetCommonFields();
    setWorkDate(getTodayDate());
  }

  function resetBulkForm() {
    resetCommonFields();
    const today = getTodayDate();
    setStartDate(today);
    setEndDate(getOneWeekLaterDate(today));
  }

  function validateCommonFields(): boolean {
    if (!castId) {
      alert("キャストを選択してください");
      return false;
    }
    if (!startTime || !endTime) {
      alert("出勤時間と退勤時間を入力してください");
      return false;
    }
    if (
      !isValidTimeInput(startTime) ||
      !isValidTimeInput(endTime)
    ) {
      alert(
        "時間は「16:00」または「28:00」の形式で入力してください"
      );
      return false;
    }
    if (startTime === endTime) {
      alert("出勤時間と退勤時間を同じにはできません");
      return false;
    }
    return true;
  }

  async function addSingleShift() {
    if (!validateCommonFields()) return;
    if (!workDate) {
      alert("日付を入力してください");
      return;
    }
    if (!isValidDateInput(workDate)) {
      alert("日付は「YYYY-MM-DD」の形式で入力してください");
      return;
    }

    try {
      setIsSubmitting(true);
      const storedStartTime =
        normalizeTimeForStorage(startTime);
      const storedEndTime = normalizeTimeForStorage(endTime);

      if (status !== "holiday") {
        const result = await checkShiftConflict(
          castId,
          null,
          workDate,
          storedStartTime,
          storedEndTime
        );
        if (!result.ok) {
          alert(result.message);
          return;
        }
      }

      await createShift({
        cast_id: castId,
        room_id:
          null,
        work_date: workDate,
        start_time: storedStartTime,
        end_time: storedEndTime,
        status,
        memo: memo.trim() || null,
      });

      alert("シフトを登録しました");
      setDraftRestored(false);
      resetSingleForm();
    } catch (error) {
      console.error("シフト登録エラー:", error);
      alert("シフト登録に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function addBulkShifts() {
    if (!validateCommonFields()) return;
    if (!startDate || !endDate) {
      alert("開始日と終了日を入力してください");
      return;
    }
    if (
      !isValidDateInput(startDate) ||
      !isValidDateInput(endDate)
    ) {
      alert("日付は「YYYY-MM-DD」の形式で入力してください");
      return;
    }
    if (startDate > endDate) {
      alert("終了日は開始日以降に設定してください");
      return;
    }
    try {
      setIsSubmitting(true);
      const storedStartTime =
        normalizeTimeForStorage(startTime);
      const storedEndTime = normalizeTimeForStorage(endTime);
      const result = await createShiftsBulk({
        cast_id: castId,
        room_id:
          null,
        start_date: startDate,
        end_date: endDate,
        start_time: storedStartTime,
        end_time: storedEndTime,
        status,
        memo: memo.trim() || null,
        weekdays: ALL_WEEKDAYS,
      });

      if (
        result.createdCount === 0 &&
        result.skippedDates.length > 0
      ) {
        alert(
          `すべての日付で重複したため登録されませんでした。\n\n${result.skippedDates.join(
            "\n"
          )}`
        );
        return;
      }

      let message = `${result.createdCount}件のシフトを登録しました。`;
      if (result.skippedDates.length > 0) {
        message += `\n\n重複により除外：${result.skippedDates.length}件\n${result.skippedDates.join(
          "\n"
        )}`;
      }
      alert(message);
      setDraftRestored(false);
      resetBulkForm();
    } catch (error) {
      console.error("シフト一括登録エラー:", error);
      alert(
        error instanceof Error
          ? error.message
          : "シフト一括登録に失敗しました"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitShift() {
    if (isSubmitting) return;
    if (mode === "single") {
      await addSingleShift();
    } else {
      await addBulkShifts();
    }
  }

  const hasUnsavedChanges = useMemo(() => {
    return (
      (!keepSelection &&
        (Boolean(castId) || Boolean(roomId))) ||
      status !== "working" ||
      Boolean(startTime) ||
      Boolean(endTime) ||
      Boolean(memo.trim())
    );
  }, [
    castId,
    roomId,
    status,
    startTime,
    endTime,
    memo,
    keepSelection,
  ]);

  useEffect(() => {
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasUnsavedChanges || isSubmitting) return;
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener(
      "beforeunload",
      warnBeforeUnload
    );
    return () =>
      window.removeEventListener(
        "beforeunload",
        warnBeforeUnload
      );
  }, [hasUnsavedChanges, isSubmitting]);

  useEffect(() => {
    if (!draftLoaded) return;

    if (!hasUnsavedChanges) {
      window.localStorage.removeItem(DRAFT_KEY);
      return;
    }

    const timer = window.setTimeout(() => {
      window.localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          mode,
          castId,
          roomId,
          workDate,
          startDate,
          endDate,
          startTime,
          endTime,
          status,
          memo,
        })
      );
    }, 400);

    return () => window.clearTimeout(timer);
  }, [
    draftLoaded,
    hasUnsavedChanges,
    mode,
    castId,
    roomId,
    workDate,
    startDate,
    endDate,
    startTime,
    endTime,
    status,
    memo,
  ]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("shift-form-dirty-change", {
        detail: {
          dirty: hasUnsavedChanges && !isSubmitting,
        },
      })
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent("shift-form-dirty-change", {
          detail: { dirty: false },
        })
      );
    };
  }, [hasUnsavedChanges, isSubmitting]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <>
      <header className="mb-5">
        <p className="text-sm text-gray-500">シフト追加</p>
        <h1 className="text-2xl font-bold">シフト登録</h1>
        <p className="mt-1 text-sm text-gray-500">
          日付と時間を直接入力して登録できます
        </p>
      </header>

      {hasUnsavedChanges && !isSubmitting && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-xs font-bold text-yellow-700">
          <span className="h-2 w-2 rounded-full bg-yellow-500" />
          入力中の未保存データがあります
        </div>
      )}

      {draftRestored && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
          <div>
            <p className="text-sm font-bold text-blue-800">
              前回の入力内容を復元しました
            </p>
            <p className="mt-1 text-xs text-blue-600">
              不要な場合は下書きを破棄できます
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              window.localStorage.removeItem(DRAFT_KEY);
              setDraftRestored(false);
              if (mode === "single") {
                resetSingleForm();
              } else {
                resetBulkForm();
              }
            }}
            className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-bold text-blue-700"
          >
            破棄
          </button>
        </div>
      )}

      <section className="mb-5 grid grid-cols-2 rounded-2xl bg-gray-100 p-1">
        {(["single", "bulk"] as RegisterMode[]).map(
          (registerMode) => (
            <button
              key={registerMode}
              type="button"
              onClick={() => setMode(registerMode)}
              className={`rounded-xl px-4 py-3 text-sm font-bold ${
                mode === registerMode
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              {registerMode === "single"
                ? "1件登録"
                : "一括登録"}
            </button>
          )
        )}
      </section>

      <section className="space-y-4">
        {mode === "single" ? (
          <Field label="日付">
            <Input
              value={workDate}
              onChange={(event) =>
                setWorkDate(normalizeDirectInput(event.target.value))
              }
              type="text"
              inputMode="numeric"
              placeholder="例：2026-07-24"
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-gray-500">
              YYYY-MM-DD形式で入力
            </p>
          </Field>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="開始日">
                <Input
                  value={startDate}
                  onChange={(event) => {
                    const nextStartDate = normalizeDirectInput(
                      event.target.value
                    );
                    setStartDate(nextStartDate);
                    if (isValidDateInput(nextStartDate)) {
                      setEndDate(
                        getOneWeekLaterDate(nextStartDate)
                      );
                    }
                  }}
                  type="text"
                  inputMode="numeric"
                  placeholder="YYYY-MM-DD"
                  autoComplete="off"
                />
              </Field>
              <Field label="終了日">
                <Input
                  value={endDate}
                  onChange={(event) =>
                    setEndDate(
                      normalizeDirectInput(event.target.value)
                    )
                  }
                  type="text"
                  inputMode="numeric"
                  placeholder="YYYY-MM-DD"
                  autoComplete="off"
                />
              </Field>
            </div>
          </>
        )}

        <Field label="キャスト">
          <Select
            value={castId}
            onChange={(event) =>
              setCastId(event.target.value)
            }
          >
            <option value="">キャストを選択</option>
            {casts.map((cast) => (
              <option key={cast.id} value={cast.id}>
                {cast.display_name || cast.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="ステータス">
          <Select
            value={status}
            onChange={(event) => {
              const nextStatus =
                event.target.value as ShiftStatus;
              setStatus(nextStatus);
              if (nextStatus === "holiday") setRoomId("");
            }}
          >
            <option value="working">通常出勤</option>
            <option value="tentative">仮シフト</option>
            <option value="holiday">休み</option>
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="出勤時間">
            <Input
              value={startTime}
              onChange={(event) =>
                setStartTime(event.target.value)
              }
              onBlur={() =>
                setStartTime((current) =>
                  normalizeTimeInput(current)
                )
              }
              type="text"
              inputMode="numeric"
              placeholder="例：16:00"
              autoComplete="off"
            />
          </Field>
          <Field label="退勤時間">
            <Input
              value={endTime}
              onChange={(event) =>
                setEndTime(event.target.value)
              }
              onBlur={() =>
                setEndTime((current) =>
                  normalizeTimeInput(current)
                )
              }
              type="text"
              inputMode="numeric"
              placeholder="例：28:00"
              autoComplete="off"
            />
          </Field>

          {isValidTimeInput(startTime) &&
            isValidTimeInput(endTime) &&
            (Number(endTime.split(":")[0]) >= 24 ||
              endTime < startTime) && (
              <div className="col-span-2 rounded-xl border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm font-bold text-blue-800">
                  翌日の退勤として登録します
                </p>
                <p className="mt-1 text-xs text-blue-700">
                  店舗時間表記：
                  {formatExtendedTime(
                    startTime,
                    endTime
                  )}
                </p>
              </div>
            )}
        </div>

        <Field label="備考">
          <textarea
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            className="min-h-28 w-full resize-none rounded-xl border border-gray-300 bg-white p-4 text-sm outline-none focus:border-black"
            placeholder="新人、遅出、時間変更予定など"
            maxLength={500}
          />
          <p className="mt-1 text-right text-xs text-gray-400">
            {memo.length} / 500
          </p>
        </Field>

        {mode === "bulk" && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
            重複する日付は自動的に登録対象から除外されます。
          </div>
        )}

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
          <input
            type="checkbox"
            checked={keepSelection}
            onChange={(event) =>
              setKeepSelection(event.target.checked)
            }
            disabled={isSubmitting}
            className="h-5 w-5 rounded border-gray-300"
          />
          <span>
            <span className="block text-sm font-bold text-gray-800">
              登録後もキャストを保持
            </span>
            <span className="mt-0.5 block text-xs text-gray-500">
              同じキャストのシフトを続けて登録するときに便利です
            </span>
          </span>
        </label>

        <Button
          onClick={submitShift}
          disabled={isSubmitting || casts.length === 0}
          className={
            isSubmitting || casts.length === 0
              ? "cursor-not-allowed opacity-50"
              : ""
          }
        >
          {isSubmitting
            ? "登録中..."
            : mode === "single"
              ? "シフトを登録する"
              : "シフトを一括登録する"}
        </Button>
      </section>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-bold text-gray-700">
        {label}
      </label>
      {children}
    </div>
  );
}

