import { getWorkQueue } from "@/lib/admin/work-queue";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/ui/empty-state";

export default async function WorkQueuePage() {
  const items = await getWorkQueue();
  return <div><h1 className="text-2xl font-bold">Work queue</h1><p className="mt-1 text-gray-600 dark:text-gray-400">Pending items that need staff attention.</p>
    <div className="mt-6">{items.length ? <ul className="divide-y rounded-lg border border-gray-200 dark:border-gray-800">{items.map((item) => <li key={`${item.kind}:${item.id}`} className="flex items-center justify-between gap-4 p-4"><div><Link href={item.href} className="font-medium text-siam-blue hover:underline">{item.title}</Link><p className="text-xs capitalize text-gray-500">{item.kind.replace(/_/g, " ")}</p></div><span className="text-sm text-gray-500">{item.ageHours}h old</span></li>)}</ul> : <EmptyState title="Queue is clear" description="There are no pending review items." />}</div>
  </div>;
}
