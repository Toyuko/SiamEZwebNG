import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import {
  buildTimelineView,
  listActiveTemplates,
  listUserRuns,
} from "@/data-access/workflows";
import { WorkflowsClient } from "./WorkflowsClient";

export default async function PortalWorkflowsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireAuth();
  const t = await getTranslations("workflows");
  const loc = locale === "th" ? "th" : "en";

  const [templates, runs] = await Promise.all([
    listActiveTemplates(),
    listUserRuns(session.user.id),
  ]);

  const timelines = runs.map((run) => {
    const view = buildTimelineView(run, loc);
    return {
      runId: view.runId,
      title: view.title,
      status: view.status,
      linkedCaseId: view.linkedCaseId,
      linkedCaseNumber: view.linkedCaseNumber,
      summary: {
        percent: view.summary.percent,
        completed: view.summary.completed,
        total: view.summary.total,
      },
      nextSteps: view.nextSteps.map((n) => ({
        reason: n.reason,
        href: n.href,
        titleEn: n.titleEn,
      })),
      steps: view.steps.map((s) => ({
        stepRunId: s.stepRunId,
        title: s.title,
        description: s.description,
        status: s.status,
        kind: s.kind,
        requiresApproval: s.requiresApproval,
        href: s.href,
        rejectionReason: s.rejectionReason,
      })),
    };
  });

  const available = templates.map((tpl) => ({
    id: tpl.id,
    title: loc === "th" && tpl.titleTh ? tpl.titleTh : tpl.titleEn,
    description:
      loc === "th" && tpl.descriptionTh ? tpl.descriptionTh : tpl.descriptionEn,
    stepCount: tpl.steps.length,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        {t("pageTitle")}
      </h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">{t("pageSubtitle")}</p>
      <div className="mt-8">
        <WorkflowsClient
          templates={available}
          timelines={timelines}
          labels={{
            templatesSection: t("templatesSection"),
            runsSection: t("runsSection"),
            startWorkflow: t("startWorkflow"),
            advance: t("advance"),
            openLink: t("openLink"),
            cancelRun: t("cancelRun"),
            linkCase: t("linkCase"),
            caseIdPlaceholder: t("caseIdPlaceholder"),
            progressLabel: t("progressLabel"),
            awaitingApproval: t("awaitingApproval"),
            nextSteps: t("nextSteps"),
            noTemplates: t("noTemplates"),
            noRuns: t("noRuns"),
            linkedCase: t("linkedCase"),
          }}
        />
      </div>
    </div>
  );
}
