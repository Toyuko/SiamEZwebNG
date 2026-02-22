"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ServiceModal } from "./ServiceModal";
import { ServiceTable } from "./ServiceTable";
import { ServiceSearch } from "./ServiceSearch";
import type { Service } from "@prisma/client";

type ServicesPageClientProps = {
  services: Service[];
  search?: string;
};

export function ServicesPageClient({ services, search }: ServicesPageClientProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);

  const openAddModal = () => {
    setEditService(null);
    setModalOpen(true);
  };

  const openEditModal = (service: Service) => {
    setEditService(service);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditService(null);
  };

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Services</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Manage service catalog: pricing, type (fixed or quote), and visibility.
          </p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="h-4 w-4" />
          Add service
        </Button>
      </div>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <ServiceSearch defaultValue={search} />
      </div>
      <Card className="mt-4">
        <CardContent className="p-0">
          <ServiceTable services={services} onEdit={openEditModal} />
        </CardContent>
      </Card>
      <ServiceModal open={modalOpen} onClose={closeModal} mode={editService ? "edit" : "add"} service={editService} />
    </>
  );
}
