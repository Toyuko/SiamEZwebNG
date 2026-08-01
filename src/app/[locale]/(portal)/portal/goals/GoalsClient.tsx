"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { createMyGoal, deleteMyGoal, updateMyGoalStatus } from "@/actions/goals";
import { startLifeEvent, updateMyStepStatus } from "@/actions/life-events";
import type { LifeEventStepStatus } from "@prisma/client";

type ChecklistStep = {
  stepId: string;
  title: string;
  description: string | null;
  status: LifeEventStepStatus;
  href: string | null;
};

type Checklist = {
  progressId: string;
  eventTitle: string;
  runStatus: string;
  summary: { percent: number; completed: number; total: number };
  steps: ChecklistStep[];
};

type AvailableEvent = {
  id: string;
  title: string;
  description: string | null;
  stepCount: number;
  alreadyStarted: boolean;
};

type GoalRow = {
  id: string;
  title: string;
  status: string;
  progressPct: number;
  lifeEventTitle: string | null;
};

type Labels = {
  lifeEventsSection: string;
  goalsSection: string;
  startEvent: string;
  started: string;
  markStarted: string;
  markDone: string;
  markPending: string;
  openLink: string;
  createGoal: string;
  goalPlaceholder: string;
  completeGoal: string;
  reopenGoal: string;
  deleteGoal: string;
  progressLabel: string;
  noSteps: string;
  linkLifeEvent: string;
  noEvents: string;
};

export function GoalsClient({
  checklists,
  availableEvents,
  goals,
  eventOptions,
  labels,
}: {
  checklists: Checklist[];
  availableEvents: AvailableEvent[];
  goals: GoalRow[];
  eventOptions: { id: string; title: string }[];
  labels: Labels;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
          {labels.lifeEventsSection}
        </h2>
        {availableEvents.length > 0 ? (
          <ul className="space-y-3">
            {availableEvents.map((event) => (
              <li
                key={event.id}
                className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {event.title}
                  </p>
                  {event.description ? (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {event.description}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-gray-500">
                    {event.stepCount} steps
                  </p>
                </div>
                {event.alreadyStarted ? (
                  <span className="text-sm text-gray-500">{labels.started}</span>
                ) : (
                  <Button
                    disabled={pending}
                    onClick={() => {
                      setError(null);
                      startTransition(async () => {
                        try {
                          await startLifeEvent(event.id);
                          refresh();
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Failed");
                        }
                      });
                    }}
                  >
                    {labels.startEvent}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-400">{labels.noEvents}</p>
        )}
      </section>

      {checklists.map((list) => (
        <section key={list.progressId} className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {list.eventTitle}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {labels.progressLabel
                  .replace("{percent}", String(list.summary.percent))
                  .replace("{completed}", String(list.summary.completed))
                  .replace("{total}", String(list.summary.total))}{" "}
                · {list.runStatus}
              </p>
            </div>
          </div>
          {list.steps.length === 0 ? (
            <p className="text-sm text-gray-500">{labels.noSteps}</p>
          ) : (
            <ol className="space-y-3">
              {list.steps.map((step, index) => (
                <li
                  key={step.stepId}
                  className="rounded-lg border border-gray-200 p-4 dark:border-gray-800"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {index + 1}. {step.title}
                      </p>
                      {step.description ? (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {step.description}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">
                        {step.status}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {step.href ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={step.href}>{labels.openLink}</Link>
                        </Button>
                      ) : null}
                      {step.status === "pending" ? (
                        <Button
                          size="sm"
                          disabled={pending}
                          onClick={() => {
                            startTransition(async () => {
                              await updateMyStepStatus(
                                list.progressId,
                                step.stepId,
                                "started"
                              );
                              refresh();
                            });
                          }}
                        >
                          {labels.markStarted}
                        </Button>
                      ) : null}
                      {step.status !== "completed" ? (
                        <Button
                          size="sm"
                          disabled={pending}
                          onClick={() => {
                            startTransition(async () => {
                              await updateMyStepStatus(
                                list.progressId,
                                step.stepId,
                                "completed"
                              );
                              refresh();
                            });
                          }}
                        >
                          {labels.markDone}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => {
                            startTransition(async () => {
                              await updateMyStepStatus(
                                list.progressId,
                                step.stepId,
                                "pending"
                              );
                              refresh();
                            });
                          }}
                        >
                          {labels.markPending}
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {labels.goalsSection}
        </h2>
        <form
          className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-end dark:border-gray-800"
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              try {
                await createMyGoal(formData);
                refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed");
              }
            });
          }}
        >
          <label className="block flex-1 space-y-1 text-sm">
            <span className="font-medium">{labels.createGoal}</span>
            <input
              name="title"
              required
              placeholder={labels.goalPlaceholder}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            />
          </label>
          <label className="block space-y-1 text-sm sm:w-56">
            <span className="font-medium">{labels.linkLifeEvent}</span>
            <select
              name="lifeEventId"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
              defaultValue=""
            >
              <option value="">—</option>
              {eventOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={pending}>
            {labels.createGoal}
          </Button>
        </form>

        <ul className="space-y-3">
          {goals.map((goal) => (
            <li
              key={goal.id}
              className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800"
            >
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {goal.title}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {goal.status} · {goal.progressPct}%
                  {goal.lifeEventTitle ? ` · ${goal.lifeEventTitle}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {goal.status === "active" ? (
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        await updateMyGoalStatus(goal.id, "completed");
                        refresh();
                      });
                    }}
                  >
                    {labels.completeGoal}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        await updateMyGoalStatus(goal.id, "active");
                        refresh();
                      });
                    }}
                  >
                    {labels.reopenGoal}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      await deleteMyGoal(goal.id);
                      refresh();
                    });
                  }}
                >
                  {labels.deleteGoal}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
