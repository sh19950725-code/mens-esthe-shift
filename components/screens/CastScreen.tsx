"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import EditCastModal from "@/components/ui/EditCastModal";
import CastDetailModal from "@/components/ui/CastDetailModal";
import CastCard from "@/components/casts/CastCard";
import {
  activateCast,
  createCast,
  deactivateCast,
  getActiveCasts,
  getInactiveCasts,
  type Cast,
} from "@/services/cast.service";

type CastView = "active" | "inactive";

export default function CastScreen() {
  const [activeCasts, setActiveCasts] = useState<Cast[]>([]);
  const [inactiveCasts, setInactiveCasts] = useState<Cast[]>([]);

  const [name, setName] = useState("");
  const [searchText, setSearchText] = useState("");
  const [currentView, setCurrentView] =
    useState<CastView>("active");

  const [editingCast, setEditingCast] =
    useState<Cast | null>(null);

  const [selectedCast, setSelectedCast] =
    useState<Cast | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCasts();
  }, []);

  async function loadCasts() {
    try {
      setIsLoading(true);

      const [activeData, inactiveData] = await Promise.all([
        getActiveCasts(),
        getInactiveCasts(),
      ]);

      setActiveCasts(activeData);
      setInactiveCasts(inactiveData);
    } catch (error) {
      console.error("キャスト取得エラー:", error);
      alert("キャスト情報の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }

  async function addCast() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      alert("キャスト名を入力してください");
      return;
    }

    const normalizedInput = trimmedName.toLowerCase();
    const allCasts = [...activeCasts, ...inactiveCasts];

    const duplicateCast = allCasts.some((cast) => {
      const castName = cast.name.trim().toLowerCase();
      const displayName = (cast.display_name || "")
        .trim()
        .toLowerCase();

      return (
        castName === normalizedInput ||
        displayName === normalizedInput
      );
    });

    if (duplicateCast) {
      alert(
        "同じ名前のキャストがすでに登録されています。退店済み一覧も確認してください。"
      );
      return;
    }

    try {
      setIsAdding(true);

      await createCast(trimmedName);

      setName("");
      setCurrentView("active");
      await loadCasts();
    } catch (error) {
      console.error("キャスト登録エラー:", error);
      alert("キャスト登録に失敗しました");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleDeactivateCast(cast: Cast) {
    const displayName = cast.display_name || cast.name;

    const ok = confirm(
      `${displayName}を退店扱いにしますか？\n過去のシフト情報は削除されません。`
    );

    if (!ok) {
      return;
    }

    try {
      await deactivateCast(cast.id);

      if (selectedCast?.id === cast.id) {
        setSelectedCast(null);
      }

      if (editingCast?.id === cast.id) {
        setEditingCast(null);
      }

      await loadCasts();
    } catch (error) {
      console.error("退店処理エラー:", error);
      alert("退店処理に失敗しました");
    }
  }

  async function handleActivateCast(cast: Cast) {
    const displayName = cast.display_name || cast.name;

    const ok = confirm(
      `${displayName}を在籍中へ戻しますか？`
    );

    if (!ok) {
      return;
    }

    try {
      await activateCast(cast.id);

      if (selectedCast?.id === cast.id) {
        setSelectedCast(null);
      }

      await loadCasts();
    } catch (error) {
      console.error("再表示エラー:", error);
      alert("再表示に失敗しました");
    }
  }

  async function handleCastSaved() {
    await loadCasts();
    setEditingCast(null);
  }

  const casts =
    currentView === "active"
      ? activeCasts
      : inactiveCasts;

  const filteredCasts = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) {
      return casts;
    }

    return casts.filter((cast) => {
      const nameText = cast.name.toLowerCase();
      const displayNameText = (
        cast.display_name || ""
      ).toLowerCase();

      return (
        nameText.includes(keyword) ||
        displayNameText.includes(keyword)
      );
    });
  }, [casts, searchText]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-gray-500">
          読み込み中...
        </p>
      </div>
    );
  }

  return (
    <>
      <header className="mb-5">
        <p className="text-sm text-gray-500">
          キャスト管理
        </p>

        <h1 className="text-2xl font-bold">
          キャスト一覧
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          在籍中 {activeCasts.length}名・退店済み{" "}
          {inactiveCasts.length}名
        </p>
      </header>

      <section className="mb-5 space-y-3">
        <div className="flex items-stretch gap-2">
          <div className="min-w-0 flex-1">
            <Input
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="新しいキャスト名"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  addCast();
                }
              }}
            />
          </div>

          <Button
            onClick={addCast}
            disabled={isAdding}
            className={`!w-auto shrink-0 px-5 ${
              isAdding
                ? "cursor-not-allowed opacity-50"
                : ""
            }`}
          >
            {isAdding ? "追加中" : "追加"}
          </Button>
        </div>

        <Input
          value={searchText}
          onChange={(event) =>
            setSearchText(event.target.value)
          }
          placeholder="キャスト名で検索"
        />
      </section>

      <section className="mb-5 grid grid-cols-2 rounded-xl bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setCurrentView("active")}
          className={`rounded-lg px-3 py-2 text-sm font-bold ${
            currentView === "active"
              ? "bg-white text-black shadow-sm"
              : "text-gray-500"
          }`}
        >
          在籍中（{activeCasts.length}）
        </button>

        <button
          type="button"
          onClick={() => setCurrentView("inactive")}
          className={`rounded-lg px-3 py-2 text-sm font-bold ${
            currentView === "inactive"
              ? "bg-white text-black shadow-sm"
              : "text-gray-500"
          }`}
        >
          退店済み（{inactiveCasts.length}）
        </button>
      </section>

      <section className="space-y-3">
        {filteredCasts.map((cast) => (
          <CastCard
            key={cast.id}
            cast={cast}
            isActive={currentView === "active"}
            onOpenDetail={() => setSelectedCast(cast)}
            onEdit={() => setEditingCast(cast)}
            onDeactivate={() =>
              handleDeactivateCast(cast)
            }
            onActivate={() =>
              handleActivateCast(cast)
            }
          />
        ))}

        {casts.length === 0 && (
          <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
            {currentView === "active"
              ? "在籍中のキャストはいません。"
              : "退店済みのキャストはいません。"}
          </p>
        )}

        {casts.length > 0 &&
          filteredCasts.length === 0 && (
            <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
              検索条件に一致するキャストはいません。
            </p>
          )}
      </section>

      {selectedCast && (
        <CastDetailModal
          cast={selectedCast}
          onClose={() => setSelectedCast(null)}
          onEdit={() => {
            setEditingCast(selectedCast);
            setSelectedCast(null);
          }}
        />
      )}

      {editingCast && (
        <EditCastModal
          cast={editingCast}
          onClose={() => setEditingCast(null)}
          onSaved={handleCastSaved}
        />
      )}
    </>
  );
}