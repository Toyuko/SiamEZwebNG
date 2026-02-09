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
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ServiceSlug } from "@/config/services";
import {
  serviceDisplayNames,
  serviceShortDescriptions,
  serviceSlugs,
} from "@/config/services";

const iconBySlug: Record<ServiceSlug, React.ComponentType<{ className?: string }>> = {
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

/** Distinct icon colors per service (bg + text Tailwind classes) */
const iconColorBySlug: Record<ServiceSlug, { bg: string; text: string }> = {
  "marriage-registration": { bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-600 dark:text-rose-400" },
  "translation-services": { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400" },
  "driver-license": { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400" },
  "police-clearance": { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-600 dark:text-indigo-400" },
  "visa-services": { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
  "construction-handyman": { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-600 dark:text-orange-400" },
  "vehicle-registration": { bg: "bg-violet-100 dark:bg-violet-900/30", text: "text-violet-600 dark:text-violet-400" },
  "transportation-services": { bg: "bg-cyan-100 dark:bg-cyan-900/30", text: "text-cyan-600 dark:text-cyan-400" },
  "private-driver-service": { bg: "bg-teal-100 dark:bg-teal-900/30", text: "text-teal-600 dark:text-teal-400" },
};

export interface ServiceItem {
  id?: string;
  name: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
}

interface ServiceGridProps {
  services: ServiceItem[];
  title?: string;
  subtitle?: string;
  maxItems?: number;
  showViewAll?: boolean;
  viewAllHref?: string;
  viewAllLabel?: string;
  learnMoreLabel?: string;
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
  learnMoreLabel = "Learn More →",
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
              s.shortDescription ?? (s as ServiceItem).description?.slice(0, 160) ?? "";
            return (
              <Card
                key={s.slug}
                className="flex flex-col border-border shadow-sm opacity-0 animate-fade-in-scale transition-shadow hover:shadow-md"
                style={{ animationDelay: `${0.05 * (i + 2)}s` }}
              >
                <CardContent className="flex flex-1 flex-col p-6">
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${colors.bg} ${colors.text}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{s.name}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                    {desc}
                  </p>
                  <Link
                    href={`/services/${s.slug}`}
                    className="mt-4 inline-flex items-center text-sm font-medium text-siam-blue hover:underline"
                  >
                    {learnMoreLabel}
                  </Link>
                </CardContent>
              </Card>
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
