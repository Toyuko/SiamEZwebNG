"use client";

export default function CalendarError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm text-red-800">Unable to load calendar. Try again.</p>
      <button type="button" className="mt-3 min-h-11 rounded-lg bg-siam-blue px-3 text-sm font-semibold text-white" onClick={reset}>
        Retry
      </button>
    </div>
  );
}
