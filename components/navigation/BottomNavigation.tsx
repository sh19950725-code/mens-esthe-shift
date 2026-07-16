type Tab = "today" | "week" | "register" | "casts";

type BottomNavigationProps = {
  activeTab: Tab;
  onChangeTab: (tab: Tab) => void;
};

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: "today", label: "本日", icon: "🏠" },
  { key: "week", label: "カレンダー", icon: "📅" },
  { key: "register", label: "登録", icon: "＋" },
  { key: "casts", label: "キャスト", icon: "👩" },
];

export default function BottomNavigation({
  activeTab,
  onChangeTab,
}: BottomNavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t bg-white">
      <div className="mx-auto grid max-w-md grid-cols-4 text-center">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => onChangeTab(tab.key)}
              className={`flex flex-col items-center gap-1 py-3 text-xs ${
                isActive ? "font-bold text-black" : "text-gray-400"
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}