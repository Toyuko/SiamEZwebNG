export default function CalendarLoading() {
  return (
    <div className="-mx-4 -my-4 min-h-[calc(100dvh-3.5rem)] animate-pulse bg-white md:-mx-6 md:-my-6 dark:bg-gray-950" aria-busy="true" aria-label="Loading calendar">
      <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-3 dark:border-gray-800">
        <div className="h-9 w-16 rounded-full bg-gray-200 dark:bg-gray-800" />
        <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-800" />
        <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-800" />
        <div className="h-6 w-40 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="ml-auto h-9 w-56 rounded-lg bg-gray-100 dark:bg-gray-900" />
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-800">
        {Array.from({ length: 35 }, (_, index) => (
          <div key={index} className="min-h-24 bg-white dark:bg-gray-950" />
        ))}
      </div>
    </div>
  );
}
