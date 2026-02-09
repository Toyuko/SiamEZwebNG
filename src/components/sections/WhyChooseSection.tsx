import { Check, Zap, Users, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

const defaultBullets = [
  { title: "Fast & Efficient", text: "Quick turnaround times without compromising quality." },
  { title: "Expert Guidance", text: "Professional support at every step of the process." },
  { title: "Transparent Pricing", text: "Clear costs with no hidden fees or surprises." },
];

const iconComponents = [Shield, Zap, Users, Check];

interface WhyChooseSectionProps {
  showCta?: boolean;
  title?: string;
  subtitle?: string;
  bullets?: { title: string; text: string }[];
  iconLabels?: string[];
  ctaLabel?: string;
}

export function WhyChooseSection({
  showCta = true,
  title = "Why Choose SiamEZ",
  subtitle = "We specialize in making complex Thai administrative processes simple and stress-free. With years of experience and deep local knowledge, we're your reliable partner in navigating Thailand's bureaucracy.",
  bullets = defaultBullets,
  iconLabels = ["100% Dedicated", "Fast Service", "Expert Team", "Pro Results"],
  ctaLabel = "About Us",
}: WhyChooseSectionProps) {
  return (
    <section className="bg-gray-50 py-16 dark:bg-gray-800/50 sm:py-20 md:py-24">
      <div className="container mx-auto px-4">
        <h2 className="text-center text-display-md font-bold tracking-tight text-foreground opacity-0 animate-fade-in-up">
          {title}
        </h2>
        <p
          className="mx-auto mt-3 max-w-2xl text-center text-lg text-muted opacity-0 animate-fade-in-up"
          style={{ animationDelay: "0.1s" }}
        >
          {subtitle}
        </p>
        <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:items-start">
          <ul className="space-y-4">
            {bullets.map(({ title: bulletTitle, text }, i) => (
              <li
                key={bulletTitle}
                className="flex items-start gap-3 opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${0.15 * (i + 2)}s` }}
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-siam-blue text-white">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h3 className="font-semibold text-foreground">{bulletTitle}</h3>
                  <p className="text-muted">{text}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            {iconComponents.map((Icon, i) => (
              <div
                key={iconLabels[i]}
                className="rounded-xl border border-border bg-card p-4 text-center shadow-sm opacity-0 animate-fade-in-scale transition-shadow hover:shadow-md sm:p-6"
                style={{ animationDelay: `${0.2 * (i + 2)}s` }}
              >
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-siam-yellow/20 text-siam-blue sm:h-14 sm:w-14">
                  <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
                <p className="text-sm font-semibold text-card-foreground sm:text-base">{iconLabels[i]}</p>
              </div>
            ))}
          </div>
        </div>
        {showCta && (
          <div className="mt-10 flex justify-center">
            <Button asChild size="lg" variant="default">
              <Link href="/about">{ctaLabel}</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
