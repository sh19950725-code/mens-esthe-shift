"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/auth/AuthGate";
import StoreProvider, {
  useStore,
} from "@/components/store/StoreProvider";
import StoreSwitcher from "@/components/store/StoreSwitcher";
import BottomNavigation, {
  type NavigationTab,
} from "@/components/BottomNavigation";
import AdminUsersScreen from "@/components/screens/AdminUsersScreen";
import AuditLogScreen from "@/components/screens/AuditLogScreen";
import CastScreen from "@/components/screens/CastScreen";
import DashboardScreen from "@/components/screens/DashboardScreen";
import MonthScreen from "@/components/screens/MonthScreen";
import RegisterScreen from "@/components/screens/RegisterScreen";
import StoreSettingsScreen from "@/components/screens/StoreSettingsScreen";
import TodayScreen from "@/components/screens/TodayScreen";
import WeekScreen from "@/components/screens/WeekScreen";
import { getCurrentProfile } from "@/services/profile.service";

type Tab =
  | "home"
  | "today"
  | "week"
  | "month"
  | "register"
  | "casts"
  | "storeSettings"
  | "rooms"
  | "roomTimeline"
  | "audit"
  | "adminUsers";

const VALID_TABS: Tab[] = [
  "home",
  "today",
  "week",
  "month",
  "register",
  "casts",
  "storeSettings",
  "rooms",
  "roomTimeline",
  "audit",
  "adminUsers",
];

const ADMIN_TABS: Tab[] = ["audit", "adminUsers"];

function isTab(value: string | null): value is Tab {
  return value !== null && VALID_TABS.includes(value as Tab);
}

function getTabFromUrl(): Tab {
  if (typeof window === "undefined") return "home";
  const value = new URLSearchParams(
    window.location.search
  ).get("tab");
  return isTab(value) ? value : "home";
}

function isNavigationTab(tab: Tab): tab is NavigationTab {
  return (
    tab === "home" ||
    tab === "today" ||
    tab === "week" ||
    tab === "casts"
  );
}

function createTabUrl(tab: Tab): string {
  const url = new URL(window.location.href);
  if (tab === "home") {
    url.searchParams.delete("tab");
  } else {
    url.searchParams.set("tab", tab);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function ShiftManagementApp() {
  const { currentStoreId } = useStore();
  const [activeTab, setActiveTab] = useState<Tab>(
    getTabFromUrl
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [isRegisterDirty, setIsRegisterDirty] =
    useState(false);

  useEffect(() => {
    let isMounted = true;

    void getCurrentProfile()
      .then((profile) => {
        if (!isMounted) return;
        const admin = profile?.role === "admin";
        setIsAdmin(admin);
        setProfileLoaded(true);

        if (!admin && ADMIN_TABS.includes(getTabFromUrl())) {
          setActiveTab("home");
          window.history.replaceState(
            { tab: "home" },
            "",
            createTabUrl("home")
          );
        }
      })
      .catch((error) => {
        console.error("権限取得エラー:", error);
        if (!isMounted) return;
        setIsAdmin(false);
        setProfileLoaded(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function handleDirtyChange(event: Event) {
      const customEvent = event as CustomEvent<{
        dirty?: boolean;
      }>;
      setIsRegisterDirty(
        customEvent.detail?.dirty === true
      );
    }

    window.addEventListener(
      "shift-form-dirty-change",
      handleDirtyChange
    );
    return () =>
      window.removeEventListener(
        "shift-form-dirty-change",
        handleDirtyChange
      );
  }, []);

  useEffect(() => {
    function handlePopState() {
      const nextTab = getTabFromUrl();
      if (ADMIN_TABS.includes(nextTab) && !isAdmin) {
        setActiveTab("home");
        return;
      }
      setActiveTab(nextTab);
      window.scrollTo({ top: 0 });
    }

    window.addEventListener("popstate", handlePopState);
    return () =>
      window.removeEventListener("popstate", handlePopState);
  }, [isAdmin]);

  function openTab(tab: Tab) {
    if (ADMIN_TABS.includes(tab) && !isAdmin) return;
    if (
      activeTab === "register" &&
      tab !== "register" &&
      isRegisterDirty
    ) {
      const confirmed = window.confirm(
        "入力途中のシフトがあります。内容を破棄して移動しますか？"
      );
      if (!confirmed) return;
      setIsRegisterDirty(false);
    }
    setActiveTab(tab);
    window.history.pushState(
      { tab },
      "",
      createTabUrl(tab)
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const showBottomNavigation = isNavigationTab(activeTab);
  const showFloatingRegisterButton =
    activeTab !== "register" &&
    activeTab !== "storeSettings" &&
    activeTab !== "rooms" &&
    activeTab !== "roomTimeline" &&
    activeTab !== "audit" &&
    activeTab !== "adminUsers";

  if (!profileLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-500">
          読み込み中...
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div
        key={currentStoreId}
        className={`mx-auto w-full max-w-md px-4 pt-5 ${
          showBottomNavigation ? "pb-28" : "pb-8"
        }`}
      >
        <StoreSwitcher
          onOpenSettings={() =>
            openTab("storeSettings")
          }
        />

        {activeTab === "home" && (
          <>
            <DashboardScreen
              onOpenToday={() => openTab("today")}
              onOpenWeek={() => openTab("week")}
              onOpenMonth={() => openTab("month")}
              onOpenRegister={() => openTab("register")}
              onOpenCasts={() => openTab("casts")}
            />

            {isAdmin && (
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => openTab("audit")}
                  className="rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm"
                >
                  <p className="font-bold text-gray-900">
                    操作履歴
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    変更内容を確認
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => openTab("adminUsers")}
                  className="rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm"
                >
                  <p className="font-bold text-gray-900">
                    スタッフ権限
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    管理者を設定
                  </p>
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === "today" && <TodayScreen />}
        {activeTab === "week" && <WeekScreen />}
        {activeTab === "month" && (
          <MonthScreen
            onOpenDate={() => openTab("today")}
          />
        )}
        {activeTab === "register" && <RegisterScreen />}
        {activeTab === "casts" && <CastScreen />}
        {activeTab === "storeSettings" && (
          <StoreSettingsScreen
            onBack={() => openTab("home")}
          />
        )}
        {activeTab === "audit" && isAdmin && (
          <AuditLogScreen onBack={() => openTab("home")} />
        )}
        {activeTab === "adminUsers" && isAdmin && (
          <AdminUsersScreen onBack={() => openTab("home")} />
        )}
      </div>

      {showFloatingRegisterButton && (
        <button
          type="button"
          onClick={() => openTab("register")}
          aria-label="シフトを登録"
          className="fixed bottom-20 left-1/2 z-40 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-gray-900 text-3xl font-light text-white shadow-lg"
        >
          ＋
        </button>
      )}

      {showBottomNavigation && (
        <BottomNavigation
          activeTab={activeTab}
          onChange={(tab) => openTab(tab)}
        />
      )}

      {!showBottomNavigation &&
        activeTab !== "rooms" &&
        activeTab !== "roomTimeline" &&
        activeTab !== "storeSettings" &&
        activeTab !== "audit" &&
        activeTab !== "adminUsers" && (
          <button
            type="button"
            onClick={() => openTab("home")}
            className="fixed bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 shadow-lg"
          >
            ホームに戻る
          </button>
        )}
    </main>
  );
}

export default function HomePage() {
  return (
    <AuthGate>
      <StoreProvider>
        <ShiftManagementApp />
      </StoreProvider>
    </AuthGate>
  );
}
