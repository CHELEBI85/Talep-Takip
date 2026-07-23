// İçerik üst çubuğu: sol başlık + isteğe bağlı sağ alan (buton, arama, meta).
export function PageHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-border-divider bg-white px-5 py-3 sm:px-7">
      <h1 className="text-lg font-extrabold tracking-[-0.01em]">{title}</h1>
      {right && <div className="flex items-center gap-3.5">{right}</div>}
    </div>
  );
}
