"use client"; // Hata sınırları Client Component olmak zorundadır

// Kök layout'ta (AuthProvider / StoreProvider — ör. Firebase init) oluşan
// hataları yakalar. Bu dosya kök layout'un yerini aldığı için kendi
// <html>/<body> etiketlerini ve stillerini içermek zorundadır.
import "./globals.css";
import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full">
        <title>Bir şeyler ters gitti · Pax Medya</title>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-page px-4 text-center">
          <div className="text-2xl font-extrabold tracking-[-0.01em]">
            Uygulama başlatılamadı
          </div>
          <p className="max-w-sm text-sm text-muted">
            Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin; sorun sürerse
            bizimle iletişime geçin.
          </p>
          {error.digest && (
            <p className="text-xs text-faint-2">Hata kodu: {error.digest}</p>
          )}
          <button
            onClick={() => unstable_retry()}
            className="mt-2 min-h-11 rounded-field bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-primary-dark"
          >
            Tekrar dene
          </button>
        </div>
      </body>
    </html>
  );
}
