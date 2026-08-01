import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCaseById, getStaffUsers, getUnassignedDocuments } from "@/actions/admin";
import { CaseStatusBadge } from "@/components/admin/CaseStatusBadge";
import { CaseAiSummaryPanel } from "@/components/admin/CaseAiSummaryPanel";
import { CaseTimeline, type TimelineItem } from "@/components/admin/CaseTimeline";
import { CaseDocumentsPanel } from "@/components/admin/CaseDocumentsPanel";
import { CaseSchedulePanel } from "@/components/admin/CaseSchedulePanel";
import { CaseDetailClient } from "./CaseDetailClient";
import { AttachUnassignedDocument } from "./AttachUnassignedDocument";
import { formatCurrency } from "@/lib/utils";

function formDataKeys(formData: unknown): string[] {
  if (!formData || typeof formData !== "object" || Array.isArray(formData)) return [];
  return Object.keys(formData as Record<string, unknown>);
}

export default async function AdminCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [caseData, staffUsers, unassignedDocs, t, locale] = await Promise.all([
    getCaseById(id),
    getStaffUsers(),
    getUnassignedDocuments(),
    getTranslations("adminCase"),
    getLocale(),
  ]);

  if (!caseData) notFound();

  const client = caseData.user;
  const displayName = client?.name ?? caseData.guestName ?? "Unknown";
  const displayEmail = client?.email ?? caseData.guestEmail ?? "—";
  const displayPhone = client?.phone ?? caseData.guestPhone ?? "—";
  const summaryLocale = locale === "th" ? "th" : "en";

  const timeline: TimelineItem[] = [
    {
      id: `created-${caseData.id}`,
      at: caseData.createdAt,
      kind: "created",
      title: t("timelineCreated"),
      detail: caseData.service.name,
    },
    ...caseData.staffAssignments.map((a) => ({
      id: `assign-${a.id}`,
      at: a.assignedAt,
      kind: "assignment" as const,
      title: t("timelineAssigned", { name: a.user.name ?? a.user.email }),
      detail: a.role,
    })),
    ...caseData.caseNotes.map((n) => ({
      id: `note-${n.id}`,
      at: n.createdAt,
      kind: "note" as const,
      title: t("timelineNote", { name: n.user.name ?? n.user.email }),
      detail: n.content.slice(0, 160) + (n.content.length > 160 ? "…" : ""),
    })),
    ...caseData.documents.map((d) => ({
      id: `doc-${d.id}`,
      at: d.createdAt,
      kind: "document" as const,
      title: t("timelineDocument", { name: d.name }),
      detail: d.documentType,
    })),
    ...caseData.invoices.map((inv) => ({
      id: `inv-${inv.id}`,
      at: inv.createdAt,
      kind: "invoice" as const,
      title: t("timelineInvoice", {
        amount: formatCurrency(inv.amount, inv.currency),
        status: inv.status,
      }),
      detail: null,
    })),
    ...caseData.payments.map((p) => ({
      id: `pay-${p.id}`,
      at: p.submittedAt ?? p.createdAt,
      kind: "payment" as const,
      title: t("timelinePayment", {
        amount: formatCurrency(p.amount, p.currency),
        status: p.status,
      }),
      detail: p.method,
    })),
    ...caseData.quotes.map((q) => ({
      id: `quote-${q.id}`,
      at: q.createdAt,
      kind: "quote" as const,
      title: t("timelineQuote", {
        amount: formatCurrency(q.amount, q.currency),
        status: q.status,
      }),
      detail: q.notes,
    })),
    ...caseData.events.map((e) => ({
      id: `event-${e.id}`,
      at: e.start,
      kind: "event" as const,
      title: t("timelineEvent", { title: e.title }),
      detail: `${e.type} · ${new Date(e.start).toLocaleString()}`,
    })),
  ];

  const latestNote = caseData.caseNotes[0];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/cases">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {caseData.caseNumber}
            </h1>
            <CaseStatusBadge status={caseData.status} />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {caseData.service.name} • {displayName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/invoices/new?caseId=${encodeURIComponent(caseData.id)}`}>
              {t("createInvoiceWizard")}
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={`/admin/calendar/new?caseId=${encodeURIComponent(caseData.id)}`}>
              {t("scheduleTask")}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <CaseAiSummaryPanel
            input={{
              caseNumber: caseData.caseNumber,
              status: caseData.status,
              serviceName: caseData.service.name,
              clientName: displayName,
              clientEmail: displayEmail !== "—" ? displayEmail : null,
              isGuest: caseData.isGuest,
              documentCount: caseData.documents.length,
              noteCount: caseData.caseNotes.length,
              invoiceCount: caseData.invoices.length,
              paymentCount: caseData.payments.length,
              quoteCount: caseData.quotes.length,
              eventCount: caseData.events.length,
              staffNames: caseData.staffAssignments.map(
                (a) => a.user.name ?? a.user.email
              ),
              latestNotePreview: latestNote
                ? latestNote.content.slice(0, 120) +
                  (latestNote.content.length > 120 ? "…" : "")
                : null,
              formDataKeys: formDataKeys(caseData.formData),
              locale: summaryLocale,
            }}
            labels={{
              title: t("aiTitle"),
              stubHint: t("aiStubHint"),
              attention: t("aiAttention"),
              regenerate: t("aiRegenerate"),
              hide: t("aiHide"),
              show: t("aiShow"),
            }}
          />

          <Card>
            <CardHeader>
              <CardTitle>{t("clientInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="font-medium">{t("name")}:</span> {displayName}
              </p>
              <p>
                <span className="font-medium">{t("email")}:</span> {displayEmail}
              </p>
              <p>
                <span className="font-medium">{t("phone")}:</span> {displayPhone}
              </p>
            </CardContent>
          </Card>

          <CaseDocumentsPanel
            documents={caseData.documents}
            labels={{
              title: t("documentsTitle"),
              empty: t("documentsEmpty"),
              type: t("documentsType"),
              size: t("documentsSize"),
              uploaded: t("documentsUploaded"),
              open: t("documentsOpen"),
              reviewHint: t("documentsReviewHint"),
            }}
            footer={
              <AttachUnassignedDocument caseId={caseData.id} unassigned={unassignedDocs} />
            }
          />

          <CaseSchedulePanel
            caseId={caseData.id}
            events={caseData.events}
            labels={{
              title: t("scheduleTitle"),
              empty: t("scheduleEmpty"),
              schedule: t("scheduleTask"),
              openCalendar: t("openCalendar"),
              upcoming: t("scheduleUpcoming"),
              past: t("schedulePast"),
            }}
          />

          <CaseTimeline
            items={timeline}
            title={t("timelineTitle")}
            empty={t("timelineEmpty")}
          />
        </div>

        <div className="space-y-6">
          <CaseDetailClient
            caseId={caseData.id}
            caseNotes={caseData.caseNotes}
            staffUsers={staffUsers}
            caseData={caseData}
            labels={{
              actions: t("actions"),
              status: t("status"),
              assignStaff: t("assignStaff"),
              selectStaff: t("selectStaff"),
              createInvoiceQuick: t("createInvoiceQuick"),
              createInvoiceWizard: t("createInvoiceWizard"),
              payments: t("payments"),
              noPayments: t("noPayments"),
              invoices: t("invoices"),
              noInvoices: t("noInvoices"),
              notes: t("notes"),
              noNotes: t("noNotes"),
              addNoteAs: t("addNoteAs"),
              notePlaceholder: t("notePlaceholder"),
              addNote: t("addNote"),
              noStaffNotes: t("noStaffNotes"),
              quotes: t("quotes"),
              noQuotes: t("noQuotes"),
            }}
          />
        </div>
      </div>
    </div>
  );
}
