import { notFound } from "next/navigation";
import { getDriverLicenseRenewalById } from "@/actions/driver-license-renewals";
import { DriverLicenseRenewalDetailClient } from "./DriverLicenseRenewalDetailClient";

export const dynamic = "force-dynamic";

export default async function DriverLicenseRenewalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const renewal = await getDriverLicenseRenewalById(id);
  if (!renewal) notFound();

  return <DriverLicenseRenewalDetailClient renewal={renewal} />;
}
