type ShiftCardProps = {
  name: string;
  time: string;
};

export default function ShiftCard({ name, time }: ShiftCardProps) {
  return (
    <div className="rounded-2xl border p-4">
      <p className="font-bold">{name}</p>
      <p className="text-sm text-gray-500">{time}</p>
    </div>
  );
}