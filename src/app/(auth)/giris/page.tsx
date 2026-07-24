"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Input, Label } from "@/components/ui/Field";
import { useAuth } from "@/lib/auth";

function authError(code: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "E-posta veya şifre hatalı.";
    case "auth/invalid-email":
      return "Geçersiz e-posta adresi.";
    case "auth/too-many-requests":
      return "Çok fazla deneme. Lütfen biraz sonra tekrar deneyin.";
    default:
      return "Giriş yapılamadı. Lütfen tekrar deneyin.";
  }
}

export default function GirisPage() {
  const router = useRouter();
  const { signIn, user, isAdmin, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Oturum zaten açıksa doğru panele yönlendir.
  useEffect(() => {
    if (!loading && user) {
      router.replace(isAdmin ? "/admin" : "/taleplerim");
    }
  }, [loading, user, isAdmin, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(authError((err as { code?: string })?.code ?? ""));
      setBusy(false);
    }
  }

  if (loading || user || busy) {
    return (
      <div className="flex min-h-[280px] items-center justify-center text-sm text-muted">
        Yukleniyor...
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-panel border border-[#e2e6f0] bg-white shadow-(--shadow-surface)">
      <div className="grid md:grid-cols-2">
        {/* Marka paneli (masaüstü) */}
        <div className="hidden flex-col justify-between bg-[linear-gradient(160deg,#2b4aa0,#20326e)] p-9 text-white md:flex">
          <Image
            src="/pax-mark.png"
            alt="Pax"
            width={52}
            height={52}
            className="h-[52px] w-[52px] object-contain"
            priority
          />
          <div>
            <div className="text-[26px] font-extrabold leading-tight tracking-[-0.02em]">
              Taleplerinizi tek yerden yönetin.
            </div>
            <div className="mt-3.5 text-sm font-medium leading-relaxed text-[#c3ccec]">
              Yeni talep oluşturun, durumlarını canlı takip edin, ekibimizle
              hızlıca iletişim kurun.
            </div>
          </div>
          <div className="text-xs font-semibold text-[#8f9bce]">
            © 2026 Pax Medya
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col justify-center p-8 sm:p-10">
          {/* Mobil marka başlığı */}
          <div className="mb-6 flex flex-col items-center md:hidden">
            <Image
              src="/pax-logo.png"
              alt="Pax Medya"
              width={96}
              height={96}
              className="h-24 w-24 object-contain"
              priority
            />
            <div className="mt-3 text-xl font-extrabold">Giriş yap</div>
            <div className="mt-1 text-[13px] font-medium text-muted-2">
              Pax Medya Talep Sistemi
            </div>
          </div>

          <div className="hidden md:block">
            <div className="text-[22px] font-extrabold tracking-[-0.02em]">
              Giriş yap
            </div>
            <div className="mb-6 mt-1.5 text-sm font-medium text-muted">
              Hesabınıza erişin
            </div>
          </div>

          <Label htmlFor="email" className="mb-1.5">
            E-posta
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="info@kurumunuz.com"
            className="mb-4"
            required
          />

          <Label htmlFor="password" className="mb-1.5">
            Şifre
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-3"
            required
          />

          <label className="mb-4 flex select-none items-center gap-2 text-[13px] font-medium text-muted">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-[1.5px] border-[#c8cee0] accent-primary"
            />
            Beni hatırla
          </label>

          {error && (
            <div className="mb-4 rounded-field border border-[#f0d2c9] bg-[#fdf1ee] px-3.5 py-2.5 text-[13px] font-semibold text-[#c05a3a]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="min-h-11 rounded-field bg-primary py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
          >
            {busy ? "Giriş yapılıyor…" : "Giriş yap"}
          </button>

          <div className="mt-5 text-center text-[13px] font-medium text-muted">
            Hesabınız yok mu?{" "}
            <Link href="/kayit" className="font-bold text-primary">
              Kayıt olun
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
