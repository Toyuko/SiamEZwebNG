import { Link } from "@/i18n/navigation";
import {
  Heart,
  FileText,
  Car,
  Shield,
  Plane,
  Wrench,
  ClipboardList,
  Bus,
  User,
  type LucideIcon,
} from "lucide-react";
import { ServiceCard } from "./ServiceCard";
import type { ServiceSlug } from "@/config/services";
import {
  serviceDisplayNames,
  serviceShortDescriptions,
  serviceSlugs,
} from "@/config/services";

const iconBySlug: Record<ServiceSlug, LucideIcon> = {
  "marriage-registration": Heart,
  "translation-services": FileText,
  "driver-license": Car,
  "police-clearance": Shield,
  "visa-services": Plane,
  "construction-handyman": Wrench,
  "vehicle-registration": ClipboardList,
  "transportation-services": Bus,
  "private-driver-service": User,
};

// Softer pastel colors matching the design - with dark mode variants
const iconColorBySlug: Record<ServiceSlug, { bg: string; text: string; shape: "circle" | "square" }> = {
  "marriage-registration": { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-600 dark:text-red-400", shape: "circle" },
  "translation-services": { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400", shape: "square" },
  "driver-license": { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400", shape: "circle" },
  "police-clearance": { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400", shape: "circle" },
  "visa-services": { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-600 dark:text-green-400", shape: "circle" },
  "construction-handyman": { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-600 dark:text-orange-400", shape: "circle" },
  "vehicle-registration": { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-600 dark:text-purple-400", shape: "square" },
  "transportation-services": { bg: "bg-cyan-100 dark:bg-cyan-900/30", text: "text-cyan-600 dark:text-cyan-400", shape: "circle" },
  "private-driver-service": { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-600 dark:text-green-400", shape: "circle" },
};

export interface ServiceItem {
  id?: string;
  name: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  priceAmount?: number | null;
  priceCurrency?: string | null;
}

interface ServiceGridProps {
  services: ServiceItem[];
  title?: string;
  subtitle?: string;
  maxItems?: number;
  showViewAll?: boolean;
  viewAllHref?: string;
  viewAllLabel?: string;
  bookNowLabel?: string;
  detailsLabel?: string;
  priceLabel?: string;
  className?: string;
}

export function ServiceGrid({
  services,
  title = "Our Services",
  subtitle = "Comprehensive solutions for all your administrative needs in Thailand",
  maxItems,
  showViewAll = true,
  viewAllHref = "/services",
  viewAllLabel = "View All Services →",
  bookNowLabel = "Book Now",
  detailsLabel = "Details",
  priceLabel,
  className = "",
}: ServiceGridProps) {
  const list =
    services.length > 0
      ? maxItems != null
        ? services.slice(0, maxItems)
        : services
      : serviceSlugs.map((slug) => ({
          name: serviceDisplayNames[slug],
          slug,
          shortDescription: serviceShortDescriptions[slug],
          priceAmount: null,
          priceCurrency: null,
        }));

  const displayList = maxItems != null ? list.slice(0, maxItems) : list;

  return (
    <section className={`py-16 sm:py-20 md:py-24 ${className}`}>
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
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {displayList.map((s, i) => {
            const Icon = iconBySlug[s.slug as ServiceSlug] ?? FileText;
            const colors = iconColorBySlug[s.slug as ServiceSlug] ?? iconColorBySlug["translation-services"];
            const desc =
              s.shortDescription ?? (s as ServiceItem).description?.slice(0, 150) ?? "";

            return (
              <div
                key={s.slug}
                className="opacity-0 animate-fade-in-scale"
                style={{ animationDelay: `${0.05 * (i + 2)}s` }}
              >
                <ServiceCard
                  slug={s.slug}
                  name={s.name}
                  description={desc}
                  Icon={Icon}
                  iconBg={colors.bg}
                  iconText={colors.text}
                  iconShape={colors.shape}
                  priceAmount={s.priceAmount}
                  priceCurrency={s.priceCurrency}
                  priceLabel={priceLabel}
                  bookNowLabel={bookNowLabel}
                  detailsLabel={detailsLabel}
                />
              </div>
            );
          })}
        </div>
        {showViewAll && list.length > 0 && (
          <div className="mt-10 text-center opacity-0 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <Link
              href={viewAllHref}
              className="inline-flex items-center rounded-lg bg-siam-blue px-5 py-2.5 text-sm font-medium text-white hover:bg-siam-blue-light"
            >
              {viewAllLabel}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
