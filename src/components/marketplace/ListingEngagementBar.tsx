"use client";

import { useEffect, useState, useTransition } from "react";
import { Bookmark, BookmarkCheck, GitCompareArrows } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
  addToCompareAction,
  recordListingViewAction,
  removeFromCompareAction,
  toggleSaveListingAction,
} from "@/actions/marketplace-engagement";
import { MAX_COMPARE_ITEMS } from "@/lib/marketplace-engagement/constants";
import type { MarketplaceListingType } from "@/lib/marketplace-engagement";

type Props = {
  listingType: MarketplaceListingType;
  listingId: string;
  initialSaved?: boolean;
  initialInCompare?: boolean;
  initialCompareCount?: number;
};

export function ListingEngagementBar({
  listingType,
  listingId,
  initialSaved = false,
  initialInCompare = false,
  initialCompareCount = 0,
}: Props) {
  const t = useTranslations("marketplaceEngagement");
  const [saved, setSaved] = useState(initialSaved);
  const [inCompare, setInCompare] = useState(initialInCompare);
  const [compareCount, setCompareCount] = useState(initialCompareCount);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const state = await recordListingViewAction({ listingType, listingId });
      if (state.ok) {
        if (typeof state.saved === "boolean") setSaved(state.saved);
        if (typeof state.inCompare === "boolean") setInCompare(state.inCompare);
        if (typeof state.compareCount === "number") setCompareCount(state.compareCount);
      }
    });
  }, [listingType, listingId]);

  function onToggleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await toggleSaveListingAction({ listingType, listingId });
      if (!result.ok) {
        setMessage(t("errorGeneric"));
        return;
      }
      setSaved(result.saved);
      setMessage(result.saved ? t("savedToast") : t("unsavedToast"));
    });
  }

  function onToggleCompare() {
    setMessage(null);
    startTransition(async () => {
      if (inCompare) {
        const result = await removeFromCompareAction({ listingType, listingId });
        if (result.ok) {
          setInCompare(false);
          setCompareCount(result.count);
          setMessage(t("compareRemoved"));
        }
        return;
      }
      const result = await addToCompareAction({ listingType, listingId });
      if (!result.ok) {
        if (result.reason === "cap") {
          setMessage(t("compareCap", { max: MAX_COMPARE_ITEMS }));
          setCompareCount(result.count);
        } else {
          setMessage(t("errorGeneric"));
        }
        return;
      }
      setInCompare(true);
      setCompareCount(result.count);
      setMessage(t("compareAdded", { count: result.count, max: MAX_COMPARE_ITEMS }));
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={onToggleSave}
          aria-pressed={saved}
          className="border-siam-blue text-siam-blue"
        >
          {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          {saved ? t("unsave") : t("save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending || (!inCompare && compareCount >= MAX_COMPARE_ITEMS)}
          onClick={onToggleCompare}
          aria-pressed={inCompare}
          className="border-gray-300 text-gray-800 dark:border-gray-600 dark:text-gray-100"
          title={
            !inCompare && compareCount >= MAX_COMPARE_ITEMS
              ? t("compareCap", { max: MAX_COMPARE_ITEMS })
              : undefined
          }
        >
          <GitCompareArrows className="h-4 w-4" />
          {inCompare ? t("removeCompare") : t("addCompare")}
          <span className="text-xs text-gray-500">
            ({compareCount}/{MAX_COMPARE_ITEMS})
          </span>
        </Button>
        <Button asChild variant="ghost" size="sm" className="text-siam-blue">
          <Link href="/portal/saved">{t("viewHub")}</Link>
        </Button>
      </div>
      {message ? (
        <p className="text-xs text-gray-600 dark:text-gray-400" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
