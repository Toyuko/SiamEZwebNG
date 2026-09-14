"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  createCaseExpenseAction,
  createCaseRefundAction,
  createCaseStaffPaymentAction,
} from "@/actions/finance";
import {
  CASE_EXPENSE_CATEGORIES,
  STAFF_PAYMENT_CATEGORIES,
  type CaseFinancialSummary,
} from "@/lib/finance/calculations";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/admin/finance/FinanceUi";
import { MarkPaidButton } from "@/components/admin/finance/MarkPaidButton";

function labelize(value: string) {
  return value.replace(/_/g, " ");
}

type StaffUser = { id: string; name: string | null; email: string };

export type CaseFinancialTransactionRow = {
  id: string;
  type: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  paymentMethod: string | null;
  transactionDate: Date | string;
  vendor: string | null;
  staffId: string | null;
  staff?: { id: string; name: string | null; email: string } | null;
};

type FormKind = "staff" | "expense" | "refund" | null;

export function CaseFinancialsPanel({
  caseId,
  summary,
  transactions,
  staffUsers,
  assignedStaffIds,
}: {
  caseId: string;
  summary: CaseFinancialSummary;
  transactions: CaseFinancialTransactionRow[];
  staffUsers: StaffUser[];
  assignedStaffIds: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormKind>(null);

  const staffPayments = transactions.filter((t) => t.type === "STAFF_PAYMENT");
  const expenses = transactions.filter((t) => t.type === "CASE_EXPENSE");
  const refunds = transactions.filter((t) => t.type === "REFUND");

  const preferredStaff =
    assignedStaffIds.length > 0
      ? staffUsers.filter((u) => assignedStaffIds.includes(u.id))
      : staffUsers;

  function closeForm() {
    setForm(null);
    setError(null);
  }

  function submitStaff(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        await createCaseStaffPaymentAction({
          caseId,
          staffId: String(fd.get("staffId") ?? ""),
          amountBaht: String(fd.get("amountBaht") ?? ""),
          category: String(fd.get("category") ?? "service_handling"),
          description: String(fd.get("description") ?? ""),
          paymentMethod: (String(fd.get("paymentMethod") || "") || null) as
            | "cash"
            | "bank"
            | "qr"
            | "stripe"
            | "wise"
            | "other"
            | null,
          paymentStatus: (String(fd.get("paymentStatus") || "UNPAID") || "UNPAID") as
            | "UNPAID"
            | "APPROVED"
            | "PAID"
            | "CANCELLED",
          transactionDate: String(fd.get("transactionDate") || "") || undefined,
          notes: String(fd.get("notes") ?? "") || undefined,
          reference: String(fd.get("reference") ?? "") || undefined,
        });
        closeForm();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  function submitExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        await createCaseExpenseAction({
          caseId,
          amountBaht: String(fd.get("amountBaht") ?? ""),
          category: String(fd.get("category") ?? "other"),
          description: String(fd.get("description") ?? ""),
          vendor: String(fd.get("vendor") ?? "") || undefined,
          paymentMethod: (String(fd.get("paymentMethod") || "") || null) as
            | "cash"
            | "bank"
            | "qr"
            | "stripe"
            | "wise"
            | "other"
            | null,
          paymentStatus: (String(fd.get("paymentStatus") || "PAID") || "PAID") as
            | "UNPAID"
            | "APPROVED"
            | "PAID"
            | "CANCELLED",
          transactionDate: String(fd.get("transactionDate") || "") || undefined,
          notes: String(fd.get("notes") ?? "") || undefined,
          reference: String(fd.get("reference") ?? "") || undefined,
        });
        closeForm();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  function submitRefund(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        await createCaseRefundAction({
          caseId,
          amountBaht: String(fd.get("amountBaht") ?? ""),
          description: String(fd.get("description") ?? ""),
          paymentMethod: (String(fd.get("paymentMethod") || "") || null) as
            | "cash"
            | "bank"
            | "qr"
            | "stripe"
            | "wise"
            | "other"
            | null,
          transactionDate: String(fd.get("transactionDate") || "") || undefined,
          notes: String(fd.get("notes") ?? "") || undefined,
        });
        closeForm();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  const inputClass =
    "w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-gray-500">
              Customer revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-1.5 text-sm">
              <Row label="Quoted" value={formatCurrency(summary.quotedRevenue)} />
              <Row label="Invoiced" value={formatCurrency(summary.invoicedRevenue)} />
              <Row label="Paid" value={formatCurrency(summary.paidRevenue)} />
              <Row label="Outstanding" value={formatCurrency(summary.outstandingRevenue)} />
              <Row label="Refunds" value={`−${formatCurrency(summary.refunds)}`} />
              <Row label="Net revenue" value={formatCurrency(summary.netRevenue)} strong />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-gray-500">
              Job costs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-1.5 text-sm">
              <Row label="Staff" value={formatCurrency(summary.staffCosts)} />
              <Row
                label="Staff paid / owed"
                value={`${formatCurrency(summary.staffCostsPaid)} / ${formatCurrency(summary.staffCostsOwed)}`}
              />
              <Row label="Other" value={formatCurrency(summary.otherDirectCosts)} />
              <Row label="Total direct" value={formatCurrency(summary.totalDirectCosts)} strong />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-gray-500">
              Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-1.5 text-sm">
              <Row label="Gross profit" value={formatCurrency(summary.grossProfit)} strong />
              <Row label="Gross margin" value={`${summary.grossMargin}%`} />
            </dl>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => setForm("staff")}>
          Add staff payment
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setForm("expense")}>
          Add expense
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setForm("refund")}>
          Add refund
        </Button>
      </div>

      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      {form === "staff" ? (
        <form
          onSubmit={submitStaff}
          className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800"
        >
          <h3 className="font-medium text-gray-900 dark:text-white">Add staff payment</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Staff</label>
              <select name="staffId" required defaultValue={preferredStaff[0]?.id ?? ""} className={inputClass}>
                {staffUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name ?? u.email}
                    {assignedStaffIds.includes(u.id) ? " (assigned)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">
                Amount (฿)
              </label>
              <input name="amountBaht" type="number" step="0.01" min="0" required className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Category</label>
              <select name="category" defaultValue="service_handling" className={inputClass}>
                {STAFF_PAYMENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {labelize(c)}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">
                Description
              </label>
              <input name="description" required className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Date</label>
              <input
                name="transactionDate"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Status</label>
              <select name="paymentStatus" defaultValue="UNPAID" className={inputClass}>
                <option value="UNPAID">Unpaid</option>
                <option value="APPROVED">Approved</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Method</label>
              <PaymentMethodSelect />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Notes</label>
              <input name="notes" className={inputClass} />
            </div>
          </div>
          <FormActions pending={pending} onCancel={closeForm} />
        </form>
      ) : null}

      {form === "expense" ? (
        <form
          onSubmit={submitExpense}
          className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800"
        >
          <h3 className="font-medium text-gray-900 dark:text-white">Add case expense</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">
                Amount (฿)
              </label>
              <input name="amountBaht" type="number" step="0.01" min="0" required className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Category</label>
              <select name="category" defaultValue="other" className={inputClass}>
                {CASE_EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {labelize(c)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Vendor</label>
              <input name="vendor" className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">
                Description
              </label>
              <input name="description" required className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Date</label>
              <input
                name="transactionDate"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Status</label>
              <select name="paymentStatus" defaultValue="PAID" className={inputClass}>
                <option value="PAID">Paid</option>
                <option value="UNPAID">Unpaid</option>
                <option value="APPROVED">Approved</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Method</label>
              <PaymentMethodSelect />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Notes</label>
              <input name="notes" className={inputClass} />
            </div>
          </div>
          <FormActions pending={pending} onCancel={closeForm} />
        </form>
      ) : null}

      {form === "refund" ? (
        <form
          onSubmit={submitRefund}
          className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800"
        >
          <h3 className="font-medium text-gray-900 dark:text-white">Add refund</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">
                Amount (฿)
              </label>
              <input name="amountBaht" type="number" step="0.01" min="0" required className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Date</label>
              <input
                name="transactionDate"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Method</label>
              <PaymentMethodSelect />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">
                Description
              </label>
              <input name="description" required className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-gray-600 dark:text-gray-400">Notes</label>
              <input name="notes" className={inputClass} />
            </div>
          </div>
          <FormActions pending={pending} onCancel={closeForm} />
        </form>
      ) : null}

      <TxList
        title="Staff payments"
        rows={staffPayments}
        empty="No staff payments on this case."
        showStaff
        showMarkPaid
      />
      <TxList title="Case expenses" rows={expenses} empty="No case expenses yet." showVendor />
      <TxList title="Refunds" rows={refunds} empty="No refunds on this case." />
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 py-1 last:border-0 dark:border-gray-800">
      <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className={`tabular-nums ${strong ? "font-semibold text-gray-900 dark:text-white" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function PaymentMethodSelect() {
  return (
    <select
      name="paymentMethod"
      defaultValue=""
      className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
    >
      <option value="">—</option>
      <option value="cash">Cash</option>
      <option value="bank">Bank transfer</option>
      <option value="qr">QR / PromptPay</option>
      <option value="stripe">Stripe</option>
      <option value="wise">Wise</option>
      <option value="other">Other</option>
    </select>
  );
}

function FormActions({
  pending,
  onCancel,
}: {
  pending: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex gap-2">
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
      <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

function TxList({
  title,
  rows,
  empty,
  showStaff,
  showVendor,
  showMarkPaid,
}: {
  title: string;
  rows: CaseFinancialTransactionRow[];
  empty: string;
  showStaff?: boolean;
  showVendor?: boolean;
  showMarkPaid?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">{empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="py-1 pr-3 font-medium">Date</th>
                  {showStaff ? <th className="py-1 pr-3 font-medium">Staff</th> : null}
                  {showVendor ? <th className="py-1 pr-3 font-medium">Vendor</th> : null}
                  <th className="py-1 pr-3 font-medium">Category</th>
                  <th className="py-1 pr-3 font-medium">Description</th>
                  <th className="py-1 pr-3 font-medium">Amount</th>
                  <th className="py-1 pr-3 font-medium">Status</th>
                  {showMarkPaid ? <th className="py-1 font-medium">Actions</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((r) => {
                  const date =
                    typeof r.transactionDate === "string"
                      ? r.transactionDate.slice(0, 10)
                      : r.transactionDate.toISOString().slice(0, 10);
                  const canMark =
                    showMarkPaid &&
                    (r.paymentStatus === "UNPAID" || r.paymentStatus === "APPROVED");
                  return (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap py-2 pr-3">{date}</td>
                      {showStaff ? (
                        <td className="py-2 pr-3">
                          {r.staff?.name ?? r.staff?.email ?? "—"}
                        </td>
                      ) : null}
                      {showVendor ? <td className="py-2 pr-3">{r.vendor ?? "—"}</td> : null}
                      <td className="py-2 pr-3">{labelize(r.category)}</td>
                      <td className="max-w-[200px] truncate py-2 pr-3">{r.description}</td>
                      <td className="whitespace-nowrap py-2 pr-3 tabular-nums">
                        {formatCurrency(r.amount, r.currency)}
                      </td>
                      <td className="py-2 pr-3">
                        <StatusPill status={r.paymentStatus} />
                      </td>
                      {showMarkPaid ? (
                        <td className="py-2">{canMark ? <MarkPaidButton id={r.id} /> : "—"}</td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
