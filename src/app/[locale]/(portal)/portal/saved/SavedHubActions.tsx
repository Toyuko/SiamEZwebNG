"use client";

import { useRouter } from "@/i18n/navigation";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  removeFromCompareAction,
  toggleSaveListingAction,
} from "@/actions/marketplace-engagement";
import type { MarketplaceListingType } from "@/lib/marketplace-engagement";

export function SavedHubActions({
  mode,
  listingType,
  listingId,
}: {
  mode: "unsave" | "removeCompare";
  listingType: MarketplaceListingType;
  listingId: string;
}) {
  const t = useTranslations("marketplaceEngagement");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          if (mode === "removeCompare") {
            await removeFromCompareAction({ listingType, listingId });
          } else {
            await toggleSaveListingAction({ listingType, listingId });
          }
          router.refresh();
        });
      }}
    >
      {mode === "removeCompare" ? t("removeCompare") : t("removeSaved")}
    </Button>
  );
}
