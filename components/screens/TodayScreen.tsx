"use client";

import { useEffect, useMemo, useState } from "react";
import ShiftCard from "@/components/cards/ShiftCard";
import EditShiftModal from "@/components/ui/EditShiftModal";
import { formatExtendedTime } from "@/lib/business-time";
import { getShiftStatus } from "@/lib/time";
import {
  deleteShiftById,
  getShiftsByDate,
  type Shift,
} from "@/services/shift.service";

type ShiftFilter =
  | "all"
  | "working"
  | "tentative"
  | "holiday"
  | "now";

function getLocalToday(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function moveLocalDate(
  dateText: string,
  amount: number
): string {
  const [year, month, day] = dateText.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + amount);

  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(
    2,
    "0"
  );
  const nextDay = String(date.getDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

function getCastName(shift: Shift): string {
  return (
    shift.casts?.display_name ||
    shift.casts?.name ||
    "未設定"
  );
}

function getShiftType(
  shift: Shift
): "working" | "tentative" | "holiday" {
  if (
    shift.status === "tentative" ||
    shift.status === "holiday"
  ) {
    return shift.status;
  }
  return "working";
}

function isWorkingNow(shift: Shift): boolean {
  return (
    getShiftType(shift) === "working" &&
    getShiftStatus(
      shift.work_date,
      shift.start_time,
      shift.end_time
    ).status === "working"
  );
}

type TodayScreenProps = {
  initialDate?: string;
};

export default function TodayScreen({
  initialDate,
}: TodayScreenProps) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [workDate, setWorkDate] = useState(
    initialDate || getLocalToday()
  );
  const [editingShift, setEditingShift] =
    useState<Shift | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState<ShiftFilter>("all");

  useEffect(() => {
    void loadShifts();
  }, [workDate]);

  useEffect(() => {
    if (initialDate) {
      setWorkDate(initialDate);
    }
  }, [initialDate]);

  async function loadShifts() {
    try {
      setIsLoading(true);
      setShifts(await getShiftsByDate(workDate));
    } catch (error) {
      console.error("シフト取得エラー:", error);
      alert("シフトの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteShift(id: string) {
    if (!window.confirm("このシフトを削除しますか？")) {
      return;
    }

    try {
      await deleteShiftById(id);
      if (editingShift?.id === id) {
        setEditingShift(null);
      }
      await loadShifts();
    } catch (error) {
      console.error("シフト削除エラー:", error);
      alert("削除に失敗しました");
    }
  }

  const summary = useMemo(() => {
    const working = shifts.filter(
      (shift) => getShiftType(shift) === "working"
    );
    const tentative = shifts.filter(
      (shift) => getShiftType(shift) === "tentative"
    );
    const holiday = shifts.filter(
      (shift) => getShiftType(shift) === "holiday"
    );

    return {
      working: working.length,
      tentative: tentative.length,
      holiday: holiday.length,
      now: working.filter(isWorkingNow).length,
      rooms: new Set(
        shifts
          .filter(
            (shift) => getShiftType(shift) !== "holiday"
          )
          .map((shift) => shift.rooms?.name)
          .filter(Boolean)
      ).size,
    };
  }, [shifts]);

  const filteredShifts = useMemo(() => {
    const keyword = searchText.trim().toLocaleLowerCase();

    return shifts.filter((shift) => {
      const type = getShiftType(shift);
      const matchesFilter =
        filter === "all" ||
        (filter === "now"
          ? isWorkingNow(shift)
          : type === filter);

      const searchableText = [
        getCastName(shift),
        shift.rooms?.name || "",
        shift.memo || "",
      ]
        .join(" ")
        .toLocaleLowerCase();

      return (
        matchesFilter &&
        (!keyword || searchableText.includes(keyword))
      );
    });
  }, [shifts, filter, searchText]);

  const filterItems: {
    key: ShiftFilter;
    label: string;
    count: number;
  }[] = [
    { key: "all", label: "すべて", count: shifts.length },
    {
      key: "working",
      label: "通常",
      count: summary.working,
    },
    {
      key: "tentative",
      label: "仮",
      count: summary.tentative,
    },
    {
      key: "holiday",
      label: "休み",
      count: summary.holiday,
    },
    { key: "now", label: "出勤中", count: summary.now },
  ];

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
          独立型シフト管理
        </p>
        <h1 className="text-2xl font-bold">
          日別シフト
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          日付ごとの出勤状況を確認できます
        </p>
      </header>

      <input
        value={workDate}
        onChange={(event) => setWorkDate(event.target.value)}
        className="mb-4 w-full rounded-xl border border-gray-300 bg-white p-4 outline-none focus:border-black"
        type="date"
      />

      <div className="mb-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() =>
            setWorkDate((current) =>
              moveLocalDate(current, -1)
            )
          }
          className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-bold text-gray-600 shadow-sm"
        >
          ‹ 前日
        </button>
        <button
          type="button"
          onClick={() => setWorkDate(getLocalToday())}
          className={`rounded-xl px-3 py-3 text-sm font-bold ${
            workDate === getLocalToday()
              ? "bg-gray-900 text-white"
              : "border border-gray-200 bg-white text-gray-600 shadow-sm"
          }`}
        >
          今日
        </button>
        <button
          type="button"
          onClick={() =>
            setWorkDate((current) =>
              moveLocalDate(current, 1)
            )
          }
          className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-bold text-gray-600 shadow-sm"
        >
          翌日 ›
        </button>
      </div>

      <section className="mb-4 grid grid-cols-2 gap-2">
        <SummaryCard
          label="通常出勤"
          value={summary.working}
          classes="bg-blue-50 text-blue-700"
        />
        <SummaryCard
          label="仮シフト"
          value={summary.tentative}
          classes="bg-yellow-50 text-yellow-700"
        />
        <SummaryCard
          label="現在出勤中"
          value={summary.now}
          classes="bg-green-50 text-green-700"
        />
        <SummaryCard
          label="休み"
          value={summary.holiday}
          classes="bg-gray-100 text-gray-700"
        />
        <div className="col-span-2 rounded-2xl bg-purple-50 p-3 text-purple-700">
          <p className="text-xs">使用予定の部屋</p>
          <p className="mt-1 text-xl font-bold">
            {summary.rooms}室
          </p>
        </div>
      </section>

      <section className="mb-4 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <input
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="キャスト名・部屋・メモで検索"
          className="w-full rounded-xl border border-gray-300 bg-gray-50 p-3 text-sm outline-none focus:border-gray-900"
        />

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {filterItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold ${
                filter === item.key
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {item.label} {item.count}
            </button>
          ))}
        </div>
      </section>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-gray-700">
          表示 {filteredShifts.length}件
        </p>
        {(searchText || filter !== "all") && (
          <button
            type="button"
            onClick={() => {
              setSearchText("");
              setFilter("all");
            }}
            className="text-xs font-bold text-gray-500"
          >
            条件を解除
          </button>
        )}
      </div>

      <section className="space-y-3">
        {filteredShifts.map((shift) => {
          const type = getShiftType(shift);
          const workingNow = isWorkingNow(shift);
          const status =
            workingNow ? "working" : type;
          const statusLabel = workingNow
            ? "現在出勤中"
            : type === "tentative"
              ? "仮シフト"
              : type === "holiday"
                ? "休み"
                : "通常出勤";

          return (
            <ShiftCard
              key={shift.id}
              name={getCastName(shift)}
              room={
                type === "holiday"
                  ? null
                  : shift.rooms?.name || null
              }
              time={formatExtendedTime(
                shift.start_time,
                shift.end_time
              )}
              status={status}
              statusLabel={statusLabel}
              memo={shift.memo}
              onEdit={() => setEditingShift(shift)}
              onDelete={() => void deleteShift(shift.id)}
            />
          );
        })}

        {filteredShifts.length === 0 && (
          <p className="rounded-xl bg-gray-50 p-5 text-center text-sm text-gray-500">
            条件に一致するシフトはありません。
          </p>
        )}
      </section>

      {editingShift && (
        <EditShiftModal
          shift={editingShift}
          onClose={() => setEditingShift(null)}
          onSaved={async () => {
            setEditingShift(null);
            await loadShifts();
          }}
        />
      )}
    </>
  );
}

function SummaryCard({
  label,
  value,
  classes,
}: {
  label: string;
  value: number;
  classes: string;
}) {
  return (
    <div className={`rounded-2xl p-3 ${classes}`}>
      <p className="text-xs">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}名</p>
    </div>
  );
}
