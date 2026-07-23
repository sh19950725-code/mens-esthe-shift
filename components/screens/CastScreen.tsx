"use client";

import { useEffect, useMemo, useState } from "react";
import CastFilters, {
  type CastSortOrder,
} from "@/components/casts/CastFilters";
import CastHeader from "@/components/casts/CastHeader";
import CastList from "@/components/casts/CastList";
import CastTabs, {
  type CastView,
} from "@/components/casts/CastTabs";
import CastDetailModal from "@/components/ui/CastDetailModal";
import EditCastModal from "@/components/ui/EditCastModal";
import {
  activateCast,
  deactivateCast,
  getActiveCasts,
  getCastShiftCount,
  getInactiveCasts,
  permanentlyDeleteInactiveCast,
  type Cast,
} from "@/services/cast.service";

export default function CastScreen({
  canEdit = false,
}: {
  canEdit?: boolean;
}) {
  const [activeCasts, setActiveCasts] = useState<Cast[]>(
    []
  );

  const [inactiveCasts, setInactiveCasts] = useState<
    Cast[]
  >([]);

  const [name, setName] = useState("");
  const [searchText, setSearchText] = useState("");
  const [sortOrder, setSortOrder] =
    useState<CastSortOrder>("registered");

  const [currentView, setCurrentView] =
    useState<CastView>("active");

  const [editingCast, setEditingCast] =
    useState<Cast | null>(null);
  const [creatingName, setCreatingName] =
    useState<string | null>(null);

  const [selectedCast, setSelectedCast] =
    useState<Cast | null>(null);

  const isAdding = creatingName !== null;
  const [deletingCastId, setDeletingCastId] =
    useState<string | null>(null);
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

  function addCast() {
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

    setCreatingName(trimmedName);
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

  async function handleDeleteCast(cast: Cast) {
    if (deletingCastId) {
      return;
    }

    const displayName =
      cast.display_name || cast.name;

    try {
      setDeletingCastId(cast.id);

      const shiftCount = await getCastShiftCount(cast.id);
      const historyText =
        shiftCount > 0
          ? `\n関連するシフト履歴 ${shiftCount}件も削除されます。`
          : "";

      const confirmed = window.confirm(
        `${displayName}を完全に削除しますか？${historyText}\n\nこの操作は取り消せません。`
      );

      if (!confirmed) {
        return;
      }

      const typedName = window.prompt(
        `確認のため「${displayName}」と入力してください。`
      );

      if (typedName !== displayName) {
        if (typedName !== null) {
          alert(
            "名前が一致しないため、削除を中止しました"
          );
        }
        return;
      }

      await permanentlyDeleteInactiveCast(cast.id);

      if (selectedCast?.id === cast.id) {
        setSelectedCast(null);
      }

      if (editingCast?.id === cast.id) {
        setEditingCast(null);
      }

      await loadCasts();
      alert(`${displayName}を完全に削除しました`);
    } catch (error) {
      console.error("キャスト完全削除エラー:", error);
      alert(
        error instanceof Error
          ? error.message
          : "キャストの完全削除に失敗しました"
      );
    } finally {
      setDeletingCastId(null);
    }
  }

  async function handleCastSaved() {
    await loadCasts();
    setEditingCast(null);
  }

  async function handleCastCreated() {
    setName("");
    setCreatingName(null);
    setCurrentView("active");
    await loadCasts();
  }

  const casts =
    currentView === "active"
      ? activeCasts
      : inactiveCasts;

  const filteredCasts = useMemo(() => {
    const keyword = searchText
      .trim()
      .toLowerCase();

    const matchedCasts = keyword
      ? casts.filter((cast) => {
          const nameText =
            cast.name.toLowerCase();
          const displayNameText = (
            cast.display_name || ""
          ).toLowerCase();
          const scoutNameText = (
            cast.scout_name || ""
          ).toLowerCase();

          return (
            nameText.includes(keyword) ||
            displayNameText.includes(keyword) ||
            scoutNameText.includes(keyword)
          );
        })
      : [...casts];

    if (sortOrder === "registered") {
      return matchedCasts;
    }

    return [...matchedCasts].sort((a, b) => {
      if (sortOrder === "name") {
        return (
          a.display_name || a.name
        ).localeCompare(
          b.display_name || b.name,
          "ja"
        );
      }

      const aIsScout =
        a.cast_type === "scout" ? 1 : 0;
      const bIsScout =
        b.cast_type === "scout" ? 1 : 0;
      const typeDifference =
        sortOrder === "scout-first"
          ? bIsScout - aIsScout
          : aIsScout - bIsScout;

      if (typeDifference !== 0) {
        return typeDifference;
      }

      return (
        a.display_name || a.name
      ).localeCompare(
        b.display_name || b.name,
        "ja"
      );
    });
  }, [casts, searchText, sortOrder]);

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
        canEdit={canEdit}
        name={name}
        searchText={searchText}
        isAdding={isAdding}
        onNameChange={setName}
        onSearchTextChange={setSearchText}
        onAdd={addCast}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
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
        canEdit={canEdit}
        casts={filteredCasts}
        totalCount={casts.length}
        isActive={currentView === "active"}
        searchText={searchText}
        onOpenDetail={setSelectedCast}
        onEdit={setEditingCast}
        onDeactivate={handleDeactivateCast}
        onActivate={handleActivateCast}
        onDelete={handleDeleteCast}
      />

      {selectedCast && (
        <CastDetailModal
          canEdit={canEdit}
          cast={selectedCast}
          onClose={() => setSelectedCast(null)}
          onEdit={() => {
            setEditingCast(selectedCast);
            setSelectedCast(null);
          }}
        />
      )}

      {canEdit && editingCast && (
        <EditCastModal
          cast={editingCast}
          onClose={() => setEditingCast(null)}
          onSaved={handleCastSaved}
        />
      )}

      {canEdit && creatingName && (
        <EditCastModal
          initialName={creatingName}
          onClose={() => setCreatingName(null)}
          onSaved={handleCastCreated}
        />
      )}
    </>
  );
}
