import { Link } from "@/i18n/navigation";
import { MapPin } from "lucide-react";
import { site } from "@/config/site";

type CoverageSectionProps = {
  title: string;
  body: string;
  officeLabel: string;
  servicesLabel: string;
  contactLabel: string;
};

export function CoverageSection({
  title,
  body,
  officeLabel,
  servicesLabel,
  contactLabel,
}: CoverageSectionProps) {
  return (
    <section className="bg-gray-50 py-12 dark:bg-gray-900/40 sm:py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">{title}</h2>
          <p className="mt-4 text-base leading-relaxed text-gray-700 dark:text-gray-300 sm:text-lg">{body}</p>
        </div>
        <div className="mx-auto mt-8 flex max-w-3xl flex-col items-center gap-3 text-sm text-gray-600 dark:text-gray-400 sm:flex-row sm:justify-center sm:gap-6">
          <p className="flex items-start gap-2 text-left">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-siam-blue" aria-hidden />
            <span>
              {officeLabel}: {site.address.full}
            </span>
          </p>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/services"
            className="inline-flex h-11 items-center rounded-lg bg-siam-blue px-5 text-sm font-semibold text-white hover:bg-siam-blue-light"
          >
            {servicesLabel}
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-11 items-center rounded-lg border border-gray-300 px-5 text-sm font-semibold text-gray-800 hover:bg-white dark:border-gray-600 dark:text-gray-100"
          >
            {contactLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
