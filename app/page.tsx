"use client";

import { useState } from "react";

import BottomNavigation from "@/components/navigation/BottomNavigation";

import DashboardScreen from "@/components/screens/DashboardScreen";
import TodayScreen from "@/components/screens/TodayScreen";
import WeekScreen from "@/components/screens/WeekScreen";
import RegisterScreen from "@/components/screens/RegisterScreen";
import CastScreen from "@/components/screens/CastScreen";
import RoomScreen from "@/components/screens/RoomScreen";

type Tab =
  | "home"
  | "today"
  | "week"
  | "register"
  | "casts"
  | "rooms";

export default function HomePage() {
  const [activeTab, setActiveTab] =
    useState<Tab>("home");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col bg-gray-100">

      {/* 画面 */}
      <div className="flex-1 p-4 pb-28">

        {activeTab === "home" && (
          <DashboardScreen
            onOpenRooms={() =>
              setActiveTab("rooms")
            }
          />
        )}

        {activeTab === "today" && (
          <TodayScreen />
        )}

        {activeTab === "week" && (
          <WeekScreen />
        )}

        {activeTab === "register" && (
          <RegisterScreen />
        )}

        {activeTab === "casts" && (
          <CastScreen />
        )}

        {activeTab === "rooms" && (
          <RoomScreen
            onBack={() =>
              setActiveTab("home")
            }
          />
        )}

      </div>

      {/* ＋ボタン */}
      <button
        type="button"
        onClick={() =>
          setActiveTab("register")
        }
        className="fixed bottom-24 left-1/2 z-50 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-black text-4xl font-light text-white shadow-xl transition hover:scale-105"
      >
        +
      </button>

      {/* 下部メニュー */}
      <BottomNavigation
        activeTab={activeTab}
        onChangeTab={setActiveTab}
      />
    </main>
  );
}