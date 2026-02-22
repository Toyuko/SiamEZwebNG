import { getClients } from "@/actions/admin";
import { ClientsPageClient } from "./ClientsPageClient";

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const search = params.search ?? undefined;
  const page = Number(params.page) || 1;

  const { clients, total, totalPages } = await getClients({ search, page });

  return (
    <div>
      <ClientsPageClient
        clients={clients}
        total={total}
        page={page}
        totalPages={totalPages}
        search={search}
      />
    </div>
  );
}
