"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  checkCastNameConflict,
  updateCastById,
  type Cast,
} from "@/services/cast.service";

type EditCastModalProps = {
  cast: Cast;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

export default function EditCastModal({
  cast,
  onClose,
  onSaved,
}: EditCastModalProps) {
  const [name, setName] = useState(cast.name);
  const [castType, setCastType] = useState<
    "enrolled" | "scout"
  >(
    cast.cast_type === "scout"
      ? "scout"
      : "enrolled"
  );
  const [scoutName, setScoutName] = useState(
    cast.scout_name || ""
  );
  const [memo, setMemo] = useState(cast.memo || "");
  const [isSaving, setIsSaving] = useState(false);

  async function saveCast() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      alert("キャスト名を入力してください");
      return;
    }

    try {
      setIsSaving(true);

      const hasNameConflict =
        await checkCastNameConflict(
          trimmedName,
          cast.id
        );

      if (hasNameConflict) {
        alert(
          "同じ名前のキャストがすでに登録されています"
        );
        return;
      }

      await updateCastById(cast.id, {
        name: trimmedName,
        cast_type: castType,
        scout_name:
          castType === "scout"
            ? scoutName.trim() || null
            : null,
        memo: memo.trim() || null,
      });

      await onSaved();
      onClose();
    } catch (error) {
      console.error(error);
      alert("キャスト情報の保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <header className="mb-6">
          <p className="text-sm text-gray-500">
            キャスト編集
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            {cast.name}
          </h2>
        </header>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">
              管理名
            </label>

            <Input
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="管理用の名前"
            />
          </div>

          <fieldset className="rounded-2xl border border-gray-200 p-4">
            <legend className="px-1 text-sm font-bold text-gray-700">
              登録区分
            </legend>

            <div className="space-y-3">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={castType === "enrolled"}
                  onChange={() =>
                    setCastType("enrolled")
                  }
                  disabled={isSaving}
                  className="h-5 w-5 rounded"
                />
                <span className="font-bold text-gray-800">
                  在籍
                </span>
              </label>

              <div className="flex items-center gap-3">
                <label className="flex shrink-0 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={castType === "scout"}
                    onChange={() =>
                      setCastType("scout")
                    }
                    disabled={isSaving}
                    className="h-5 w-5 rounded"
                  />
                  <span className="font-bold text-gray-800">
                    スカウト
                  </span>
                </label>

                <input
                  type="text"
                  value={scoutName}
                  onChange={(event) =>
                    setScoutName(event.target.value)
                  }
                  disabled={
                    castType !== "scout" ||
                    isSaving
                  }
                  placeholder="スカウト名"
                  maxLength={100}
                  className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-black disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>
            </div>
          </fieldset>

          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">
              メモ
            </label>

            <textarea
              value={memo}
              onChange={(e) =>
                setMemo(e.target.value)
              }
              placeholder="管理メモ"
              className="min-h-28 w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-black"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            onClick={saveCast}
            disabled={isSaving}
            className="flex-1"
          >
            {isSaving
              ? "保存中..."
              : "保存"}
          </Button>

          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1"
          >
            キャンセル
          </Button>
        </div>
      </div>
    </div>
  );
}
