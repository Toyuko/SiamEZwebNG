"use client";

import { useRouter } from "@/i18n/navigation";
import { createEvent, updateEvent } from "@/actions/admin";
import { Modal } from "@/components/ui/modal";
import { EventForm } from "./EventForm";

type CaseItem = { id: string; caseNumber: string };
type StaffItem = { id: string; name: string | null; email: string };
type EventWithRelations = {
  id: string;
  title: string;
  description: string | null;
  start: Date;
  end: Date;
  type: string;
  allDay?: boolean;
  color?: string | null;
  caseId: string | null;
  staffId?: string | null;
};

export function EventModal({
  open,
  onClose,
  mode,
  defaultDate,
  defaultStart,
  defaultEnd,
  defaultAllDay,
  editingEvent,
  cases,
  staff,
}: {
  open: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  defaultDate: Date;
  defaultStart?: Date;
  defaultEnd?: Date;
  defaultAllDay?: boolean;
  editingEvent?: EventWithRelations | null;
  cases: CaseItem[];
  staff: StaffItem[];
}) {
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    const title = (formData.get("title") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || undefined;
    const startStr = formData.get("start") as string;
    const endStr = formData.get("end") as string;
    const allDay = formData.get("allDay") === "on" || formData.get("allDay") === "1";
    const type = (formData.get("type") as "appointment" | "deadline" | "milestone") || "appointment";
    const color = (formData.get("color") as string) || undefined;
    const caseId = (formData.get("caseId") as string) || undefined;
    const staffId = (formData.get("staffId") as string) || undefined;

    if (!title || !startStr || !endStr) return;

    const start = allDay ? new Date(startStr + "T00:00:00") : new Date(startStr);
    const end = allDay ? new Date(endStr + "T23:59:59") : new Date(endStr);

    try {
      if (mode === "add") {
        await createEvent({
          title,
          description: description || null,
          start,
          end,
          type,
          allDay,
          color: color || null,
          caseId: caseId || null,
          staffId: staffId || null,
        });
      } else if (editingEvent) {
        await updateEvent(editingEvent.id, {
          title,
          description: description || null,
          start,
          end,
          type,
          allDay,
          color: color || null,
          caseId: caseId || null,
          staffId: staffId || null,
        });
      }
      onClose();
      router.refresh();
    } catch {
      // Keep modal open on error
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "add" ? "Add event" : "Edit event"}
      className="max-w-lg"
    >
      <EventForm
        action={handleSubmit}
        defaultDate={defaultDate}
        defaultStart={defaultStart}
        defaultEnd={defaultEnd}
        defaultAllDay={defaultAllDay}
        defaultValues={
          mode === "edit" && editingEvent
            ? {
                title: editingEvent.title,
                description: editingEvent.description,
                start: new Date(editingEvent.start),
                end: new Date(editingEvent.end),
                type: editingEvent.type,
                allDay: editingEvent.allDay,
                color: editingEvent.color,
                caseId: editingEvent.caseId,
                staffId: editingEvent.staffId,
              }
            : undefined
        }
        cases={cases}
        staff={staff}
      />
    </Modal>
  );
}
