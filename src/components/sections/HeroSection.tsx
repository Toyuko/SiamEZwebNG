import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { site } from "@/config/site";

interface HeroSectionProps {
  /** Optional overrides; defaults to site tagline and standard headline */
  badge?: string;
  headline?: string;
  subline?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  showLogo?: boolean;
  className?: string;
}

export function HeroSection({
  badge = "Professional Thai Services",
  headline = "Expert Thai Services",
  subline = "Your trusted partner for marriage registration, translations, driver's licenses, police clearance, and more",
  primaryCta = { label: "Get Started", href: "/contact" },
  secondaryCta = { label: "Learn More", href: "/services" },
  showLogo = true,
  className = "",
}: HeroSectionProps) {
  return (
    <section
      className={`relative overflow-hidden bg-gradient-to-br from-siam-blue via-siam-blue-light/90 to-siam-blue text-white ${className}`}
    >
      <div className="container relative mx-auto px-4 py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl lg:max-w-2xl">
            {badge && (
              <span
                className="inline-block rounded-full bg-siam-yellow/20 px-4 py-1.5 text-sm font-medium text-siam-yellow opacity-0 animate-fade-in-up"
                style={{ animationDelay: "0.1s" }}
              >
                {badge}
              </span>
            )}
            <h1
              className="mt-4 text-display-lg font-bold leading-tight tracking-tight text-white opacity-0 animate-fade-in-up"
              style={{ animationDelay: "0.2s" }}
            >
              {headline}
            </h1>
            <p
              className="mt-4 text-lg leading-relaxed text-white/90 sm:text-xl opacity-0 animate-fade-in-up"
              style={{ animationDelay: "0.35s" }}
            >
              {subline}
            </p>
            <div
              className="mt-6 flex flex-wrap gap-3 sm:mt-8 sm:gap-4 opacity-0 animate-fade-in-up"
              style={{ animationDelay: "0.5s" }}
            >
              <Button
                asChild
                size="lg"
                variant="primary"
                className="min-w-[140px] text-siam-blue-dark"
              >
                <Link href={primaryCta.href}>{primaryCta.label}</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="min-w-[140px] border-white text-white hover:bg-white/10 hover:text-white"
              >
                <Link href={secondaryCta.href}>{secondaryCta.label}</Link>
              </Button>
            </div>
          </div>
          {showLogo && (
            <div
              className="relative hidden shrink-0 opacity-0 animate-slide-in-right lg:block lg:w-72 xl:w-80"
              style={{ animationDelay: "0.3s" }}
            >
              {/* Backdrop for better visibility */}
              <div className="absolute inset-0 -z-10 rounded-3xl bg-white/10 backdrop-blur-sm shadow-2xl" />
              <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-white/20 to-white/5" />
              
              <Image
                src="/images/logo.png"
                alt={site.name}
                width={320}
                height={280}
                className="relative object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] brightness-110 contrast-110"
                priority
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
