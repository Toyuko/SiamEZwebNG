import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { site } from "@/config/site";
import {
  HeroBookingWidget,
  type BookingWidgetService,
} from "@/components/home/HeroBookingWidget";

type PremiumHeroProps = {
  headlineBefore: string;
  headlineHighlight: string;
  headlineAfter?: string;
  subline: string;
  trustItems: string[];
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string; external?: boolean };
  booking: {
    title: string;
    subtitle: string;
    selectLabel: string;
    selectPlaceholder: string;
    continueLabel: string;
    steps: [string, string, string];
    trustLabels: [string, string, string];
  };
  services: BookingWidgetService[];
};

export function PremiumHero({
  headlineBefore,
  headlineHighlight,
  headlineAfter = "",
  subline,
  trustItems,
  primaryCta,
  secondaryCta,
  booking,
  services,
}: PremiumHeroProps) {
  return (
    <section className="relative overflow-hidden bg-hero-gradient text-white">
      {/* Soft atmosphere — single optimized image, no multi-slide LCP hit */}
      <div className="pointer-events-none absolute inset-0">
        <Image
          src="/images/gallery/hero-home/hero-01.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0535B5]/95 via-[#0754E8]/85 to-[#0875FF]/70" />
        <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-siam-yellow/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      </div>

      <div className="relative container mx-auto grid gap-8 px-4 py-10 sm:py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-10 lg:py-14">
        <div className="max-w-xl motion-safe:animate-fade-in">
          <h1 className="text-display-md font-extrabold tracking-tight text-white sm:text-display-lg">
            {headlineBefore}{" "}
            <span className="italic text-siam-yellow">{headlineHighlight}</span>
            {headlineAfter}
          </h1>
          <p className="mt-4 max-w-lg text-base text-white/90 sm:text-lg">{subline}</p>

          <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {trustItems.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-white/95">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-siam-yellow text-siam-navy">
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                </span>
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild variant="primary" size="xl" className="min-w-[11rem]">
              <Link href={primaryCta.href}>
                {primaryCta.label}
                <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
            </Button>
            {secondaryCta.external ? (
              <a
                href={secondaryCta.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-siam-md border-2 border-white/40 bg-white/10 px-6 text-base font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                {secondaryCta.label}
              </a>
            ) : (
              <Button asChild variant="outline" size="xl" className="border-white text-white hover:bg-white/10">
                <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
              </Button>
            )}
          </div>

          <p className="mt-4 text-xs text-white/60">{site.name} · {site.tagline}</p>
        </div>

        <div className="motion-safe:animate-fade-in-scale lg:justify-self-end lg:w-full lg:max-w-md">
          <HeroBookingWidget
            title={booking.title}
            subtitle={booking.subtitle}
            selectLabel={booking.selectLabel}
            selectPlaceholder={booking.selectPlaceholder}
            continueLabel={booking.continueLabel}
            steps={booking.steps}
            trustLabels={booking.trustLabels}
            services={services}
          />
        </div>
      </div>

      {/* Gold wave divider */}
      <div className="relative h-6 sm:h-8" aria-hidden>
        <svg
          viewBox="0 0 1440 48"
          preserveAspectRatio="none"
          className="absolute bottom-0 h-full w-full text-white"
        >
          <path
            fill="currentColor"
            d="M0,24 C240,48 480,0 720,16 C960,32 1200,48 1440,20 L1440,48 L0,48 Z"
          />
        </svg>
        <div className="absolute bottom-[10px] left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-siam-yellow to-transparent opacity-80" />
      </div>
    </section>
  );
}
