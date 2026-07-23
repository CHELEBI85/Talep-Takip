import type { HistoryEvent } from "@/lib/types";

// Dikey zaman çizelgesi. `showBy` admin görünümünde olayı yapan kişiyi gösterir.
export function Timeline({
  items,
  showBy = false,
}: {
  items: HistoryEvent[];
  showBy?: boolean;
}) {
  return (
    <div>
      {items.map((h, i) => {
        const last = i === items.length - 1;
        return (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="mt-1 h-[9px] w-[9px] shrink-0 rounded-full bg-primary" />
              {!last && <span className="mt-1 w-0.5 flex-1 bg-border-card" />}
            </div>
            <div className={`min-w-0 ${last ? "pb-0.5" : "pb-3.5"}`}>
              <div className="break-words text-[13px] font-bold text-[#3d4763]">
                {h.event}
              </div>
              <div className="mt-0.5 break-words text-xs text-faint-2">
                {showBy && h.by ? `${h.by} · ${h.date}` : h.date}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
