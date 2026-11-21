import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ArrowRight, CheckCircle2, Lock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

type BookingPromoPanelProps = {
  title: string;
  text: string;
  ctaLabel: string;
  features: [string, string, string];
};

export function BookingPromoPanel({
  title,
  text,
  ctaLabel,
  features,
}: BookingPromoPanelProps) {
  return (
    <article className="relative overflow-hidden rounded-siam-xl bg-siam-navy p-6 text-white shadow-card sm:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <Image
          src="/images/gallery/hero-home/hero-03.png"
          alt=""
          fill
          sizes="400px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-siam-navy via-siam-blue/90 to-siam-blue-mid" />
      </div>
      <div className="relative">
        <h3 className="text-xl font-bold sm:text-2xl">{title}</h3>
        <p className="mt-2 text-sm text-white/85">{text}</p>
        <ul className="mt-4 space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-siam-yellow" aria-hidden />
            {features[0]}
          </li>
          <li className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-siam-yellow" aria-hidden />
            {features[1]}
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-siam-yellow" aria-hidden />
            {features[2]}
          </li>
        </ul>
        <Button asChild variant="primary" size="lg" className="mt-6">
          <Link href="/services">
            {ctaLabel}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>
    </article>
  );
}
