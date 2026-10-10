import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { reviewReport } from "@/actions/directory";
import { AdminDirectoryNav } from "@/components/directory/AdminDirectoryNav";
import { requireDirectoryAdmin } from "@/data-access/directory";
import { getDirectoryCopy } from "@/lib/directory/copy";

export default async function ReportsPage() {
  await requireDirectoryAdmin();
  const copy = getDirectoryCopy(await getLocale());
  const reports = await prisma.govOfficeReport.findMany({
    where: { status: { in: ["open", "in_review"] } },
    include: {
      office: { select: { nameEn: true, nameTh: true, slug: true } },
      reporter: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <main className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold">{copy.reports}</h1>
      <div className="mt-4">
        <AdminDirectoryNav />
      </div>
      {reports.length === 0 ? <p className="text-sm text-muted-foreground">{copy.noPending}</p> : null}
      <ul className="space-y-4">
        {reports.map((report) => (
          <li key={report.id} className="rounded-xl border border-border bg-white p-4">
            <p className="font-medium">
              {report.office.nameEn || report.office.nameTh} · {copy.reportFields[report.field]}
            </p>
            <p className="mt-1 text-sm">{report.explanation}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {report.createdAt.toISOString().slice(0, 10)} · {report.reporter?.name || report.reporter?.email || copy.unknown}
            </p>
            <form action={reviewReport} className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={report.id} />
              <select name="status" defaultValue="resolved" className="h-10 rounded-lg border px-2 text-sm">
                <option value="in_review">in review</option>
                <option value="resolved">resolved</option>
                <option value="dismissed">dismissed</option>
              </select>
              <input name="resolutionNotes" placeholder={copy.reviewNotes} className="h-10 flex-1 rounded-lg border px-3 text-sm" />
              <button className="h-10 rounded-lg bg-siam-blue px-3 text-sm font-semibold text-white">{copy.save}</button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
