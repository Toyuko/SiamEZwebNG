"use client";

import { dispatchOpenConcierge } from "@/lib/ai/concierge-events";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Target } from "lucide-react";

export type HomeGoalPrompt = {
  id: string;
  label: string;
  prompt: string;
  href?: string;
};

export function HomeGoalPrompts({ prompts }: { prompts: HomeGoalPrompt[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {prompts.map((item) => (
        <li key={item.id}>
          {item.href ? (
            <Link
              href={item.href}
              className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 transition hover:border-siam-blue/30 hover:bg-siam-blue/5 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:hover:border-siam-blue/40"
            >
              <Target className="h-4 w-4 shrink-0 text-siam-blue" aria-hidden />
              <span className="min-w-0 flex-1">{item.label}</span>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-gray-400 transition group-hover:text-siam-blue"
                aria-hidden
              />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => dispatchOpenConcierge(item.prompt)}
              className="group flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-900 transition hover:border-siam-blue/30 hover:bg-siam-blue/5 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:hover:border-siam-blue/40"
            >
              <Target className="h-4 w-4 shrink-0 text-siam-blue" aria-hidden />
              <span className="min-w-0 flex-1">{item.label}</span>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-gray-400 transition group-hover:text-siam-blue"
                aria-hidden
              />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
