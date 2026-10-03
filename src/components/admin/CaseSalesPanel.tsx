"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { assignCaseSalesPersonAction, updateCaseCommissionAction } from "@/actions/sales-attribution";
import type { SalesCommissionType } from "@/lib/finance/sales";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type StaffUser = { id: string; name: string | null; email: string };

type AuditRow = {
  id: string;
  reason: string | null;
  createdAt: string;
  previousName: string;
  nextName: string;
  changedByName: string;
};

export function CaseSalesPanel({
  caseId,
  canManage,
  canSeeCommission,
  salespersonId,
  salespersonName,
  closedAt,
  dealValueSatang,
  salesNotes,
  staffNames,
  paidSatang,
  outstandingSatang,
  staffCostSatang,
  otherCostSatang,
  profitSatang,
  commissionType,
  commissionStatus,
  commissionSatang,
  ratePercent,
  staffUsers,
  audits,
}: {
  caseId: string;
  canManage: boolean;
  canSeeCommission: boolean;
  salespersonId: string | null;
  salespersonName: string;
  closedAt: string | null;
  dealValueSatang: number;
  salesNotes: string | null;
  staffNames: string[];
  paidSatang: number;
  outstandingSatang: number;
  staffCostSatang: number;
  otherCostSatang: number;
  profitSatang: number;
  commissionType: string | null;
  commissionStatus: string | null;
  commissionSatang: number;
  ratePercent: string | null;
  staffUsers: StaffUser[];
  audits: AuditRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<SalesCommissionType>((commissionType as SalesCommissionType) || "none");

  const inputClass =
    "w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <dl className="grid gap-2 sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">Closed by</dt>
            <dd className="font-medium">{salespersonName}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Closed date</dt>
            <dd className="font-medium">{closedAt ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Deal value</dt>
            <dd className="font-medium">{formatCurrency(dealValueSatang)}</dd>
          </div>
          {canSeeCommission ? (
            <div>
              <dt className="text-gray-500">Commission</dt>
              <dd className="font-medium">
                {formatCurrency(commissionSatang)}
                {commissionStatus ? ` · ${commissionStatus}` : ""}
              </dd>
            </div>
          ) : null}
        </dl>

        <div>
          <p className="text-gray-500">Service team</p>
          <p className="font-medium">{staffNames.length ? staffNames.join(", ") : "Unassigned"}</p>
        </div>

        <dl className="grid gap-2 sm:grid-cols-3">
          <div>
            <dt className="text-gray-500">Paid</dt>
            <dd>{formatCurrency(paidSatang)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Outstanding</dt>
            <dd>{formatCurrency(outstandingSatang)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Staff costs</dt>
            <dd>{formatCurrency(staffCostSatang)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Other costs</dt>
            <dd>{formatCurrency(otherCostSatang)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Profit</dt>
            <dd className="font-medium">{formatCurrency(profitSatang)}</dd>
          </div>
        </dl>

        {salesNotes ? <p className="text-gray-600 dark:text-gray-300">{salesNotes}</p> : null}

        {canManage ? (
          <form
            className="space-y-3 border-t border-gray-100 pt-3 dark:border-gray-800"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              const fd = new FormData(e.currentTarget);
              start(async () => {
                try {
                  await assignCaseSalesPersonAction({
                    caseId,
                    salesPersonId: String(fd.get("salesPersonId") ?? ""),
                    reason: String(fd.get("reason") ?? ""),
                    closedAt: String(fd.get("closedAt") ?? ""),
                    dealValueBaht: String(fd.get("dealValueBaht") ?? ""),
                    salesNotes: String(fd.get("salesNotes") ?? ""),
                  });
                  router.refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not update salesperson");
                }
              });
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-gray-500">Closed by</span>
                <select name="salesPersonId" defaultValue={salespersonId ?? ""} className={inputClass} required>
                  <option value="">Select salesperson</option>
                  {staffUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name ?? u.email}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-gray-500">Closed date</span>
                <input name="closedAt" type="date" required={!closedAt} defaultValue={closedAt ?? ""} className={inputClass} />
              </label>
              <label>
                <span className="mb-1 block text-gray-500">Deal value (THB)</span>
                <input
                  name="dealValueBaht"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={(dealValueSatang / 100).toFixed(2)}
                  className={inputClass}
                />
              </label>
              <label>
                <span className="mb-1 block text-gray-500">Reason for change</span>
                <input name="reason" className={inputClass} placeholder="Required when changing closer" />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-gray-500">Sales notes</span>
              <textarea name="salesNotes" defaultValue={salesNotes ?? ""} rows={2} className={inputClass} />
            </label>
            <Button type="submit" size="sm" disabled={pending}>
              Save attribution
            </Button>
          </form>
        ) : null}

        {canManage && canSeeCommission ? (
          <form
            className="space-y-3 border-t border-gray-100 pt-3 dark:border-gray-800"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              const fd = new FormData(e.currentTarget);
              start(async () => {
                try {
                  await updateCaseCommissionAction({
                    caseId,
                    type,
                    ratePercent: String(fd.get("ratePercent") ?? ""),
                    amountBaht: String(fd.get("amountBaht") ?? ""),
                    status: String(fd.get("status") ?? "pending") as
                      | "pending"
                      | "approved"
                      | "paid"
                      | "cancelled",
                    notes: String(fd.get("notes") ?? ""),
                  });
                  router.refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not update commission");
                }
              });
            }}
          >
            <p className="font-medium">Commission</p>
            <p className="text-xs text-gray-500">
              Optional. Commission is a job cost. It is not service-staff pay, and it does not mean the salesperson received the customer&apos;s payment.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-gray-500">Type</span>
                <select
                  className={inputClass}
                  value={type}
                  onChange={(e) => setType(e.target.value as SalesCommissionType)}
                >
                  <option value="none">None</option>
                  <option value="fixed">Fixed amount</option>
                  <option value="percent_of_deal">Percentage of deal</option>
                  <option value="percent_of_collected">Percentage of collected revenue</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
              <label>
                <span className="mb-1 block text-gray-500">Status</span>
                <select name="status" defaultValue={commissionStatus ?? "pending"} className={inputClass}>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              {type === "percent_of_deal" || type === "percent_of_collected" ? (
                <label>
                  <span className="mb-1 block text-gray-500">Rate %</span>
                  <input name="ratePercent" type="number" min="0" max="100" step="0.01" defaultValue={ratePercent ?? ""} className={inputClass} />
                </label>
              ) : null}
              {type === "fixed" || type === "custom" ? (
                <label>
                  <span className="mb-1 block text-gray-500">Amount (THB)</span>
                  <input name="amountBaht" type="number" min="0" step="0.01" className={inputClass} />
                </label>
              ) : null}
            </div>
            <Button type="submit" size="sm" variant="outline" disabled={pending}>
              Save commission
            </Button>
          </form>
        ) : null}

        {audits.length > 0 ? (
          <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
            <p className="mb-2 font-medium">Attribution history</p>
            <ul className="space-y-2">
              {audits.map((a) => (
                <li key={a.id} className="text-gray-600 dark:text-gray-300">
                  {a.previousName} → {a.nextName}
                  <span className="block text-xs text-gray-400">
                    {a.changedByName} · {a.createdAt}
                    {a.reason ? ` · ${a.reason}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
