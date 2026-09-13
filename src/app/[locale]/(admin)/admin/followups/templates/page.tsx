import { adminListFollowUpTemplates } from "@/actions/follow-ups";
import { getServices, getStaffUsers } from "@/actions/admin";
import { TemplatesClient } from "./TemplatesClient";

export const dynamic = "force-dynamic";

export default async function FollowUpTemplatesPage() {
  const [templates, services, staff] = await Promise.all([
    adminListFollowUpTemplates(),
    getServices(),
    getStaffUsers(),
  ]);

  return (
    <TemplatesClient
      templates={templates}
      services={services.map((s) => ({ id: s.id, name: s.name, slug: s.slug }))}
      staff={staff}
    />
  );
}
