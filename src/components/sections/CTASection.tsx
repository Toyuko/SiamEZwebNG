import Link from "next/link";
import { Button } from "@/components/ui/button";

interface CTASectionProps {
  title?: string;
  subtitle?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  className?: string;
}

export function CTASection({
  title = "Get In Touch",
  subtitle = "Ready to get started? Contact us today!",
  primaryLabel = "Contact Us",
  primaryHref = "/contact",
  secondaryLabel,
  secondaryHref = "/services",
  className = "",
}: CTASectionProps) {
  return (
    <section className={`bg-siam-blue py-16 sm:py-20 md:py-24 ${className}`}>
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-display-md font-bold tracking-tight text-white opacity-0 animate-fade-in-up">
          {title}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-lg text-white/90 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          {subtitle}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4 opacity-0 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <Button
            asChild
            size="lg"
            variant="primary"
            className="min-w-[160px] text-siam-blue-dark"
          >
            <Link href={primaryHref}>{primaryLabel}</Link>
          </Button>
          {secondaryLabel && (
            <Button
              asChild
              size="lg"
              variant="outline"
              className="min-w-[160px] border-white text-white hover:bg-white/10 hover:text-white"
            >
              <Link href={secondaryHref}>{secondaryLabel}</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
