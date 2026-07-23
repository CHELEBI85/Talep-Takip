"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
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

export default function AdminPersonelPage() {
  const { staff, requests, createStaffAccount, removeStaff } = useStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const rows = staff.map((person) => {
    const assigned = requests.filter((request) => request.assignee === person.name);
    const active = assigned.filter(
      (request) =>
        request.status !== "Tamamlandı" && request.status !== "İptal edildi"
    ).length;
    return { ...person, total: assigned.length, active };
  });

  async function run(action: () => Promise<void>, success: string) {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await action();
      setMessage(success);
    } catch (e) {
      console.error("staff action:", e);
      setError(e instanceof Error ? e.message : "Islem tamamlanamadi.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateAccount() {
    if (!name.trim() || !email.trim() || password.length < 6) return;
    await run(
      () =>
        createStaffAccount({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      "Personel hesabi acildi ve admin olarak tanimlandi."
    );
    setName("");
    setEmail("");
    setPassword("");
  }

  return (
    <>
      <PageHeader title="Personel" />

      <div className="p-5 sm:p-7">
        <section className="mb-5 rounded-card border border-border-card bg-white p-4 sm:p-5">
          <div className="mb-4">
            <h2 className="text-sm font-extrabold">Personel hesabi ac</h2>
            <p className="mt-1 text-[13px] font-semibold text-muted-2">
              Buradan acilan hesap otomatik Admin olur ve admin paneline giris yapabilir.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_220px_auto]">
            <div>
              <Label htmlFor="staff-name" className="mb-1.5">
                Ad Soyad
              </Label>
              <Input
                id="staff-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ad Soyad"
              />
            </div>
            <div>
              <Label htmlFor="staff-email" className="mb-1.5">
                E-posta
              </Label>
              <Input
                id="staff-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="personel@paxmedya.com"
              />
            </div>
            <div>
              <Label htmlFor="staff-password" className="mb-1.5">
                Sifre
              </Label>
              <Input
                id="staff-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="En az 6 karakter"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleCreateAccount}
                disabled={
                  busy || !name.trim() || !email.trim() || password.length < 6
                }
              >
                Hesap ac
              </Button>
            </div>
          </div>

          {message && (
            <div className="mt-3 rounded-field border border-border-input bg-panel px-3.5 py-2.5 text-[13px] font-semibold text-ink-2">
              {message}
            </div>
          )}
          {error && (
            <div className="mt-3 rounded-field border border-[#f0d2c9] bg-[#fdf1ee] px-3.5 py-2.5 text-[13px] font-semibold text-[#c05a3a]">
              {error}
            </div>
          )}
        </section>

        {rows.length === 0 ? (
          <div className="rounded-card border border-dashed border-border-card bg-white px-4 py-10 text-center text-sm text-faint-2">
            Henuz personel hesabi acilmamis.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {rows.map((person) => (
              <div
                key={person.id}
                className="flex items-center gap-3 rounded-card border border-border-card bg-white p-4 sm:p-5"
              >
                <Avatar initials={initialsOf(person.name)} tone="soft" size={40} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{person.name}</div>
                  <div className="mt-0.5 truncate text-[13px] text-muted-2">
                    {person.email || "E-posta yok"}
                  </div>
                  <div className="mt-0.5 text-xs font-semibold text-faint">
                    {person.active} aktif - {person.total} toplam talep
                  </div>
                </div>
                <button
                  onClick={() =>
                    run(() => removeStaff(person.id), "Personel listeden kaldirildi.")
                  }
                  disabled={busy}
                  aria-label={`${person.name} personelini listeden kaldir`}
                  className="min-h-11 shrink-0 rounded-field px-3 text-[13px] font-bold text-[#c05a3a] transition-colors hover:bg-[#fdf1ee] disabled:opacity-60"
                >
                  Kaldir
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
