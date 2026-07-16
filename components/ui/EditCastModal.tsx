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
  const [displayName, setDisplayName] = useState(
    cast.display_name || ""
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
        display_name:
          displayName.trim() || null,
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
            {cast.display_name || cast.name}
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

          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">
              表示名
            </label>

            <Input
              value={displayName}
              onChange={(e) =>
                setDisplayName(e.target.value)
              }
              placeholder="表示用の名前"
            />
          </div>

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