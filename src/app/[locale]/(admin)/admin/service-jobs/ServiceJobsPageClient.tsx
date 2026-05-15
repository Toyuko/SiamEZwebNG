"use client";

import { Button } from "@/components/ui/button";
import { Plus, Store } from "lucide-react";
import { useState } from "react";
import { CreateJobModal } from "./CreateJobModal";
import type { Service } from "@prisma/client";

type Client = { id: string; name: string | null; email: string };
type StaffUser = { id: string; name: string | null; email: string };

export function ServiceJobsPageClient({
  services,
  clients,
  staffUsers,
  marketplaceOnly = false,
}: {
  services: Service[];
  clients: Client[];
  staffUsers: StaffUser[];
  /** When true (Freelancer Jobs page), only show marketplace posting. */
  marketplaceOnly?: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [assignmentSource, setAssignmentSource] = useState<"INTERNAL" | "FREELANCER">(
    marketplaceOnly ? "FREELANCER" : "INTERNAL"
  );

  function openCreate(source: "INTERNAL" | "FREELANCER") {
    setAssignmentSource(source);
    setCreateOpen(true);
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {!marketplaceOnly && (
          <Button onClick={() => openCreate("INTERNAL")} variant="outline" className="shrink-0">
            <Plus className="h-4 w-4" />
            Create internal job
          </Button>
        )}
        <Button
          onClick={() => openCreate("FREELANCER")}
          variant="primary"
          className="shrink-0"
        >
          <Store className="h-4 w-4" />
          Post to freelancer marketplace
        </Button>
      </div>
      <CreateJobModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        services={services}
        clients={clients}
        staffUsers={staffUsers}
        assignmentSource={assignmentSource}
        hideSourceToggle={assignmentSource === "FREELANCER"}
      />
    </>
  );
}
