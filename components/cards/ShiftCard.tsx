type ShiftCardProps = {
  name: string;
  time: string;
  memo?: string | null;
  onDelete?: () => void;
};

export default function ShiftCard({
  name,
  time,
  memo,
  onDelete,
}: ShiftCardProps) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-lg">
          👩
        </div>

        <div className="flex-1">
          <p className="text-lg font-bold">{name}</p>
          <p className="mt-1 text-sm font-medium text-gray-600">{time}</p>

          {memo && (
            <p className="mt-2 rounded-lg bg-gray-100 p-2 text-xs text-gray-600">
              {memo}
            </p>
          )}
        </div>

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
  );
}