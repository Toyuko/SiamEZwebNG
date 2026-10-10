import { Link } from "@/i18n/navigation";
import { listPublicAvailability } from "@/data-access/company-calendar";
import { calendarAnchor, calendarRange, monthGridDates, shiftAnchor } from "@/lib/calendar/schedule";
import { provinceChipStyle, provinceStyle } from "@/lib/calendar/provinces";

export const metadata = {
  title: "Availability | SiamEZ",
  description: "See when SiamEZ is booked in Thailand. Customer details are not shown.",
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function PublicAvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const anchor = calendarAnchor(params.date);
  const range = calendarRange("month", anchor);
  const slots = await listPublicAvailability(range.start, range.end);
  const dates = monthGridDates(anchor);
  const monthKey = anchor.slice(0, 7);
  const title = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", month: "long", year: "numeric" }).format(
    new Date(`${anchor}T12:00:00+07:00`)
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <p className="text-sm font-medium text-siam-blue">Thailand time</p>
      <h1 className="text-3xl font-bold">Availability</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        Booked times, provinces, and services only. Customer names, phone numbers, prices, invoices, and documents are not shown.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={`/calendar?date=${shiftAnchor(anchor, "month", -1)}`} className="inline-flex h-11 items-center rounded-lg border px-3" aria-label="Previous month">
          Previous
        </Link>
        <Link href="/calendar" className="inline-flex h-11 items-center rounded-lg border px-3">
          This month
        </Link>
        <Link href={`/calendar?date=${shiftAnchor(anchor, "month", 1)}`} className="inline-flex h-11 items-center rounded-lg border px-3" aria-label="Next month">
          Next
        </Link>
        <p className="px-2 text-lg font-medium">{title}</p>
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border">
        <div className="grid min-w-[40rem] grid-cols-7 border-b text-center text-xs font-medium text-gray-500">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-2">{day}</div>
          ))}
        </div>
        <div className="grid min-w-[40rem] grid-cols-7">
          {dates.map((date) => {
            const daySlots = slots.filter((slot) => slot.date === date);
            const outside = !date.startsWith(monthKey);
            return (
              <div key={date} className={`min-h-28 border-b border-r p-1 ${outside ? "bg-gray-50 text-gray-400" : ""}`}>
                <p className="text-xs">{Number(date.slice(-2))}</p>
                <ul className="mt-1 space-y-1">
                  {daySlots.slice(0, 3).map((slot, index) => {
                    const named = slot.province === "Province needed" ? null : slot.province;
                    const style = provinceStyle(named);
                    return (
                      <li
                        key={`${slot.date}-${slot.time}-${index}`}
                        className="rounded-md border px-1.5 py-1 text-[11px] leading-tight"
                        style={provinceChipStyle(named)}
                      >
                        <span className="inline-flex rounded px-1 text-[10px] font-bold text-white" style={{ backgroundColor: style.accent }}>{slot.province}</span>
                        <span className="mt-0.5 block font-semibold">{slot.time}</span>
                        <span className="block opacity-80">{slot.service}</span>
                        <span className="block opacity-80">Booked</span>
                      </li>
                    );
                  })}
                  {daySlots.length > 3 && <li className="px-1 text-[11px] text-gray-500">+ {daySlots.length - 3} more booked</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
