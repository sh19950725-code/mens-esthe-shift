import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type CastFiltersProps = {
  name: string;
  searchText: string;
  isAdding: boolean;
  onNameChange: (value: string) => void;
  onSearchTextChange: (value: string) => void;
  onAdd: () => void;
  canEdit?: boolean;
};

export default function CastFilters({
  name,
  searchText,
  isAdding,
  onNameChange,
  onSearchTextChange,
  onAdd,
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

      <Input
        value={searchText}
        onChange={(event) =>
          onSearchTextChange(event.target.value)
        }
        placeholder="キャスト名で検索"
      />
    </section>
  );
}
