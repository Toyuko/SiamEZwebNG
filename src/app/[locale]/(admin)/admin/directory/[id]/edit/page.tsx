import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { archiveOffice, restoreOffice } from "@/actions/directory";
import { AdminDirectoryNav } from "@/components/directory/AdminDirectoryNav";
import { ConfirmSubmit } from "@/components/directory/ConfirmSubmit";
import { OfficeForm } from "@/components/directory/OfficeForm";
import { getOfficeForAdmin, listActiveCategories, listActiveServices } from "@/data-access/directory";
import { getDirectoryCopy } from "@/lib/directory/copy";

export default async function EditOfficePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const copy = getDirectoryCopy(await getLocale());
  const [office, categories, services] = await Promise.all([
    getOfficeForAdmin(id),
    listActiveCategories(),
    listActiveServices(),
  ]);
  if (!office) notFound();
  return (
    <main className="mx-auto max-w-4xl p-4 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold">{copy.editOffice}</h1>
        {office.archivedAt ? (
          <ConfirmSubmit action={restoreOffice} confirmText={copy.restoreConfirm} fields={{ id: office.id }}>
            {copy.restore}
          </ConfirmSubmit>
        ) : (
          <ConfirmSubmit action={archiveOffice} confirmText={copy.archiveConfirm} fields={{ id: office.id }}>
            {copy.archive}
          </ConfirmSubmit>
        )}
      </div>
      <div className="mt-4">
        <AdminDirectoryNav />
      </div>
      <OfficeForm copy={copy} office={office} categories={categories} services={services} />
      <section className="mt-10">
        <h2 className="font-semibold">{copy.audit}</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {office.audits.map((entry) => (
            <li key={entry.id}>
              {entry.createdAt.toISOString().slice(0, 16).replace("T", " ")} · {entry.summary}
              {entry.actor?.name || entry.actor?.email ? ` · ${entry.actor.name || entry.actor.email}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
