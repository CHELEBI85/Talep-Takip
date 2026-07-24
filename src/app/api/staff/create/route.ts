import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { SERVER_ADMIN_EMAILS, SERVER_ADMIN_UIDS } from "@/lib/server-config";

export const runtime = "nodejs";

type CreateStaffBody = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function isSuperAdmin(uid: string, email?: string) {
  const normalized = normalizeEmail(email ?? "");
  if (SERVER_ADMIN_UIDS.includes(uid) || SERVER_ADMIN_EMAILS.includes(normalized)) return true;
  if (!normalized) return false;

  const snap = await getAdminDb().collection("admins").doc(normalized).get();
  return snap.exists && snap.data()?.role === "super_admin";
}

export async function POST(request: Request) {
  let auth;
  let db;
  try {
    auth = getAdminAuth();
    db = getAdminDb();
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Firebase Admin baslatilamadi." },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const decoded = token ? await auth.verifyIdToken(token).catch(() => null) : null;
  if (!decoded || !(await isSuperAdmin(decoded.uid, decoded.email))) {
    return Response.json({ ok: false, error: "Bu islem sadece super admin icin." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as CreateStaffBody;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = normalizeEmail(typeof body.email === "string" ? body.email : "");
  const password = typeof body.password === "string" ? body.password : "";

  if (!name || !emailPattern.test(email) || password.length < 6) {
    return Response.json(
      { ok: false, error: "Ad, gecerli e-posta ve en az 6 karakter sifre gerekli." },
      { status: 400 }
    );
  }

  const existing = await auth.getUserByEmail(email).catch(() => null);
  if (existing) {
    return Response.json({ ok: false, error: "Bu e-posta ile zaten hesap var." }, { status: 400 });
  }

  const user = await auth.createUser({
    email,
    password,
    displayName: name,
  });
  const now = Date.now();

  await db.runTransaction(async (tx) => {
    tx.set(db.collection("admins").doc(email), {
      email,
      role: "admin",
      createdAt: now,
      updatedAt: now,
    });
    tx.set(db.collection("staff").doc(user.uid), {
      name,
      email,
      uid: user.uid,
      createdAt: now,
    });
  });

  return Response.json({ ok: true, uid: user.uid, email, role: "admin" });
}
