"use client";

import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

type QuoteRow = {
  id: string;
  quoteNumber: string | null;
  status: string;
  quoteType: string;
  amount: number;
  currency: string;
  rangeMin: number | null;
  rangeMax: number | null;
  validUntil: string | null;
  createdAt: string;
  serviceName: string;
  serviceSlug: string;
  customerName: string | null;
  customerEmail: string | null;
  caseId: string | null;
  caseNumber: string | null;
  paymentStatus: string | null;
};

function formatQuoteAmount(q: QuoteRow): string {
  if (q.quoteType === "range" && q.rangeMin != null && q.rangeMax != null) {
    return `${formatCurrency(q.rangeMin, q.currency)} - ${formatCurrency(q.rangeMax, q.currency)}`;
  }
  return formatCurrency(q.amount, q.currency);
}

export function QuotesPageClient({
  quotes,
  total,
  services,
  filters,
}: {
  quotes: QuoteRow[];
  total: number;
  services: { id: string; name: string; slug: string }[];
  filters: { status: string; serviceId: string; q: string };
}) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Quotes</h1>
        <p className="mt-1 text-sm text-muted">
          View pricing-engine quotes, requirements, and linked bookings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const sp = new URLSearchParams();
              const status = String(fd.get("status") || "");
              const serviceId = String(fd.get("serviceId") || "");
              const q = String(fd.get("q") || "");
              if (status) sp.set("status", status);
              if (serviceId) sp.set("serviceId", serviceId);
              if (q) sp.set("q", q);
              router.push(`/admin/quotes?${sp.toString()}`);
            }}
          >
            <Input
              name="q"
              defaultValue={filters.q}
              placeholder="Search quote #, email..."
            />
            <Select name="status" defaultValue={filters.status}>
              <option value="">All statuses</option>
              <option value="generated">Generated</option>
              <option value="accepted">Accepted</option>
              <option value="converted_to_booking">Converted</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
              <option value="rejected">Rejected</option>
            </Select>
            <Select name="serviceId" defaultValue={filters.serviceId}>
              <option value="">All services</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Button type="submit">Apply</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{total} quotes</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="py-2 pr-3 font-medium">Quote</th>
                <th className="py-2 pr-3 font-medium">Service</th>
                <th className="py-2 pr-3 font-medium">Customer</th>
                <th className="py-2 pr-3 font-medium">Amount</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Booking</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted">
                    No quotes yet.
                  </td>
                </tr>
              ) : (
                quotes.map((q) => {
                  return (
                    <tr key={q.id} className="border-b border-border/60">
                      <td className="py-3 pr-3">
                        <div className="font-medium text-foreground">
                          {q.quoteNumber ?? q.id.slice(0, 8)}
                        </div>
                        <div className="text-xs text-muted">{q.quoteType}</div>
                      </td>
                      <td className="py-3 pr-3">{q.serviceName}</td>
                      <td className="py-3 pr-3">
                        <div>{q.customerName ?? "-"}</div>
                        <div className="text-xs text-muted">{q.customerEmail}</div>
                      </td>
                      <td className="py-3 pr-3">{formatQuoteAmount(q)}</td>
                      <td className="py-3 pr-3">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                          {q.status}
                        </span>
                        {q.paymentStatus ? (
                          <div className="mt-1 text-xs text-muted">
                            Invoice: {q.paymentStatus}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3 pr-3">
                        {q.caseId && q.caseNumber ? (
                          <Link
                            href={`/admin/cases/${q.caseId}`}
                            className="text-siam-blue hover:underline"
                          >
                            {q.caseNumber}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <Link href={`/admin/quotes/${q.id}`}>
                          <Button type="button" size="sm" variant="outline">
                            Open
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
