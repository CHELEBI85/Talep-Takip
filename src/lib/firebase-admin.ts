import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

type ServiceAccountJson = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

function cleanJsonEnv(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function serviceAccount() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (json) {
    const parsed = JSON.parse(cleanJsonEnv(json)) as ServiceAccountJson;
    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key?.replace(/\\n/g, "\n"),
    };
  }

  return {
    projectId: process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  };
}

function adminApp() {
  if (getApps().length) return getApps()[0];

  const account = serviceAccount();
  if (!account.projectId || !account.clientEmail || !account.privateKey) {
    throw new Error(
      "Firebase Admin servis hesabi eksik. FIREBASE_SERVICE_ACCOUNT_KEY veya FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY tanimlayin."
    );
  }

  return initializeApp({
    credential: cert(account),
  });
}

export function getAdminAuth() {
  return getAuth(adminApp());
}

export function getAdminDb() {
  return getFirestore(adminApp());
}
