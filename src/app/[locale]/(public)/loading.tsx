export default function PublicLoading() {
  return (
    <div className="flex min-h-[30vh] items-center justify-center p-8" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-siam-blue border-t-transparent" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
