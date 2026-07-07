"use client";

import { useEffect, useState } from "react";
import ShiftCard from "@/components/cards/ShiftCard";
import {
  createCast,
  getActiveCasts,
  type Cast,
} from "@/services/cast.service";

export default function CastScreen() {
  const [casts, setCasts] = useState<Cast[]>([]);
  const [name, setName] = useState("");

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
    if (!name.trim()) return;

    try {
      await createCast(name.trim());
      setName("");
      await loadCasts();
    } catch (error) {
      console.error(error);
      alert("キャスト登録に失敗しました");
    }
  }

  return (
    <>
      <header className="mb-5">
        <p className="text-sm text-gray-500">キャスト管理</p>
        <h1 className="text-2xl font-bold">キャスト一覧</h1>
      </header>

      <section className="mb-5 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-xl border p-4"
          placeholder="キャスト名"
        />

        <button
          onClick={addCast}
          className="rounded-xl bg-black px-5 font-bold text-white"
        >
          追加
        </button>
      </section>

      <section className="space-y-3">
        {casts.map((cast) => (
          <ShiftCard
            key={cast.id}
            name={cast.display_name || cast.name}
            time={cast.status === "active" ? "在籍中" : cast.status}
          />
        ))}

        {casts.length === 0 && (
          <p className="text-sm text-gray-500">
            キャストがまだ登録されていません。
          </p>
        )}
      </section>
    </>
  );
}