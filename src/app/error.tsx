"use client"; // Hata sınırları Client Component olmak zorundadır

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-page px-4 text-center">
      <Image
        src="/pax-logo.png"
        alt="Pax Medya"
        width={96}
        height={96}
        className="h-24 w-24 object-contain"
      />
      <div className="text-2xl font-extrabold tracking-[-0.01em]">
        Bir şeyler ters gitti
      </div>
      <p className="max-w-sm text-sm text-muted">
        Beklenmeyen bir hata oluştu. Tekrar deneyebilir ya da panele
        dönebilirsiniz.
      </p>
      {error.digest && (
        <p className="text-xs text-faint-2">Hata kodu: {error.digest}</p>
      )}
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <button
          onClick={() => unstable_retry()}
          className="min-h-11 rounded-field bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-primary-dark"
        >
          Tekrar dene
        </button>
        <Link
          href="/taleplerim"
          className="min-h-11 rounded-field border border-border-input bg-white px-5 py-3 text-sm font-bold text-ink-2 hover:bg-panel"
        >
          Taleplerim
        </Link>
      </div>
    </div>
  );
}
