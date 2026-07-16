type ShiftStatus = "before" | "soon" | "working" | "finished";

type ShiftCardProps = {
  name: string;
  time: string;
  room?: string | null;
  memo?: string | null;
  status?: ShiftStatus;
  statusLabel?: string;
  onEdit?: () => void;
  onDelete?: () => void;
};

export default function ShiftCard({
  name,
  time,
  room,
  memo,
  status,
  statusLabel,
  onEdit,
  onDelete,
}: ShiftCardProps) {
  function getStatusClass() {
    if (status === "working") {
      return "bg-green-100 text-green-700";
    }

    if (status === "soon") {
      return "bg-yellow-100 text-yellow-700";
    }

    if (status === "finished") {
      return "bg-gray-100 text-gray-500";
    }

    return "bg-blue-50 text-blue-600";
  }

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-lg">
          👩
        </div>

        <div className="flex-1">
          <p className="text-lg font-bold">{name}</p>

          {room && (
            <p className="mt-1 text-sm font-medium text-gray-500">
              🏠 {room}
            </p>
          )}

          <p className="mt-1 text-sm font-medium text-gray-600">
            🕒 {time}
          </p>

          {status && statusLabel && (
            <p
              className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusClass()}`}
            >
              {statusLabel}
            </p>
          )}

          {memo && (
            <p className="mt-2 rounded-lg bg-gray-100 p-2 text-xs text-gray-600">
              {memo}
            </p>
          )}

          <div className="mt-3 flex gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700"
              >
                編集
              </button>
            )}

            {onDelete && (
              <button
                onClick={onDelete}
                className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-500"
              >
                削除
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}