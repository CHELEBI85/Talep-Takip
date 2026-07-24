import { createHash } from "crypto";
import type { Transaction } from "firebase-admin/firestore";
import { ADMIN_EMAILS, ADMIN_UIDS } from "@/lib/firebase";
import { getAdminDb } from "@/lib/firebase-admin";

export type RateLimitSpec = {
  id: string;
  limit: number;
  increment: number;
  windowMs: number;
};

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function requesterIsBootstrapAdmin(uid: string, email?: string): boolean {
  const normalized = normalizeEmail(email ?? "");
  return ADMIN_UIDS.includes(uid) || (!!normalized && ADMIN_EMAILS.includes(normalized));
}

export async function requesterIsAdmin(uid: string, email?: string): Promise<boolean> {
  if (requesterIsBootstrapAdmin(uid, email)) return true;
  const normalized = normalizeEmail(email ?? "");
  if (!normalized) return false;
  const snap = await getAdminDb().collection("admins").doc(normalized).get();
  return snap.exists;
}

export function clientIpHash(request: Request): string {
  const vercelIp = firstIp(request.headers.get("x-vercel-forwarded-for"));
  const forwardedIp = firstIp(request.headers.get("x-forwarded-for"));
  const ip = vercelIp || forwardedIp || "unknown";
  const salt = rateLimitSalt();
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

function firstIp(value: string | null): string {
  const raw = value?.split(",").map((part) => part.trim()).find(Boolean) ?? "";
  return raw.toLowerCase();
}

function rateLimitSalt(): string {
  const salt = process.env.RATE_LIMIT_HASH_SALT;
  if (salt && salt.length >= 32) return salt;
  if (process.env.NODE_ENV !== "production") {
    return "development-only-rate-limit-salt-please-set-env";
  }
  throw new Error("RATE_LIMIT_HASH_SALT is required in production.");
}

export function rateLimitId(scope: string, subject: string, windowMs: number, now: number): string {
  return `${scope}_${subject}_${Math.floor(now / windowMs)}`;
}

export async function applyRateLimits(
  tx: Transaction,
  specs: RateLimitSpec[],
  now: number
): Promise<RateLimitResult> {
  const db = getAdminDb();
  const refs = specs.map((spec) => db.collection("rateLimits").doc(spec.id));
  const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));

  for (let i = 0; i < specs.length; i += 1) {
    const spec = specs[i];
    const current = snaps[i].exists ? Number(snaps[i].data()?.count ?? 0) : 0;
    if (current + spec.increment > spec.limit) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((Math.floor(now / spec.windowMs + 1) * spec.windowMs - now) / 1000)
      );
      return { allowed: false, retryAfterSeconds };
    }
  }

  specs.forEach((spec, i) => {
    const current = snaps[i].exists ? Number(snaps[i].data()?.count ?? 0) : 0;
    tx.set(
      refs[i],
      {
        count: current + spec.increment,
        updatedAt: now,
        expiresAt: now + spec.windowMs * 2,
      },
      { merge: true }
    );
  });
  return { allowed: true };
}
