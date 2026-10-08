import { Link } from "@/i18n/navigation";
import { listPublicAvailability } from "@/data-access/company-calendar";
import { calendarAnchor, calendarRange, shiftAnchor } from "@/lib/calendar/schedule";
import { provinceStyle } from "@/lib/calendar/provinces";

export const metadata = {
  title: "Availability | SiamEZ",
  description: "See when SiamEZ is booked in Thailand. Customer details are not shown.",
};

export default async function PublicAvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const anchor = calendarAnchor(params.date);
  const range = calendarRange("month", anchor);
  const slots = await listPublicAvailability(range.start, range.end);
  const byDate = new Map<string, typeof slots>();
  for (const slot of slots) {
    const list = byDate.get(slot.date) ?? [];
    list.push(slot);
    byDate.set(slot.date, list);
  }
  const days = [...byDate.keys()].sort();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <p className="text-sm font-medium text-siam-blue">Thailand time</p>
      <h1 className="text-3xl font-bold">Availability</h1>
      <p className="mt-2 text-gray-600">
        Booked times and provinces only. Customer names, phone numbers, prices, and documents are not shown.
      </p>
      <div className="mt-4 flex gap-2">
        <Link href={`/calendar?date=${shiftAnchor(anchor, "month", -1)}`} className="inline-flex min-h-11 items-center rounded-lg border px-3">
          Previous
        </Link>
        <Link href="/calendar" className="inline-flex min-h-11 items-center rounded-lg bg-siam-blue px-3 font-semibold text-white">
          This month
        </Link>
        <Link href={`/calendar?date=${shiftAnchor(anchor, "month", 1)}`} className="inline-flex min-h-11 items-center rounded-lg border px-3">
          Next
        </Link>
      </div>
      <p className="mt-4 font-medium">{anchor.slice(0, 7)}</p>
      {days.length === 0 && <p className="mt-6 text-gray-500">No public bookings in this month.</p>}
      <div className="mt-4 space-y-4">
        {days.map((date) => (
          <section key={date}>
            <h2 className="text-lg font-semibold">{date}</h2>
            <ul className="mt-2 space-y-2">
              {byDate.get(date)?.map((slot, index) => {
                const style = provinceStyle(slot.province === "Province needed" ? null : slot.province);
                return (
                  <li key={`${slot.date}-${slot.time}-${index}`} className="rounded-xl px-3 py-2" style={{ background: style.color, color: style.textColor }}>
                    <span className="block font-medium">{slot.time}</span>
                    <span className="block">{slot.province}</span>
                    <span className="block text-sm">{slot.service}</span>
                    <span className="block text-sm">Booked</span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
