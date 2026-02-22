"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ClientModal } from "./ClientModal";
import { ClientTable } from "./ClientTable";
import { ClientSearch } from "./ClientSearch";

type Client = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  active: boolean | null;
  createdAt: Date;
};

type ClientsPageClientProps = {
  clients: Client[];
  total: number;
  page: number;
  totalPages: number;
  search?: string;
};

export function ClientsPageClient({
  clients,
  total,
  page,
  totalPages,
  search,
}: ClientsPageClientProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);

  const openAddModal = () => {
    setEditClient(null);
    setModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditClient(client);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditClient(null);
  };

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Clients
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            View and manage client accounts.
          </p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="h-4 w-4" />
          Add client
        </Button>
      </div>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <ClientSearch defaultValue={search} />
      </div>
      <Card className="mt-4">
        <CardContent className="p-0">
      <ClientTable
        clients={clients}
        total={total}
        page={page}
        totalPages={totalPages}
        search={search}
        onEdit={openEditModal}
      />
        </CardContent>
      </Card>
      <ClientModal
        open={modalOpen}
        onClose={closeModal}
        mode={editClient ? "edit" : "add"}
        client={editClient}
      />
    </>
  );
}
