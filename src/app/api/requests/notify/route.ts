import { Resend } from "resend";

type NotifyRequest = {
  org?: unknown;
  requests?: unknown;
};

type RequestSummary = {
  code: string;
  title: string;
  description: string;
  note?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type FirestoreValue = {
  arrayValue?: { values?: FirestoreValue[] };
  stringValue?: string;
  mapValue?: { fields?: Record<string, FirestoreValue> };
};

function asRecipients(values: FirestoreValue[] = []): string[] {
  return Array.from(
    new Set(
      values
        .map((item) => String(item.stringValue ?? "").trim().toLowerCase())
        .filter((email) => emailPattern.test(email))
    )
  );
}

function scopedRecipients(values: FirestoreValue[] = [], org: string): string[] {
  return Array.from(
    new Set(
      values
        .map((item) => item.mapValue?.fields)
        .filter(Boolean)
        .filter((fields) => fields?.customer?.stringValue === org)
        .map((fields) => String(fields?.email?.stringValue ?? "").trim().toLowerCase())
        .filter((email) => emailPattern.test(email))
    )
  );
}

async function getRecipients(authHeader: string | null, org: string): Promise<string[]> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!authHeader?.startsWith("Bearer ") || !projectId) return [];

  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/notifications`,
    { headers: { Authorization: authHeader } }
  );
  if (!res.ok) return [];

  const data = (await res.json()) as {
    fields?: { recipients?: FirestoreValue; rules?: FirestoreValue };
  };
  return Array.from(
    new Set([
      ...asRecipients(data.fields?.recipients?.arrayValue?.values),
      ...scopedRecipients(data.fields?.rules?.arrayValue?.values, org),
    ])
  );
}

function asRequests(value: unknown): RequestSummary[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        code: String(row.code ?? ""),
        title: String(row.title ?? ""),
        description: String(row.description ?? ""),
        note: row.note ? String(row.note) : "",
      };
    })
    .filter((item) => item.code && item.title);
}

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return Response.json({ ok: false, error: "RESEND_API_KEY eksik." }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as NotifyRequest;
  const requests = asRequests(body.requests);
  const org = typeof body.org === "string" ? body.org : "Bilinmeyen kurum";
  const recipients = await getRecipients(request.headers.get("authorization"), org);

  if (recipients.length === 0 || requests.length === 0) {
    return Response.json({ ok: false, error: "Bildirim verisi eksik." }, { status: 400 });
  }

  const from = process.env.RESEND_FROM_EMAIL ?? "Pax Medya <onboarding@resend.dev>";
  const safeOrg = escapeHtml(org);
  const rows = requests
    .map((item) => {
      const note = item.note?.trim()
        ? `<p style="margin:8px 0 0;color:#667085"><strong>Ek not:</strong> ${escapeHtml(item.note)}</p>`
        : "";
      return `
        <li style="margin:0 0 18px;padding:16px;border:1px solid #e7eaf1;border-radius:10px">
          <div style="font-weight:800;color:#1d2b4f">${escapeHtml(item.code)} · ${escapeHtml(item.title)}</div>
          <p style="margin:8px 0 0;color:#475467;line-height:1.55">${escapeHtml(item.description)}</p>
          ${note}
        </li>`;
    })
    .join("");

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to: recipients,
    subject: `${org} yeni talep oluşturdu`,
    html: `
      <div style="font-family:Arial,sans-serif;color:#101828">
        <h2 style="margin:0 0 8px">Yeni talep oluşturuldu</h2>
        <p style="margin:0 0 20px;color:#475467"><strong>${safeOrg}</strong> tarafından ${requests.length} yeni talep gönderildi.</p>
        <ul style="list-style:none;margin:0;padding:0">${rows}</ul>
      </div>
    `,
  });

  if (result.error) {
    console.error("Resend mail hatasi:", result.error);
    return Response.json({ ok: false, error: result.error.message }, { status: 502 });
  }

  return Response.json({ ok: true, id: result.data?.id });
}
