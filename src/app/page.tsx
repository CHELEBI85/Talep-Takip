"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const router = useRouter();
  const { user, loading, isAdmin } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? (isAdmin ? "/admin" : "/taleplerim") : "/giris");
  }, [loading, user, isAdmin, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-page text-sm text-muted">
      Yukleniyor...
    </div>
  );
}
