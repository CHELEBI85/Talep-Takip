import { FieldValue } from "firebase-admin/firestore";
import { Resend } from "resend";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import {
  applyRateLimits,
  clientIpHash,
  rateLimitId,
  requesterIsAdmin,
  type RateLimitResult,
} from "@/lib/server-security";

export const runtime = "nodejs";

type NotifyBody = {
  requestIds?: unknown;
};

type RequestDoc = {
  code?: string;
  title?: string;
  description?: string;
  note?: string;
  org?: string;
  ownerUid?: string;
  notificationSentAt?: number;
  notificationLockAt?: number;
};

type NotificationRule = {
  email?: string;
  customer?: string;
};

type NotificationSettings = {
  recipients?: string[];
  rules?: NotificationRule[];
};

type LockedRequest = {
  docId: string;
  code: string;
  title: string;
  description: string;
  note: string;
  org: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_REQUESTS_PER_NOTIFY = 20;
const LOCK_TTL_MS = 5 * 60 * 1000;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function asRequestIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    )
  ).slice(0, MAX_REQUESTS_PER_NOTIFY);
}

function cleanRecipients(emails: unknown): string[] {
  if (!Array.isArray(emails)) return [];
  return Array.from(
    new Set(
      emails
        .map((email) => normalizeEmail(String(email)))
        .filter((email) => emailPattern.test(email))
    )
  );
}

function scopedRecipients(rules: unknown, orgs: Set<string>): string[] {
  if (!Array.isArray(rules)) return [];
  return Array.from(
    new Set(
      rules
        .map((rule) => rule as NotificationRule)
        .filter((rule) => rule.customer && orgs.has(rule.customer))
        .map((rule) => normalizeEmail(String(rule.email ?? "")))
        .filter((email) => emailPattern.test(email))
    )
  );
}

async function notificationRecipients(orgs: Set<string>): Promise<string[]> {
  const snap = await getAdminDb()
    .collection("settings")
    .doc("notifications")
    .get();
  const data = (snap.data() ?? {}) as NotificationSettings;
  return Array.from(
    new Set([
      ...cleanRecipients(data.recipients),
      ...scopedRecipients(data.rules, orgs),
    ])
  );
}

async function enforceNotifyRateLimit(request: Request, uid: string, now: number): Promise<RateLimitResult> {
  const db = getAdminDb();
  const minute = 60 * 1000;
  const tenMinutes = 10 * minute;
  const ipHash = clientIpHash(request);
  let result: RateLimitResult = { allowed: true };
  await db.runTransaction(async (tx) => {
    result = await applyRateLimits(
      tx,
      [
        {
          id: rateLimitId("notify_uid_minute", uid, minute, now),
          limit: 6,
          increment: 1,
          windowMs: minute,
        },
        {
          id: rateLimitId("notify_ip_10m", ipHash, tenMinutes, now),
          limit: 40,
          increment: 1,
          windowMs: tenMinutes,
        },
      ],
      now
    );
  });
  return result;
}

async function clearNotificationLocks(requests: LockedRequest[], lockId: string) {
  if (requests.length === 0) return;
  const db = getAdminDb();
  const batch = db.batch();
  requests.forEach((item) => {
    batch.update(db.collection("requests").doc(item.docId), {
      notificationLockAt: FieldValue.delete(),
      notificationLockId: FieldValue.delete(),
    });
  });
  await batch.commit().catch((error) => {
    console.error("Notification lock temizlenemedi:", { lockId, error });
  });
}

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return Response.json(
      { ok: false, error: "Mail servisi yapilandirilmamis." },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return Response.json({ ok: false, error: "Oturum dogrulanamadi." }, { status: 401 });
  }

  let decoded;
  try {
    decoded = await getAdminAuth().verifyIdToken(token);
  } catch {
    return Response.json({ ok: false, error: "Oturum dogrulanamadi." }, { status: 401 });
  }

  try {
    if (await requesterIsAdmin(decoded.uid, decoded.email)) {
      return Response.json(
        { ok: false, error: "Admin hesaplari talep bildirimi gonderemez." },
        { status: 403 }
      );
    }
  } catch (error) {
    console.error("request notify admin check failed:", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return Response.json(
      { ok: false, error: "Sunucu yetki kontrolu yapilamadi." },
      { status: 500 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as NotifyBody;
  const requestIds = asRequestIds(body.requestIds);
  if (requestIds.length === 0) {
    return Response.json({ ok: false, error: "Bildirim verisi eksik." }, { status: 400 });
  }

  let db;
  try {
    db = getAdminDb();
  } catch (error) {
    console.error("request notify db init failed:", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return Response.json(
      { ok: false, error: "Firebase Admin yapilandirmasi eksik." },
      { status: 500 }
    );
  }
  const now = Date.now();
  let rateLimit: RateLimitResult;
  try {
    rateLimit = await enforceNotifyRateLimit(request, decoded.uid, now);
  } catch {
    return Response.json(
      { ok: false, error: "Rate limit yapilandirmasi eksik." },
      { status: 500 }
    );
  }
  if (!rateLimit.allowed) {
    return Response.json(
      { ok: false, error: "Cok fazla bildirim istegi gonderildi." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    );
  }
  const lockId = crypto.randomUUID();
  const lockedRequests: LockedRequest[] = [];

  try {
    await db.runTransaction(async (tx) => {
      const refs = requestIds.map((id) => db.collection("requests").doc(id));
      const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));
      const nextLockedRequests: LockedRequest[] = [];

      snaps.forEach((snap) => {
        if (!snap.exists) {
          throw new Error("request-not-found");
        }
        const data = snap.data() as RequestDoc;
        if (data.ownerUid !== decoded.uid) {
          throw new Error("request-forbidden");
        }
        if (typeof data.notificationSentAt === "number") return;
        if (
          typeof data.notificationLockAt === "number" &&
          now - data.notificationLockAt < LOCK_TTL_MS
        ) {
          return;
        }

        tx.update(snap.ref, {
          notificationLockAt: now,
          notificationLockId: lockId,
        });
        nextLockedRequests.push({
          docId: snap.id,
          code: String(data.code ?? ""),
          title: String(data.title ?? ""),
          description: String(data.description ?? ""),
          note: String(data.note ?? ""),
          org: String(data.org ?? "Bilinmeyen kurum"),
        });
      });
      lockedRequests.length = 0;
      lockedRequests.push(...nextLockedRequests);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message === "request-forbidden" ? 403 : 404;
    return Response.json({ ok: false, error: "Talep dogrulanamadi." }, { status });
  }

  if (lockedRequests.length === 0) {
    return Response.json({ ok: true, skipped: true });
  }

  const orgs = new Set(lockedRequests.map((item) => item.org));
  const recipients = await notificationRecipients(orgs);
  if (recipients.length === 0) {
    await clearNotificationLocks(lockedRequests, lockId);
    return Response.json({ ok: false, error: "Bildirim alicisi bulunamadi." }, { status: 400 });
  }

  const customerEmail = escapeHtml(decoded.email ?? "");
  const customerEmailLine = customerEmail
    ? `<p style="margin:4px 0 0;color:#667085"><strong>Musteri e-postasi:</strong> ${customerEmail}</p>`
    : "";
  const rows = lockedRequests
    .map((item) => {
      const note = item.note.trim()
        ? `<p style="margin:8px 0 0;color:#667085"><strong>Ek not:</strong> ${escapeHtml(item.note)}</p>`
        : "";
      return `
        <li style="margin:0 0 18px;padding:16px;border:1px solid #e7eaf1;border-radius:10px">
          <div style="font-weight:800;color:#1d2b4f">${escapeHtml(item.code)} - ${escapeHtml(item.title)}</div>
          <p style="margin:8px 0 0;color:#667085"><strong>Musteri:</strong> ${escapeHtml(item.org)}</p>
          <p style="margin:8px 0 0;color:#475467;line-height:1.55">${escapeHtml(item.description)}</p>
          ${note}
        </li>`;
    })
    .join("");

  const subject =
    orgs.size === 1
      ? `${Array.from(orgs)[0]} yeni talep olusturdu`
      : "Yeni talepler olusturuldu";

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "Pax Medya <onboarding@resend.dev>",
    to: recipients,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;color:#101828">
        <h2 style="margin:0 0 8px">Yeni talep olusturuldu</h2>
        ${customerEmailLine}
        <p style="margin:16px 0 20px;color:#475467">${lockedRequests.length} yeni talep gonderildi.</p>
        <ul style="list-style:none;margin:0;padding:0">${rows}</ul>
      </div>
    `,
  });

  if (result.error) {
    console.error("Resend mail hatasi:", { lockId, message: result.error.message });
    await clearNotificationLocks(lockedRequests, lockId);
    return Response.json(
      { ok: false, error: "Mail bildirimi gonderilemedi." },
      { status: 502 }
    );
  }

  const sentAt = Date.now();
  const batch = db.batch();
  lockedRequests.forEach((item) => {
    batch.update(db.collection("requests").doc(item.docId), {
      notificationSentAt: sentAt,
      notificationMailId: result.data?.id ?? "",
      notificationLockAt: FieldValue.delete(),
      notificationLockId: FieldValue.delete(),
    });
  });
  await batch.commit();

  return Response.json({ ok: true, sent: lockedRequests.length });
}
