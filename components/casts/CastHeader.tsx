type CastHeaderProps = {
  activeCount: number;
  inactiveCount: number;
};

export default function CastHeader({
  activeCount,
  inactiveCount,
}: CastHeaderProps) {
  return (
    <header className="mb-5">
      <p className="text-sm text-gray-500">
        キャスト管理
      </p>

      <h1 className="text-2xl font-bold">
        キャスト一覧
      </h1>

      <p className="mt-1 text-sm text-gray-500">
        在籍中 {activeCount}名・退店済み{" "}
        {inactiveCount}名
      </p>
    </header>
  );
}