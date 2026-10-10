import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { setDirectoryAccess } from "@/actions/directory";
import { AdminDirectoryNav } from "@/components/directory/AdminDirectoryNav";
import { requireDirectoryAdmin } from "@/data-access/directory";
import { getDirectoryCopy } from "@/lib/directory/copy";

export default async function DirectoryAccessPage() {
  await requireDirectoryAdmin();
  const copy = getDirectoryCopy(await getLocale());
  const freelancers = await prisma.user.findMany({
    where: { role: "freelancer" },
    include: { freelancerProfile: { select: { verificationStatus: true } } },
    orderBy: { email: "asc" },
    take: 200,
  });
  return (
    <main className="p-4 md:p-6">
      <h1 className="text-2xl font-semibold">{copy.access}</h1>
      <div className="mt-4">
        <AdminDirectoryNav />
      </div>
      <p className="mb-2 text-sm text-muted-foreground">{copy.staffAlways}</p>
      <p className="mb-4 text-sm text-muted-foreground">{copy.freelancerRule}</p>
      <ul className="space-y-2">
        {freelancers.map((user) => {
          const verified = user.freelancerProfile?.verificationStatus === "verified";
          return (
            <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white p-3">
              <div>
                <p className="font-medium">{user.name || user.email}</p>
                <p className="text-xs text-muted-foreground">
                  {user.email} · {user.freelancerProfile?.verificationStatus ?? "no profile"} · {user.active ? "active" : "inactive"}
                </p>
              </div>
              <form action={setDirectoryAccess}>
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="enabled" value={user.directoryAccess ? "false" : "true"} />
                <button
                  className="h-10 rounded-lg bg-siam-blue px-3 text-sm font-semibold text-white disabled:opacity-40"
                  disabled={!user.directoryAccess && (!verified || !user.active)}
                >
                  {user.directoryAccess ? copy.revoke : copy.grant}
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
