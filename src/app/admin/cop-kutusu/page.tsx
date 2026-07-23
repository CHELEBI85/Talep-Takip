"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import { useStore } from "@/lib/store";

export default function AdminCopKutusuPage() {
  const { trash, restore } = useStore();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleRestore(id: string) {
    setBusyId(id);
    try {
      await restore(id);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Çöp Kutusu"
        right={
          <div className="text-[13px] font-semibold text-muted-2">
            {trash.length} talep
          </div>
        }
      />

      <div className="p-5 sm:p-7">
        <p className="mb-[18px] rounded-field bg-primary-soft px-3.5 py-3 text-[13px] leading-relaxed text-primary">
          Silinen talepler burada saklanır — hiçbir veri kalıcı olarak
          silinmez. İstediğiniz zaman geri yükleyebilirsiniz.
        </p>

        {trash.length === 0 ? (
          <p className="rounded-[13px] border border-dashed border-border-card bg-white px-4 py-10 text-center text-sm text-faint-2">
            Çöp kutusu boş.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {trash.map((r) => (
              <div
                key={r.id}
                className="rounded-[13px] border border-border-card bg-white px-4 py-4 sm:px-[18px]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold tracking-[0.02em] text-faint">
                      {r.id} · {r.org}
                    </div>
                    <Link
                      href={`/admin/talep/${r.id.replace("#", "")}`}
                      className="mt-0.5 block break-words text-[15px] font-extrabold tracking-[-0.01em] hover:text-primary"
                    >
                      {r.title}
                    </Link>
                    <div className="mt-1.5 text-[13px] text-muted-2">
                      Silinme {r.deletedAt ?? r.updated} · Oluşturma {r.created}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusPill status={r.status} size="sm" />
                    <button
                      onClick={() => handleRestore(r.id)}
                      disabled={busyId === r.id}
                      className="min-h-11 rounded-[9px] border border-primary-soft-border bg-primary-soft px-4 py-2 text-[13px] font-bold text-primary transition-colors hover:bg-[#e4ebfa] disabled:opacity-60"
                    >
                      {busyId === r.id ? "Yükleniyor…" : "Geri yükle"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
