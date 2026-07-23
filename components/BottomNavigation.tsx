"use client";

export type NavigationTab =
  | "home"
  | "today"
  | "week"
  | "casts";

type BottomNavigationProps = {
  activeTab: NavigationTab;
  onChange: (tab: NavigationTab) => void;
};

const navigationItems: Array<{
  key: NavigationTab;
  label: string;
  icon: string;
}> = [
  {
    key: "home",
    label: "ホーム",
    icon: "⌂",
  },
  {
    key: "today",
    label: "今日",
    icon: "☀",
  },
  {
    key: "week",
    label: "週間",
    icon: "▦",
  },
  {
    key: "casts",
    label: "キャスト",
    icon: "♙",
  },
];

export default function BottomNavigation({
  activeTab,
  onChange,
}: BottomNavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto grid h-16 w-full max-w-md grid-cols-4">
        {navigationItems.map((item) => {
          const isActive = activeTab === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              aria-label={`${item.label}を開く`}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 px-1 transition ${
                isActive
                  ? "text-gray-900"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-lg leading-none transition ${
                  isActive
                    ? "bg-gray-900 text-white"
                    : ""
                }`}
              >
                {item.icon}
              </span>

              <span className="truncate text-[10px] font-bold">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}