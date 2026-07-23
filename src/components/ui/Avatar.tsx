type Tone = "primary" | "orange" | "soft";

const tones: Record<Tone, string> = {
  primary: "bg-primary text-white",
  orange: "bg-accent-orange text-white",
  soft: "bg-primary-soft text-primary",
};

export function Avatar({
  initials,
  tone = "primary",
  size = 34,
  className = "",
}: {
  initials: string;
  tone?: Tone;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-[9px] font-extrabold ${tones[tone]} ${className}`}
      style={{ width: size, height: size, fontSize: size <= 30 ? 12 : 13 }}
    >
      {initials}
    </span>
  );
}
