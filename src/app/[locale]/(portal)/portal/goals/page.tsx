import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import {
  buildChecklistView,
  listActiveLifeEvents,
  listUserLifeEventProgress,
} from "@/data-access/life-events";
import { listGoalsForUser } from "@/data-access/goals";
import { listActiveTemplates } from "@/data-access/workflows";
import { GoalsClient } from "./GoalsClient";

export default async function PortalGoalsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireAuth();
  const t = await getTranslations("goalsLifeEvents");
  const loc = locale === "th" ? "th" : "en";

  const [events, progressRows, goals, workflowTemplates] = await Promise.all([
    listActiveLifeEvents(),
    listUserLifeEventProgress(session.user.id),
    listGoalsForUser(session.user.id),
    listActiveTemplates(),
  ]);

  const startedIds = new Set(progressRows.map((p) => p.lifeEventId));

  const checklists = progressRows.map((row) => {
    const view = buildChecklistView(row, loc);
    return {
      progressId: view.progressId,
      eventTitle: view.eventTitle,
      runStatus: view.runStatus,
      summary: {
        percent: view.summary.percent,
        completed: view.summary.completed,
        total: view.summary.total,
      },
      steps: view.steps.map((s) => ({
        stepId: s.stepId,
        title: s.title,
        description: s.description ?? null,
        status: s.status,
        href: s.href,
      })),
    };
  });

  const availableEvents = events.map((event) => ({
    id: event.id,
    title: loc === "th" && event.titleTh ? event.titleTh : event.titleEn,
    description:
      loc === "th" && event.descriptionTh
        ? event.descriptionTh
        : event.descriptionEn,
    stepCount: event.steps.length,
    alreadyStarted: startedIds.has(event.id),
  }));

  const goalRows = goals.map((g) => ({
    id: g.id,
    title: g.title,
    status: g.status,
    progressPct: g.progressPct,
    lifeEventTitle: g.lifeEvent
      ? loc === "th" && g.lifeEvent.titleTh
        ? g.lifeEvent.titleTh
        : g.lifeEvent.titleEn
      : null,
    workflowTemplateId: g.workflowTemplateId,
    workflowTemplateTitle: g.workflowTemplate
      ? loc === "th" && g.workflowTemplate.titleTh
        ? g.workflowTemplate.titleTh
        : g.workflowTemplate.titleEn
      : null,
  }));

  const eventOptions = events.map((e) => ({
    id: e.id,
    title: loc === "th" && e.titleTh ? e.titleTh : e.titleEn,
  }));

  const workflowOptions = workflowTemplates.map((w) => ({
    id: w.id,
    title: loc === "th" && w.titleTh ? w.titleTh : w.titleEn,
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("pageTitle")}
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">{t("pageSubtitle")}</p>
      </div>
      <GoalsClient
        checklists={checklists}
        availableEvents={availableEvents}
        goals={goalRows}
        eventOptions={eventOptions}
        workflowOptions={workflowOptions}
        labels={{
          lifeEventsSection: t("lifeEventsSection"),
          goalsSection: t("goalsSection"),
          startEvent: t("startEvent"),
          started: t("started"),
          markStarted: t("markStarted"),
          markDone: t("markDone"),
          markPending: t("markPending"),
          openLink: t("openLink"),
          createGoal: t("createGoal"),
          goalPlaceholder: t("goalPlaceholder"),
          completeGoal: t("completeGoal"),
          reopenGoal: t("reopenGoal"),
          deleteGoal: t("deleteGoal"),
          progressLabel: t("progressLabel"),
          noSteps: t("noSteps"),
          linkLifeEvent: t("linkLifeEvent"),
          linkWorkflow: t("linkWorkflow"),
          startWorkflow: t("startWorkflow"),
          noEvents: t("noEvents"),
        }}
      />
    </div>
  );
}
