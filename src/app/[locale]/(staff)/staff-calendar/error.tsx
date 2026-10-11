"use client";

export default function StaffCalendarError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-8">
      <p className="text-sm font-semibold text-siam-blue">SIAMEZ</p>
      <h1 className="mt-1 text-xl font-semibold">Calendar</h1>
      <p className="mt-3 text-sm text-gray-600">Unable to load the schedule. Check the connection and try again.</p>
      <button type="button" className="mt-4 h-11 rounded-xl bg-siam-blue px-4 text-sm font-semibold text-white" onClick={reset}>
        Retry
      </button>
    </div>
  );
}
