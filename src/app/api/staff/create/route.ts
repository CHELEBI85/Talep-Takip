type CreateStaffBody = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
};

type FirestoreField =
  | { stringValue: string }
  | { integerValue: string }
  | { booleanValue: boolean };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function fields(data: Record<string, FirestoreField>) {
  return { fields: data };
}

async function assertAdmin(authHeader: string | null, projectId: string) {
  if (!authHeader?.startsWith("Bearer ")) return false;

  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/staff?pageSize=1`,
    { headers: { Authorization: authHeader } }
  );
  return res.ok;
}

async function firestorePatch(
  path: string,
  authHeader: string,
  data: Record<string, FirestoreField>
) {
  const res = await fetch(path, {
    method: "PATCH",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(fields(data)),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Firestore yazma hatasi: ${res.status} ${detail}`);
  }
  return res.json();
}

export async function POST(request: Request) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authHeader = request.headers.get("authorization");

  if (!projectId || !apiKey) {
    return Response.json({ ok: false, error: "Firebase env eksik." }, { status: 500 });
  }
  if (!(await assertAdmin(authHeader, projectId))) {
    return Response.json({ ok: false, error: "Yetkisiz islem." }, { status: 403 });
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

  const signUpRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName: name, returnSecureToken: false }),
    }
  );
  const signUpData = (await signUpRes.json().catch(() => ({}))) as {
    localId?: string;
    error?: { message?: string };
  };

  if (!signUpRes.ok || !signUpData.localId) {
    const message =
      signUpData.error?.message === "EMAIL_EXISTS"
        ? "Bu e-posta ile zaten hesap var."
        : "Personel hesabi acilamadi.";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }

  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  const now = String(Date.now());

  await firestorePatch(`${base}/admins/${encodeURIComponent(email)}`, authHeader!, {
    email: { stringValue: email },
    role: { stringValue: "admin" },
    createdAt: { integerValue: now },
    updatedAt: { integerValue: now },
  });

  await firestorePatch(`${base}/staff/${signUpData.localId}`, authHeader!, {
    name: { stringValue: name },
    email: { stringValue: email },
    uid: { stringValue: signUpData.localId },
    createdAt: { integerValue: now },
  });

  return Response.json({
    ok: true,
    uid: signUpData.localId,
    email,
    role: "admin",
  });
}
