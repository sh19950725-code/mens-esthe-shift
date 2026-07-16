"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  createRoom,
  deactivateRoom,
  getActiveRooms,
  type Room,
} from "@/services/room.service";

type RoomScreenProps = {
  onBack: () => void;
};

export default function RoomScreen({
  onBack,
}: RoomScreenProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomName, setRoomName] = useState("");
  const [searchText, setSearchText] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRooms();
  }, []);

  async function loadRooms() {
    try {
      setIsLoading(true);

      const data = await getActiveRooms();
      setRooms(data);
    } catch (error) {
      console.error(error);
      alert("部屋情報の取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }

  async function addRoom() {
    const trimmedName = roomName.trim();

    if (!trimmedName) {
      alert("部屋名を入力してください");
      return;
    }

    const duplicateRoom = rooms.some(
      (room) =>
        room.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicateRoom) {
      alert("同じ名前の部屋がすでに登録されています");
      return;
    }

    try {
      setIsAdding(true);

      const nextSortOrder =
        rooms.length === 0
          ? 1
          : Math.max(...rooms.map((room) => room.sort_order)) + 1;

      await createRoom(trimmedName, nextSortOrder);

      setRoomName("");
      await loadRooms();
    } catch (error) {
      console.error(error);
      alert("部屋の登録に失敗しました");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleDeactivateRoom(room: Room) {
    const ok = confirm(
      `${room.name}を部屋一覧から非表示にしますか？\n過去のシフト情報は削除されません。`
    );

    if (!ok) {
      return;
    }

    try {
      await deactivateRoom(room.id);
      await loadRooms();
    } catch (error) {
      console.error(error);
      alert("部屋の非表示処理に失敗しました");
    }
  }

  const filteredRooms = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) {
      return rooms;
    }

    return rooms.filter((room) =>
      room.name.toLowerCase().includes(keyword)
    );
  }, [rooms, searchText]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-gray-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm font-bold text-gray-600"
      >
        ← ホームへ戻る
      </button>

      <header className="mb-5">
        <p className="text-sm text-gray-500">部屋管理</p>
        <h1 className="text-2xl font-bold">部屋一覧</h1>
        <p className="mt-1 text-sm text-gray-500">
          使用中の部屋数：{rooms.length}室
        </p>
      </header>

      <section className="mb-5 space-y-3">
        <div className="flex items-stretch gap-2">
          <div className="min-w-0 flex-1">
            <Input
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              placeholder="新しい部屋名"
            />
          </div>

          <Button
            onClick={addRoom}
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
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="部屋名で検索"
        />
      </section>

      <section className="space-y-3">
        {filteredRooms.map((room) => (
          <div
            key={room.id}
            className="rounded-2xl border bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-bold">{room.name}</p>

                <p className="mt-1 text-sm text-gray-500">
                  表示順：{room.sort_order}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleDeactivateRoom(room)}
                className="shrink-0 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-500"
              >
                非表示
              </button>
            </div>
          </div>
        ))}

        {rooms.length === 0 && (
          <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
            部屋がまだ登録されていません。
          </p>
        )}

        {rooms.length > 0 && filteredRooms.length === 0 && (
          <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
            検索条件に一致する部屋はありません。
          </p>
        )}
      </section>
    </>
  );
}