"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Input, Label } from "@/components/ui/Field";
import { useAuth } from "@/lib/auth";

function authError(code: string): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "Bu e-posta zaten kayıtlı. Giriş yapmayı deneyin.";
    case "auth/invalid-email":
      return "Geçersiz e-posta adresi.";
    case "auth/weak-password":
      return "Şifre en az 6 karakter olmalı.";
    default:
      return "Kayıt oluşturulamadı. Lütfen tekrar deneyin.";
  }
}

export default function KayitPage() {
  const router = useRouter();
  const { signUp, user, isAdmin, loading } = useAuth();
  const [form, setForm] = useState({
    org: "",
    contact: "",
    phone: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Oturum zaten açıksa doğru panele yönlendir.
  useEffect(() => {
    if (!loading && user && !busy) {
      router.replace(isAdmin ? "/admin" : "/taleplerim");
    }
  }, [loading, user, isAdmin, busy, router]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signUp(form);
      router.replace("/taleplerim");
    } catch (err) {
      setError(authError((err as { code?: string })?.code ?? ""));
      setBusy(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-panel border border-[#e2e6f0] bg-white p-8 shadow-(--shadow-surface) sm:p-10">
      <div className="mb-6 flex flex-col items-center text-center">
        <Image
          src="/pax-logo.png"
          alt="Pax Medya"
          width={88}
          height={88}
          className="h-22 w-22 object-contain"
          priority
        />
        <div className="mt-3 text-[22px] font-extrabold tracking-[-0.02em]">
          Kurum kaydı oluşturun
        </div>
        <div className="mt-1.5 text-sm font-medium text-muted">
          Birkaç dakikada başlayın
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-4.5">
          <div className="sm:col-span-2">
            <Label htmlFor="org" className="mb-1.5">
              Kurum adı
            </Label>
            <Input
              id="org"
              value={form.org}
              onChange={set("org")}
              placeholder="Örn. Pax Medya Ajans"
              required
            />
          </div>
          <div>
            <Label htmlFor="contact" className="mb-1.5">
              Yetkili kişi
            </Label>
            <Input
              id="contact"
              value={form.contact}
              onChange={set("contact")}
              placeholder="Adınız Soyadınız"
              required
            />
          </div>
          <div>
            <Label htmlFor="phone" className="mb-1.5">
              Telefon
            </Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={set("phone")}
              placeholder="05XX XXX XX XX"
            />
          </div>
          <div>
            <Label htmlFor="email" className="mb-1.5">
              E-posta
            </Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="info@kurumunuz.com"
              required
            />
          </div>
          <div>
            <Label htmlFor="password" className="mb-1.5">
              Şifre
            </Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={set("password")}
              placeholder="En az 6 karakter"
              required
            />
          </div>
        </div>



        {error && (
          <div className="mt-4 rounded-field border border-[#f0d2c9] bg-[#fdf1ee] px-3.5 py-2.5 text-[13px] font-semibold text-[#c05a3a]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-5 min-h-11 w-full rounded-field bg-primary py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
        >
          {busy ? "Kayıt oluşturuluyor…" : "Kayıt ol"}
        </button>

        <div className="mt-4 text-center text-[13px] font-medium text-muted">
          Zaten üye misiniz?{" "}
          <Link href="/giris" className="font-bold text-primary">
            Giriş yapın
          </Link>
        </div>
      </form>
    </div>
  );
}
