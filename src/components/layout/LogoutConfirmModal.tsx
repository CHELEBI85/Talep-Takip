"use client";

import { Button } from "@/components/ui/Button";

export function LogoutConfirmModal({
  open,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-title"
    >
      <div className="w-full max-w-[380px] rounded-card border border-border-card bg-white p-5 shadow-(--shadow-surface)">
        <h2 id="logout-title" className="text-base font-extrabold text-ink">
          Cikis yapilsin mi?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-2">
          Oturumunuz kapatilacak ve giris ekranina yonlendirileceksiniz.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button variant="soft" onClick={onCancel} disabled={busy}>
            Vazgec
          </Button>
          <Button onClick={onConfirm} disabled={busy}>
            {busy ? "Cikiliyor..." : "Cikis yap"}
          </Button>
        </div>
      </div>
    </div>
  );
}
