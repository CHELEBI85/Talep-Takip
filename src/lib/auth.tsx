"use client";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ADMIN_EMAILS, getAuthClient, getDb } from "./firebase";
import type { AdminRole } from "./types";

interface SignUpData {
  org: string;
  contact: string;
  phone: string;
  email: string;
  password: string;
}

interface AuthValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  adminRole: AdminRole | null;
  /** Giriş yapan müşterinin kurum adı (displayName). */
  org: string;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (data: SignUpData) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminDoc, setAdminDoc] = useState<{
    email: string;
    role: AdminRole | null;
  }>({ email: "", role: null });

  useEffect(() => {
    return onAuthStateChanged(getAuthClient(), (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const email = user?.email?.toLowerCase();
    if (!email || ADMIN_EMAILS.includes(email)) return;
    return onSnapshot(
      doc(getDb(), "admins", email),
      (snap) => {
        const role = snap.data()?.role as AdminRole | undefined;
        setAdminDoc({ email, role: snap.exists() ? role ?? "admin" : null });
      },
      (err) => {
        console.error("admin role onSnapshot:", err);
        setAdminDoc({ email, role: null });
      }
    );
  }, [user]);

  const value = useMemo<AuthValue>(() => {
    const email = user?.email?.toLowerCase() ?? "";
    const envAdmin = !!email && ADMIN_EMAILS.includes(email);
    const firestoreRole = adminDoc.email === email ? adminDoc.role : null;
    const checkingAdmin = !!email && !envAdmin && adminDoc.email !== email;
    const isAdmin = envAdmin || !!firestoreRole;
    return {
      user,
      loading: loading || checkingAdmin,
      isAdmin,
      adminRole: envAdmin ? "super_admin" : firestoreRole,
      org: user?.displayName ?? "",
      async signIn(email, password) {
        const cred = await signInWithEmailAndPassword(getAuthClient(), email, password);
        // Kurum profili eksikse tamamla (kayıt sırasında yazım yarıda
        // kalmış olabilir). merge: mevcut contact/phone alanlarını korur.
        const u = cred.user;
        const admin = !!u.email && ADMIN_EMAILS.includes(u.email.toLowerCase());
        if (!admin) {
          try {
            await setDoc(
              doc(getDb(), "customers", u.uid),
              {
                org: u.displayName ?? "",
                email: u.email ?? "",
                ownerUid: u.uid,
              },
              { merge: true }
            );
          } catch (e) {
            console.warn("customer profil senkronu başarısız:", e);
          }
        }
        return cred.user;
      },
      async signUp({ org, contact, phone, email, password }) {
        const cred = await createUserWithEmailAndPassword(getAuthClient(), email, password);
        await updateProfile(cred.user, { displayName: org });
        // Müşteri (kurum) profilini Firestore'a yaz
        await setDoc(doc(getDb(), "customers", cred.user.uid), {
          org,
          contact,
          phone,
          email,
          ownerUid: cred.user.uid,
          createdAt: serverTimestamp(),
        });
        return cred.user;
      },
      async logout() {
        await signOut(getAuthClient());
      },
    };
  }, [user, loading, adminDoc]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth, AuthProvider içinde kullanılmalı");
  return ctx;
}
