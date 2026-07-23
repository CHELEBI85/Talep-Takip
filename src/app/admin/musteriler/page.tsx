"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { useStore } from "@/lib/store";

const COLS = "grid-cols-[1.5fr_1.4fr_0.7fr]";

export default function AdminMusterilerPage() {
  const { customers } = useStore();

  return (
    <>
      <PageHeader title="Müşteriler" />

      <div className="p-5 sm:p-7">
        {/* ── Masaüstü tablo ── */}
        <div className="hidden overflow-hidden rounded-card border border-border-card bg-white sm:block">
          <div
            className={`grid ${COLS} border-b border-[#eceff5] bg-[#fafbfd] px-[18px] py-3 text-xs font-extrabold uppercase tracking-[0.03em] text-muted-2`}
          >
            <span>Kurum</span>
            <span>Yetkili</span>
            <span>Talep</span>
          </div>
          {customers.map((c) => (
            <div
              key={c.name}
              className={`grid ${COLS} items-center border-b border-[#f1f3f8] px-[18px] py-[15px] last:border-0`}
            >
              <div className="flex items-center gap-2.5">
                <Avatar initials={c.initials} tone="soft" />
                <div className="text-sm font-bold">{c.name}</div>
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-ink-2">
                  {c.contact}
                </div>
                <div className="truncate text-xs text-faint-2">{c.email}</div>
              </div>
              <div className="text-sm font-extrabold text-primary">
                {c.requests}
              </div>
            </div>
          ))}
        </div>

        {/* ── Mobil kart listesi ── */}
        <div className="flex flex-col gap-3 sm:hidden">
          {customers.map((c) => (
            <div
              key={c.name}
              className="rounded-[12px] border border-border-card bg-white p-3.5"
            >
              <div className="flex items-center gap-2.5">
                <Avatar initials={c.initials} tone="soft" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{c.name}</div>
                  <div className="truncate text-xs text-faint-2">{c.email}</div>
                </div>
                <div className="text-sm font-extrabold text-primary">
                  {c.requests}
                </div>
              </div>
              <div className="mt-2 text-[13px] font-semibold text-ink-2">
                {c.contact}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
