"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DriverLicenseStatusBadge } from "@/components/admin/DriverLicenseStatusBadge";
import { DriverLicenseRenewalForm } from "@/components/admin/DriverLicenseRenewalForm";
import { formatDisplayDate } from "@/lib/driver-license-renewal/dates";
import { RENEWAL_TYPE_LABELS } from "@/lib/driver-license-renewal/constants";
import type { DriverLicenseFollowUpStatus, DriverLicenseRenewalType } from "@prisma/client";

type Renewal = {
  id: string;
  renewalType: DriverLicenseRenewalType;
  issueDate: Date | string;
  expiryDate: Date | string;
  nextRenewalDate: Date | string;
  reminderDate: Date | string;
  reminderSentAt: Date | string | null;
  status: DriverLicenseFollowUpStatus;
  case: { id: string; caseNumber: string } | null;
};

function yearOf(d: Date | string) {
  const iso = typeof d === "string" ? d : d.toISOString();
  return iso.slice(0, 4);
}

export function ClientDriverLicenseSection({
  clientId,
  renewals,
}: {
  clientId: string;
  renewals: Renewal[];
}) {
  const [adding, setAdding] = useState(false);
  const current = renewals[0] ?? null;

  return (
    <Card className="mt-6 max-w-2xl">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Driver&apos;s License</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)}>
          {adding ? "Cancel" : "Add Driver's License Renewal"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {adding && (
          <DriverLicenseRenewalForm
            mode="create"
            clientId={clientId}
            onDone={() => setAdding(false)}
          />
        )}

        {current ? (
          <div className="space-y-2 text-sm">
            <p className="font-medium text-gray-900 dark:text-white">Current / newest license</p>
            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">Issue date</dt>
                <dd>{formatDisplayDate(current.issueDate)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Expiry date</dt>
                <dd>{formatDisplayDate(current.expiryDate)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Renewal type</dt>
                <dd>{RENEWAL_TYPE_LABELS[current.renewalType]}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Next renewal</dt>
                <dd>{formatDisplayDate(current.nextRenewalDate)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Reminder date</dt>
                <dd>{formatDisplayDate(current.reminderDate)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Reminder status</dt>
                <dd>{current.reminderSentAt ? "Sent" : "Pending"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Follow-up status</dt>
                <dd>
                  <DriverLicenseStatusBadge status={current.status} />
                </dd>
              </div>
            </dl>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/driver-license-followups/${current.id}`}>Edit renewal</Link>
            </Button>
          </div>
        ) : (
          !adding && (
            <p className="text-sm text-gray-500">No driver&apos;s license renewals recorded yet.</p>
          )
        )}

        {renewals.length > 1 && (
          <div className="border-t pt-4">
            <p className="mb-2 text-sm font-medium">History</p>
            <ul className="space-y-2">
              {renewals.map((r) => (
                <li key={r.id} className="flex items-center justify-between text-sm">
                  <span>
                    {yearOf(r.issueDate)} → {yearOf(r.expiryDate)} ·{" "}
                    {RENEWAL_TYPE_LABELS[r.renewalType]}
                  </span>
                  <Link
                    href={`/admin/driver-license-followups/${r.id}`}
                    className="text-siam-blue hover:underline"
                  >
                    View
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
