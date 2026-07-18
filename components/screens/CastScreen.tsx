"use client";

import { useEffect, useMemo, useState } from "react";
import CastFilters from "@/components/casts/CastFilters";
import CastHeader from "@/components/casts/CastHeader";
import CastList from "@/components/casts/CastList";
import CastTabs, {
  type CastView,
} from "@/components/casts/CastTabs";
import CastDetailModal from "@/components/ui/CastDetailModal";
import EditCastModal from "@/components/ui/EditCastModal";
import {
  activateCast,
  createCast,
  deactivateCast,
  getActiveCasts,
  getInactiveCasts,
  type Cast,
} from "@/services/cast.service";

export default function CastScreen() {
  const [activeCasts, setActiveCasts] = useState<Cast[]>(
    []
  );

  const [inactiveCasts, setInactiveCasts] = useState<
    Cast[]
  >([]);

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
    void loadCasts();
  }, []);

  async function loadCasts() {
    try {
      setIsLoading(true);

      const [activeData, inactiveData] =
        await Promise.all([
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

    if (isAdding) {
      return;
    }

    const normalizedInput = trimmedName.toLowerCase();
    const allCasts = [...activeCasts, ...inactiveCasts];

    const duplicateCast = allCasts.some((cast) => {
      const castName = cast.name
        .trim()
        .toLowerCase();

      const displayName = (
        cast.display_name || ""
      )
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
    const displayName =
      cast.display_name || cast.name;

    const confirmed = window.confirm(
      `${displayName}を退店扱いにしますか？\n過去のシフト情報は削除されません。`
    );

    if (!confirmed) {
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
    const displayName =
      cast.display_name || cast.name;

    const confirmed = window.confirm(
      `${displayName}を在籍中へ戻しますか？`
    );

    if (!confirmed) {
      return;
    }

    try {
      await activateCast(cast.id);

      if (selectedCast?.id === cast.id) {
        setSelectedCast(null);
      }

      if (editingCast?.id === cast.id) {
        setEditingCast(null);
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
    const keyword = searchText
      .trim()
      .toLowerCase();

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
      <CastHeader
        activeCount={activeCasts.length}
        inactiveCount={inactiveCasts.length}
      />

      <CastFilters
        name={name}
        searchText={searchText}
        isAdding={isAdding}
        onNameChange={setName}
        onSearchTextChange={setSearchText}
        onAdd={addCast}
      />

      <CastTabs
        currentView={currentView}
        activeCount={activeCasts.length}
        inactiveCount={inactiveCasts.length}
        onChange={(view) => {
          setCurrentView(view);
          setSearchText("");
        }}
      />

      <CastList
        casts={filteredCasts}
        totalCount={casts.length}
        isActive={currentView === "active"}
        searchText={searchText}
        onOpenDetail={setSelectedCast}
        onEdit={setEditingCast}
        onDeactivate={handleDeactivateCast}
        onActivate={handleActivateCast}
      />

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