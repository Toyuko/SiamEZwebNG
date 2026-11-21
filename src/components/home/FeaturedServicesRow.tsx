import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

export type FeaturedServiceCard = {
  slug: string;
  name: string;
  description: string;
  thumbnailImage?: string | null;
  priceAmount?: number | null;
  priceCurrency?: string | null;
};

type FeaturedServicesRowProps = {
  title: string;
  subtitle: string;
  viewAllLabel: string;
  learnMoreLabel: string;
  bookNowLabel: string;
  fromLabel: string;
  services: FeaturedServiceCard[];
};

export function FeaturedServicesRow({
  title,
  subtitle,
  viewAllLabel,
  learnMoreLabel,
  bookNowLabel,
  fromLabel,
  services,
}: FeaturedServicesRowProps) {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-siam-ink sm:text-3xl">{title}</h2>
          <p className="mt-1 text-siam-ink-muted">{subtitle}</p>
        </div>
        <Link
          href="/services"
          className="inline-flex items-center gap-1 text-sm font-semibold text-siam-blue hover:text-siam-blue-mid"
        >
          {viewAllLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        {services.slice(0, 4).map((service) => (
          <li key={service.slug}>
            <article className="flex h-full flex-col overflow-hidden rounded-siam-xl border border-siam-surface-pale bg-white shadow-soft transition-all duration-premium hover:-translate-y-0.5 hover:shadow-card">
              <div className="relative h-36 w-full bg-siam-surface">
                {service.thumbnailImage ? (
                  <Image
                    src={service.thumbnailImage}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 100vw, 40vw"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-bold text-siam-ink">{service.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-siam-ink-muted">
                  {service.description}
                </p>
                {service.priceAmount != null ? (
                  <p className="mt-2 text-sm font-semibold text-siam-blue">
                    {fromLabel}{" "}
                    {formatCurrency(service.priceAmount, service.priceCurrency ?? "THB")}
                  </p>
                ) : null}
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  <Button asChild variant="primary" size="sm">
                    <Link href={`/book/${service.slug}`}>{bookNowLabel}</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/services/${service.slug}`}>
                      {learnMoreLabel}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </Button>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
