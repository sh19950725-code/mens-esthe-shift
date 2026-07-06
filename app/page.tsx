"use client";

import { useState } from "react";
import TodayScreen from "@/components/screens/TodayScreen";
import WeekScreen from "@/components/screens/WeekScreen";
import RegisterScreen from "@/components/screens/RegisterScreen";
import CastScreen from "@/components/screens/CastScreen";
import BottomNavigation from "@/components/navigation/BottomNavigation";

type Tab = "today" | "week" | "register" | "casts";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("today");

  return (
    <main className="min-h-screen bg-gray-100 pb-20">
      <div className="mx-auto min-h-screen max-w-md bg-white p-4">
        {activeTab === "today" && <TodayScreen />}
        {activeTab === "week" && <WeekScreen />}
        {activeTab === "register" && <RegisterScreen />}
        {activeTab === "casts" && <CastScreen />}
      </div>

      <BottomNavigation activeTab={activeTab} onChangeTab={setActiveTab} />
    </main>
  );
}