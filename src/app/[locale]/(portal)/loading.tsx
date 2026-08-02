export default function PortalLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-8" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-siam-blue border-t-transparent" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
