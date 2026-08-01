import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type TimelineItem = {
  id: string;
  at: Date | string;
  kind: "created" | "note" | "document" | "invoice" | "payment" | "event" | "assignment" | "quote";
  title: string;
  detail?: string | null;
};

const KIND_DOT: Record<TimelineItem["kind"], string> = {
  created: "bg-siam-blue",
  note: "bg-violet-500",
  document: "bg-emerald-500",
  invoice: "bg-amber-500",
  payment: "bg-green-600",
  event: "bg-sky-500",
  assignment: "bg-orange-500",
  quote: "bg-purple-500",
};

export function CaseTimeline({
  items,
  title,
  empty,
}: {
  items: TimelineItem[];
  title: string;
  empty: string;
}) {
  const sorted = [...items].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-gray-500">{empty}</p>
        ) : (
          <ol className="relative space-y-4 border-l border-gray-200 pl-4 dark:border-gray-800">
            {sorted.map((item) => (
              <li key={item.id} className="relative">
                <span
                  className={`absolute -left-[1.35rem] top-1.5 h-2.5 w-2.5 rounded-full ${KIND_DOT[item.kind]}`}
                  aria-hidden
                />
                <p className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</p>
                {item.detail ? (
                  <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{item.detail}</p>
                ) : null}
                <p className="mt-0.5 text-xs text-gray-500">
                  {new Date(item.at).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
