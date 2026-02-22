"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StaffModal } from "./StaffModal";
import { StaffTable } from "./StaffTable";
import { StaffSearch } from "./StaffSearch";

type StaffUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  active: boolean | null;
};

type StaffPageClientProps = {
  staff: StaffUser[];
  search?: string;
};

export function StaffPageClient({ staff, search }: StaffPageClientProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffUser | null>(null);

  const openAddModal = () => {
    setEditStaff(null);
    setModalOpen(true);
  };

  const openEditModal = (s: StaffUser) => {
    setEditStaff(s);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditStaff(null);
  };

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Manage staff and admin users.</p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="h-4 w-4" />
          Add staff
        </Button>
      </div>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <StaffSearch defaultValue={search} />
      </div>
      <Card className="mt-4">
        <CardContent className="p-0">
          <StaffTable staff={staff} onEdit={openEditModal} />
        </CardContent>
      </Card>
      <StaffModal open={modalOpen} onClose={closeModal} mode={editStaff ? "edit" : "add"} staff={editStaff} />
    </>
  );
}
