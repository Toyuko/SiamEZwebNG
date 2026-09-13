import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getClientById,
  getServices,
  getStaffUsers,
} from "@/actions/admin";
import {
  adminGetClientFollowUps,
  adminListFollowUpTemplates,
} from "@/actions/follow-ups";
import { serializeFollowUp } from "@/app/[locale]/(admin)/admin/followups/types";
import { ClientFollowUpsSection } from "./ClientFollowUpsSection";

export const dynamic = "force-dynamic";

export default async function AdminClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [client, groups, services, staff, templates] = await Promise.all([
    getClientById(id),
    adminGetClientFollowUps(id),
    getServices(),
    getStaffUsers(),
    adminListFollowUpTemplates(),
  ]);

  if (!client) notFound();

  const serviceOptions = services.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {client.name ?? client.email}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Client profile
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/clients/${id}/edit`}>
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Email:</span> {client.email}
            </p>
            <p>
              <span className="font-medium">Phone:</span> {client.phone ?? "—"}
            </p>
            <p>
              <span className="font-medium">Status:</span>{" "}
              {client.active !== false ? "Active" : "Inactive"}
            </p>
            {client.legacyCustomerId != null ? (
              <p>
                <span className="font-medium">Legacy ID:</span>{" "}
                {client.legacyCustomerId}
              </p>
            ) : null}
            {client.address ? (
              <p>
                <span className="font-medium">Address:</span> {client.address}
              </p>
            ) : null}
            {client.notes ? (
              <p>
                <span className="font-medium">Notes:</span> {client.notes}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cases ({client.casesAsClient.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {client.casesAsClient.length === 0 ? (
              <p className="text-sm text-gray-500">No cases yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {client.casesAsClient.slice(0, 10).map((c) => (
                  <li key={c.id} className="flex justify-between gap-3">
                    <Link
                      href={`/admin/cases/${c.id}`}
                      className="text-siam-blue hover:underline"
                    >
                      {c.caseNumber}
                    </Link>
                    <span className="text-gray-500">
                      {c.service?.name ?? "—"} · {c.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ClientFollowUpsSection
        clientId={id}
        client={{ id: client.id, name: client.name, email: client.email }}
        groups={{
          upcoming: groups.upcoming.map(serializeFollowUp),
          overdue: groups.overdue.map(serializeFollowUp),
          completed: groups.completed.map(serializeFollowUp),
          cancelled: groups.cancelled.map(serializeFollowUp),
        }}
        services={serviceOptions}
        staff={staff}
        templates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          active: t.active,
          serviceId: t.serviceId,
        }))}
      />
    </div>
  );
}
