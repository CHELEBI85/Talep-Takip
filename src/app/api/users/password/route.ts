import { ADMIN_EMAILS, ADMIN_UIDS } from "@/lib/firebase";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

type PasswordBody = {
  email?: unknown;
  password?: unknown;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function isSuperAdmin(uid: string, email?: string) {
  const normalized = normalizeEmail(email ?? "");
  if (ADMIN_UIDS.includes(uid) || ADMIN_EMAILS.includes(normalized)) return true;
  if (!normalized) return false;

  const snap = await getAdminDb().collection("admins").doc(normalized).get();
  return snap.exists && snap.data()?.role === "super_admin";
}

export async function POST(request: Request) {
  let auth;
  try {
    auth = getAdminAuth();
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Firebase Admin baslatilamadi." },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return Response.json({ ok: false, error: "Oturum dogrulanamadi." }, { status: 401 });
  }

  const decoded = await auth.verifyIdToken(token).catch(() => null);
  if (!decoded || !(await isSuperAdmin(decoded.uid, decoded.email))) {
    return Response.json({ ok: false, error: "Bu islem sadece super admin icin." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as PasswordBody;
  const email = normalizeEmail(typeof body.email === "string" ? body.email : "");
  const password = typeof body.password === "string" ? body.password : "";

  if (!emailPattern.test(email) || password.length < 6) {
    return Response.json(
      { ok: false, error: "Gecerli e-posta ve en az 6 karakter sifre gerekli." },
      { status: 400 }
    );
  }

  const target = await auth.getUserByEmail(email).catch(() => null);
  if (!target) {
    return Response.json({ ok: false, error: "Bu e-posta ile kullanici bulunamadi." }, { status: 404 });
  }

  await auth.updateUser(target.uid, { password });

  return Response.json({ ok: true, uid: target.uid, email });
}
