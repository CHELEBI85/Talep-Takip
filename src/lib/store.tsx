"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  where,
  writeBatch,
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
import { getDb } from "./firebase";
import { SEED_STAFF } from "./mock-data";
import type {
  Customer,
  AdminAccount,
  AdminRole,
  DraftRequest,
  HistoryEvent,
  NotificationRule,
  NotificationSettings,
  Request,
  Staff,
  Status,
} from "./types";

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
const normalizeEmail = (email: string) => email.trim().toLowerCase();

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
  staff: Staff[];
  admins: AdminAccount[];
  notificationSettings: NotificationSettings;
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

  /** Personel ekle (yalnızca admin). */
  addStaff: (name: string) => Promise<void>;
  /** Personeli listeden çıkar — mevcut atamalar değişmez. */
  removeStaff: (id: string) => Promise<void>;
  /** Boş kurulumda başlangıç personel listesini ekler. */
  seedStaff: () => Promise<void>;

  /** Admin hesabi ekle veya rolunu guncelle. */
  addAdmin: (email: string, role: AdminRole) => Promise<void>;
  updateAdminRole: (email: string, role: AdminRole) => Promise<void>;
  removeAdmin: (email: string) => Promise<void>;
  setNotificationRecipients: (emails: string[]) => Promise<void>;
  setNotificationRules: (rules: NotificationRule[]) => Promise<void>;

  /** Admin listesinde gösterilenden daha eski talep var mı? */
  hasMore: boolean;
  /** Admin talep penceresini bir sayfa büyütür. */
  loadMore: () => void;
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

/** Admin talep listesinde bir seferde çekilen belge sayısı. */
const PAGE_SIZE = 100;

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const uid = user?.uid ?? "";
  const [requestFeed, setRequestFeed] = useState<Feed<Request>>(EMPTY_FEED);
  const [trashFeed, setTrashFeed] = useState<Feed<Request>>(EMPTY_FEED);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [customerFeed, setCustomerFeed] = useState<Feed<CustomerDoc>>(EMPTY_FEED);
  const [staffFeed, setStaffFeed] = useState<Feed<Staff>>(EMPTY_FEED);
  const [adminFeed, setAdminFeed] = useState<Feed<AdminAccount>>(EMPTY_FEED);
  const [notificationFeed, setNotificationFeed] = useState<
    { uid: string; settings: NotificationSettings }
  >({ uid: "", settings: { recipients: [], rules: [] } });
  const [profile, setProfile] = useState<{ uid: string; org: string }>({
    uid: "",
    org: "",
  });
  const [drafts, setDrafts] = useState<DraftRequest[]>([]);

  // ── Realtime: talepler ──
  // Admin en yeni `pageSize` talebi görür ("daha fazla yükle" ile pencere
  // büyür); müşteri yalnızca kendi taleplerini görür — kendi talep sayısı
  // doğal olarak sınırlı olduğundan orada sayfalama yoktur. Admin sorgusunda
  // where yok, yalnızca orderBy + limit var: bileşik dizin gerektirmez.
  useEffect(() => {
    if (!uid) return;
    const col = collection(getDb(), "requests");
    const q = isAdmin
      ? query(col, orderBy("createdAt", "desc"), limit(pageSize))
      : query(col, where("ownerUid", "==", uid));
    return onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((s) => ({ id: s.id, d: s.data() as ReqDoc }));
        rows.sort((a, b) => (b.d.createdAt ?? 0) - (a.d.createdAt ?? 0));
        setRequestFeed({ uid, rows: rows.map((r) => mapRequest(r.id, r.d)) });
        setReachedEnd(snap.size < pageSize);
      },
      (err) => {
        console.error("requests onSnapshot:", err);
        setRequestFeed({ uid, rows: [] }); // hata da yüklemeyi bitirir
      }
    );
  }, [uid, isAdmin, pageSize]);

  // ── Realtime: çöp kutusu (yalnızca admin) ──
  // Sayfalanan ana pencereden bağımsız sorgulanır; aksi halde eski bir
  // silinmiş talep pencerenin dışında kalıp çöp kutusunda görünmezdi.
  useEffect(() => {
    if (!uid || !isAdmin) return;
    return onSnapshot(
      query(collection(getDb(), "requests"), where("deleted", "==", true)),
      (snap) => {
        const rows = snap.docs.map((s) => ({ id: s.id, d: s.data() as ReqDoc }));
        rows.sort((a, b) => (b.d.deletedAt ?? 0) - (a.d.deletedAt ?? 0));
        setTrashFeed({ uid, rows: rows.map((r) => mapRequest(r.id, r.d)) });
      },
      (err) => console.error("trash onSnapshot:", err)
    );
  }, [uid, isAdmin]);

  // Realtime: adminler ve roller (yalnizca admin)
  useEffect(() => {
    if (!uid || !isAdmin) return;
    return onSnapshot(
      collection(getDb(), "admins"),
      (snap) => {
        const rows = snap.docs.map((s) => {
          const d = s.data() as Omit<AdminAccount, "id">;
          return {
            id: s.id,
            email: d.email ?? s.id,
            role: d.role ?? "admin",
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          };
        });
        rows.sort((a, b) => a.email.localeCompare(b.email));
        setAdminFeed({ uid, rows });
      },
      (err) => console.error("admins onSnapshot:", err)
    );
  }, [uid, isAdmin]);

  // Realtime: mail bildirim ayarlari
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      doc(getDb(), "settings", "notifications"),
      (snap) => {
        const data = snap.data() as NotificationSettings | undefined;
        setNotificationFeed({
          uid,
          settings: {
            recipients: Array.isArray(data?.recipients) ? data.recipients : [],
            rules: Array.isArray(data?.rules) ? data.rules : [],
          },
        });
      },
      (err) => console.error("notifications onSnapshot:", err)
    );
  }, [uid]);

  // ── Realtime: müşteriler (yalnızca admin) ──
  useEffect(() => {
    if (!uid || !isAdmin) return;
    return onSnapshot(
      collection(getDb(), "customers"),
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

  // ── Realtime: personel (yalnızca admin) ──
  useEffect(() => {
    if (!uid || !isAdmin) return;
    return onSnapshot(
      collection(getDb(), "staff"),
      (snap) => {
        const rows = snap.docs.map((s) => ({
          id: s.id,
          name: (s.data().name as string) ?? "",
        }));
        rows.sort((a, b) => a.name.localeCompare(b.name, "tr"));
        setStaffFeed({ uid, rows });
      },
      (err) => console.error("staff onSnapshot:", err)
    );
  }, [uid, isAdmin]);

  // ── Realtime: kendi kurum profilim (müşteri) ──
  // Kurum adının tek doğru kaynağı budur; auth displayName istemciden
  // değiştirilebildiği için talep yazarken ona güvenilmez.
  useEffect(() => {
    if (!uid || isAdmin) return;
    return onSnapshot(
      doc(getDb(), "customers", uid),
      (snap) => setProfile({ uid, org: (snap.data()?.org as string) ?? "" }),
      (err) => console.error("customer profile onSnapshot:", err)
    );
  }, [uid, isAdmin]);

  const requests = uid && requestFeed.uid === uid ? requestFeed.rows : EMPTY_ROWS;
  const customerDocs =
    uid && isAdmin && customerFeed.uid === uid ? customerFeed.rows : EMPTY_ROWS;
  const staff = uid && isAdmin && staffFeed.uid === uid ? staffFeed.rows : EMPTY_ROWS;
  const admins = uid && isAdmin && adminFeed.uid === uid ? adminFeed.rows : EMPTY_ROWS;
  const notificationSettings =
    uid && notificationFeed.uid === uid
      ? notificationFeed.settings
      : { recipients: [], rules: [] };
  const org = uid && profile.uid === uid ? profile.org : "";
  // Kullanıcı varken henüz o kullanıcıya ait anlık görüntü gelmediyse yükleniyor.
  const loading = !!uid && requestFeed.uid !== uid;

  // Admin'de çöp kutusu ayrı sorgudan gelir; müşteride silinmiş talep zaten
  // listelenmez, o yüzden aynı akıştan süzülür.
  const activeRequests = useMemo(
    () => requests.filter((r) => !r.deleted),
    [requests]
  );
  const trash = useMemo(
    () =>
      isAdmin
        ? uid && trashFeed.uid === uid
          ? trashFeed.rows
          : EMPTY_ROWS
        : requests.filter((r) => r.deleted),
    [isAdmin, uid, trashFeed, requests]
  );

  // Detay sayfaları çöp kutusundaki talebi de bulabilmeli (admin geri yükleme).
  // Çöp kutusundan açılan talep sayfalanan pencerede olmayabilir; her iki
  // kaynakta da aranır.
  const getRequest = useCallback(
    (id: string) => {
      const match = (r: Request) => r.id === id || r.id === `#${id}`;
      return requests.find(match) ?? trash.find(match);
    },
    [requests, trash]
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
    const counterRef = doc(getDb(), "counters", "requests");
    let firstCode = 1001;
    await runTransaction(getDb(), async (tx) => {
      const counter = await tx.get(counterRef);
      const start = counter.exists()
        ? (counter.data().next as number)
        : 1001;
      firstCode = start;
      tx.set(counterRef, { next: start + items.length });
      items.forEach((d, i) => {
        tx.set(doc(collection(getDb(), "requests")), {
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
          // Yalnızca oluşturma olayı belgede durur (tek, değişmez kayıt);
          // sonraki olaylar `history` alt koleksiyonuna yazılır. Kurallardaki
          // get() aynı transaction'ın yazmalarını göremediği için oluşturma
          // kaydı alt koleksiyona atomik biçimde yazılamazdı.
          history: [
            { event: "Talep oluşturuldu", by: org, date: nowStamp(), at: stamp + i },
          ],
        });
      });
    });
    const token = await user.getIdToken();
    await fetch("/api/requests/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        org,
        requests: items.map((d, i) => ({
          code: `#PAX-${firstCode + i}`,
          title: d.title,
          description: d.description,
          note: d.note?.trim() ? d.note.trim() : "",
        })),
      }),
    }).catch((err) => console.error("request notification:", err));
    setDrafts([]);
    return items.length;
  }, [user, drafts, org]);

  // ── Admin mutasyonları ──
  // Talep güncellemesi ve geçmiş kaydı tek batch'te gider: biri yazılıp
  // diğeri yazılmadan kalamaz.
  const mutate = useCallback(
    async (docId: string, patch: Record<string, unknown>, event: string) => {
      const reqRef = doc(getDb(), "requests", docId);
      const at = Date.now();
      const batch = writeBatch(getDb());
      batch.update(reqRef, { ...patch, updatedAt: at });
      batch.set(doc(collection(reqRef, "history")), {
        event,
        by: user?.displayName ?? "Yönetici",
        date: nowStamp(),
        at,
      });
      await batch.commit();
    },
    [user]
  );

  const updateStatus = useCallback(
    async (id: string, status: Status) => {
      const req = getRequest(id);
      if (!req?.docId || req.status === status) return;
      await mutate(
        req.docId,
        { status },
        `Durum "${status}" olarak güncellendi`
      );
    },
    [getRequest, mutate]
  );

  const assignStaff = useCallback(
    async (id: string, assignee: string) => {
      const req = getRequest(id);
      if (!req?.docId || req.assignee === assignee) return;
      await mutate(
        req.docId,
        { assignee },
        assignee === "—" ? "Atama kaldırıldı" : `${assignee}'a atandı`
      );
    },
    [getRequest, mutate]
  );

  const sendFeedback = useCallback(
    async (id: string, feedback: string) => {
      const text = feedback.trim();
      const req = getRequest(id);
      if (!text || !req?.docId) return;
      await mutate(req.docId, { feedback: text }, "Müşteriye not gönderildi");
    },
    [getRequest, mutate]
  );

  // ── Soft-delete / geri yükleme (veri asla kalıcı silinmez) ──
  const softDelete = useCallback(
    async (id: string) => {
      const req = getRequest(id);
      if (!req?.docId || req.deleted) return;
      await mutate(
        req.docId,
        { deleted: true, deletedAt: Date.now() },
        "Talep çöp kutusuna taşındı"
      );
    },
    [getRequest, mutate]
  );

  const restore = useCallback(
    async (id: string) => {
      const req = getRequest(id);
      if (!req?.docId || !req.deleted) return;
      await mutate(
        req.docId,
        { deleted: false, deletedAt: null },
        "Talep çöp kutusundan geri yüklendi"
      );
    },
    [getRequest, mutate]
  );

  const loadMore = useCallback(() => setPageSize((p) => p + PAGE_SIZE), []);

  // ── Personel yönetimi (admin) ──
  const addStaff = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      // Aynı ad iki kez eklenmesin (atamalar ada göre eşleşiyor).
      if (staff.some((s) => s.name.toLocaleLowerCase("tr") === trimmed.toLocaleLowerCase("tr"))) {
        return;
      }
      await addDoc(collection(getDb(), "staff"), { name: trimmed, createdAt: Date.now() });
    },
    [staff]
  );

  const removeStaff = useCallback(async (id: string) => {
    await deleteDoc(doc(getDb(), "staff", id));
  }, []);

  const seedStaff = useCallback(async () => {
    if (staff.length > 0) return;
    const batch = writeBatch(getDb());
    SEED_STAFF.forEach((name) =>
      batch.set(doc(collection(getDb(), "staff")), { name, createdAt: Date.now() })
    );
    await batch.commit();
  }, [staff]);

  const addAdmin = useCallback(async (email: string, role: AdminRole) => {
    const normalized = normalizeEmail(email);
    if (!normalized) return;
    await setDoc(
      doc(getDb(), "admins", normalized),
      {
        email: normalized,
        role,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  }, []);

  const updateAdminRole = useCallback(async (email: string, role: AdminRole) => {
    const normalized = normalizeEmail(email);
    if (!normalized) return;
    await setDoc(
      doc(getDb(), "admins", normalized),
      { email: normalized, role, updatedAt: Date.now() },
      { merge: true }
    );
  }, []);

  const removeAdmin = useCallback(async (email: string) => {
    const normalized = normalizeEmail(email);
    if (!normalized || user?.email?.toLowerCase() === normalized) return;
    await deleteDoc(doc(getDb(), "admins", normalized));
  }, [user]);

  const setNotificationRecipients = useCallback(async (emails: string[]) => {
    await setDoc(
      doc(getDb(), "settings", "notifications"),
      {
        recipients: parseEmails(emails.join(",")),
        rules: notificationSettings.rules,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  }, [notificationSettings.rules]);

  const setNotificationRules = useCallback(async (rules: NotificationRule[]) => {
    const cleanRules = rules
      .map((rule) => ({
        email: normalizeEmail(rule.email),
        customer: rule.customer.trim(),
      }))
      .filter((rule) => rule.email && rule.customer);
    await setDoc(
      doc(getDb(), "settings", "notifications"),
      {
        recipients: notificationSettings.recipients,
        rules: cleanRules,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  }, [notificationSettings.recipients]);

  const value: StoreValue = {
    requests: activeRequests,
    trash,
    drafts,
    customers,
    staff,
    admins,
    notificationSettings,
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
    addStaff,
    removeStaff,
    seedStaff,
    addAdmin,
    updateAdminRole,
    removeAdmin,
    setNotificationRecipients,
    setNotificationRules,
    hasMore: isAdmin && !reachedEnd,
    loadMore,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

/**
 * Bir talebin geçmişi. Eski belgelerdeki `history` dizisi ile
 * `requests/{id}/history` alt koleksiyonundaki yeni kayıtları sırayla
 * birleştirir — dizi kayıtları her zaman daha eskidir.
 */
export function useRequestHistory(req?: Request): HistoryEvent[] {
  const docId = req?.docId ?? "";
  const [feed, setFeed] = useState<{ docId: string; rows: HistoryEvent[] }>({
    docId: "",
    rows: EMPTY_ROWS,
  });

  useEffect(() => {
    if (!docId) return;
    return onSnapshot(
      query(collection(getDb(), "requests", docId, "history"), orderBy("at", "asc")),
      (snap) =>
        setFeed({ docId, rows: snap.docs.map((s) => s.data() as HistoryEvent) }),
      (err) => console.error("history onSnapshot:", err)
    );
  }, [docId]);

  const live = docId && feed.docId === docId ? feed.rows : EMPTY_ROWS;
  return useMemo(
    () => [...(req?.history ?? []), ...live],
    [req?.history, live]
  );
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
