export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6" role="status" aria-live="polite">
      <div className="h-24 animate-pulse rounded-2xl border border-[#DCE6F5] bg-white shadow-soft" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl border border-[#DCE6F5] bg-white shadow-soft"
          />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="h-64 animate-pulse rounded-2xl border border-[#DCE6F5] bg-white shadow-soft lg:col-span-3" />
        <div className="h-64 animate-pulse rounded-2xl border border-[#DCE6F5] bg-white shadow-soft lg:col-span-2" />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
