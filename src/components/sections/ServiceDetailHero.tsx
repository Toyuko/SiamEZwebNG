import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";

interface ServiceDetailHeroProps {
  title: string;
  subtitle: string;
  breadcrumbs: Array<{ label: string; href: string }>;
  imageUrl?: string;
  showPremiumTag?: boolean;
}

export function ServiceDetailHero({
  title,
  subtitle,
  breadcrumbs,
  imageUrl,
  showPremiumTag = false,
}: ServiceDetailHeroProps) {
  return (
    <>
      {/* Breadcrumb */}
      <section className="border-b border-gray-200 bg-white py-4 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <nav className="flex items-center gap-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={`${crumb.href}-${index}`} className="flex items-center gap-2">
                {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />}
                <Link
                  href={crumb.href}
                  className={
                    index === breadcrumbs.length - 1
                      ? "font-medium text-gray-900 dark:text-gray-100"
                      : "text-gray-500 hover:text-siam-blue dark:text-gray-400 dark:hover:text-siam-blue-light"
                  }
                >
                  {crumb.label}
                </Link>
              </div>
            ))}
          </nav>
        </div>
      </section>

      {/* Hero Section with Background Image */}
      <section className="relative overflow-hidden rounded-b-3xl">
        {/* Background Image */}
        <div className="absolute inset-0">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-green-700 via-green-600 to-yellow-600" />
          )}
          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/70" />
        </div>

        {/* Content */}
        <div className="relative z-10 py-16 sm:py-20 md:py-24 lg:py-28">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl">
              {/* Premium Badge - Angled Yellow Stripe */}
              {showPremiumTag && (
                <div className="mb-6">
                  <div className="relative inline-block">
                    <div className="absolute -inset-1 rotate-[-2deg] bg-siam-yellow opacity-90 blur-sm" />
                    <span className="relative inline-block rotate-[-2deg] bg-siam-yellow px-6 py-2 text-xs font-bold uppercase tracking-wider text-gray-900 shadow-lg">
                      PREMIUM SERVICE
                    </span>
                  </div>
                </div>
              )}

              {/* Title */}
              <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
                {title}
              </h1>

              {/* Subtitle */}
              <p className="mt-6 max-w-3xl text-lg leading-relaxed text-white/95 sm:text-xl">
                {subtitle}
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
