import { Link } from "@/i18n/navigation";
import {
  Building2,
  Car,
  ClipboardList,
  Heart,
  Languages,
  LayoutGrid,
  Plane,
  Search,
  Shield,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { homeCategoryTiles } from "@/config/home-categories";
import { ArrowRight } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Car,
  ClipboardList,
  Heart,
  Languages,
  Shield,
  Plane,
  Building2,
  Wrench,
  Search,
  LayoutGrid,
};

type ServiceCategoryGridProps = {
  title: string;
  subtitle: string;
  viewAllLabel: string;
  labels: Record<string, string>;
};

export function ServiceCategoryGrid({
  title,
  subtitle,
  viewAllLabel,
  labels,
}: ServiceCategoryGridProps) {
  return (
    <section className="bg-[#EEF5FF] py-12 sm:py-14">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-[#101C55] sm:text-3xl">{title}</h2>
            <p className="mt-1 text-[#52648A]">{subtitle}</p>
          </div>
          <Link
            href="/services"
            className="inline-flex items-center gap-1 text-sm font-semibold text-siam-blue transition-colors hover:text-siam-blue-mid"
          >
            {viewAllLabel}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-4">
          {homeCategoryTiles.map((tile) => {
            const Icon = ICON_MAP[tile.icon] ?? LayoutGrid;
            const label = labels[tile.labelKey] ?? tile.labelKey;
            return (
              <li key={tile.id}>
                <Link
                  href={tile.href}
                  style={{ backgroundColor: tile.color }}
                  className="group flex min-h-[8.5rem] flex-col items-center justify-center gap-2.5 rounded-siam-xl p-3 text-center text-white shadow-soft transition-all duration-premium hover:-translate-y-0.5 hover:brightness-95 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-siam-yellow focus-visible:ring-offset-2 sm:min-h-[9.5rem] sm:p-4"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 transition-transform duration-premium group-hover:scale-105 sm:h-12 sm:w-12">
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
                  </span>
                  <span className="line-clamp-2 text-[13px] font-semibold leading-snug sm:text-sm">
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
