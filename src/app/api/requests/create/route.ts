import type { DocumentReference } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import {
  applyRateLimits,
  clientIpHash,
  rateLimitId,
  requesterIsAdmin,
  type RateLimitResult,
  type RateLimitSpec,
} from "@/lib/server-security";

type CreateBody = {
  submissionId?: unknown;
  requests?: unknown;
};

type DraftInput = {
  title: string;
  description: string;
  note: string;
};

type IdempotencyDoc = {
  requestIds?: string[];
  count?: number;
};

const MAX_REQUESTS = 10;
const TITLE_MAX = 200;
const DESCRIPTION_MAX = 5000;
const NOTE_MAX = 2000;
const SUBMISSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MIN_COUNTER = 1001;
const MAX_COUNTER = 999999999;
const MAX_BODY_BYTES = 64 * 1024;

function safeError(error: string, status: number, headers?: HeadersInit) {
  return Response.json({ ok: false, error }, { status, headers });
}

async function readJsonBody(request: Request): Promise<
  | { ok: true; body: CreateBody }
  | { ok: false; response: Response }
> {
  const contentLength = request.headers.get("content-length");
  const declaredLength = contentLength ? Number(contentLength) : 0;
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return {
      ok: false,
      response: safeError("Istek boyutu izin verilen siniri asiyor.", 413),
    };
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return {
      ok: false,
      response: safeError("Istek boyutu izin verilen siniri asiyor.", 413),
    };
  }

  try {
    return { ok: true, body: JSON.parse(rawBody) as CreateBody };
  } catch {
    return {
      ok: false,
      response: safeError("Gecersiz istek verisi.", 400),
    };
  }
}

function nowStamp(date = new Date()): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function parseBody(body: CreateBody): { submissionId: string; requests: DraftInput[] } | null {
  if (
    !body ||
    typeof body !== "object" ||
    !hasOnlyKeys(body as Record<string, unknown>, ["submissionId", "requests"]) ||
    typeof body.submissionId !== "string" ||
    !SUBMISSION_ID_PATTERN.test(body.submissionId) ||
    !Array.isArray(body.requests) ||
    body.requests.length === 0 ||
    body.requests.length > MAX_REQUESTS
  ) {
    return null;
  }

  const requests = body.requests.map((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      !hasOnlyKeys(item as Record<string, unknown>, ["title", "description", "note"])
    ) {
      return null;
    }
    const row = item as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const description =
      typeof row.description === "string" ? row.description.trim() : "";
    const note = typeof row.note === "string" ? row.note.trim() : "";
    if (
      !title ||
      !description ||
      title.length > TITLE_MAX ||
      description.length > DESCRIPTION_MAX ||
      note.length > NOTE_MAX
    ) {
      return null;
    }
    return { title, description, note };
  });

  if (requests.some((item) => item === null)) return null;
  return { submissionId: body.submissionId, requests: requests as DraftInput[] };
}

function rateLimitSpecs(uid: string, ipHash: string, requestCount: number, now: number): RateLimitSpec[] {
  const minute = 60 * 1000;
  const tenMinutes = 10 * minute;
  const hour = 60 * minute;
  return [
    {
      id: rateLimitId("create_uid_minute", uid, minute, now),
      limit: 3,
      increment: 1,
      windowMs: minute,
    },
    {
      id: rateLimitId("create_uid_hour", uid, hour, now),
      limit: 30,
      increment: requestCount,
      windowMs: hour,
    },
    {
      id: rateLimitId("create_ip_10m", ipHash, tenMinutes, now),
      limit: 30,
      increment: 1,
      windowMs: tenMinutes,
    },
  ];
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return safeError("Oturum dogrulanamadi.", 401);

  let decoded;
  let authUser;
  try {
    const auth = getAdminAuth();
    decoded = await auth.verifyIdToken(token);
    authUser = await auth.getUser(decoded.uid);
  } catch {
    return safeError("Oturum dogrulanamadi.", 401);
  }

  if (authUser.disabled) {
    return safeError("Bu hesap aktif degil.", 403);
  }
  if (await requesterIsAdmin(decoded.uid, decoded.email)) {
    return safeError("Admin hesaplari talep olusturamaz.", 403);
  }

  const bodyResult = await readJsonBody(request);
  if (!bodyResult.ok) return bodyResult.response;

  const parsed = parseBody(bodyResult.body);
  if (!parsed) {
    return safeError("Talep bilgileri eksik veya gecersiz.", 400);
  }

  const db = getAdminDb();
  const customerRef = db.collection("customers").doc(decoded.uid);
  const counterRef = db.collection("counters").doc("requests");
  const idemRef = db.collection("requestSubmissions").doc(`${decoded.uid}_${parsed.submissionId}`);
  const now = Date.now();
  let ipHash = "";
  try {
    ipHash = clientIpHash(request);
  } catch {
    return safeError("Rate limit yapilandirmasi eksik.", 500);
  }
  const requestRefs = parsed.requests.map(() => db.collection("requests").doc());
  let rateLimit: RateLimitResult = { allowed: true };
  let retryAfterSeconds = 0;
  let responseRequestIds: string[] = [];
  let created = false;

  try {
    await db.runTransaction(async (tx) => {
      const idemSnap = await tx.get(idemRef);
      if (idemSnap.exists) {
        const idem = idemSnap.data() as IdempotencyDoc;
        responseRequestIds = Array.isArray(idem.requestIds) ? idem.requestIds : [];
        created = false;
        return;
      }

      const customerSnap = await tx.get(customerRef);
      const counterSnap = await tx.get(counterRef);
      rateLimit = await applyRateLimits(
        tx,
        rateLimitSpecs(decoded.uid, ipHash, parsed.requests.length, now),
        now
      );
      if (!rateLimit.allowed) {
        retryAfterSeconds = rateLimit.retryAfterSeconds;
        return;
      }

      if (!customerSnap.exists) throw new Error("customer-profile-missing");
      const customer = customerSnap.data() ?? {};
      const org = typeof customer.org === "string" ? customer.org.trim() : "";
      if (!org) throw new Error("customer-profile-missing");

      const rawNext = counterSnap.exists ? counterSnap.data()?.next : MIN_COUNTER;
      const next = typeof rawNext === "number" && Number.isInteger(rawNext) ? rawNext : MIN_COUNTER;
      if (next < MIN_COUNTER || next > MAX_COUNTER) {
        throw new Error("counter-invalid");
      }
      if (next + parsed.requests.length > MAX_COUNTER) {
        throw new Error("counter-invalid");
      }

      const stamp = now;
      responseRequestIds = requestRefs.map((ref: DocumentReference) => ref.id);
      tx.set(counterRef, { next: next + parsed.requests.length }, { merge: true });
      parsed.requests.forEach((item, i) => {
        tx.set(requestRefs[i], {
          code: `#PAX-${next + i}`,
          title: item.title,
          description: item.description,
          note: item.note,
          org,
          ownerUid: decoded.uid,
          status: "Yeni",
          assignee: "—",
          feedback: "",
          createdAt: stamp + i,
          updatedAt: stamp + i,
          history: [
            { event: "Talep oluşturuldu", by: org, date: nowStamp(new Date(stamp + i)), at: stamp + i },
          ],
        });
      });
      tx.set(idemRef, {
        uid: decoded.uid,
        submissionId: parsed.submissionId,
        requestIds: responseRequestIds,
        count: parsed.requests.length,
        createdAt: now,
        expiresAt: now + 7 * 24 * 60 * 60 * 1000,
      });
      created = true;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "customer-profile-missing") {
      return safeError("Kurum profiliniz bulunamadi.", 403);
    }
    if (message === "counter-invalid") {
      return safeError("Talep numarasi olusturulamadi.", 500);
    }
    console.error("request create failed:", { uid: decoded.uid, message });
    return safeError("Talep olusturulamadi.", 500);
  }

  if (!rateLimit.allowed) {
    return safeError("Cok fazla talep gonderildi. Biraz sonra tekrar deneyin.", 429, {
      "Retry-After": String(retryAfterSeconds || 60),
    });
  }

  return Response.json({
    ok: true,
    requestIds: responseRequestIds,
    created,
  });
}
