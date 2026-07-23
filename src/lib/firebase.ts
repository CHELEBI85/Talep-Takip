import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Zorunlu alanlar ve karşılık gelen ortam değişkeni adları. Adlar elle
// yazılır: config anahtarından türetilse "apiKey" → "APIKEY" gibi var
// olmayan bir değişken adı önerilirdi.
const REQUIRED: [keyof typeof firebaseConfig, string][] = [
  ["apiKey", "NEXT_PUBLIC_FIREBASE_API_KEY"],
  ["authDomain", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"],
  ["projectId", "NEXT_PUBLIC_FIREBASE_PROJECT_ID"],
  ["appId", "NEXT_PUBLIC_FIREBASE_APP_ID"],
];

// Firebase istemcileri modül yüklenirken DEĞİL, ilk kullanımda kurulur.
// Sayfalar statik olarak prerender edildiği için modül gövdesi build
// sırasında sunucuda da çalışır; orada getAuth() çağırmak, env değişkenleri
// eksik olduğunda tüm build'i "auth/invalid-api-key" ile düşürürdü.
// Tembel kurulumla bu yalnızca tarayıcıda, net bir mesajla ortaya çıkar.
let appRef: FirebaseApp | null = null;
let authRef: Auth | null = null;
let dbRef: Firestore | null = null;

function firebaseApp(): FirebaseApp {
  const missing = REQUIRED.filter(([key]) => !firebaseConfig[key]).map(
    ([, envName]) => envName
  );
  if (missing.length > 0) {
    throw new Error(
      `Firebase yapılandırması eksik: ${missing.join(", ")}. Ortam ` +
        `değişkenlerini (Vercel → Environment Variables) tanımlayıp yeniden ` +
        `deploy edin — NEXT_PUBLIC_* değerleri build sırasında gömülür.`
    );
  }
  // Next.js fast-refresh / SSR'de çift init'i önle
  if (!appRef) appRef = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return appRef;
}

export function getAuthClient(): Auth {
  if (!authRef) authRef = getAuth(firebaseApp());
  return authRef;
}

export function getDb(): Firestore {
  if (!dbRef) dbRef = getFirestore(firebaseApp());
  return dbRef;
}

// Admin e-posta listesi (env'den)
export const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Analytics yalnızca tarayıcıda ve destekleniyorsa yüklenir (SSR guard)
export async function initAnalytics() {
  if (typeof window === "undefined") return null;
  const { getAnalytics, isSupported } = await import("firebase/analytics");
  if (await isSupported()) return getAnalytics(firebaseApp());
  return null;
}
