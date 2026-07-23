"use client";

import {
  arrayUnion,
  collection,
  onSnapshot,
  query,
  runTransaction,
  updateDoc,
  where,
  doc,
} from "firebase/firestore";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth";
import { db } from "./firebase";
import { STAFF } from "./mock-data";
import type { Customer, DraftRequest, Request, Status } from "./types";

// ── Yardımcılar ──────────────────────────────────────────────────────────
const p2 = (n: number) => String(n).padStart(2, "0");

function fmtDate(ms: number): string {
  if (!ms) return "";
  const d = new Date(ms);
  return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function nowStamp(): string {
  const d = new Date();
  return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()} · ${p2(
    d.getHours()
  )}:${p2(d.getMinutes())}`;
}

let draftSeq = 0;
const nextDraftId = () => `draft-${(draftSeq += 1)}`;

// Firestore belgesini bileşen şekline (Request) eşle
type ReqDoc = {
  code: string;
  title: string;
  description: string;
  note?: string;
  org: string;
  ownerUid: string;
  status: Status;
  assignee: string;
  feedback?: string;
  createdAt: number;
  updatedAt: number;
  history: Request["history"];
  deleted?: boolean;
  deletedAt?: number;
};

function mapRequest(docId: string, d: ReqDoc): Request {
  return {
    docId,
    ownerUid: d.ownerUid,
    id: d.code,
    title: d.title,
    description: d.description,
    note: d.note,
    org: d.org,
    status: d.status,
    assignee: d.assignee,
    feedback: d.feedback,
    created: fmtDate(d.createdAt),
    updated: fmtDate(d.updatedAt),
    history: d.history ?? [],
    deleted: d.deleted === true,
    deletedAt: d.deletedAt ? fmtDate(d.deletedAt) : undefined,
  };
}

// ── Context ──────────────────────────────────────────────────────────────
interface StoreValue {
  /** Aktif talepler (çöp kutusundakiler hariç). */
  requests: Request[];
  /** Çöp kutusu — soft-delete edilmiş talepler (yalnızca admin görür). */
  trash: Request[];
  drafts: DraftRequest[];
  customers: Customer[];
  staff: string[];
  loading: boolean;

  getRequest: (id: string) => Request | undefined;
  myRequests: Request[];

  addDraft: (draft: Omit<DraftRequest, "id">) => void;
  updateDraft: (id: string, patch: Omit<DraftRequest, "id">) => void;
  removeDraft: (id: string) => void;
  clearDrafts: () => void;
  submitDrafts: () => Promise<number>;

  updateStatus: (id: string, status: Status) => Promise<void>;
  assignStaff: (id: string, assignee: string) => Promise<void>;
  sendFeedback: (id: string, feedback: string) => Promise<void>;
  /** Talebi çöp kutusuna taşır (soft-delete — veri silinmez). */
  softDelete: (id: string) => Promise<void>;
  /** Çöp kutusundaki talebi geri yükler. */
  restore: (id: string) => Promise<void>;

  /** Giriş yapan müşterinin kayıtlı kurum adı (customers/{uid}.org). */
  org: string;
}

const StoreContext = createContext<StoreValue | null>(null);

type CustomerDoc = {
  org: string;
  initials: string;
  contact: string;
  email: string;
  ownerUid: string;
};

// Abonelik sonuçları, ait oldukları kullanıcının uid'i ile birlikte tutulur.
// Böylece "kullanıcı yok" durumunda state'i effect içinde temizlemek yerine
// render sırasında türetiriz — önceki kullanıcının verisi asla sızmaz.
type Feed<T> = { uid: string; rows: T[] };
const EMPTY_ROWS: never[] = []; // referansı sabit — gereksiz memo geçersizlemez
const EMPTY_FEED = { uid: "", rows: EMPTY_ROWS };

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const uid = user?.uid ?? "";
  const [requestFeed, setRequestFeed] = useState<Feed<Request>>(EMPTY_FEED);
  const [customerFeed, setCustomerFeed] = useState<Feed<CustomerDoc>>(EMPTY_FEED);
  const [profile, setProfile] = useState<{ uid: string; org: string }>({
    uid: "",
    org: "",
  });
  const [drafts, setDrafts] = useState<DraftRequest[]>([]);

  // ── Realtime: talepler ──
  // Admin tüm talepleri, müşteri yalnızca kendi taleplerini görür.
  useEffect(() => {
    if (!uid) return;
    const col = collection(db, "requests");
    const q = isAdmin ? query(col) : query(col, where("ownerUid", "==", uid));
    return onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((s) => ({ id: s.id, d: s.data() as ReqDoc }));
        rows.sort((a, b) => (b.d.createdAt ?? 0) - (a.d.createdAt ?? 0));
        setRequestFeed({ uid, rows: rows.map((r) => mapRequest(r.id, r.d)) });
      },
      (err) => {
        console.error("requests onSnapshot:", err);
        setRequestFeed({ uid, rows: [] }); // hata da yüklemeyi bitirir
      }
    );
  }, [uid, isAdmin]);

  // ── Realtime: müşteriler (yalnızca admin) ──
  useEffect(() => {
    if (!uid || !isAdmin) return;
    return onSnapshot(
      collection(db, "customers"),
      (snap) => {
        setCustomerFeed({
          uid,
          rows: snap.docs.map((s) => {
            const d = s.data() as Omit<CustomerDoc, "initials">;
            return {
              org: d.org,
              contact: d.contact,
              email: d.email,
              ownerUid: d.ownerUid ?? s.id,
              initials: initialsOf(d.org),
            };
          }),
        });
      },
      (err) => console.error("customers onSnapshot:", err)
    );
  }, [uid, isAdmin]);

  // ── Realtime: kendi kurum profilim (müşteri) ──
  // Kurum adının tek doğru kaynağı budur; auth displayName istemciden
  // değiştirilebildiği için talep yazarken ona güvenilmez.
  useEffect(() => {
    if (!uid || isAdmin) return;
    return onSnapshot(
      doc(db, "customers", uid),
      (snap) => setProfile({ uid, org: (snap.data()?.org as string) ?? "" }),
      (err) => console.error("customer profile onSnapshot:", err)
    );
  }, [uid, isAdmin]);

  const requests = uid && requestFeed.uid === uid ? requestFeed.rows : EMPTY_ROWS;
  const customerDocs =
    uid && isAdmin && customerFeed.uid === uid ? customerFeed.rows : EMPTY_ROWS;
  const org = uid && profile.uid === uid ? profile.org : "";
  // Kullanıcı varken henüz o kullanıcıya ait anlık görüntü gelmediyse yükleniyor.
  const loading = !!uid && requestFeed.uid !== uid;

  // `requests` state'i tüm belgeleri tutar; dışarıya aktif/çöp ayrık verilir.
  const activeRequests = useMemo(
    () => requests.filter((r) => !r.deleted),
    [requests]
  );
  const trash = useMemo(() => requests.filter((r) => r.deleted), [requests]);

  // Detay sayfaları çöp kutusundaki talebi de bulabilmeli (admin geri yükleme).
  const getRequest = useCallback(
    (id: string) => requests.find((r) => r.id === id || r.id === `#${id}`),
    [requests]
  );

  const myRequests = useMemo(
    () =>
      user
        ? activeRequests.filter((r) => r.ownerUid === user.uid)
        : [],
    [activeRequests, user]
  );

  const customers: Customer[] = useMemo(
    () =>
      customerDocs.map((c) => ({
        name: c.org,
        initials: c.initials,
        contact: c.contact,
        email: c.email,
        requests: activeRequests.filter((r) => r.ownerUid === c.ownerUid).length,
      })),
    [customerDocs, activeRequests]
  );

  // ── Draft (yerel) ──
  const addDraft = useCallback((draft: Omit<DraftRequest, "id">) => {
    setDrafts((prev) => [...prev, { ...draft, id: nextDraftId() }]);
  }, []);
  const updateDraft = useCallback(
    (id: string, patch: Omit<DraftRequest, "id">) =>
      setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d))),
    []
  );
  const removeDraft = useCallback(
    (id: string) => setDrafts((prev) => prev.filter((d) => d.id !== id)),
    []
  );
  const clearDrafts = useCallback(() => setDrafts([]), []);

  // ── Talepleri gönder (Firestore'a yaz) ──
  // #PAX-… kodu, counters/requests belgesindeki merkezi sayaçtan transaction
  // ile alınır: farklı kurumlar aynı anda gönderse bile kod çakışmaz.
  const submitDrafts = useCallback(async (): Promise<number> => {
    if (!user || drafts.length === 0) return 0;
    // Kurum adı Firestore profilinden gelir (kurallar da orayla karşılaştırır).
    if (!org) {
      throw new Error(
        "Kurum profiliniz yüklenemedi. Sayfayı yenileyip tekrar deneyin."
      );
    }
    const stamp = Date.now();
    const items = [...drafts];
    const counterRef = doc(db, "counters", "requests");
    await runTransaction(db, async (tx) => {
      const counter = await tx.get(counterRef);
      const start = counter.exists()
        ? (counter.data().next as number)
        : 1001;
      tx.set(counterRef, { next: start + items.length });
      items.forEach((d, i) => {
        tx.set(doc(collection(db, "requests")), {
          code: `#PAX-${start + i}`,
          title: d.title,
          description: d.description,
          note: d.note?.trim() ? d.note.trim() : "",
          org,
          ownerUid: user.uid,
          status: "Yeni" as Status,
          assignee: "—",
          feedback: "",
          createdAt: stamp + i, // sıralama kararlılığı için
          updatedAt: stamp + i,
          history: [{ event: "Talep oluşturuldu", by: org, date: nowStamp() }],
        });
      });
    });
    setDrafts([]);
    return items.length;
  }, [user, drafts, org]);

  // ── Admin mutasyonları ──
  const updateStatus = useCallback(
    async (id: string, status: Status) => {
      const req = getRequest(id);
      if (!req?.docId || req.status === status) return;
      await updateDoc(doc(db, "requests", req.docId), {
        status,
        updatedAt: Date.now(),
        history: arrayUnion({
          event: `Durum "${status}" olarak güncellendi`,
          by: user?.displayName ?? "Yönetici",
          date: nowStamp(),
        }),
      });
    },
    [getRequest, user]
  );

  const assignStaff = useCallback(
    async (id: string, assignee: string) => {
      const req = getRequest(id);
      if (!req?.docId || req.assignee === assignee) return;
      await updateDoc(doc(db, "requests", req.docId), {
        assignee,
        updatedAt: Date.now(),
        history: arrayUnion({
          event: assignee === "—" ? "Atama kaldırıldı" : `${assignee}'a atandı`,
          by: user?.displayName ?? "Yönetici",
          date: nowStamp(),
        }),
      });
    },
    [getRequest, user]
  );

  const sendFeedback = useCallback(
    async (id: string, feedback: string) => {
      const text = feedback.trim();
      const req = getRequest(id);
      if (!text || !req?.docId) return;
      await updateDoc(doc(db, "requests", req.docId), {
        feedback: text,
        updatedAt: Date.now(),
        history: arrayUnion({
          event: "Müşteriye not gönderildi",
          by: user?.displayName ?? "Yönetici",
          date: nowStamp(),
        }),
      });
    },
    [getRequest, user]
  );

  // ── Soft-delete / geri yükleme (veri asla kalıcı silinmez) ──
  const softDelete = useCallback(
    async (id: string) => {
      const req = getRequest(id);
      if (!req?.docId || req.deleted) return;
      await updateDoc(doc(db, "requests", req.docId), {
        deleted: true,
        deletedAt: Date.now(),
        updatedAt: Date.now(),
        history: arrayUnion({
          event: "Talep çöp kutusuna taşındı",
          by: user?.displayName ?? "Yönetici",
          date: nowStamp(),
        }),
      });
    },
    [getRequest, user]
  );

  const restore = useCallback(
    async (id: string) => {
      const req = getRequest(id);
      if (!req?.docId || !req.deleted) return;
      await updateDoc(doc(db, "requests", req.docId), {
        deleted: false,
        deletedAt: null,
        updatedAt: Date.now(),
        history: arrayUnion({
          event: "Talep çöp kutusundan geri yüklendi",
          by: user?.displayName ?? "Yönetici",
          date: nowStamp(),
        }),
      });
    },
    [getRequest, user]
  );

  const value: StoreValue = {
    requests: activeRequests,
    trash,
    drafts,
    customers,
    staff: STAFF.map((s) => s.name),
    loading,
    getRequest,
    myRequests,
    addDraft,
    updateDraft,
    removeDraft,
    clearDrafts,
    submitDrafts,
    updateStatus,
    assignStaff,
    sendFeedback,
    softDelete,
    restore,
    org,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore, StoreProvider içinde kullanılmalı");
  return ctx;
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase("tr");
}
