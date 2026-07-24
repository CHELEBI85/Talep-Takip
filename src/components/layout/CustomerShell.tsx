"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ClipboardList,
  PlusCircle,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/lib/auth";
import { LogoutConfirmModal } from "./LogoutConfirmModal";

type NavItem = {
  label: string;
  href: string;
  match: (p: string) => boolean;
  icon: LucideIcon;
};

const NAV: NavItem[] = [
  {
    label: "Yeni Talep",
    href: "/talep/yeni",
    match: (p) => p === "/talep/yeni",
    icon: PlusCircle,
  },
  {
    label: "Taleplerim",
    href: "/taleplerim",
    match: (p) =>
      p === "/taleplerim" || (p.startsWith("/talep/") && p !== "/talep/yeni"),
    icon: ClipboardList,
  },
  { label: "Profil", href: "/profil", match: (p) => p === "/profil", icon: UserRound },
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
  const { user, loading, isAdmin, org, logout } = useAuth();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/giris");
    else if (isAdmin) router.replace("/admin");
  }, [loading, user, isAdmin, router]);

  if (loading || !user || isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        Yukleniyor...
      </div>
    );
  }

  const orgName = org || "Musteri";

  async function confirmLogout() {
    setLogoutBusy(true);
    await logout();
    router.replace("/giris");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 flex-col overflow-hidden border-r border-border-divider bg-white p-4 pt-[22px] lg:flex">
        <Link href="/taleplerim" className="mb-5 mt-1 flex shrink-0 justify-center">
          <Image
            src="/pax-logo.png"
            alt="Pax Medya"
            width={88}
            height={88}
            className="h-22 w-22 object-contain"
            priority
          />
        </Link>
        <nav className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="flex flex-col gap-1">
            {NAV.map((item) => {
              const active = item.match(pathname);
              const Icon = item.icon;
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
                  <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={2.2} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="shrink-0 border-t border-border-divider pt-4">
          <div className="flex items-center gap-2.5">
            <Avatar initials={initialsOf(orgName)} tone="primary" />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[13px] font-bold">{orgName}</div>
              <div className="text-xs text-muted-2">Musteri</div>
            </div>
          </div>
          <button
            onClick={() => setLogoutOpen(true)}
            className="mt-3 w-full rounded-[9px] border border-border-input py-2 text-[13px] font-semibold text-muted-2 transition-colors hover:bg-panel hover:text-ink-2"
          >
            Cikis yap
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-panel">
        <div className="flex items-center justify-between gap-3 border-b border-border-divider bg-white px-4 py-3 lg:hidden">
          <Image
            src="/pax-logo.png"
            alt="Pax Medya"
            width={44}
            height={44}
            className="h-11 w-11 object-contain"
            priority
          />
          <button
            onClick={() => setLogoutOpen(true)}
            aria-label="Cikis yap"
            className="flex items-center gap-2"
          >
            <Avatar initials={initialsOf(orgName)} tone="primary" size={32} />
          </button>
        </div>

        <div className="flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">
          {children}
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border-divider bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {NAV.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-[86px] flex-1 flex-col items-center justify-center gap-1 px-2 py-2.5 text-center text-xs font-bold ${
                active ? "text-primary" : "text-muted-2"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <LogoutConfirmModal
        open={logoutOpen}
        busy={logoutBusy}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={confirmLogout}
      />
    </div>
  );
}
