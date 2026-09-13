"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DriverLicenseRenewalForm } from "@/components/admin/DriverLicenseRenewalForm";

/**
 * Shown on DL case detail when the case has a linked customer.
 * Lets staff set follow-up when completing / after completing the service.
 */
export function CaseDriverLicenseFollowUpPanel({
  caseId,
  clientId,
  serviceName,
}: {
  caseId: string;
  clientId: string | null;
  serviceName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!clientId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Driver&apos;s License Follow-Up</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Link or create a client account for this case before setting a license follow-up.
            Guest bookings need a matching customer email in the client database.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!open) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Driver&apos;s License Follow-Up</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
            After completing {serviceName}, record the <strong>new</strong> license dates so
            SiamEZ can remind the customer one month before renewal.
          </p>
          <Button type="button" onClick={() => setOpen(true)}>
            Set Driver&apos;s License Follow-Up
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set Driver&apos;s License Follow-Up</CardTitle>
      </CardHeader>
      <CardContent>
        <DriverLicenseRenewalForm
          mode="create"
          clientId={clientId}
          caseId={caseId}
          onDone={() => {
            setOpen(false);
            router.refresh();
          }}
        />
        <button
          type="button"
          className="mt-3 text-sm text-gray-500 underline"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </CardContent>
    </Card>
  );
}
