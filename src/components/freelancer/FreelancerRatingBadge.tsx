import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type FreelancerRatingBadgeProps = {
  averageRating: number;
  totalReviews: number;
  className?: string;
  size?: "sm" | "md";
};

export function formatFreelancerRatingLabel(
  averageRating: number,
  totalReviews: number,
  options?: { reviewsLabel?: string }
): string | null {
  if (totalReviews <= 0 || averageRating <= 0) return null;
  const reviewsLabel =
    options?.reviewsLabel ??
    (totalReviews === 1 ? "1 review" : `${totalReviews} reviews`);
  return `⭐ ${averageRating.toFixed(1)} (${reviewsLabel})`;
}

export function FreelancerRatingBadge({
  averageRating,
  totalReviews,
  className,
  size = "sm",
}: FreelancerRatingBadgeProps) {
  const label = formatFreelancerRatingLabel(averageRating, totalReviews);
  if (!label) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-300",
        size === "sm" ? "text-xs" : "text-sm",
        className
      )}
    >
      <Star className={cn("fill-amber-400 text-amber-400", size === "sm" ? "h-3 w-3" : "h-4 w-4")} aria-hidden />
      <span>{averageRating.toFixed(1)}</span>
      <span className="text-slate-500 dark:text-slate-400">
        ({totalReviews === 1 ? "1 review" : `${totalReviews} reviews`})
      </span>
    </span>
  );
}
