import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { formatDisplayDate } from "@/lib/driver-license-renewal/dates";
import { RENEWAL_TYPE_LABELS } from "@/lib/driver-license-renewal/constants";
import { site } from "@/config/site";
import type { DriverLicenseRenewalType } from "@prisma/client";

type PortalRenewal = {
  id: string;
  renewalType: DriverLicenseRenewalType;
  issueDate: Date;
  expiryDate: Date;
  nextRenewalDate: Date;
  status: string;
};

export function PortalDriverLicenseCard({ renewals }: { renewals: PortalRenewal[] }) {
  if (!renewals.length) return null;
  const current = renewals[0]!;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Driver&apos;s License</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="text-gray-500">Current expiry</p>
          <p className="font-medium text-gray-900 dark:text-white">
            {formatDisplayDate(current.expiryDate)}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Next renewal</p>
          <p className="font-medium text-gray-900 dark:text-white">
            {formatDisplayDate(current.nextRenewalDate)}
          </p>
        </div>
        <div>
          <p className="text-gray-500">License type</p>
          <p>{RENEWAL_TYPE_LABELS[current.renewalType]}</p>
        </div>
        <div>
          <p className="text-gray-500">SiamEZ renewal assistance</p>
          <p>
            Contact us on LINE ({site.line}) or call {site.phone} when you are ready to renew.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/contact">Contact SiamEZ</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
