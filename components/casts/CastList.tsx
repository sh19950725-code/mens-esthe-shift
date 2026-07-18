import CastCard from "@/components/casts/CastCard";
import type { Cast } from "@/services/cast.service";

type CastListProps = {
  casts: Cast[];
  totalCount: number;
  isActive: boolean;
  searchText: string;
  onOpenDetail: (cast: Cast) => void;
  onEdit: (cast: Cast) => void;
  onDeactivate: (cast: Cast) => void;
  onActivate: (cast: Cast) => void;
};

export default function CastList({
  casts,
  totalCount,
  isActive,
  searchText,
  onOpenDetail,
  onEdit,
  onDeactivate,
  onActivate,
}: CastListProps) {
  if (totalCount === 0) {
    return (
      <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
        {isActive
          ? "在籍中のキャストはいません。"
          : "退店済みのキャストはいません。"}
      </p>
    );
  }

  if (casts.length === 0 && searchText.trim()) {
    return (
      <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
        検索条件に一致するキャストはいません。
      </p>
    );
  }

  return (
    <section className="space-y-3">
      {casts.map((cast) => (
        <CastCard
          key={cast.id}
          cast={cast}
          isActive={isActive}
          onOpenDetail={() => onOpenDetail(cast)}
          onEdit={() => onEdit(cast)}
          onDeactivate={() => onDeactivate(cast)}
          onActivate={() => onActivate(cast)}
        />
      ))}
    </section>
  );
}