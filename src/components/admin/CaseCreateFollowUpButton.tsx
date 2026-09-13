"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FollowUpFormModal } from "@/app/[locale]/(admin)/admin/followups/FollowUpFormModal";
import { adminListFollowUpTemplates } from "@/actions/follow-ups";
import type {
  ClientOption,
  ServiceOption,
  StaffOption,
} from "@/app/[locale]/(admin)/admin/followups/types";

type TemplateOption = {
  id: string;
  name: string;
  active: boolean;
  serviceId: string | null;
};

/**
 * Shown on case detail when the case is completed or near completion.
 */
export function CaseCreateFollowUpButton({
  clientId,
  caseId,
  serviceId,
  serviceName,
  staff,
  clients,
  services,
}: {
  clientId: string;
  caseId: string;
  serviceId: string;
  serviceName: string;
  staff: StaffOption[];
  clients: ClientOption[];
  services: ServiceOption[];
}) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    adminListFollowUpTemplates()
      .then((rows) => {
        if (cancelled) return;
        setTemplates(
          rows
            .filter((t) => t.active)
            .filter(
              (t) =>
                !t.serviceId ||
                t.serviceId === serviceId ||
                !serviceId
            )
            .map((t) => ({
              id: t.id,
              name: t.name,
              active: t.active,
              serviceId: t.serviceId,
            }))
        );
      })
      .catch(() => {
        /* ignore — create form still works without templates */
      });
    return () => {
      cancelled = true;
    };
  }, [serviceId]);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Create Follow-Up
      </Button>
      <FollowUpFormModal
        open={open}
        onClose={() => setOpen(false)}
        mode="create"
        clients={clients}
        services={services}
        staff={staff}
        templates={templates}
        defaults={{
          clientId,
          caseId,
          serviceId,
          title: `Follow-up: ${serviceName}`,
        }}
      />
    </>
  );
}
