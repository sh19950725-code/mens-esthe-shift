"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  createCast,
  deactivateCast,
  getActiveCasts,
  type Cast,
} from "@/services/cast.service";

export default function CastScreen() {
  const [casts, setCasts] = useState<Cast[]>([]);
  const [name, setName] = useState("");
  const [searchText, setSearchText] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadCasts();
  }, []);

  async function loadCasts() {
    try {
      const data = await getActiveCasts();
      setCasts(data);
    } catch (error) {
      console.error(error);
      alert("キャスト取得に失敗しました");
    }
  }

  async function addCast() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      alert("キャスト名を入力してください");
      return;
    }

    try {
      setIsAdding(true);

      await createCast(trimmedName);

      setName("");
      await loadCasts();
    } catch (error) {
      console.error(error);
      alert("キャスト登録に失敗しました");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleDeactivateCast(cast: Cast) {
    const displayName = cast.display_name || cast.name;

    const ok = confirm(
      `${displayName}を在籍一覧から外しますか？\n過去のシフトは削除されません。`
    );

    if (!ok) {
      return;
    }

    try {
      await deactivateCast(cast.id);
      await loadCasts();
    } catch (error) {
      console.error(error);
      alert("退店処理に失敗しました");
    }
  }

  const filteredCasts = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) {
      return casts;
    }

    return casts.filter((cast) => {
      const nameText = cast.name.toLowerCase();
      const displayNameText = (cast.display_name || "").toLowerCase();

      return (
        nameText.includes(keyword) ||
        displayNameText.includes(keyword)
      );
    });
  }, [casts, searchText]);

  return (
    <>
      <header className="mb-5">
        <p className="text-sm text-gray-500">キャスト管理</p>
        <h1 className="text-2xl font-bold">キャスト一覧</h1>
      </header>

      <section className="mb-5 space-y-3">
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="新しいキャスト名"
          />

          <Button
            onClick={addCast}
            disabled={isAdding}
            className={`w-auto shrink-0 px-5 ${
              isAdding ? "cursor-not-allowed opacity-50" : ""
            }`}
          >
            {isAdding ? "追加中" : "追加"}
          </Button>
        </div>

        <Input
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="キャスト名で検索"
        />
      </section>

      <section className="space-y-3">
        {filteredCasts.map((cast) => (
          <div
            key={cast.id}
            className="rounded-2xl border bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold">
                  {cast.display_name || cast.name}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  在籍中
                </p>

                {cast.memo && (
                  <p className="mt-2 rounded-lg bg-gray-100 p-2 text-xs text-gray-600">
                    {cast.memo}
                  </p>
                )}
              </div>

              <button
                onClick={() => handleDeactivateCast(cast)}
                className="shrink-0 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-500"
              >
                退店
              </button>
            </div>
          </div>
        ))}

        {casts.length === 0 && (
          <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
            キャストがまだ登録されていません。
          </p>
        )}

        {casts.length > 0 && filteredCasts.length === 0 && (
          <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
            検索条件に一致するキャストはいません。
          </p>
        )}
      </section>
    </>
  );
}