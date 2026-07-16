"use client";

import { useState } from "react";
import TodayScreen from "@/components/screens/TodayScreen";
import RegisterScreen from "@/components/screens/RegisterScreen";
import CastScreen from "@/components/screens/CastScreen";
import BottomNavigation from "@/components/navigation/BottomNavigation";
import FloatingActionButton from "@/components/ui/FloatingActionButton";
import CalendarScreen from "@/components/screens/CalendarScreen";
import DashboardScreen from "@/components/screens/DashboardScreen";

type Tab = "home" | "today" | "week" | "register" | "casts";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("home");

  return (
    <main className="min-h-screen bg-gray-100 pb-20">
      <div className="mx-auto min-h-screen max-w-md bg-white p-4">
        {activeTab === "home" && <DashboardScreen />}
        {activeTab === "today" && <TodayScreen />}
        {activeTab === "week" && <CalendarScreen />}
        {activeTab === "register" && <RegisterScreen />}
        {activeTab === "casts" && <CastScreen />}
      </div>

      <FloatingActionButton onClick={() => setActiveTab("register")} />

      <BottomNavigation activeTab={activeTab} onChangeTab={setActiveTab} />

    </main>
  );
}