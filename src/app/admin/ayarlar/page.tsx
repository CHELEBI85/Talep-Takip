"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { useAuth } from "@/lib/auth";
import { ADMIN_EMAILS } from "@/lib/firebase";
import { useStore } from "@/lib/store";
import type { AdminRole, NotificationRule } from "@/lib/types";

const ROLES: { value: AdminRole; label: string }[] = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
];

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parseEmails(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[\s,;]+/)
        .map(normalizeEmail)
        .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    )
  );
}

export default function AdminAyarlarPage() {
  const router = useRouter();
  const {
    admins,
    customers,
    notificationSettings,
    addAdmin,
    updateAdminRole,
    removeAdmin,
    setNotificationRecipients,
    setNotificationRules,
  } = useStore();
  const { user, adminRole, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("admin");
  const [recipientsDraft, setRecipientsDraft] = useState<string | null>(null);
  const [ruleEmail, setRuleEmail] = useState("");
  const [ruleCustomer, setRuleCustomer] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const recipientsText =
    recipientsDraft ?? notificationSettings.recipients.join("\n");

  useEffect(() => {
    if (!loading && adminRole !== "super_admin") router.replace("/admin");
  }, [loading, adminRole, router]);

  const adminRows = useMemo(() => {
    const envRows = ADMIN_EMAILS.map((adminEmail) => ({
      id: adminEmail,
      email: adminEmail,
      role: "super_admin" as AdminRole,
      source: "env",
    }));
    const dbRows = admins.map((admin) => ({ ...admin, source: "panel" }));
    const merged = new Map<string, (typeof envRows)[number] | (typeof dbRows)[number]>();
    [...envRows, ...dbRows].forEach((row) => merged.set(row.email, row));
    return Array.from(merged.values()).sort((a, b) => a.email.localeCompare(b.email));
  }, [admins]);

  const customerOptions = useMemo(
    () =>
      customers
        .map((customer) => customer.name)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "tr")),
    [customers]
  );

  if (loading || adminRole !== "super_admin") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        Yukleniyor...
      </div>
    );
  }

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      setMessage(success);
    } catch (e) {
      console.error("settings action:", e);
      setMessage("Islem tamamlanamadi. Baglantinizi ve Firestore kurallarini kontrol edin.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddAdmin() {
    const normalized = normalizeEmail(email);
    if (!normalized) return;
    await run(() => addAdmin(normalized, role), "Admin kaydedildi.");
    setEmail("");
    setRole("admin");
  }

  async function handleSaveRecipients() {
    await run(
      () => setNotificationRecipients(parseEmails(recipientsText)),
      "Genel mail alicilari kaydedildi."
    );
    setRecipientsDraft(null);
  }

  async function saveRules(rules: NotificationRule[], success: string) {
    await run(() => setNotificationRules(rules), success);
  }

  async function handleAddRule() {
    const normalized = normalizeEmail(ruleEmail);
    if (!normalized || !ruleCustomer) return;
    const next = [
      ...notificationSettings.rules.filter(
        (rule) => !(rule.email === normalized && rule.customer === ruleCustomer)
      ),
      { email: normalized, customer: ruleCustomer },
    ];
    await saveRules(next, "Musteri bazli mail kurali kaydedildi.");
    setRuleEmail("");
    setRuleCustomer("");
  }

  return (
    <>
      <PageHeader title="Ayarlar" />

      <div className="grid grid-cols-1 gap-6 p-5 sm:p-7 xl:grid-cols-[1fr_440px]">
        <section className="rounded-card border border-border-card bg-white p-5 sm:p-6">
          <div className="mb-4">
            <h2 className="text-sm font-extrabold">Adminler ve roller</h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px_auto]">
            <div>
              <Label htmlFor="admin-email" className="mb-1.5">
                E-posta
              </Label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@paxmedya.com"
              />
            </div>
            <div>
              <Label htmlFor="admin-role" className="mb-1.5">
                Rol
              </Label>
              <Select
                id="admin-role"
                value={role}
                onChange={(e) => setRole(e.target.value as AdminRole)}
              >
                {ROLES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddAdmin} disabled={busy || !normalizeEmail(email)}>
                Ekle
              </Button>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-card border border-border-card">
            {adminRows.map((admin) => {
              const isEnv = admin.source === "env";
              const isCurrent = user?.email?.toLowerCase() === admin.email;
              return (
                <div
                  key={admin.email}
                  className="grid grid-cols-1 gap-3 border-b border-border-divider p-4 last:border-b-0 sm:grid-cols-[1fr_190px_auto]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">{admin.email}</div>
                    <div className="mt-0.5 text-xs font-semibold text-muted-2">
                      {isEnv ? "Ortam degiskeninden geliyor" : "Panelden eklendi"}
                    </div>
                  </div>
                  <Select
                    value={admin.role}
                    disabled={busy || isEnv}
                    onChange={(e) =>
                      run(
                        () => updateAdminRole(admin.email, e.target.value as AdminRole),
                        "Rol guncellendi."
                      )
                    }
                  >
                    {ROLES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </Select>
                  <button
                    disabled={busy || isEnv || isCurrent}
                    onClick={() => run(() => removeAdmin(admin.email), "Admin kaldirildi.")}
                    className="min-h-11 rounded-field px-3 text-[13px] font-bold text-[#c05a3a] transition-colors hover:bg-[#fdf1ee] disabled:opacity-50"
                  >
                    Kaldir
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-card border border-border-card bg-white p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-extrabold">Mail bildirimleri</h2>

          <Label htmlFor="notify-emails" className="mb-1.5">
            Butun taleplerin gidecegi mail adresleri
          </Label>
          <Textarea
            id="notify-emails"
            value={recipientsText}
            onChange={(e) => setRecipientsDraft(e.target.value)}
            placeholder="paxmedya26@gmail.com"
            className="min-h-[130px]"
          />
          <div className="mt-3 rounded-field border border-border-input bg-panel px-3.5 py-2.5 text-[13px] font-semibold text-muted-2">
            {parseEmails(recipientsText).length} gecerli alici. Virgul, noktali virgul veya yeni satir kullanabilirsiniz.
          </div>
          <Button
            fullWidth
            className="mt-4"
            onClick={handleSaveRecipients}
            disabled={busy}
          >
            Genel mail alicilarini kaydet
          </Button>

          <div className="mt-7 border-t border-border-divider pt-5">
            <h3 className="mb-4 text-sm font-extrabold">Musteriye gore mail</h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label htmlFor="rule-email" className="mb-1.5">
                  Personel mail adresi
                </Label>
                <Input
                  id="rule-email"
                  type="email"
                  value={ruleEmail}
                  onChange={(e) => setRuleEmail(e.target.value)}
                  placeholder="personel@paxmedya.com"
                />
              </div>
              <div>
                <Label htmlFor="rule-customer" className="mb-1.5">
                  Sadece bu musterinin talepleri
                </Label>
                <Select
                  id="rule-customer"
                  value={ruleCustomer}
                  onChange={(e) => setRuleCustomer(e.target.value)}
                >
                  <option value="">Musteri sec</option>
                  {customerOptions.map((customer) => (
                    <option key={customer} value={customer}>
                      {customer}
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                variant="soft"
                onClick={handleAddRule}
                disabled={busy || !normalizeEmail(ruleEmail) || !ruleCustomer}
              >
                Kural ekle
              </Button>
            </div>

            <div className="mt-4 overflow-hidden rounded-card border border-border-card">
              {notificationSettings.rules.length === 0 ? (
                <div className="p-4 text-[13px] font-semibold text-muted-2">
                  Henuz musteri bazli mail kurali yok.
                </div>
              ) : (
                notificationSettings.rules.map((rule) => (
                  <div
                    key={`${rule.email}-${rule.customer}`}
                    className="grid grid-cols-1 gap-2 border-b border-border-divider p-4 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold">{rule.email}</div>
                      <div className="mt-0.5 text-xs font-semibold text-muted-2">
                        {rule.customer} talepleri
                      </div>
                    </div>
                    <button
                      disabled={busy}
                      onClick={() =>
                        saveRules(
                          notificationSettings.rules.filter(
                            (item) =>
                              item.email !== rule.email ||
                              item.customer !== rule.customer
                          ),
                          "Mail kurali kaldirildi."
                        )
                      }
                      className="min-h-10 justify-self-start rounded-field px-3 text-[13px] font-bold text-[#c05a3a] transition-colors hover:bg-[#fdf1ee] disabled:opacity-50"
                    >
                      Kaldir
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-5 rounded-field border border-border-input bg-panel px-3.5 py-3 text-[13px] leading-relaxed text-muted-2">
            Gonderim icin sunucuda <span className="font-bold text-ink-2">RESEND_API_KEY</span>{" "}
            tanimli olmali. Gonderen adres icin{" "}
            <span className="font-bold text-ink-2">RESEND_FROM_EMAIL</span> kullanilir.
          </div>
          {message && (
            <div className="mt-4 rounded-field border border-border-input bg-white px-3.5 py-2.5 text-[13px] font-semibold text-ink-2">
              {message}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
