export function Chip({
  active = false,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors ${
        active
          ? "bg-primary font-bold text-white"
          : "border border-border-input bg-white text-ink-3 hover:border-primary/40"
      }`}
    >
      {children}
    </button>
  );
}
