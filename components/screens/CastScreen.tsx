"use client";

import { useEffect, useMemo, useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
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
    const castName = name.trim();

    if (!castName) {
      alert("キャスト名を入力してください");
      return;
    }

    try {
      setIsAdding(true);

      await createCast(castName);

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
    const ok = confirm(
      `${cast.display_name || cast.name}を退店にしますか？`
    );

    if (!ok) return;

    try {
      await deactivateCast(cast.id);
      await loadCasts();
    } catch (error) {
      console.error(error);
      alert("退店処理に失敗しました");
    }
  }

  const filteredCasts = useMemo(() => {
    const keyword = searchText.toLowerCase();

    return casts.filter((cast) => {
      return (
        cast.name.toLowerCase().includes(keyword) ||
        (cast.display_name ?? "")
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [casts, searchText]);

  return (
    <div className="p-4">
      <div className="mb-5">
        <p className="text-sm text-gray-500">
          キャスト管理
        </p>

        <h1 className="text-3xl font-bold">
          キャスト一覧
        </h1>
      </div>

      {/* 新規追加 */}
      <div className="mb-4 flex gap-2">
        <div className="flex-1">
          <Input
            value={name}
            placeholder="キャスト名"
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <button
          onClick={addCast}
          disabled={isAdding}
          className="rounded-xl bg-black px-6 text-white font-bold hover:bg-gray-800 disabled:opacity-50"
        >
          {isAdding ? "追加中" : "追加"}
        </button>
      </div>

      {/* 検索 */}
      <div className="mb-5">
        <Input
          value={searchText}
          placeholder="キャスト名で検索"
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      {/* 一覧 */}
      <div className="space-y-3">
        {filteredCasts.map((cast) => (
          <div
            key={cast.id}
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold">
                  {cast.display_name || cast.name}
                </div>

                <div className="text-sm text-gray-500">
                  在籍中
                </div>
              </div>

              <button
                onClick={() =>
                  handleDeactivateCast(cast)
                }
                className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-500 hover:bg-red-100"
              >
                退店
              </button>
            </div>
          </div>
        ))}

        {filteredCasts.length === 0 && (
          <div className="rounded-xl bg-gray-50 p-4 text-center text-gray-500">
            キャストが登録されていません
          </div>
        )}
      </div>
    </div>
  );
}