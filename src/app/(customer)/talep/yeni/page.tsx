"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { useStore } from "@/lib/store";
import type { DraftRequest } from "@/lib/types";

function draftMeta(d: DraftRequest): string {
  const lead = d.note?.trim() ? "Açıklama + ek not" : "Açıklama";
  const desc = d.description.trim();
  const snippet = desc.length > 46 ? `${desc.slice(0, 46)}…` : desc;
  return snippet ? `${lead} · ${snippet}` : lead;
}

export default function YeniTalepPage() {
  const router = useRouter();
  const { org, drafts, addDraft, updateDraft, removeDraft, submitDrafts } =
    useStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const canAdd = title.trim().length > 0 && description.trim().length > 0;

  function resetForm() {
    setTitle("");
    setDescription("");
    setNote("");
    setEditingId(null);
  }

  function handleAdd() {
    if (!canAdd) return;
    const payload = { title: title.trim(), description: description.trim(), note };
    if (editingId) updateDraft(editingId, payload);
    else addDraft(payload);
    resetForm();
  }

  function handleEdit(d: DraftRequest) {
    setTitle(d.title);
    setDescription(d.description);
    setNote(d.note ?? "");
    setEditingId(d.id);
  }

  function handleRemove(id: string) {
    if (editingId === id) resetForm();
    removeDraft(id);
  }

  async function handleSubmit() {
    setSubmitError("");
    setSubmitting(true);
    try {
      const n = await submitDrafts();
      if (n > 0) router.push("/taleplerim");
    } catch (e) {
      console.error("submitDrafts:", e);
      setSubmitError(
        "Talepler gönderilemedi. Bağlantınızı kontrol edip tekrar deneyin."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Yeni Talep Oluştur"
        right={
          <div className="text-[13px] font-semibold text-muted-2">
            Kurum: <span className="text-ink-2">{org}</span>
          </div>
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_360px]">
        {/* ── Form ── */}
        <div className="rounded-card border border-border-card bg-white p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-extrabold">
            {editingId ? "Talebi düzenle" : "Talep bilgileri"}
          </h2>

          <Label htmlFor="title" className="mb-1.5">
            Talep başlığı
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Örn. Sosyal medya görseli hazırlanması"
            className="mb-4"
          />

          <Label htmlFor="desc" className="mb-1.5">
            Talep açıklaması
          </Label>
          <Textarea
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Talebinizi mümkün olduğunca ayrıntılı açıklayın."
            className="mb-4 min-h-[92px]"
          />

          <Label htmlFor="note" optional className="mb-1.5">
            Ek not
          </Label>
          <Input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Öncelik, teslim tarihi vb."
            className="mb-4"
          />

          <div className="flex items-center gap-3">
            <Button variant="soft" onClick={handleAdd} disabled={!canAdd}>
              {editingId ? "Değişikliği kaydet" : "+ Listeye ekle"}
            </Button>
            <Button variant="ghost" onClick={resetForm} type="button">
              {editingId ? "Vazgeç" : "Temizle"}
            </Button>
          </div>
        </div>

        {/* ── Eklenen talepler ── */}
        <div className="rounded-card border border-border-card bg-white p-5 sm:p-[22px]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-extrabold">Eklenen talepler</h2>
            <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-bold text-primary">
              {drafts.length}
            </span>
          </div>

          {drafts.length === 0 ? (
            <p className="rounded-[11px] border border-dashed border-border-input px-4 py-6 text-center text-[13px] leading-relaxed text-faint-2">
              Henüz talep eklemediniz. Soldaki formu doldurup
              <br />“+ Listeye ekle” ile buraya ekleyin.
            </p>
          ) : (
            <div className="mb-1.5">
              {drafts.map((d) => (
                <div
                  key={d.id}
                  className="mb-3 rounded-[11px] border border-[#eceff5] px-3.5 py-3.5"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 break-words text-sm font-bold leading-snug">
                      {d.title}
                    </div>
                    <div className="flex shrink-0 gap-2.5 text-xs font-bold">
                      <button
                        onClick={() => handleEdit(d)}
                        className="text-primary-light hover:underline"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => handleRemove(d.id)}
                        className="text-[#c3785f] hover:underline"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                  <div className="mt-1.5 break-words text-xs leading-relaxed text-muted-2">
                    {draftMeta(d)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!org && drafts.length > 0 && (
            <div className="mb-2.5 rounded-field border border-border-input bg-panel px-3.5 py-2.5 text-[13px] font-semibold text-muted-2">
              Kurum profiliniz yükleniyor…
            </div>
          )}
          {submitError && (
            <div className="mb-2.5 rounded-field border border-[#f0d2c9] bg-[#fdf1ee] px-3.5 py-2.5 text-[13px] font-semibold text-[#c05a3a]">
              {submitError}
            </div>
          )}
          <Button
            fullWidth
            className="mt-1.5 py-3.5 text-[15px]"
            onClick={handleSubmit}
            disabled={drafts.length === 0 || submitting || !org}
          >
            {submitting
              ? "Gönderiliyor…"
              : `Talepleri Gönder (${drafts.length})`}
          </Button>
          <p className="mt-3 text-center text-xs leading-relaxed text-faint-2">
            Birden fazla talebi tek seferde gönderebilirsiniz. Gönderim sonrası
            her talep ayrı takip edilir.
          </p>
        </div>
      </div>
    </>
  );
}
