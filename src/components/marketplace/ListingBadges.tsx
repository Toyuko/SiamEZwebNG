import { computeListingBadges, type ListingBadge } from "@/lib/marketplace/badges";
import { cn } from "@/lib/utils";

const labels: Record<ListingBadge, string> = {
  new: "New",
  featured: "Featured",
  reduced: "Reduced",
  verified: "Verified",
};

const colors: Record<ListingBadge, string> = {
  new: "bg-emerald-600 text-white",
  featured: "bg-yellow-500 text-gray-900",
  reduced: "bg-rose-600 text-white",
  verified: "bg-siam-blue text-white",
};

export function ListingBadges(props: {
  createdAt: Date;
  isBoosted: boolean;
  boostExpiresAt?: Date | null;
  previousPriceAmount?: number | null;
  priceAmount: number;
  isVerified?: boolean;
  className?: string;
}) {
  const badges = computeListingBadges(props);
  if (!badges.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-1", props.className)}>
      {badges.map((badge) => (
        <span key={badge} className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-sm", colors[badge])}>
          {labels[badge]}
        </span>
      ))}
    </div>
  );
}
