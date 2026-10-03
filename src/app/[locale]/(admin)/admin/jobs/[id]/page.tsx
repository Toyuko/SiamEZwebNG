import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getServices, getStaffUsers } from "@/actions/admin";
import { getConfirmedJobAction, regenerateJobInvoiceAction } from "@/actions/job-intake";
import { JobIntakeForm } from "@/components/admin/jobs/JobIntakeForm";
import { formatThb, jobFormValuesFromRecord } from "@/lib/jobs/intake";
import { Button } from "@/components/ui/button";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [job, services, staff] = await Promise.all([
    getConfirmedJobAction(id),
    getServices(),
    getStaffUsers(),
  ]);
  if (!job) notFound();
  const pdf = job.invoiceId ? `/api/admin/invoices/${job.invoiceId}/pdf` : null;
  const receiptPdf = job.invoiceId && job.receiptNumber ? `/api/admin/invoices/${job.invoiceId}/receipt` : null;

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="mb-4 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm" className="min-h-11">
          <Link href="/admin/jobs">All jobs</Link>
        </Button>
        {job.invoiceId && (
          <Button asChild size="sm" className="min-h-11">
            <Link href={`/admin/invoices/${job.invoiceId}`}>View invoice</Link>
          </Button>
        )}
        {pdf && (
          <Button asChild variant="outline" size="sm" className="min-h-11">
            <a href={pdf}>Download invoice</a>
          </Button>
        )}
        {receiptPdf && (
          <Button asChild size="sm" className="min-h-11">
            <a href={receiptPdf}>View receipt</a>
          </Button>
        )}
        <form
          action={async () => {
            "use server";
            await regenerateJobInvoiceAction(id);
          }}
        >
          <Button type="submit" variant="outline" size="sm" className="min-h-11">
            Regenerate invoice
          </Button>
        </form>
      </div>
      <p className="mb-3 text-sm text-gray-500">
        {job.caseNumber} · {formatThb(job.totalSatang)} · Paid {formatThb(job.paidSatang)} · Outstanding{" "}
        {formatThb(job.outstandingSatang)}
        {job.events[0] ? ` · Calendar ${new Date(job.events[0].start).toLocaleString("en-GB", { timeZone: "Asia/Bangkok" })}` : ""}
      </p>
      <JobIntakeForm
        mode="edit"
        caseId={job.id}
        services={services.filter((service) => service.active).map((service) => ({ id: service.id, name: service.name }))}
        staff={staff}
        initial={jobFormValuesFromRecord(job)}
        issuedReceiptNumber={job.receiptNumber}
      />
    </div>
  );
}
