"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { Timeline } from "@/components/Timeline";
import { Select } from "@/components/ui/Field";
import { StatusPill } from "@/components/ui/StatusPill";
import { useRequestHistory, useStore } from "@/lib/store";
import { STATUSES, type Status } from "@/lib/types";

export default function AdminTalepDetayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const {
    getRequest,
    loading,
    staff,
    updateStatus,
    assignStaff,
    sendFeedback,
    softDelete,
    restore,
  } = useStore();
  const req = getRequest(id);
  const history = useRequestHistory(req);

  // Not kutusu: kullanıcı yazana kadar kayıtlı geri bildirimi gösterir.
  // Taslak, ait olduğu talep koduyla saklanır — veri sonradan geldiğinde
  // (doğrudan URL ile açılış) kutu bir effect'e gerek kalmadan dolar.
  const [draft, setDraft] = useState<{ id: string; text: string } | null>(null);
  const feedback =
    draft && req && draft.id === req.id ? draft.text : req?.feedback ?? "";
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Firestore yazmaları sessizce başarısız olmamalı: her mutasyon burada
  // beklenir ve hata kullanıcıya gösterilir.
  async function run(action: () => Promise<void>, message: string) {
    setError("");
    try {
      await action();
      return true;
    } catch (e) {
      console.error(`${message}:`, e);
      setError(`${message} Bağlantınızı kontrol edip tekrar deneyin.`);
      return false;
    }
  }

  if (loading && !req) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">
        Yükleniyor…
      </div>
    );
  }

  if (!req) {
    return (
      <div className="max-w-3xl p-5 sm:p-7">
        <Link
          href="/admin/talepler"
          className="text-[13px] font-semibold text-muted-2 hover:text-ink-2"
        >
          ← Talepler
        </Link>
        <p className="mt-6 rounded-[13px] border border-dashed border-border-card bg-white px-4 py-10 text-center text-sm text-faint-2">
          Talep bulunamadı.
        </p>
      </div>
    );
  }

  async function handleSend() {
    if (!feedback.trim() || !req) return;
    setBusy(true);
    const ok = await run(
      () => sendFeedback(req.id, feedback),
      "Not gönderilemedi."
    );
    setBusy(false);
    if (!ok) return;
    setSent(true);
    setTimeout(() => setSent(false), 2200);
  }

  async function handleDelete() {
    if (!req) return;
    setBusy(true);
    const ok = await run(
      () => softDelete(req.id),
      "Talep çöp kutusuna taşınamadı."
    );
    setBusy(false);
    if (ok) router.push("/admin/talepler");
  }

  async function handleRestore() {
    if (!req) return;
    setBusy(true);
    await run(() => restore(req.id), "Talep geri yüklenemedi.");
    setBusy(false);
  }

  return (
    <div className="p-5 sm:p-7">
      <Link
        href="/admin/talepler"
        className="text-[13px] font-semibold text-muted-2 hover:text-ink-2"
      >
        ← Talepler
      </Link>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-card border border-[#f0d2c9] bg-[#fdf1ee] px-4 py-3 text-[13px] font-semibold text-[#c05a3a]"
        >
          {error}
        </div>
      )}

      {/* Çöp kutusu uyarısı */}
      {req.deleted && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-[#f0d2c9] bg-[#fdf1ee] px-4 py-3">
          <div className="text-[13px] font-semibold text-[#c05a3a]">
            Bu talep çöp kutusunda ({req.deletedAt ?? req.updated}). Düzenleme
            için önce geri yükleyin.
          </div>
          <button
            onClick={handleRestore}
            disabled={busy}
            className="min-h-11 rounded-[9px] bg-primary px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
          >
            {busy ? "Yükleniyor…" : "Geri yükle"}
          </button>
        </div>
      )}

      {/* ── Başlık kartı ── */}
      <div className="mt-4 rounded-card border border-border-card bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-block rounded-full bg-panel px-2.5 py-1 text-xs font-bold tracking-[0.02em] text-muted-2">
                {req.id}
              </span>
              <span className="text-xs font-bold text-faint">{req.org}</span>
            </div>
            <h1 className="mt-2.5 break-words text-xl font-extrabold leading-snug tracking-[-0.01em] sm:text-2xl">
              {req.title}
            </h1>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full border border-border-input bg-panel px-3.5 py-2">
            <StatusPill status={req.status} />
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border-divider pt-3 text-[13px] text-muted-2">
          <span>
            Oluşturma <span className="font-semibold text-ink-2">{req.created}</span>
          </span>
          <span className="hidden text-border-input sm:inline">·</span>
          <span>
            Son güncelleme{" "}
            <span className="font-semibold text-ink-2">{req.updated}</span>
          </span>
          <span className="hidden text-border-input sm:inline">·</span>
          <span>
            Atanan <span className="font-semibold text-ink-2">{req.assignee}</span>
          </span>
        </div>
      </div>

      {/* ── İçerik + yönetim | geçmiş ── */}
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-4">
          {/* Açıklama */}
          <div className="rounded-card border border-border-card bg-white p-5 sm:p-6">
            <div className="mb-2.5 text-[13px] font-extrabold uppercase tracking-[0.04em] text-muted-2">
              Açıklama
            </div>
            <p className="break-words text-sm leading-[1.7] text-ink-3">
              {req.description}
            </p>
            {req.note && (
              <div className="mt-4 rounded-field bg-panel px-3.5 py-3">
                <span className="text-[13px] font-bold text-ink-2">Ek not: </span>
                <span className="break-words text-[13px] leading-relaxed text-ink-3">
                  {req.note}
                </span>
              </div>
            )}
          </div>

          {/* Yönetim: durum + atama + geri bildirim */}
          <div className="rounded-card border border-border-card bg-white p-5 sm:p-6">
            <div className="mb-4 text-[13px] font-extrabold uppercase tracking-[0.04em] text-muted-2">
              Talebi yönet
            </div>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <div className="mb-1.5 text-xs font-bold text-faint-2">Durum</div>
                <Select
                  value={req.status}
                  disabled={req.deleted}
                  onChange={(e) =>
                    run(
                      () => updateStatus(req.id, e.target.value as Status),
                      "Durum güncellenemedi."
                    )
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <div className="mb-1.5 text-xs font-bold text-faint-2">
                  Personele ata
                </div>
                <Select
                  value={req.assignee}
                  disabled={req.deleted}
                  onChange={(e) =>
                    run(
                      () => assignStaff(req.id, e.target.value),
                      "Atama yapılamadı."
                    )
                  }
                >
                  <option value="—">Atanmadı</option>
                  {/* Listeden çıkarılmış olsa bile mevcut atama görünür kalmalı */}
                  {req.assignee !== "—" &&
                    !staff.some((s) => s.name === req.assignee) && (
                      <option value={req.assignee}>{req.assignee}</option>
                    )}
                  {staff.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-1.5 text-xs font-bold text-faint-2">
                Müşteriye not / geri bildirim
              </div>
              <textarea
                value={feedback}
                onChange={(e) => setDraft({ id: req.id, text: e.target.value })}
                placeholder="Müşteriye iletilecek notu yazın…"
                className="min-h-22 w-full resize-y rounded-field border border-border-input bg-input px-3.5 py-3 text-sm leading-relaxed text-ink outline-none transition-colors focus:border-primary focus:bg-white"
              />
              <button
                onClick={handleSend}
                disabled={!feedback.trim() || req.deleted || busy}
                className="mt-2.5 min-h-11 w-full rounded-field bg-primary py-3 text-sm font-bold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sent ? "Gönderildi ✓" : "Notu kaydet & müşteriye bildir"}
              </button>
            </div>
          </div>
        </div>

        {/* Sağ sütun: geçmiş + tehlikeli işlem */}
        <div className="space-y-4">
          <div className="rounded-card border border-border-card bg-white p-5 sm:p-6">
            <div className="mb-4 text-[13px] font-extrabold uppercase tracking-[0.04em] text-muted-2">
              Talep geçmişi
            </div>
            <Timeline items={history} showBy />
          </div>

          {/* Soft-delete: talep çöp kutusuna taşınır, veri kaybolmaz. */}
          {!req.deleted && (
            <button
              onClick={handleDelete}
              disabled={busy}
              className="min-h-11 w-full rounded-field border border-[#f0d2c9] bg-white py-3 text-sm font-bold text-[#c05a3a] transition-colors hover:bg-[#fdf1ee] disabled:opacity-60"
            >
              {busy ? "Taşınıyor…" : "Çöp kutusuna taşı"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
