"use client";

import { useTransition } from "react";
import { deleteSavedSearchAction } from "@/actions/saved-searches";
import { Button } from "@/components/ui/button";

export function SavedSearchDeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return <Button size="sm" variant="ghost" disabled={pending} onClick={() => startTransition(async () => { await deleteSavedSearchAction(id); window.location.reload(); })}>Delete</Button>;
}
