"use client";

import { useEffect, useState } from "react";
import ShiftCard from "@/components/cards/ShiftCard";
import { supabase } from "@/lib/supabase";

type Cast = {
  id: string;
  name: string;
  display_name: string | null;
  status: string;
};

export default function CastScreen() {
  const [casts, setCasts] = useState<Cast[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    loadCasts();
  }, []);

  async function loadCasts() {
    const { data, error } = await supabase
      .from("casts")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setCasts(data || []);
  }

  async function addCast() {
    if (!name.trim()) return;

    const { error } = await supabase.from("casts").insert({
      name: name.trim(),
      display_name: name.trim(),
      status: "active",
    });

    if (error) {
      console.error(error);
      alert("登録に失敗しました");
      return;
    }

    setName("");
    loadCasts();
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
          <p className="text-sm text-gray-500">キャストがまだ登録されていません。</p>
        )}
      </section>
    </>
  );
}