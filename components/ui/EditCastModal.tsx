"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
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

      await updateCastById(cast.id, {
        name: trimmedName,
        display_name: displayName.trim() || null,
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 px-4 py-8">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-5 shadow-xl">
        <header className="mb-5">
          <p className="text-sm text-gray-500">
            キャスト編集
          </p>

          <h2 className="text-xl font-bold">
            {cast.display_name || cast.name}
          </h2>
        </header>

        <section className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">
              管理名
            </label>

            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="管理用の名前"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">
              表示名
            </label>

            <Input
              value={displayName}
              onChange={(event) =>
                setDisplayName(event.target.value)
              }
              placeholder="画面に表示する名前"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-gray-700">
              メモ
            </label>

            <textarea
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              className="min-h-28 w-full rounded-xl border p-4"
              placeholder="管理メモ"
            />
          </div>

          <Button
            onClick={saveCast}
            disabled={isSaving}
            className={
              isSaving
                ? "cursor-not-allowed opacity-50"
                : ""
            }
          >
            {isSaving ? "保存中..." : "保存する"}
          </Button>

          <Button
            onClick={onClose}
            variant="secondary"
            disabled={isSaving}
          >
            キャンセル
          </Button>
        </section>
      </div>
    </div>
  );
}