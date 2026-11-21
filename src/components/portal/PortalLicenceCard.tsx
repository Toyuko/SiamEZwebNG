import { PreCheckCard } from "./PreCheckCard";

/**
 * @deprecated Prefer PreCheckCard. Kept for any lingering imports.
 */
export async function PortalLicenceCard({ userId }: { userId: string }) {
  return (
    <PreCheckCard
      userId={userId}
      locale="en"
      labels={{
        title: "Planning to get a Thai driving license?",
        titleWithStatus: "Driving license pre-check",
        description: "Check your documents before booking to help avoid delays.",
        startCta: "Start document check",
        viewCta: "View latest check",
        newCheckCta: "Start new check",
      }}
    />
  );
}
