"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/lib/auth";
import { LogoutConfirmModal } from "./LogoutConfirmModal";

type NavItem = {
  label: string;
  href: string;
  match: (p: string) => boolean;
  superOnly?: boolean;
};

const NAV: NavItem[] = [
  { label: "Genel Bakis", href: "/admin", match: (p) => p === "/admin" },
  {
    label: "Talepler",
    href: "/admin/talepler",
    match: (p) => p.startsWith("/admin/talep"),
  },
  {
    label: "Musteriler",
    href: "/admin/musteriler",
    match: (p) => p.startsWith("/admin/musteriler"),
  },
  {
    label: "Personel",
    href: "/admin/personel",
    match: (p) => p.startsWith("/admin/personel"),
  },
  {
    label: "Ayarlar",
    href: "/admin/ayarlar",
    match: (p) => p.startsWith("/admin/ayarlar"),
    superOnly: true,
  },
  {
    label: "Cop Kutusu",
    href: "/admin/cop-kutusu",
    match: (p) => p.startsWith("/admin/cop-kutusu"),
  },
];

function initialsOf(name: string): string {
  return (
    name
      .split(/[\s@.]+/)
      .map((w) => w[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toLocaleUpperCase("tr") || "?"
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, isAdmin, adminRole, logout } = useAuth();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/giris");
    else if (!isAdmin) router.replace("/taleplerim");
  }, [loading, user, isAdmin, router]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        Yukleniyor...
      </div>
    );
  }

  const navItems = NAV.filter((item) => !item.superOnly || adminRole === "super_admin");
  const activeLabel = navItems.find((n) => n.match(pathname))?.label ?? "Talepler";
  const adminName = user.displayName || user.email || "Yonetici";

  async function confirmLogout() {
    setLogoutBusy(true);
    await logout();
    router.replace("/giris");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 flex-col overflow-hidden bg-admin p-4 pt-[22px] lg:flex">
        <div className="mx-1.5 mb-6 mt-1 flex shrink-0 items-center gap-2.5">
          <Image
            src="/pax-mark.png"
            alt="Pax"
            width={30}
            height={30}
            className="h-[30px] w-[30px] object-contain"
            priority
          />
          <span className="text-[15px] font-extrabold text-white">Pax Admin</span>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-field px-[13px] py-[11px] text-sm transition-colors ${
                    active
                      ? "bg-primary font-bold text-white"
                      : "font-semibold text-admin-muted hover:bg-white/5"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-[2px] ${
                      active ? "bg-[#a9c4f0]" : "bg-admin-dot"
                    }`}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="shrink-0 border-t border-admin-divider pt-4">
          <div className="flex items-center gap-2.5">
            <Avatar initials={initialsOf(adminName)} tone="orange" />
            <div className="min-w-0 leading-tight">
              <div className="truncate text-[13px] font-bold text-white">
                {adminName}
              </div>
              <div className="text-xs text-admin-user">Yonetici</div>
            </div>
          </div>
          <button
            onClick={() => setLogoutOpen(true)}
            className="mt-3 w-full rounded-[9px] border border-admin-divider py-2 text-[13px] font-semibold text-admin-muted transition-colors hover:bg-white/5 hover:text-white"
          >
            Cikis yap
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-panel">
        <div className="flex items-center justify-between bg-admin px-5 py-3 lg:hidden">
          <div className="flex items-center gap-2.5">
            <Image
              src="/pax-mark.png"
              alt="Pax"
              width={24}
              height={24}
              className="h-6 w-6 object-contain"
              priority
            />
            <span className="text-base font-extrabold text-white">
              Pax Admin - {activeLabel}
            </span>
          </div>
          <button
            onClick={() => setLogoutOpen(true)}
            className="text-[13px] font-semibold text-admin-muted"
          >
            Cikis
          </button>
        </div>

        <div className="flex-1 pb-24 lg:pb-0">{children}</div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-admin-divider bg-admin lg:hidden">
        {navItems.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-bold ${
                active ? "text-white" : "text-admin-muted"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-[2px] ${
                  active ? "bg-[#a9c4f0]" : "bg-admin-dot"
                }`}
              />
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
