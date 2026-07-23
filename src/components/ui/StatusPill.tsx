import type { Status } from "@/lib/types";

// Tasarım kararı: durumlar RENK KODU KULLANMAZ.
// Nötr gri nokta + sade tek renk metin.
export function StatusPill({
  status,
  size = "md",
}: {
  status: Status;
  size?: "sm" | "md";
}) {
  const dot = size === "sm" ? "h-1.5 w-1.5" : "h-[7px] w-[7px]";
  const text = size === "sm" ? "text-xs" : "text-[13px]";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`${dot} rounded-full bg-dot`} />
      <span className={`${text} font-bold text-ink-2`}>{status}</span>
    </span>
  );
}
