"use client";

import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { markStaffPaymentPaidAction } from "@/actions/finance";
import { Button } from "@/components/ui/button";

export function MarkPaidButton({
  id,
  label = "Mark paid",
}: {
  id: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        start(async () => {
          await markStaffPaymentPaidAction(id);
          router.refresh();
        });
      }}
    >
      {pending ? "Saving…" : label}
    </Button>
  );
}
