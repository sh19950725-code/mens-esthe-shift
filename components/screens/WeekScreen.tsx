import DayCard from "@/components/cards/DayCard";

export default function WeekScreen() {
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