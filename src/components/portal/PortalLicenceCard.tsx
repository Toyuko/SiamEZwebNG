import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { serviceTitle } from "@/lib/licence-verification/copy";

export async function PortalLicenceCard({ userId }: { userId: string }) {
  let rows: { id: string; referenceNumber: string; status: string; serviceKind: Parameters<typeof serviceTitle>[0]; accessToken: string }[] = [];
  try {
    rows = await prisma.licenceApplication.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, referenceNumber: true, status: true, serviceKind: true, accessToken: true },
    });
  } catch {
    return null;
  }
  return (
    <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Driving licence pre-check</h2>
        <Link href="/driving-licence/apply" className="text-sm font-semibold text-siam-blue">Start a new check</Link>
      </div>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Check your documents before SiamEZ sends a quotation.</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/driving-licence/track/${row.accessToken}`} className="font-semibold text-siam-blue">{row.referenceNumber}</Link>
              <span className="text-gray-500"> · {serviceTitle(row.serviceKind, "en")} · {row.status.replaceAll("_", " ").toLowerCase()}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
