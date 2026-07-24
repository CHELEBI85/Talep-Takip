"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { StatusPill } from "@/components/ui/StatusPill";
import { useStore } from "@/lib/store";
import { STATUSES } from "@/lib/types";

const COLS = "grid-cols-[1.6fr_1.1fr_1fr_1fr_0.9fr]";
const PAGE_SIZE = 20;

export default function AdminTaleplerPage() {
  const { requests, customers, staff, hasMore, loadMore } = useStore();

  const [org, setOrg] = useState("Tümü");
  const [status, setStatus] = useState("Tümü");
  const [assignee, setAssignee] = useState("Tümü");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const list = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr");
    return requests.filter((r) => {
      if (org !== "Tümü" && r.org !== org) return false;
      if (status !== "Tümü" && r.status !== status) return false;
      if (assignee !== "Tümü" && r.assignee !== assignee) return false;
      if (
        q &&
        !r.title.toLocaleLowerCase("tr").includes(q) &&
        !r.org.toLocaleLowerCase("tr").includes(q) &&
        !r.id.toLocaleLowerCase("tr").includes(q)
      )
        return false;
      return true;
    });
  }, [requests, org, status, assignee, search]);

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => list.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [list, safePage]
  );

  const href = (id: string) => `/admin/talep/${id.replace("#", "")}`;

  return (
    <>
      <PageHeader
        title="Gelen Talepler"
        right={
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Ara: talep, kurum…"
            className="w-full min-w-0 rounded-[9px] border border-border-input bg-[#f2f4f9] px-3.5 py-2.5 text-[13px] font-medium text-ink outline-none placeholder:text-faint-2 focus:border-primary focus:bg-white sm:w-64"
          />
        }
      />

      <div className="p-5 sm:p-7">
        {/* Filtre çubuğu */}
        <div className="mb-[18px] flex flex-wrap items-center gap-3">
          <FilterSelect
            label="Kurum"
            value={org}
            onChange={(value) => {
              setOrg(value);
              setPage(1);
            }}
            options={customers.map((c) => c.name)}
          />
          <FilterSelect
            label="Durum"
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            options={[...STATUSES]}
          />
          <FilterSelect
            label="Atanan"
            value={assignee}
            onChange={(value) => {
              setAssignee(value);
              setPage(1);
            }}
            options={[...staff.map((s) => s.name), "—"]}
          />
          <div className="ml-auto self-center text-[13px] font-semibold text-muted-2">
            {list.length} talep
          </div>
        </div>

        {/* ── Masaüstü tablo ── */}
        <div className="hidden overflow-hidden rounded-card border border-border-card bg-white sm:block">
          <div
            className={`grid ${COLS} border-b border-[#eceff5] bg-[#fafbfd] px-[18px] py-3 text-xs font-extrabold uppercase tracking-[0.03em] text-muted-2`}
          >
            <span>Talep</span>
            <span>Kurum</span>
            <span>Durum</span>
            <span>Atanan</span>
            <span>Güncelleme</span>
          </div>
          {pageRows.map((r) => (
            <Link
              key={r.id}
              href={href(r.id)}
              className={`grid ${COLS} items-center border-b border-[#f1f3f8] px-[18px] py-[15px] transition-colors last:border-0 hover:bg-panel`}
            >
              <div className="min-w-0 pr-3">
                <div className="truncate text-sm font-bold tracking-[-0.01em]">
                  {r.title}
                </div>
                <div className="mt-0.5 text-xs font-semibold text-faint">
                  {r.id}
                </div>
              </div>
              <div className="pr-3 text-[13px] font-semibold text-ink-3">
                {r.org}
              </div>
              <StatusPill status={r.status} />
              <div className="text-[13px] font-semibold text-ink-3">
                {r.assignee}
              </div>
              <div className="text-[13px] text-muted-2">{r.updated}</div>
            </Link>
          ))}
          {list.length === 0 && <EmptyRow />}
        </div>

        {/* ── Mobil kart listesi ── */}
        <div className="flex flex-col gap-3 sm:hidden">
          {pageRows.map((r) => (
            <Link
              key={r.id}
              href={href(r.id)}
              className="block rounded-[12px] border border-border-card bg-white px-3.5 py-3.5"
            >
              <div className="break-words text-sm font-extrabold leading-snug">
                {r.title}
              </div>
              <div className="mt-1 text-xs font-semibold text-muted-2">
                {r.org} · {r.id}
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="text-xs text-faint-2">{r.assignee}</span>
                <StatusPill status={r.status} size="sm" />
              </div>
            </Link>
          ))}
          {list.length === 0 && (
            <p className="rounded-[12px] border border-dashed border-border-card bg-white px-4 py-8 text-center text-sm text-faint-2">
              Eşleşen talep yok.
            </p>
          )}
        </div>

        {/* Liste en yeni taleplerle sınırlıdır; daha eskiler istek üzerine gelir. */}
        <Pagination
          page={safePage}
          pageSize={PAGE_SIZE}
          totalItems={list.length}
          onPageChange={setPage}
        />

        {hasMore && (
          <div className="mt-4 text-center">
            <button
              onClick={loadMore}
              className="min-h-11 rounded-field border border-border-input bg-white px-5 py-3 text-sm font-bold text-ink-2 transition-colors hover:bg-panel"
            >
              Daha eski talepleri yükle
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="relative flex items-center gap-2 rounded-[9px] border border-border-input bg-white px-3.5 py-2.5 text-[13px] font-semibold text-ink-2">
      <span>{label}:</span>
      <span className="font-bold">{value}</span>
      <span className="text-[#b7bdcd]">▾</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        <option value="Tümü">Tümü</option>
        {options.map((o, i) => (
          <option key={`${o}-${i}`} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function EmptyRow() {
  return (
    <div className="px-[18px] py-10 text-center text-sm text-faint-2">
      Eşleşen talep yok.
    </div>
  );
}
