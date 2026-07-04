type DayCardProps = {
  date: string;
  count: string;
};

export default function DayCard({
  date,
  count,
}: DayCardProps) {
  return (
    <div className="rounded-2xl border p-4">
      <p className="font-bold">{date}</p>
      <p className="text-sm text-gray-500">
        出勤 {count}
      </p>
    </div>
  );
}