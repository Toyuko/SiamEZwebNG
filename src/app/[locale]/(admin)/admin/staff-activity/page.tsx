import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/ui/empty-state";

export default async function StaffActivityPage() {
  const [assignments, notes] = await Promise.all([
    prisma.staffAssignment.groupBy({ by: ["userId"], _count: { _all: true }, orderBy: { _count: { userId: "desc" } }, take: 30 }),
    prisma.caseNote.findMany({ orderBy: { createdAt: "desc" }, take: 20, select: { id: true, content: true, createdAt: true, user: { select: { name: true, email: true } } } }),
  ]);
  const users = assignments.length ? await prisma.user.findMany({ where: { id: { in: assignments.map((item) => item.userId) } }, select: { id: true, name: true, email: true } }) : [];
  const usersById = new Map(users.map((user) => [user.id, user]));
  return <div className="space-y-8"><div><h1 className="text-2xl font-bold">Staff activity</h1><p className="mt-1 text-gray-600 dark:text-gray-400">Assignments and recently authored case notes.</p></div>
    <section><h2 className="text-lg font-semibold">Case assignments</h2>{assignments.length ? <ul className="mt-3 divide-y rounded-lg border">{assignments.map((item) => <li className="flex justify-between p-3" key={item.userId}><span>{usersById.get(item.userId)?.name ?? usersById.get(item.userId)?.email ?? "Unknown staff"}</span><span>{item._count._all}</span></li>)}</ul> : <EmptyState title="No assignments yet" />}</section>
    <section><h2 className="text-lg font-semibold">Recent case notes</h2>{notes.length ? <ul className="mt-3 divide-y rounded-lg border">{notes.map((note) => <li className="p-3" key={note.id}><p className="text-sm font-medium">{note.user.name ?? note.user.email}</p><p className="line-clamp-2 text-sm text-gray-600">{note.content}</p></li>)}</ul> : <EmptyState title="No recent notes" />}</section>
  </div>;
}
