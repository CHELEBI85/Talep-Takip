import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
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
        Sayfa bulunamadı
      </div>
      <p className="max-w-sm text-sm text-muted">
        Aradığınız kayıt taşınmış veya hiç var olmamış olabilir.
      </p>
      <div className="mt-2 flex gap-3">
        <Link
          href="/taleplerim"
          className="min-h-11 rounded-field bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-primary-dark"
        >
          Taleplerim
        </Link>
        <Link
          href="/admin"
          className="min-h-11 rounded-field border border-border-input bg-white px-5 py-3 text-sm font-bold text-ink-2 hover:bg-panel"
        >
          Admin paneli
        </Link>
      </div>
    </div>
  );
}
