"use client";

import {
  useEffect,
  useState,
  type MouseEvent,
} from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { formatExtendedTime } from "@/lib/business-time";
import {
  checkShiftConflict,
  updateShiftById,
  type Shift,
  type ShiftStatus,
} from "@/services/shift.service";
import {
  getActiveCasts,
  type Cast,
} from "@/services/cast.service";

type EditShiftModalProps = {
  shift: Shift;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

export default function EditShiftModal({
  shift,
  onClose,
  onSaved,
}: EditShiftModalProps) {
  const [casts, setCasts] = useState<Cast[]>([]);
  const [castId, setCastId] = useState(shift.cast_id);
  const [workDate, setWorkDate] = useState(shift.work_date);
  const [startTime, setStartTime] = useState(
    shift.start_time.slice(0, 5)
  );
  const [endTime, setEndTime] = useState(
    shift.end_time.slice(0, 5)
  );
  const [status, setStatus] = useState<ShiftStatus>(
    shift.status ?? "working"
  );
  const [memo, setMemo] = useState(shift.memo || "");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function loadInitialData() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const castData = await getActiveCasts();

        if (!isCancelled) {
          setCasts(castData);
        }
      } catch (error) {
        console.error("編集画面データ取得エラー:", error);

        if (!isCancelled) {
          setErrorMessage(
            "キャストまたは部屋情報の取得に失敗しました"
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialData();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isSaving, onClose]);

  function validateFields(): boolean {
    if (!castId) {
      setErrorMessage("キャストを選択してください");
      return false;
    }

    if (!workDate) {
      setErrorMessage("日付を選択してください");
      return false;
    }

    if (!startTime || !endTime) {
      setErrorMessage(
        "出勤時間と退勤時間を入力してください"
      );
      return false;
    }

    if (startTime === endTime) {
      setErrorMessage(
        "出勤時間と退勤時間を同じにはできません"
      );
      return false;
    }

    return true;
  }

  async function saveShift() {
    if (isSaving) {
      return;
    }

    setErrorMessage("");

    if (!validateFields()) {
      return;
    }

    try {
      setIsSaving(true);

      const normalizedRoomId = null;

      if (status !== "holiday") {
        const conflict = await checkShiftConflict(
          castId,
          normalizedRoomId,
          workDate,
          startTime,
          endTime,
          shift.id
        );

        if (!conflict.ok) {
          setErrorMessage(conflict.message);
          return;
        }
      }

      await updateShiftById(shift.id, {
        cast_id: castId,
        work_date: workDate,
        room_id: normalizedRoomId,
        start_time: startTime,
        end_time: endTime,
        status,
        memo: memo.trim() || null,
      });

      await onSaved();
    } catch (error) {
      console.error("シフト保存エラー:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "シフトの保存に失敗しました"
      );
    } finally {
      setIsSaving(false);
    }
  }

  function closeFromBackdrop(
    event: MouseEvent<HTMLDivElement>
  ) {
    if (
      event.target === event.currentTarget &&
      !isSaving
    ) {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/45 px-4 py-8"
      onMouseDown={closeFromBackdrop}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-shift-title"
        className="mx-auto max-w-md rounded-3xl bg-white p-5 shadow-2xl"
      >
        <header className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500">
              シフト編集
            </p>

            <h2
              id="edit-shift-title"
              className="text-xl font-bold text-gray-900"
            >
              {shift.casts?.display_name ||
                shift.casts?.name ||
                "未設定"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="編集画面を閉じる"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-500 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ×
          </button>
        </header>

        {errorMessage && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            {errorMessage}
          </p>
        )}

        {isLoading ? (
          <div className="flex min-h-48 items-center justify-center">
            <p className="text-sm text-gray-500">
              読み込み中...
            </p>
          </div>
        ) : (
          <section className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-bold text-gray-700">
                キャスト
              </label>

              <Select
                value={castId}
                onChange={(event) =>
                  setCastId(event.target.value)
                }
                disabled={isSaving}
              >
                <option value="">キャストを選択</option>

                {casts.map((cast) => (
                  <option key={cast.id} value={cast.id}>
                    {cast.display_name || cast.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-gray-700">
                日付
              </label>

              <Input
                type="date"
                value={workDate}
                onChange={(event) =>
                  setWorkDate(event.target.value)
                }
                disabled={isSaving}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-gray-700">
                ステータス
              </label>

              <Select
                value={status}
                onChange={(event) => {
                  const nextStatus =
                    event.target.value as ShiftStatus;

                  setStatus(nextStatus);

                  if (nextStatus === "holiday") {
                  }
                }}
                disabled={isSaving}
              >
                <option value="working">通常出勤</option>
                <option value="tentative">仮シフト</option>
                <option value="holiday">休み</option>
              </Select>
            </div>



            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">
                  出勤時間
                </label>

                <Input
                  type="time"
                  value={startTime}
                  onChange={(event) =>
                    setStartTime(event.target.value)
                  }
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-bold text-gray-700">
                  退勤時間
                </label>

                <Input
                  type="time"
                  value={endTime}
                  onChange={(event) =>
                    setEndTime(event.target.value)
                  }
                  disabled={isSaving}
                />
              </div>
            </div>

            {endTime < startTime &&
              startTime !== endTime && (
                <p className="rounded-xl bg-blue-50 p-3 text-xs text-blue-700">
                  翌日の退勤時刻として登録します。
                  店舗時間表記：
                  {formatExtendedTime(
                    startTime,
                    endTime
                  )}
                </p>
              )}

            <div>
              <label className="mb-1 block text-sm font-bold text-gray-700">
                メモ
              </label>

              <textarea
                value={memo}
                onChange={(event) =>
                  setMemo(event.target.value)
                }
                disabled={isSaving}
                className="min-h-28 w-full resize-none rounded-xl border border-gray-300 bg-white p-4 text-sm outline-none transition focus:border-black disabled:cursor-not-allowed disabled:bg-gray-100"
                placeholder="体験入店、遅出、時間変更予定など"
                maxLength={500}
              />

              <p className="mt-1 text-right text-xs text-gray-400">
                {memo.length} / 500
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <Button
                onClick={saveShift}
                disabled={isSaving}
                className={
                  isSaving
                    ? "cursor-not-allowed opacity-50"
                    : ""
                }
              >
                {isSaving
                  ? "保存中..."
                  : "変更を保存する"}
              </Button>

              <Button
                onClick={onClose}
                variant="secondary"
                disabled={isSaving}
              >
                キャンセル
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
