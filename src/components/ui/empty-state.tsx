import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
      <h2 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      {description ? <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
