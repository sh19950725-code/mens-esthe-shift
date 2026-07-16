type Tab =
  | "home"
  | "today"
  | "week"
  | "register"
  | "casts"
  | "rooms";

type BottomNavigationProps = {
  activeTab: Tab;
  onChangeTab: (tab: Tab) => void;
};

const tabs: {
  key: Tab;
  label: string;
  icon: string;
}[] = [
  {
    key: "home",
    label: "ホーム",
    icon: "🏠",
  },
  {
    key: "today",
    label: "本日",
    icon: "📋",
  },
  {
    key: "week",
    label: "カレンダー",
    icon: "📅",
  },
  {
    key: "casts",
    label: "キャスト",
    icon: "👩",
  },
];

export default function BottomNavigation({
  activeTab,
  onChangeTab,
}: BottomNavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChangeTab(tab.key)}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 px-2 py-2 text-xs transition-colors ${
                isActive
                  ? "font-bold text-black"
                  : "text-gray-400"
              }`}
            >
              <span className="text-xl leading-none">
                {tab.icon}
              </span>

              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}