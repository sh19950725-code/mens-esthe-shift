export type CastView = "active" | "inactive";

type CastTabsProps = {
  currentView: CastView;
  activeCount: number;
  inactiveCount: number;
  onChange: (view: CastView) => void;
};

export default function CastTabs({
  currentView,
  activeCount,
  inactiveCount,
  onChange,
}: CastTabsProps) {
  return (
    <section className="mb-5 grid grid-cols-2 rounded-xl bg-gray-100 p-1">
      <button
        type="button"
        onClick={() => onChange("active")}
        className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
          currentView === "active"
            ? "bg-white text-black shadow-sm"
            : "text-gray-500"
        }`}
      >
        在籍中（{activeCount}）
      </button>

      <button
        type="button"
        onClick={() => onChange("inactive")}
        className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
          currentView === "inactive"
            ? "bg-white text-black shadow-sm"
            : "text-gray-500"
        }`}
      >
        退店済み（{inactiveCount}）
      </button>
    </section>
  );
}