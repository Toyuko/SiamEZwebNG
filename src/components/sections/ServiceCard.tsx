import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Clock, FileCheck, LucideIcon, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { serviceCardThumbnailObjectPosition } from "@/lib/service-display";
import { ServiceBadges } from "@/components/services/ServiceBadges";
import { site } from "@/config/site";
import type { ServiceBadgeKey } from "@/config/service-catalog";

interface ServiceCardProps {
  slug: string;
  name: string;
  description: string;
  thumbnailImage?: string | null;
  Icon: LucideIcon;
  iconBg: string;
  iconText: string;
  iconShape: "circle" | "square";
  priceAmount?: number | null;
  priceCurrency?: string | null;
  priceLabel?: string;
  processingTime?: string;
  processingTimeLabel?: string;
  requirementsSummary?: string;
  requirementsLabel?: string;
  badges?: ServiceBadgeKey[];
  badgeLabels?: Record<ServiceBadgeKey, string>;
  bookNowLabel: string;
  detailsLabel: string;
  lineLabel?: string;
  /** If provided, used for the Book Now href; otherwise defaults to /book/[slug] */
  getBookHref?: (slug: string) => string;
  onBookClick?: () => void;
  onDetailsClick?: () => void;
  onLineClick?: () => void;
}

export function ServiceCard({
  slug,
  name,
  description,
  thumbnailImage,
  Icon,
  iconBg,
  iconText,
  iconShape,
  priceAmount,
  priceCurrency,
  priceLabel,
  processingTime,
  processingTimeLabel,
  requirementsSummary,
  requirementsLabel,
  badges = [],
  badgeLabels,
  bookNowLabel,
  detailsLabel,
  lineLabel = "LINE",
  getBookHref,
  onBookClick,
  onDetailsClick,
  onLineClick,
}: ServiceCardProps) {
  const iconShapeClass = iconShape === "square" ? "rounded-xl" : "rounded-full";
  const bookHref = getBookHref ? getBookHref(slug) : `/book/${slug}`;
  const objectPosition = serviceCardThumbnailObjectPosition(slug);

  return (
    <Card className="flex h-full flex-col overflow-hidden shadow-sm transition-all duration-200 hover:shadow-lg">
      {thumbnailImage ? (
        <div className="relative h-40 w-full">
          <Image
            src={thumbnailImage}
            alt={name}
            fill
            className="object-cover"
            style={objectPosition ? { objectPosition } : undefined}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      ) : null}
      <CardContent className="flex flex-1 flex-col p-5 sm:p-6">
        {badges.length > 0 && badgeLabels ? (
          <ServiceBadges badges={badges} labels={badgeLabels} className="mb-3" />
        ) : null}
        <div className={`mb-3 flex h-12 w-12 items-center justify-center sm:mb-4 sm:h-14 sm:w-14 ${iconShapeClass} ${iconBg} ${iconText} shadow-sm`}>
          <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
        </div>
        <h2 className="text-lg font-semibold text-card-foreground sm:text-xl">{name}</h2>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">
          {description}
        </p>
        {processingTime ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
            <Clock className="h-3.5 w-3.5 shrink-0 text-siam-blue" aria-hidden />
            <span>
              {processingTimeLabel ? `${processingTimeLabel}: ` : ""}
              {processingTime}
            </span>
          </p>
        ) : null}
        {requirementsSummary ? (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground sm:text-sm">
            <FileCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-siam-blue" aria-hidden />
            <span className="line-clamp-2">
              {requirementsLabel ? `${requirementsLabel}: ` : ""}
              {requirementsSummary}
            </span>
          </p>
        ) : null}
        {priceAmount != null && priceLabel && (
          <p className="mt-3 text-sm font-medium text-siam-blue">
            {priceLabel} {formatCurrency(priceAmount, priceCurrency ?? "THB")}
          </p>
        )}
        <div className="mt-5 flex flex-col gap-2 sm:mt-6">
          <div className="flex gap-2">
            <Button
              asChild
              className="min-h-[44px] flex-1 bg-siam-blue text-white hover:bg-siam-blue-light"
            >
              <Link href={bookHref} onClick={onBookClick}>
                {bookNowLabel}
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="min-h-[44px] flex-1 border-siam-blue text-siam-blue hover:bg-siam-blue/10 dark:border-siam-blue dark:text-siam-blue dark:hover:bg-siam-blue/20"
            >
              <Link href={`/services/${slug}`} onClick={onDetailsClick}>
                {detailsLabel}
              </Link>
            </Button>
          </div>
          <a
            href={site.lineUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onLineClick}
            className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-[#06C755]/40 bg-[#06C755]/5 px-3 text-xs font-medium text-[#06C755] hover:bg-[#06C755]/10 sm:text-sm"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            {lineLabel} {site.line}
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
