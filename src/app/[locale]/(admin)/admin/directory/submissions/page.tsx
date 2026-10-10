import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { reviewSubmission } from "@/actions/directory";
import { AdminDirectoryNav } from "@/components/directory/AdminDirectoryNav";
import { requireDirectoryAdmin, listActiveCategories } from "@/data-access/directory";
import { getDirectoryCopy } from "@/lib/directory/copy";
import { THAI_PROVINCES } from "@/lib/directory/provinces";

export default async function SubmissionsPage() {
  await requireDirectoryAdmin();
  const locale = await getLocale();
  const copy = getDirectoryCopy(locale);
  const [submissions, categories] = await Promise.all([
    prisma.govOfficeSubmission.findMany({
      where: { status: "pending" },
      include: {
        office: { select: { nameEn: true, nameTh: true } },
        submitter: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    listActiveCategories(),
  ]);

  return (
    <main className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold">{copy.submissions}</h1>
      <div className="mt-4">
        <AdminDirectoryNav />
      </div>
      {submissions.length === 0 ? <p className="text-sm text-muted-foreground">{copy.noPending}</p> : null}
      <ul className="space-y-4">
        {submissions.map((submission) => {
          const payload = submission.payload as Record<string, string | null>;
          return (
            <li key={submission.id} className="rounded-xl border border-border bg-white p-4">
              <p className="text-sm font-medium">
                {submission.kind} · {submission.submitter?.name || submission.submitter?.email}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{submission.createdAt.toISOString().slice(0, 16)}</p>
              {submission.kind === "correction" ? (
                <form action={reviewSubmission} className="mt-3 space-y-2">
                  <input type="hidden" name="id" value={submission.id} />
                  <p className="text-sm">
                    {payload.field}: {payload.suggestedValue}
                  </p>
                  <textarea name="approvedValue" defaultValue={payload.suggestedValue ?? ""} rows={3} className="w-full rounded-lg border px-3 py-2 text-sm" />
                  <textarea name="reviewNotes" placeholder={copy.reviewNotes} rows={2} className="w-full rounded-lg border px-3 py-2 text-sm" />
                  <div className="flex gap-2">
                    <button name="decision" value="approve" className="h-10 rounded-lg bg-siam-blue px-3 text-sm font-semibold text-white">
                      {copy.approve}
                    </button>
                    <button name="decision" value="reject" className="h-10 rounded-lg border px-3 text-sm">
                      {copy.reject}
                    </button>
                  </div>
                </form>
              ) : (
                <form action={reviewSubmission} className="mt-3 grid gap-2 md:grid-cols-2">
                  <input type="hidden" name="id" value={submission.id} />
                  <input name="nameEn" defaultValue={payload.nameEn ?? ""} placeholder={copy.nameEn} className="rounded-lg border px-3 py-2 text-sm" />
                  <input name="nameTh" defaultValue={payload.nameTh ?? ""} placeholder={copy.nameTh} className="rounded-lg border px-3 py-2 text-sm" />
                  <select name="categorySlug" defaultValue={payload.categorySlug ?? ""} className="rounded-lg border px-3 py-2 text-sm">
                    {categories.map((category) => (
                      <option key={category.slug} value={category.slug}>
                        {category.nameEn}
                      </option>
                    ))}
                  </select>
                  <select name="provinceCode" defaultValue={payload.provinceCode ?? "10"} className="rounded-lg border px-3 py-2 text-sm">
                    {THAI_PROVINCES.map((province) => (
                      <option key={province.code} value={province.code}>
                        {province.nameEn}
                      </option>
                    ))}
                  </select>
                  <input name="phonePrimary" defaultValue={payload.phonePrimary ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
                  <input name="website" defaultValue={payload.website ?? ""} className="rounded-lg border px-3 py-2 text-sm" />
                  <textarea name="addressEn" defaultValue={payload.addressEn ?? ""} className="rounded-lg border px-3 py-2 text-sm md:col-span-2" />
                  <textarea name="notes" defaultValue={payload.notes ?? ""} className="rounded-lg border px-3 py-2 text-sm md:col-span-2" />
                  <textarea name="reviewNotes" placeholder={copy.reviewNotes} className="rounded-lg border px-3 py-2 text-sm md:col-span-2" />
                  <div className="flex gap-2 md:col-span-2">
                    <button name="decision" value="approve" className="h-10 rounded-lg bg-siam-blue px-3 text-sm font-semibold text-white">
                      {copy.approve}
                    </button>
                    <button name="decision" value="reject" className="h-10 rounded-lg border px-3 text-sm">
                      {copy.reject}
                    </button>
                  </div>
                </form>
              )}
              {submission.office ? (
                <p className="mt-2 text-xs text-muted-foreground">{submission.office.nameEn || submission.office.nameTh}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
