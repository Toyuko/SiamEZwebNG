"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { CreateJobModal } from "./CreateJobModal";
import type { Service } from "@prisma/client";

type Client = { id: string; name: string | null; email: string };
type StaffUser = { id: string; name: string | null; email: string };

export function ServiceJobsPageClient({
  services,
  clients,
  staffUsers,
}: {
  services: Service[];
  clients: Client[];
  staffUsers: StaffUser[];
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setCreateOpen(true)} className="shrink-0">
        <Plus className="h-4 w-4" />
        Create Job
      </Button>
      <CreateJobModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        services={services}
        clients={clients}
        staffUsers={staffUsers}
      />
    </>
  );
}
