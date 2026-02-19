"use client";

import type { Prisma } from "@prisma/client";

type Client = Prisma.UserGetPayload<{
  select: { id: true; name: true; email: true; phone: true; createdAt: true };
}>;

export function ClientTable({ clients }: { clients: Client[] }) {
  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500">No clients yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Phone</th>
            <th className="px-4 py-3 font-medium">Joined</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr
              key={c.id}
              className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/50"
            >
              <td className="px-4 py-3 font-medium">{c.name ?? "—"}</td>
              <td className="px-4 py-3">{c.email}</td>
              <td className="px-4 py-3 text-gray-500">{c.phone ?? "—"}</td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(c.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
