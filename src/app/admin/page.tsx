"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import { useStore } from "@/lib/store";
import { STATUSES } from "@/lib/types";

export default function AdminGenelBakisPage() {
  const { requests, customers } = useStore();

  const openCount = requests.filter(
    (r) => r.status !== "Tamamlandı" && r.status !== "İptal edildi"
  ).length;
  const waitingCount = requests.filter(
    (r) => r.status === "Bilgi bekleniyor"
  ).length;
  const doneCount = requests.filter((r) => r.status === "Tamamlandı").length;

  const stats = [
    { label: "Toplam talep", value: requests.length },
    { label: "Açık talep", value: openCount },
    { label: "Bilgi bekleyen", value: waitingCount },
    { label: "Tamamlanan", value: doneCount },
  ];

  const byStatus = STATUSES.map((s) => ({
    status: s,
    count: requests.filter((r) => r.status === s).length,
  }));

  const recent = requests.slice(0, 5);

  return (
    <>
      <PageHeader title="Genel Bakış" />

      <div className="p-5 sm:p-7">
        {/* Özet kutuları */}
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-card border border-border-card bg-white p-4 sm:p-5"
            >
              <div className="text-[28px] font-extrabold tracking-[-0.02em] text-primary">
                {s.value}
              </div>
              <div className="mt-1 text-[13px] font-semibold text-muted-2">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          {/* Son talepler */}
          <div className="rounded-card border border-border-card bg-white p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-extrabold">Son talepler</h2>
              <Link
                href="/admin/talepler"
                className="text-[13px] font-bold text-primary hover:underline"
              >
                Tümü →
              </Link>
            </div>
            <div className="flex flex-col">
              {recent.map((r, i) => (
                <Link
                  key={r.id}
                  href={`/admin/talep/${r.id.replace("#", "")}`}
                  className={`flex items-center justify-between gap-3 py-3 ${
                    i !== recent.length - 1
                      ? "border-b border-border-divider"
                      : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">{r.title}</div>
                    <div className="mt-0.5 text-xs font-semibold text-faint">
                      {r.org} · {r.id}
                    </div>
                  </div>
                  <StatusPill status={r.status} size="sm" />
                </Link>
              ))}
            </div>
          </div>

          {/* Durum dağılımı + müşteri sayısı */}
          <div className="flex flex-col gap-6">
            <div className="rounded-card border border-border-card bg-white p-5 sm:p-6">
              <h2 className="mb-4 text-sm font-extrabold">Durum dağılımı</h2>
              <div className="flex flex-col gap-3">
                {byStatus.map((b) => (
                  <div
                    key={b.status}
                    className="flex items-center justify-between"
                  >
                    <StatusPill status={b.status} size="sm" />
                    <span className="text-sm font-extrabold text-ink-2">
                      {b.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/admin/musteriler"
              className="rounded-card border border-border-card bg-white p-5 transition-shadow hover:shadow-(--shadow-soft) sm:p-6"
            >
              <div className="text-[28px] font-extrabold tracking-[-0.02em] text-primary">
                {customers.length}
              </div>
              <div className="mt-1 text-[13px] font-semibold text-muted-2">
                Kayıtlı müşteri →
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
