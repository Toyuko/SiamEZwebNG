"use client";

import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { deleteSavedFinancialReportAction } from "@/actions/finance-analytics";
import { Button } from "@/components/ui/button";

export function DeleteSavedReportButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => {
        start(async () => {
          await deleteSavedFinancialReportAction(id);
          router.refresh();
        });
      }}
    >
      {pending ? "…" : "Delete"}
    </Button>
  );
}
