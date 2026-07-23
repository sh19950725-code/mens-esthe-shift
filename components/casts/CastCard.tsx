import type { Cast } from "@/services/cast.service";

type CastCardProps = {
  cast: Cast;
  isActive: boolean;
  onOpenDetail: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onActivate: () => void;
  onDelete: () => void;
};

export default function CastCard({
  cast,
  isActive,
  onOpenDetail,
  onEdit,
  onDeactivate,
  onActivate,
  onDelete,
}: CastCardProps) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onOpenDetail}
            className="block max-w-full text-left"
          >
            <p className="truncate text-lg font-bold">
              {cast.display_name || cast.name}
            </p>

            {cast.display_name &&
              cast.display_name !== cast.name && (
                <p className="mt-1 text-xs text-gray-400">
                  管理名：{cast.name}
                </p>
              )}

            <p className="mt-1 text-sm text-gray-500">
              {isActive ? "在籍中" : "退店済み"}
            </p>
          </button>

          {cast.memo && (
            <p className="mt-2 rounded-lg bg-gray-100 p-2 text-xs text-gray-600">
              {cast.memo}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700"
          >
            編集
          </button>

          {isActive ? (
            <button
              type="button"
              onClick={onDeactivate}
              className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-500"
            >
              退店
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onActivate}
                className="rounded-lg bg-green-50 px-3 py-2 text-xs font-bold text-green-600"
              >
                再表示
              </button>

              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white"
              >
                完全削除
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
