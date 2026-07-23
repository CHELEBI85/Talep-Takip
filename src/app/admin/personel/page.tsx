"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
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
  const { staff, requests, addStaff, removeStaff, seedStaff } = useStore();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const rows = staff.map((s) => {
    const assigned = requests.filter((r) => r.assignee === s.name);
    const active = assigned.filter(
      (r) => r.status !== "Tamamlandı" && r.status !== "İptal edildi"
    ).length;
    return { ...s, total: assigned.length, active };
  });

  async function run(action: () => Promise<void>, message: string) {
    setError("");
    setBusy(true);
    try {
      await action();
    } catch (e) {
      console.error(`${message}:`, e);
      setError(`${message} Bağlantınızı kontrol edip tekrar deneyin.`);
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd() {
    if (!name.trim()) return;
    await run(() => addStaff(name), "Personel eklenemedi.");
    setName("");
  }

  return (
    <>
      <PageHeader title="Personel" />

      <div className="p-5 sm:p-7">
        {/* ── Personel ekle ── */}
        <div className="mb-5 rounded-card border border-border-card bg-white p-4 sm:p-5">
          <div className="mb-3 text-[13px] font-extrabold uppercase tracking-[0.04em] text-muted-2">
            Personel ekle
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              placeholder="Ad Soyad"
              className="sm:flex-1"
            />
            <Button onClick={handleAdd} disabled={!name.trim() || busy}>
              Ekle
            </Button>
          </div>
          {error && (
            <div role="alert" className="mt-3 text-[13px] font-semibold text-[#c05a3a]">
              {error}
            </div>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="rounded-card border border-dashed border-border-card bg-white px-4 py-10 text-center">
            <p className="text-sm text-faint-2">
              Henüz personel eklenmemiş. Yukarıdaki formu kullanabilir ya da
              başlangıç listesini tek tıkla ekleyebilirsiniz.
            </p>
            <Button
              variant="soft"
              className="mt-4"
              disabled={busy}
              onClick={() =>
                run(() => seedStaff(), "Başlangıç listesi eklenemedi.")
              }
            >
              Başlangıç listesini ekle
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {rows.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-card border border-border-card bg-white p-4 sm:p-5"
              >
                <Avatar initials={initialsOf(s.name)} tone="soft" size={40} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{s.name}</div>
                  <div className="mt-0.5 text-[13px] text-muted-2">
                    {s.active} aktif · {s.total} toplam talep
                  </div>
                </div>
                <button
                  onClick={() =>
                    run(() => removeStaff(s.id), "Personel çıkarılamadı.")
                  }
                  disabled={busy}
                  aria-label={`${s.name} personelini listeden çıkar`}
                  className="min-h-11 shrink-0 rounded-field px-3 text-[13px] font-bold text-[#c05a3a] transition-colors hover:bg-[#fdf1ee] disabled:opacity-60"
                >
                  Çıkar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
