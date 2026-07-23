"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";

function initialsOf(name: string): string {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toLocaleUpperCase("tr") || "?"
  );
}

export default function ProfilPage() {
  const { user } = useAuth();
  const { org, myRequests } = useStore();
  const orgName = org || user?.displayName || "Musteri";
  const openCount = myRequests.filter(
    (request) =>
      request.status !== "Tamamlandı" && request.status !== "İptal edildi"
  ).length;
  const doneCount = myRequests.filter(
    (request) => request.status === "Tamamlandı"
  ).length;
  const lastRequest = myRequests[0];

  return (
    <>
      <PageHeader title="Profil" />

      <div className="grid grid-cols-1 gap-6 p-5 sm:p-7 lg:grid-cols-[360px_1fr]">
        <section className="rounded-card border border-border-card bg-white p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <Avatar initials={initialsOf(orgName)} tone="primary" size={56} />
            <div className="min-w-0">
              <h2 className="truncate text-lg font-extrabold text-ink">{orgName}</h2>
              <p className="mt-0.5 truncate text-sm font-semibold text-muted-2">
                {user?.email ?? "-"}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-field border border-border-input bg-panel p-4">
              <div className="text-2xl font-extrabold text-primary">
                {myRequests.length}
              </div>
              <div className="mt-1 text-xs font-bold text-muted-2">Toplam talep</div>
            </div>
            <div className="rounded-field border border-border-input bg-panel p-4">
              <div className="text-2xl font-extrabold text-primary">{openCount}</div>
              <div className="mt-1 text-xs font-bold text-muted-2">Acik talep</div>
            </div>
          </div>

          <Link
            href="/talep/yeni"
            className="mt-5 flex min-h-11 w-full items-center justify-center rounded-field bg-primary px-[18px] py-[13px] text-sm font-bold text-white transition-colors hover:bg-primary-dark"
          >
            Yeni talep olustur
          </Link>
        </section>

        <section className="rounded-card border border-border-card bg-white p-5 sm:p-6">
          <h2 className="text-sm font-extrabold">Hesap ozeti</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-field border border-border-input px-4 py-3">
              <div className="text-xs font-bold text-muted-2">Kurum</div>
              <div className="mt-1 truncate text-sm font-extrabold">{orgName}</div>
            </div>
            <div className="rounded-field border border-border-input px-4 py-3">
              <div className="text-xs font-bold text-muted-2">E-posta</div>
              <div className="mt-1 truncate text-sm font-extrabold">
                {user?.email ?? "-"}
              </div>
            </div>
            <div className="rounded-field border border-border-input px-4 py-3">
              <div className="text-xs font-bold text-muted-2">Tamamlanan</div>
              <div className="mt-1 text-sm font-extrabold">{doneCount}</div>
            </div>
          </div>

          <div className="mt-6 rounded-field border border-border-input bg-panel px-4 py-4">
            <div className="text-xs font-bold uppercase text-muted-2">Son hareket</div>
            {lastRequest ? (
              <div className="mt-2">
                <div className="text-sm font-extrabold">{lastRequest.title}</div>
                <div className="mt-1 text-[13px] font-semibold text-muted-2">
                  {lastRequest.id} - {lastRequest.status} - {lastRequest.created}
                </div>
              </div>
            ) : (
              <div className="mt-2 text-sm font-semibold text-muted-2">
                Henuz talep olusturulmamis.
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
