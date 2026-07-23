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
  /** Sıralama için ms zaman damgası (alt koleksiyon kayıtlarında bulunur). */
  at?: number;
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
  /**
   * Eski kayıtlardaki belge içi geçmiş dizisi. Yeni olaylar
   * `requests/{id}/history` alt koleksiyonuna yazılır (belge 1 MB sınırına
   * dayanmasın diye); ikisini `useRequestHistory` birleştirir.
   */
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
// Firestore `staff` koleksiyonundan gelir (yönetici ekler/çıkarır).
export interface Staff {
  /** Firestore belge kimliği. */
  id: string;
  name: string;
}
export type AdminRole = "super_admin" | "admin" | "staff";

export interface AdminAccount {
  id: string;
  email: string;
  role: AdminRole;
  createdAt?: number;
  updatedAt?: number;
}

export interface NotificationRule {
  email: string;
  customer: string;
}

export interface NotificationSettings {
  recipients: string[];
  rules: NotificationRule[];
}
