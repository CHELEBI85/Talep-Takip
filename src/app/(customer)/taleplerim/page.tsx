"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Chip } from "@/components/ui/Chip";
import { Pagination } from "@/components/ui/Pagination";
import { StatusPill } from "@/components/ui/StatusPill";
import { useStore } from "@/lib/store";
import { STATUSES, type Status } from "@/lib/types";

type Filter = "Tümü" | Status;
const FILTERS: Filter[] = ["Tümü", ...STATUSES];

const PAGE_SIZE = 10;

export default function TaleplerimPage() {
  const { myRequests } = useStore();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Filter>("Tümü");

  const list =
    filter === "Tümü"
      ? myRequests
      : myRequests.filter((r) => r.status === filter);

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => list.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [list, safePage]
  );

  return (
    <>
      <PageHeader
        title="Taleplerim"
        right={
          <Link
            href="/talep/yeni"
            className="inline-flex min-h-11 items-center rounded-[9px] bg-primary px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-primary-dark"
          >
            + Yeni Talep
          </Link>
        }
      />

      <div className="p-5 sm:p-7">
        {/* Filtre çipleri */}
        <div className="no-scrollbar -mx-5 mb-[18px] flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
          {FILTERS.map((f) => (
            <Chip
              key={f}
              active={filter === f}
              onClick={() => {
                setFilter(f);
                setPage(1);
              }}
            >
              {f}
            </Chip>
          ))}
        </div>

        {/* Kartlar */}
        {list.length === 0 ? (
          <p className="rounded-[13px] border border-dashed border-border-card bg-white px-4 py-10 text-center text-sm text-faint-2">
            Bu durumda talebiniz bulunmuyor.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {pageRows.map((r) => (
              <Link
                key={r.id}
                href={`/talep/${r.id.replace("#", "")}`}
                className="block rounded-[13px] border border-border-card bg-white px-4 py-4 transition-shadow hover:shadow-(--shadow-soft) sm:px-[18px]"
              >
                <div className="flex items-start justify-between gap-3.5">
                  <div className="min-w-0">
                    <div className="text-xs font-bold tracking-[0.02em] text-faint">
                      {r.id}
                    </div>
                    <div className="mt-0.5 break-words text-[15px] font-extrabold tracking-[-0.01em]">
                      {r.title}
                    </div>
                    <div className="mt-1.5 text-[13px] text-muted-2">
                      Oluşturma {r.created} · Güncelleme {r.updated}
                    </div>
                  </div>
                  <div className="shrink-0 pt-0.5">
                    <StatusPill status={r.status} />
                  </div>
                </div>

                {r.feedback && (
                  <div className="mt-3 break-words rounded-[9px] bg-panel px-3 py-2.5 text-[13px] leading-relaxed text-ink-3">
                    <span className="font-bold text-ink-2">Pax notu:</span>{" "}
                    {r.feedback}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}

        <Pagination
          page={safePage}
          pageSize={PAGE_SIZE}
          totalItems={list.length}
          onPageChange={setPage}
        />
      </div>
    </>
  );
}
