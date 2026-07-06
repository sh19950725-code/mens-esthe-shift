type Tab = "today" | "week" | "register" | "casts";

type BottomNavigationProps = {
  activeTab: Tab;
  onChangeTab: (tab: Tab) => void;
};

export default function BottomNavigation({
  activeTab,
  onChangeTab,
}: BottomNavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-white">
      <div className="mx-auto grid max-w-md grid-cols-4 text-center text-sm">
        <button
          onClick={() => onChangeTab("today")}
          className={`p-4 ${activeTab === "today" ? "font-bold text-black" : "text-gray-400"}`}
        >
          本日
        </button>

        <button
          onClick={() => onChangeTab("week")}
          className={`p-4 ${activeTab === "week" ? "font-bold text-black" : "text-gray-400"}`}
        >
          週間
        </button>

        <button
          onClick={() => onChangeTab("register")}
          className={`p-4 ${activeTab === "register" ? "font-bold text-black" : "text-gray-400"}`}
        >
          登録
        </button>

        <button
          onClick={() => onChangeTab("casts")}
          className={`p-4 ${activeTab === "casts" ? "font-bold text-black" : "text-gray-400"}`}
        >
          キャスト
        </button>
      </div>
    </nav>
  );
}