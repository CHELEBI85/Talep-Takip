// İçerik üst çubuğu: sol başlık + isteğe bağlı sağ alan (buton, arama, meta).
export function PageHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-16 flex-col items-stretch justify-center gap-3 border-b border-border-divider bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-7">
      <h1 className="min-w-0 break-words text-lg font-extrabold tracking-[-0.01em]">
        {title}
      </h1>
      {right && (
        <div className="flex w-full min-w-0 items-center gap-3.5 sm:w-auto">
          {right}
        </div>
      )}
    </div>
  );
}
