import { notFound } from "next/navigation";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicSalesVehicleById } from "@/data-access/sales";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { site } from "@/config/site";
import { Mail, MessageCircle, Phone } from "lucide-react";

export const dynamic = "force-dynamic";

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(
    amount / 100
  );
}

function buildWhatsAppUrl(message: string) {
  const phone = site.phone.replace(/\D/g, "");
  return `https://api.whatsapp.com/send/?phone=${phone}&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`;
}

export default async function SalesVehicleDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sales");

  const vehicle = await getPublicSalesVehicleById(id);
  if (!vehicle) {
    notFound();
  }

  const images = Array.from(
    new Set([
      vehicle.heroImageUrl,
      ...(Array.isArray(vehicle.imageUrls)
        ? vehicle.imageUrls.filter((url): url is string => typeof url === "string")
        : []),
    ])
  );

  const ctaUrl = buildWhatsAppUrl(
    `Hi SiamEZ, I am interested in ${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.id}). Please share details.`
  );
  const lineUrl = site.lineUrl;
  const phoneUrl = `tel:${site.phone.replace(/\s/g, "")}`;
  const emailUrl = `mailto:${site.email}?subject=${encodeURIComponent(
    `Inquiry: ${vehicle.year} ${vehicle.make} ${vehicle.model}`
  )}&body=${encodeURIComponent(
    `Hi SiamEZ,%0D%0A%0D%0AI am interested in ${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.id}). Please share details.`
  )}`;
  const specifications =
    vehicle.specifications && typeof vehicle.specifications === "object"
      ? (vehicle.specifications as Record<string, string>)
      : {};

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <Link href="/sales" className="text-sm font-medium text-siam-blue hover:underline">
        {t("backToInventory")}
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            <Image
              src={vehicle.heroImageUrl}
              alt={`${vehicle.make} ${vehicle.model}`}
              fill
              sizes="(max-width: 1024px) 100vw, 66vw"
              className="object-cover"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {images.map((url) => (
              <div key={url} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                <Image src={url} alt={`${vehicle.make} ${vehicle.model} gallery`} fill className="object-cover" sizes="33vw" />
              </div>
            ))}
          </div>
        </div>

        <Card className="h-fit">
          <CardContent className="space-y-4 p-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h1>
            <p className="text-3xl font-bold text-siam-blue dark:text-siam-blue-light">
              {formatPrice(vehicle.priceAmount, vehicle.priceCurrency)}
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <p className="text-gray-500">Mileage</p>
                <p className="font-semibold">{vehicle.mileageKm.toLocaleString()} km</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <p className="text-gray-500">{t("categoryLabel")}</p>
                <p className="font-semibold capitalize">{vehicle.category}</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{vehicle.description}</p>
            {Object.keys(specifications).length > 0 ? (
              <div className="space-y-2 rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700">
                <p className="font-semibold">{t("specifications")}</p>
                {Object.entries(specifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between border-b border-gray-100 py-1 last:border-0 dark:border-gray-800">
                    <span className="text-gray-500">{key}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t("contactMethodsTitle")}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button asChild className="w-full">
                  <a href={ctaUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4" />
                    {t("contactWhatsapp")}
                  </a>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <a href={lineUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4" />
                    {t("contactLine")}
                  </a>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <a href={phoneUrl}>
                    <Phone className="h-4 w-4" />
                    {t("contactCall")}
                  </a>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <a href={emailUrl}>
                    <Mail className="h-4 w-4" />
                    {t("contactEmail")}
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
