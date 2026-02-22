"use client";

import { Link } from "@/i18n/navigation";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Pencil, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deactivateClient } from "@/actions/admin";

type Client = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  active: boolean | null;
  createdAt: Date;
};

export function ClientTable({
  clients,
  total,
  page,
  totalPages,
  search,
  onEdit,
}: {
  clients: Client[];
  total: number;
  page: number;
  totalPages: number;
  search?: string;
  onEdit?: (client: Client) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleDeactivate = (id: string, name: string) => {
    if (!confirm(`Deactivate client "${name}"? They will no longer be able to log in.`)) return;
    startTransition(async () => {
      await deactivateClient(id);
      router.refresh();
    });
  };

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500">No clients found.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium w-24">Actions</th>
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
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      c.active !== false ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {c.active !== false ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(c.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {onEdit ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/admin/clients/${c.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                    {c.active !== false && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeactivate(c.id, c.name ?? c.email)}
                        disabled={pending}
                      >
                        <Ban className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              asChild={page > 1}
            >
              {page > 1 ? (
                <Link href={search ? `/admin/clients?search=${encodeURIComponent(search)}&page=${page - 1}` : `/admin/clients?page=${page - 1}`}>Previous</Link>
              ) : (
                <span>Previous</span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              asChild={page < totalPages}
            >
              {page < totalPages ? (
                <Link href={search ? `/admin/clients?search=${encodeURIComponent(search)}&page=${page + 1}` : `/admin/clients?page=${page + 1}`}>Next</Link>
              ) : (
                <span>Next</span>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
