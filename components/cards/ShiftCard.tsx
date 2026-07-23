"use client";

import type { KeyboardEvent } from "react";

export type ShiftCardStatus =
  | "before"
  | "working"
  | "finished"
  | "tentative"
  | "holiday";

type ShiftCardProps = {
  name: string;
  room: string | null;
  time: string;
  status?: ShiftCardStatus;
  statusLabel?: string;
  memo?: string | null;
  onEdit?: () => void;
  onDelete?: () => void;
};

function getStatusClasses(status?: ShiftCardStatus) {
  switch (status) {
    case "working":
      return {
        card:
          "border-green-200 border-l-4 border-l-green-500 bg-green-50/30",
        badge: "bg-green-100 text-green-700",
        indicator: "bg-green-500",
        room: "bg-green-100 text-green-800",
      };

    case "tentative":
      return {
        card:
          "border-yellow-200 border-l-4 border-l-yellow-500 bg-yellow-50/30",
        badge: "bg-yellow-100 text-yellow-700",
        indicator: "bg-yellow-500",
        room: "bg-yellow-100 text-yellow-800",
      };

    case "holiday":
      return {
        card:
          "border-gray-200 border-l-4 border-l-gray-400 bg-gray-50",
        badge: "bg-gray-200 text-gray-600",
        indicator: "bg-gray-400",
        room: "bg-gray-200 text-gray-700",
      };

    case "finished":
      return {
        card:
          "border-gray-200 border-l-4 border-l-gray-300 bg-gray-50/70",
        badge: "bg-gray-100 text-gray-500",
        indicator: "bg-gray-300",
        room: "bg-gray-100 text-gray-600",
      };

    case "before":
    default:
      return {
        card:
          "border-blue-200 border-l-4 border-l-blue-500 bg-white",
        badge: "bg-blue-100 text-blue-700",
        indicator: "bg-blue-500",
        room: "bg-blue-100 text-blue-800",
      };
  }
}

export default function ShiftCard({
  name,
  room,
  time,
  status = "before",
  statusLabel,
  memo,
  onEdit,
  onDelete,
}: ShiftCardProps) {
  const statusClasses = getStatusClasses(status);
  const isClickable = Boolean(onEdit);

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!onEdit) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onEdit();
    }
  }

  return (
    <article
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={() => onEdit?.()}
      onKeyDown={handleCardKeyDown}
      className={`rounded-2xl border p-4 shadow-sm transition ${
        isClickable
          ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.995]"
          : ""
      } ${statusClasses.card}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusClasses.indicator} ${
                status === "working" ? "animate-pulse" : ""
              }`}
              aria-hidden="true"
            />

            <p className="truncate text-lg font-bold text-gray-900">
              {name}
            </p>
          </div>

          <p className="mt-1 pl-[18px] text-sm font-semibold text-gray-700">
            {time}
          </p>
        </div>

        {statusLabel && (
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusClasses.badge}`}
          >
            {statusLabel}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-2 pl-[18px] text-sm text-gray-600">
        {room && (
          <div>
            <span
              className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-bold ${statusClasses.room}`}
            >
              部屋：{room}
            </span>
          </div>
        )}

        {memo && (
          <p className="whitespace-pre-wrap break-words rounded-xl bg-white/70 p-3 text-sm leading-6 text-gray-600">
            <span className="font-bold text-gray-700">
              メモ：
            </span>
            {memo}
          </p>
        )}
      </div>

      {(onEdit || onDelete) && (
        <div className="mt-4 flex justify-end gap-2 border-t border-gray-100 pt-3">
          {onEdit && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
              }}
              className="min-w-20 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-200 active:scale-95"
            >
              編集
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
              className="min-w-20 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100 active:scale-95"
            >
              削除
            </button>
          )}
        </div>
      )}

      {isClickable && (
        <p className="mt-3 text-right text-[11px] text-gray-400">
          カードをタップして編集
        </p>
      )}
    </article>
  );
}