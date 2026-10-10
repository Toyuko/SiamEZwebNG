import { getLocale } from "next-intl/server";
import { AdminDirectoryNav } from "@/components/directory/AdminDirectoryNav";
import { ReminderForm } from "@/components/directory/ReminderForm";
import { getVerificationReminderDays, requireDirectoryAdmin } from "@/data-access/directory";
import { getDirectoryCopy } from "@/lib/directory/copy";

export default async function DirectorySettingsPage() {
  await requireDirectoryAdmin();
  const copy = getDirectoryCopy(await getLocale());
  const days = await getVerificationReminderDays();
  return (
    <main className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold">{copy.settings}</h1>
      <div className="mt-4">
        <AdminDirectoryNav />
      </div>
      <ReminderForm copy={copy} days={days} />
    </main>
  );
}
