import { Link } from "@/i18n/navigation";
import { ArrowRight, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";

type TrackBookingPanelProps = {
  title: string;
  text: string;
  ctaLabel: string;
};

/**
 * Routes returning customers into the existing portal case tracker.
 * Guests are redirected to login by middleware — no parallel tracking system.
 */
export function TrackBookingPanel({ title, text, ctaLabel }: TrackBookingPanelProps) {
  return (
    <article className="flex h-full flex-col rounded-siam-xl border border-siam-surface-pale bg-white p-6 shadow-soft sm:p-7">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-siam-md bg-siam-yellow/20 text-siam-navy">
        <PackageSearch className="h-6 w-6" aria-hidden />
      </span>
      <h3 className="text-xl font-bold text-siam-ink">{title}</h3>
      <p className="mt-2 flex-1 text-sm text-siam-ink-muted">{text}</p>
      <Button asChild variant="outline" size="lg" className="mt-6 w-full sm:w-auto">
        <Link href="/portal/cases">
          {ctaLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </Button>
    </article>
  );
}
