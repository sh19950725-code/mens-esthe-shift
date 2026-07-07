type FloatingActionButtonProps = {
  onClick: () => void;
};

export default function FloatingActionButton({
  onClick,
}: FloatingActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-black text-3xl font-bold text-white shadow-lg"
    >
      +
    </button>
  );
}