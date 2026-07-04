"use client";

import { useState } from "react";
import ShiftCard from "@/components/cards/ShiftCard";
import DayCard from "@/components/cards/DayCard";
type Tab = "today" | "week" | "register" | "casts";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("today");

  return (
    <main className="min-h-screen bg-gray-100 pb-20">
      <div className="mx-auto min-h-screen max-w-md bg-white p-4">
        {activeTab === "today" && <TodayScreen />}
        {activeTab === "week" && <WeekScreen />}
        {activeTab === "register" && <RegisterScreen />}
        {activeTab === "casts" && <CastsScreen />}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 border-t bg-white">
        <div className="mx-auto grid max-w-md grid-cols-4 text-center text-sm">
          <TabButton
            label="本日"
            isActive={activeTab === "today"}
            onClick={() => setActiveTab("today")}
          />
          <TabButton
            label="週間"
            isActive={activeTab === "week"}
            onClick={() => setActiveTab("week")}
          />
          <TabButton
            label="登録"
            isActive={activeTab === "register"}
            onClick={() => setActiveTab("register")}
          />
          <TabButton
            label="キャスト"
            isActive={activeTab === "casts"}
            onClick={() => setActiveTab("casts")}
          />
        </div>
      </nav>
    </main>
  );
}

function TabButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-4 ${
        isActive ? "font-bold text-black" : "text-gray-400"
      }`}
    >
      {label}
    </button>
  );
}

function TodayScreen() {
  return (
    <>
      <header className="mb-5">
        <p className="text-sm text-gray-500">独立型シフト管理</p>
        <h1 className="text-2xl font-bold">本日のシフト</h1>
      </header>

      <section className="mb-4 rounded-2xl bg-gray-100 p-4">
        <p className="text-sm text-gray-500">2026年7月4日（土）</p>
        <p className="mt-1 text-xl font-bold">出勤 3名</p>
      </section>

      <section className="space-y-3">
        <ShiftCard name="あい" time="12:00〜18:00" />
        <ShiftCard name="れな" time="13:00〜21:00" />
        <ShiftCard name="ゆい" time="18:00〜LAST" />
      </section>
    </>
  );
}

function WeekScreen() {
  return (
    <>
      <header className="mb-5">
        <p className="text-sm text-gray-500">週間確認</p>
        <h1 className="text-2xl font-bold">今週のシフト</h1>
      </header>

      <section className="space-y-3">
        <DayCard date="7/4（土）" count="3名" />
        <DayCard date="7/5（日）" count="5名" />
        <DayCard date="7/6（月）" count="2名" />
        <DayCard date="7/7（火）" count="4名" />
      </section>
    </>
  );
}

function RegisterScreen() {
  return (
    <>
      <header className="mb-5">
        <p className="text-sm text-gray-500">シフト追加</p>
        <h1 className="text-2xl font-bold">シフト登録</h1>
      </header>

      <section className="space-y-4">
        <input className="w-full rounded-xl border p-4" placeholder="キャスト名" />
        <input className="w-full rounded-xl border p-4" type="date" />
        <input className="w-full rounded-xl border p-4" type="time" />
        <input className="w-full rounded-xl border p-4" type="time" />

        <button className="w-full rounded-xl bg-black p-4 font-bold text-white">
          登録する
        </button>
      </section>
    </>
  );
}

function CastsScreen() {
  return (
    <>
      <header className="mb-5">
        <p className="text-sm text-gray-500">キャスト管理</p>
        <h1 className="text-2xl font-bold">キャスト一覧</h1>
      </header>

      <section className="space-y-3">
        <ShiftCard name="あい" time="在籍中" />
        <ShiftCard name="れな" time="在籍中" />
        <ShiftCard name="ゆい" time="在籍中" />
      </section>
    </>
  );
}
