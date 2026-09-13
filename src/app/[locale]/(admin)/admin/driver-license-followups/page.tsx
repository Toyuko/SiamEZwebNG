import { listDriverLicenseRenewals } from "@/actions/driver-license-renewals";
import { DriverLicenseFollowupsClient } from "./DriverLicenseFollowupsClient";
import type { DriverLicenseFollowUpStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function DriverLicenseFollowupsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const status = one(sp.status);
  const range = one(sp.range) as "7d" | "30d" | "90d" | "6m" | "custom" | undefined;
  const search = one(sp.search);
  const sort = one(sp.sort) as "renewal" | "reminder" | "customer" | "status" | undefined;
  const from = one(sp.from);
  const to = one(sp.to);
  const page = Number(one(sp.page) ?? "1") || 1;

  const data = await listDriverLicenseRenewals({
    status: (status as DriverLicenseFollowUpStatus | "all" | "due_soon" | undefined) ?? "all",
    range,
    search,
    sort,
    from,
    to,
    page,
  });

  return (
    <DriverLicenseFollowupsClient
      renewals={data.renewals}
      stats={data.stats}
      total={data.total}
      page={data.page}
      totalPages={data.totalPages}
      initial={{ status, range, search, sort, from, to }}
    />
  );
}
