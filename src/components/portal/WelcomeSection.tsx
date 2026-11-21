import { Link } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AskSiamEzButton } from "@/components/ai/AskSiamEzButton";

export function WelcomeSection({
  title,
  subtitle,
  bookLabel,
  askLabel,
  showAsk = true,
}: {
  title: string;
  subtitle: string;
  bookLabel: string;
  askLabel: string;
  showAsk?: boolean;
}) {
  return (
    <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-siam-ink dark:text-white sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-siam-ink-muted dark:text-gray-400 sm:text-base">
          {subtitle}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Button
          asChild
          variant="primary"
          size="lg"
          className="gap-2 font-semibold shadow-soft"
        >
          <Link href="/services">
            <Plus className="h-4 w-4" aria-hidden />
            {bookLabel}
          </Link>
        </Button>
        {showAsk ? (
          <AskSiamEzButton
            label={askLabel}
            variant="outline"
            size="lg"
            className="border-[#DCE6F5] bg-white text-siam-ink hover:bg-[#F4F8FF]"
          />
        ) : null}
      </div>
    </section>
  );
}
