"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/lib/auth";

type NavItem = { label: string; href: string; match: (p: string) => boolean };

const NAV: NavItem[] = [
  { label: "Yeni Talep", href: "/talep/yeni", match: (p) => p === "/talep/yeni" },
  {
    label: "Taleplerim",
    href: "/taleplerim",
    match: (p) =>
      p === "/taleplerim" || (p.startsWith("/talep/") && p !== "/talep/yeni"),
  },
];

function initialsOf(name: string): string {
  return (
    name
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toLocaleUpperCase("tr") || "?"
  );
}

export function CustomerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, org, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/giris");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        Yükleniyor…
      </div>
    );
  }

  const orgName = org || "Müşteri";

  return (
    <div className="flex min-h-screen">
      {/* ── Masaüstü sidebar ── */}
      <aside className="hidden w-[236px] shrink-0 flex-col border-r border-border-divider bg-white p-4 pt-[22px] lg:flex">
        <Link
          href="/taleplerim"
          className="mb-5 mt-1 flex justify-center"
        >
          <Image
            src="/pax-logo.png"
            alt="Pax Medya"
            width={88}
            height={88}
            className="h-22 w-22 object-contain"
            priority
          />
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-field px-[13px] py-[11px] text-sm transition-colors ${
                  active
                    ? "bg-primary-soft font-bold text-primary"
                    : "font-semibold text-[#5a627a] hover:bg-panel"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-[2px] ${
                    active ? "bg-primary" : "bg-[#c3c9d8]"
                  }`}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex-1" />
        <div className="border-t border-border-divider pt-4">
          <div className="flex items-center gap-2.5">
            <Avatar initials={initialsOf(orgName)} tone="primary" />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[13px] font-bold">{orgName}</div>
              <div className="text-xs text-muted-2">Müşteri</div>
            </div>
          </div>
          <button
            onClick={() => logout().then(() => router.replace("/giris"))}
            className="mt-3 w-full rounded-[9px] border border-border-input py-2 text-[13px] font-semibold text-muted-2 transition-colors hover:bg-panel hover:text-ink-2"
          >
            Çıkış yap
          </button>
        </div>
      </aside>

      {/* ── İçerik ── */}
      <div className="flex min-w-0 flex-1 flex-col bg-panel">
        {/* Mobil marka çubuğu */}
        <div className="flex items-center justify-between border-b border-border-divider bg-white px-5 py-3 lg:hidden">
          <Image
            src="/pax-logo.png"
            alt="Pax Medya"
            width={44}
            height={44}
            className="h-11 w-11 object-contain"
            priority
          />
          <button
            onClick={() => logout().then(() => router.replace("/giris"))}
            aria-label="Çıkış yap"
            className="flex items-center gap-2"
          >
            <Avatar initials={initialsOf(orgName)} tone="primary" size={32} />
          </button>
        </div>

        <div className="flex-1 pb-24 lg:pb-0">{children}</div>
      </div>

      {/* ── Mobil alt navigasyon ── */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border-divider bg-white lg:hidden">
        {NAV.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-xs font-bold ${
                active ? "text-primary" : "text-muted-2"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-[2px] ${
                  active ? "bg-primary" : "bg-[#c3c9d8]"
                }`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
