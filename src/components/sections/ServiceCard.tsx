import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

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
  bookNowLabel: string;
  detailsLabel: string;
  /** If provided, used for the Book Now href; otherwise defaults to /book/[slug] */
  getBookHref?: (slug: string) => string;
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
  bookNowLabel,
  detailsLabel,
  getBookHref,
}: ServiceCardProps) {
  const iconShapeClass = iconShape === "square" ? "rounded-xl" : "rounded-full";
  const bookHref = getBookHref ? getBookHref(slug) : `/book/${slug}`;

  return (
    <Card className="flex h-full flex-col overflow-hidden shadow-sm transition-all duration-200 hover:shadow-lg">
      {thumbnailImage ? (
        <div className="relative h-40 w-full">
          <Image
            src={thumbnailImage}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      ) : null}
      <CardContent className="flex flex-1 flex-col p-6">
        <div className={`mb-4 flex h-14 w-14 items-center justify-center ${iconShapeClass} ${iconBg} ${iconText} shadow-sm`}>
          <Icon className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-semibold text-card-foreground">{name}</h2>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        {priceAmount != null && priceLabel && (
          <p className="mt-3 text-sm font-medium text-siam-blue">
            {priceLabel} {formatCurrency(priceAmount, priceCurrency ?? "THB")}
          </p>
        )}
        <div className="mt-6 flex gap-3">
          <Button asChild className="flex-1 bg-siam-blue text-white hover:bg-siam-blue-light">
            <Link href={bookHref}>
              {bookNowLabel}
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1 border-siam-blue text-siam-blue hover:bg-siam-blue/10 dark:border-siam-blue dark:text-siam-blue dark:hover:bg-siam-blue/20">
            <Link href={`/services/${slug}`}>
              {detailsLabel}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
