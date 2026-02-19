import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface ServiceCardProps {
  slug: string;
  name: string;
  description: string;
  Icon: LucideIcon;
  iconBg: string;
  iconText: string;
  iconShape: "circle" | "square";
  priceAmount?: number | null;
  priceCurrency?: string | null;
  priceLabel?: string;
  bookNowLabel: string;
  detailsLabel: string;
}

export function ServiceCard({
  slug,
  name,
  description,
  Icon,
  iconBg,
  iconText,
  iconShape,
  priceAmount,
  priceCurrency,
  priceLabel,
  bookNowLabel,
  detailsLabel,
}: ServiceCardProps) {
  const iconShapeClass = iconShape === "square" ? "rounded-xl" : "rounded-full";

  return (
    <Card className="flex flex-col shadow-sm transition-all duration-200 hover:shadow-lg">
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
            <Link href={`/book/${slug}`}>
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
