"use client";

import Link from "next/link";
import { use } from "react";
import { Timeline } from "@/components/Timeline";
import { StatusPill } from "@/components/ui/StatusPill";
import { useRequestHistory, useStore } from "@/lib/store";

export default function TalepDetayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { getRequest, loading } = useStore();
  const req = getRequest(id);
  const history = useRequestHistory(req);

  if (loading && !req) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">
        Yükleniyor…
      </div>
    );
  }

  // Çöp kutusuna taşınan talep müşteri görünümünde listelenmez.
  if (!req || req.deleted) {
    return (
      <div className="max-w-3xl p-5 sm:p-7">
        <Link
          href="/taleplerim"
          className="text-[13px] font-semibold text-muted-2 hover:text-ink-2"
        >
          ← Taleplerim
        </Link>
        <p className="mt-6 rounded-[13px] border border-dashed border-border-card bg-white px-4 py-10 text-center text-sm text-faint-2">
          Talep bulunamadı.
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-7">
      <Link
        href="/taleplerim"
        className="text-[13px] font-semibold text-muted-2 hover:text-ink-2"
      >
        ← Taleplerim
      </Link>

      {/* ── Başlık kartı ── */}
      <div className="mt-4 rounded-card border border-border-card bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-block rounded-full bg-panel px-2.5 py-1 text-xs font-bold tracking-[0.02em] text-muted-2">
              {req.id}
            </span>
            <h1 className="mt-2.5 break-words text-xl font-extrabold leading-snug tracking-[-0.01em] sm:text-2xl">
              {req.title}
            </h1>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full border border-border-input bg-panel px-3.5 py-2">
            <StatusPill status={req.status} />
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border-divider pt-3 text-[13px] text-muted-2">
          <span>
            Oluşturma <span className="font-semibold text-ink-2">{req.created}</span>
          </span>
          <span className="hidden text-border-input sm:inline">·</span>
          <span>
            Son güncelleme{" "}
            <span className="font-semibold text-ink-2">{req.updated}</span>
          </span>
        </div>
      </div>

      {/* ── İçerik + geçmiş ── */}
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-4">
          {/* Açıklama */}
          <div className="rounded-card border border-border-card bg-white p-5 sm:p-6">
            <div className="mb-2.5 text-[13px] font-extrabold uppercase tracking-[0.04em] text-muted-2">
              Açıklama
            </div>
            <p className="break-words text-sm leading-[1.7] text-ink-3">
              {req.description}
            </p>
            {req.note && (
              <div className="mt-4 rounded-field bg-panel px-3.5 py-3">
                <span className="text-[13px] font-bold text-ink-2">Ek not: </span>
                <span className="break-words text-[13px] leading-relaxed text-ink-3">
                  {req.note}
                </span>
              </div>
            )}
          </div>

          {/* Pax Medya geri bildirimi */}
          {req.feedback ? (
            <div className="rounded-card border border-[#d9e2f6] bg-primary-soft p-5 sm:p-6">
              <div className="mb-2.5 text-[13px] font-extrabold uppercase tracking-[0.04em] text-primary">
                Pax Medya geri bildirimi
              </div>
              <p className="break-words text-sm leading-[1.7] text-[#3d4763]">
                {req.feedback}
              </p>
            </div>
          ) : (
            <div className="rounded-card border border-dashed border-border-card bg-white px-5 py-6 text-center text-[13px] text-faint-2">
              Pax Medya ekibi geri bildirim eklediğinde burada görünecek.
            </div>
          )}
        </div>

        {/* Talep geçmişi */}
        <div className="rounded-card border border-border-card bg-white p-5 sm:p-6">
          <div className="mb-4 text-[13px] font-extrabold uppercase tracking-[0.04em] text-muted-2">
            Talep geçmişi
          </div>
          <Timeline items={history} />
        </div>
      </div>
    </div>
  );
}
