"use client";

import { Link } from "@/i18n/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

type StaffUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  active: boolean | null;
};

export function StaffTable({ staff, onEdit }: { staff: StaffUser[]; onEdit?: (s: StaffUser) => void }) {
  if (staff.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500">No staff found.</p>
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
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium w-16">Actions</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((s) => (
            <tr
              key={s.id}
              className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/50"
            >
              <td className="px-4 py-3 font-medium">{s.name ?? "—"}</td>
              <td className="px-4 py-3">{s.email}</td>
              <td className="px-4 py-3">
                <span className="inline-flex rounded-full px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                  {s.role}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                    s.active !== false ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {s.active !== false ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="px-4 py-3">
                {onEdit ? (
                  <Button variant="ghost" size="icon" onClick={() => onEdit(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/admin/staff/${s.id}/edit`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
