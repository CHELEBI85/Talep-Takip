"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { useStore } from "@/lib/store";

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase("tr");
}

export default function AdminPersonelPage() {
  const { staff, requests } = useStore();

  const rows = staff.map((name) => {
    const assigned = requests.filter((r) => r.assignee === name);
    const active = assigned.filter(
      (r) => r.status !== "Tamamlandı" && r.status !== "İptal edildi"
    ).length;
    return { name, total: assigned.length, active };
  });

  return (
    <>
      <PageHeader title="Personel" />

      <div className="p-5 sm:p-7">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {rows.map((s) => (
            <div
              key={s.name}
              className="flex items-center gap-3 rounded-card border border-border-card bg-white p-4 sm:p-5"
            >
              <Avatar initials={initialsOf(s.name)} tone="soft" size={40} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold">{s.name}</div>
                <div className="mt-0.5 text-[13px] text-muted-2">
                  {s.active} aktif · {s.total} toplam talep
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
