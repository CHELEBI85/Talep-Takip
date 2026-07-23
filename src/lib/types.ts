// ── Talep durumları (enum) ──────────────────────────────────────────────
export const STATUSES = [
  "Yeni",
  "İnceleniyor",
  "İşleme alındı",
  "Bilgi bekleniyor",
  "Tamamlandı",
  "İptal edildi",
] as const;

export type Status = (typeof STATUSES)[number];

// ── Talep geçmişi olayı ──────────────────────────────────────────────────
export interface HistoryEvent {
  event: string;
  /** Olayı yapan kişi/kurum. Müşteri görünümünde gizlenebilir. */
  by?: string;
  /** "14.07.2026 11:02" biçiminde okunabilir tarih. */
  date: string;
}

// ── Talep ────────────────────────────────────────────────────────────────
export interface Request {
  /** Firestore belge kimliği (mutasyonlar için). */
  docId?: string;
  /** Talep sahibinin auth uid'i. */
  ownerUid?: string;
  id: string; // görüntülenen kod, "#PAX-1042"
  title: string;
  description: string;
  note?: string; // müşterinin eklediği ek not
  org: string; // kurum adı (kayıttan gelir)
  status: Status;
  assignee: string; // atanan personel adı, atanmadıysa "—"
  /** Pax Medya'nın müşteriye gönderdiği geri bildirim. */
  feedback?: string;
  created: string; // "14.07.2026"
  updated: string; // "19.07.2026"
  history: HistoryEvent[];
  /** Soft-delete: çöp kutusundaysa true. Veri asla kalıcı silinmez. */
  deleted?: boolean;
  /** Çöp kutusuna taşınma tarihi (görüntü metni). */
  deletedAt?: string;
}

// ── Yeni Talep ekranındaki geçici (draft) madde ──────────────────────────
export interface DraftRequest {
  id: string; // client-side geçici id
  title: string;
  description: string;
  note?: string;
}

// ── Müşteri (kurum) ──────────────────────────────────────────────────────
export interface Customer {
  name: string;
  initials: string;
  contact: string;
  email: string;
  requests: number;
}

// ── Personel ─────────────────────────────────────────────────────────────
export interface Staff {
  name: string;
}
