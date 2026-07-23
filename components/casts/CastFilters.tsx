import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export type CastSortOrder =
  | "registered"
  | "name"
  | "enrolled-first"
  | "scout-first";

type CastFiltersProps = {
  name: string;
  searchText: string;
  isAdding: boolean;
  onNameChange: (value: string) => void;
  onSearchTextChange: (value: string) => void;
  onAdd: () => void;
  sortOrder: CastSortOrder;
  onSortOrderChange: (
    value: CastSortOrder
  ) => void;
  canEdit?: boolean;
};

export default function CastFilters({
  name,
  searchText,
  isAdding,
  onNameChange,
  onSearchTextChange,
  onAdd,
  sortOrder,
  onSortOrderChange,
  canEdit = false,
}: CastFiltersProps) {
  return (
    <section className="mb-5 space-y-3">
      {canEdit && (
      <div className="flex items-stretch gap-2">
        <div className="min-w-0 flex-1">
          <Input
            value={name}
            onChange={(event) =>
              onNameChange(event.target.value)
            }
            placeholder="新しいキャスト名"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !isAdding) {
                onAdd();
              }
            }}
          />
        </div>

        <Button
          onClick={onAdd}
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
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          value={searchText}
          onChange={(event) =>
            onSearchTextChange(event.target.value)
          }
          placeholder="キャスト名で検索"
        />

        <label className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3">
          <span className="shrink-0 text-xs font-bold text-gray-700">
            並び順
          </span>
          <select
            value={sortOrder}
            onChange={(event) =>
              onSortOrderChange(
                event.target.value as CastSortOrder
              )
            }
            className="min-h-11 min-w-0 flex-1 bg-white text-sm font-bold text-gray-900 outline-none"
          >
            <option value="registered">
              登録順
            </option>
            <option value="name">
              名前順
            </option>
            <option value="enrolled-first">
              在籍を先に表示
            </option>
            <option value="scout-first">
              スカウトを先に表示
            </option>
          </select>
        </label>
      </div>
    </section>
  );
}
