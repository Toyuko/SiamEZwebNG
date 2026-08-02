"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  advanceMyWorkflowStep,
  cancelMyWorkflow,
  linkMyWorkflowCase,
  startMyWorkflow,
} from "@/actions/workflows";

type TimelineStep = {
  stepRunId: string;
  title: string;
  description: string | null;
  status: string;
  kind: string;
  requiresApproval: boolean;
  href: string | null;
  rejectionReason: string | null;
};

type Timeline = {
  runId: string;
  title: string;
  status: string;
  linkedCaseId: string | null;
  linkedCaseNumber: string | null;
  summary: { percent: number; completed: number; total: number };
  nextSteps: Array<{ reason: string; href: string | null; titleEn: string }>;
  steps: TimelineStep[];
};

type AvailableTemplate = {
  id: string;
  title: string;
  description: string | null;
  stepCount: number;
};

type Labels = {
  templatesSection: string;
  runsSection: string;
  startWorkflow: string;
  advance: string;
  openLink: string;
  cancelRun: string;
  linkCase: string;
  caseIdPlaceholder: string;
  progressLabel: string;
  awaitingApproval: string;
  nextSteps: string;
  noTemplates: string;
  noRuns: string;
  linkedCase: string;
};

export function WorkflowsClient({
  templates,
  timelines,
  labels,
}: {
  templates: AvailableTemplate[];
  timelines: Timeline[];
  labels: Labels;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [caseIds, setCaseIds] = useState<Record<string, string>>({});

  function refresh() {
    router.refresh();
  }

  return (
    <div className="space-y-10">
      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {labels.templatesSection}
        </h2>
        {templates.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">{labels.noTemplates}</p>
        ) : (
          <ul className="space-y-3">
            {templates.map((tpl) => (
              <li
                key={tpl.id}
                className="flex flex-col gap-3 border-b border-gray-100 pb-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{tpl.title}</p>
                  {tpl.description ? (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {tpl.description}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-gray-500">{tpl.stepCount} steps</p>
                </div>
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    setError(null);
                    startTransition(async () => {
                      try {
                        await startMyWorkflow(tpl.id);
                        refresh();
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "Failed");
                      }
                    });
                  }}
                >
                  {labels.startWorkflow}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {labels.runsSection}
        </h2>
        {timelines.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-400">{labels.noRuns}</p>
        ) : (
          timelines.map((run) => (
            <article
              key={run.runId}
              className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {run.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {labels.progressLabel
                      .replace("{percent}", String(run.summary.percent))
                      .replace("{completed}", String(run.summary.completed))
                      .replace("{total}", String(run.summary.total))}{" "}
                    · {run.status}
                  </p>
                  {run.linkedCaseNumber ? (
                    <p className="text-xs text-gray-500">
                      {labels.linkedCase}:{" "}
                      <Link
                        href={`/portal/cases/${run.linkedCaseId}`}
                        className="text-siam-blue hover:underline"
                      >
                        {run.linkedCaseNumber}
                      </Link>
                    </p>
                  ) : null}
                </div>
                {run.status === "active" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        try {
                          await cancelMyWorkflow(run.runId);
                          refresh();
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Failed");
                        }
                      });
                    }}
                  >
                    {labels.cancelRun}
                  </Button>
                ) : null}
              </div>

              {run.nextSteps.length > 0 ? (
                <div className="rounded-md bg-siam-blue/5 px-3 py-2 text-sm dark:bg-siam-blue/10">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {labels.nextSteps}
                  </p>
                  {run.nextSteps.map((n, i) => (
                    <p key={i} className="mt-1 text-gray-700 dark:text-gray-300">
                      {n.reason}
                    </p>
                  ))}
                </div>
              ) : null}

              <ol className="relative space-y-4 border-l border-gray-200 pl-4 dark:border-gray-700">
                {run.steps.map((step) => {
                  const canAdvance =
                    run.status === "active" &&
                    (step.status === "pending" ||
                      step.status === "in_progress" ||
                      step.status === "approved" ||
                      step.status === "rejected");
                  const waiting = step.status === "awaiting_approval";
                  return (
                    <li key={step.stepRunId} className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {step.title}
                        </span>
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          {waiting ? labels.awaitingApproval : step.status}
                        </span>
                      </div>
                      {step.description ? (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {step.description}
                        </p>
                      ) : null}
                      {step.rejectionReason ? (
                        <p className="text-sm text-red-600">{step.rejectionReason}</p>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        {step.href ? (
                          <Button asChild size="sm" variant="outline">
                            <Link href={step.href}>{labels.openLink}</Link>
                          </Button>
                        ) : null}
                        {canAdvance ? (
                          <Button
                            size="sm"
                            disabled={pending}
                            onClick={() => {
                              setError(null);
                              startTransition(async () => {
                                try {
                                  await advanceMyWorkflowStep(step.stepRunId);
                                  refresh();
                                } catch (e) {
                                  setError(e instanceof Error ? e.message : "Failed");
                                }
                              });
                            }}
                          >
                            {labels.advance}
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>

              {run.status === "active" && !run.linkedCaseId ? (
                <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                  <label className="block text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {labels.linkCase}
                    </span>
                    <input
                      value={caseIds[run.runId] ?? ""}
                      onChange={(e) =>
                        setCaseIds((prev) => ({ ...prev, [run.runId]: e.target.value }))
                      }
                      placeholder={labels.caseIdPlaceholder}
                      className="mt-1 block w-64 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                    />
                  </label>
                  <Button
                    size="sm"
                    disabled={pending || !(caseIds[run.runId] ?? "").trim()}
                    onClick={() => {
                      const caseId = (caseIds[run.runId] ?? "").trim();
                      if (!caseId) return;
                      startTransition(async () => {
                        try {
                          await linkMyWorkflowCase(run.runId, caseId);
                          refresh();
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Failed");
                        }
                      });
                    }}
                  >
                    {labels.linkCase}
                  </Button>
                </div>
              ) : null}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
