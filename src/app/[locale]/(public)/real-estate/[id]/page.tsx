import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicSalesPropertyById } from "@/data-access/real-estate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { site } from "@/config/site";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { SalesVehicleImageGallery } from "@/components/sales/SalesVehicleImageGallery";
import { SalesListingExportActions } from "@/components/sales/SalesListingExportActions";

export const dynamic = "force-dynamic";

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(
    amount
  );
}

function buildWhatsAppUrl(message: string) {
  const phone = site.phone.replace(/\D/g, "");
  return `https://api.whatsapp.com/send/?phone=${phone}&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`;
}

function formatDescription(description: string) {
  return description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getVideoEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (host === "youtu.be") {
      const videoId = parsed.pathname.replace("/", "");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (host.includes("vimeo.com")) {
      const match = parsed.pathname.match(/\/(\d+)/);
      return match?.[1] ? `https://player.vimeo.com/video/${match[1]}` : null;
    }
  } catch {
    return null;
  }

  return null;
}

export default async function RealEstateDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("realEstate");

  const property = await getPublicSalesPropertyById(id);
  if (!property) {
    notFound();
  }

  const boostActive = Boolean(
    property.isBoosted && property.boostExpiresAt && property.boostExpiresAt > new Date()
  );
  const sellerKind = property.sellerKind === "dealer" ? "dealer" : "private";
  const location = [property.neighborhood, property.district, property.province]
    .filter(Boolean)
    .join(", ");

  const images = Array.from(
    new Set([
      property.heroImageUrl,
      ...(Array.isArray(property.imageUrls)
        ? property.imageUrls.filter((url): url is string => typeof url === "string")
        : []),
    ])
  );

  const ctaUrl = buildWhatsAppUrl(
    `Hi SiamEZ, I am interested in ${property.title} (${property.id}). Please share details.`
  );
  const lineUrl = site.lineUrl;
  const phoneUrl = `tel:${site.phone.replace(/\s/g, "")}`;
  const emailUrl = `mailto:${site.email}?subject=${encodeURIComponent(
    `Inquiry: ${property.title}`
  )}&body=${encodeURIComponent(
    `Hi SiamEZ,%0D%0A%0D%0AI am interested in ${property.title} (${property.id}). Please share details.`
  )}`;
  const specifications =
    property.specifications && typeof property.specifications === "object"
      ? (property.specifications as Record<string, string>)
      : {};
  const descriptionLines = formatDescription(property.description);
  const videoUrls = Array.isArray(property.videoUrls)
    ? property.videoUrls.filter((url): url is string => typeof url === "string")
    : [];
  const heroMediaType = property.heroMediaType === "video" ? "video" : "image";
  const heroVideoUrl =
    heroMediaType === "video" && typeof property.heroVideoUrl === "string"
      ? property.heroVideoUrl
      : null;
  const heroEmbedUrl = heroVideoUrl ? getVideoEmbedUrl(heroVideoUrl) : null;
  const heroIsDirectVideo = heroVideoUrl
    ? /\.(mp4|webm|ogg)(\?.*)?$/i.test(heroVideoUrl)
    : false;

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <Link href="/real-estate" className="text-sm font-medium text-siam-blue hover:underline">
        {t("backToInventory")}
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {heroMediaType === "video" && heroVideoUrl ? (
            heroEmbedUrl ? (
              <div className="relative aspect-video overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                <iframe
                  src={heroEmbedUrl}
                  title={`${property.title} hero video`}
                  className="h-full w-full"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            ) : heroIsDirectVideo ? (
              <video
                controls
                preload="metadata"
                className="w-full rounded-xl border border-gray-200 bg-black dark:border-gray-700"
              >
                <source src={heroVideoUrl} />
              </video>
            ) : (
              <a
                href={heroVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-dashed border-gray-300 p-3 text-sm text-siam-blue hover:underline dark:border-gray-700"
              >
                {heroVideoUrl}
              </a>
            )
          ) : null}
          <SalesVehicleImageGallery
            images={images}
            title={property.title}
            showPrimary={heroMediaType !== "video"}
          />
          {videoUrls.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t("videos")}</p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {videoUrls.map((videoUrl) => {
                  const embedUrl = getVideoEmbedUrl(videoUrl);
                  const isDirectVideo = /\.(mp4|webm|ogg)(\?.*)?$/i.test(videoUrl);

                  if (embedUrl) {
                    return (
                      <div
                        key={videoUrl}
                        className="relative aspect-video overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <iframe
                          src={embedUrl}
                          title={`${property.title} video`}
                          className="h-full w-full"
                          loading="lazy"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      </div>
                    );
                  }

                  if (isDirectVideo) {
                    return (
                      <video
                        key={videoUrl}
                        controls
                        preload="metadata"
                        className="w-full rounded-lg border border-gray-200 bg-black dark:border-gray-700"
                      >
                        <source src={videoUrl} />
                      </video>
                    );
                  }

                  return (
                    <a
                      key={videoUrl}
                      href={videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-dashed border-gray-300 p-3 text-sm text-siam-blue hover:underline dark:border-gray-700"
                    >
                      {videoUrl}
                    </a>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <Card className="h-fit">
          <CardContent className="space-y-4 p-6">
            {boostActive ? (
              <span className="inline-block rounded-md bg-yellow-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-900">
                {t("featuredBadge")}
              </span>
            ) : null}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{property.title}</h1>
            <div className="flex flex-wrap gap-2">
              <span className="inline-block rounded-full bg-siam-blue/15 px-3 py-1 text-xs font-semibold text-siam-blue dark:bg-siam-blue/25 dark:text-siam-blue-light">
                {t(`listingType.${property.listingType}`)}
              </span>
              <span className="inline-block rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-100">
                {t(`propertyType.${property.propertyType}`)}
              </span>
              <span
                className={
                  sellerKind === "dealer"
                    ? "inline-block rounded-full bg-siam-blue/15 px-3 py-1 text-xs font-semibold text-siam-blue dark:bg-siam-blue/25 dark:text-siam-blue-light"
                    : "inline-block rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-100"
                }
              >
                {sellerKind === "dealer"
                  ? t("sellerKind.dealerBadge")
                  : t("sellerKind.privateBadge")}
              </span>
            </div>
            <p className="text-3xl font-bold text-siam-blue dark:text-siam-blue-light">
              {property.priceAmount <= 0
                ? t("priceContactSeller")
                : formatPrice(property.priceAmount, property.priceCurrency)}
              {property.listingType === "rent" && property.priceAmount > 0 ? (
                <span className="text-base font-medium text-gray-500"> {t("perMonth")}</span>
              ) : null}
            </p>
            {location ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">{location}</p>
            ) : null}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <p className="text-gray-500">{t("bedsLabel")}</p>
                <p className="font-semibold">
                  {property.bedrooms != null ? property.bedrooms : t("bedsNa")}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <p className="text-gray-500">{t("bathsLabel")}</p>
                <p className="font-semibold">
                  {property.bathrooms != null ? property.bathrooms : t("bathsNa")}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <p className="text-gray-500">{t("areaLabel")}</p>
                <p className="font-semibold">{property.areaSqm.toLocaleString()} m²</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <p className="text-gray-500">{t("furnishedLabel")}</p>
                <p className="font-semibold">{t(`furnished.${property.furnished}`)}</p>
              </div>
              {property.floor != null ? (
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                  <p className="text-gray-500">{t("floorLabel")}</p>
                  <p className="font-semibold">{property.floor}</p>
                </div>
              ) : null}
              {property.yearBuilt != null ? (
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                  <p className="text-gray-500">{t("yearBuiltLabel")}</p>
                  <p className="font-semibold">{property.yearBuilt}</p>
                </div>
              ) : null}
              {property.landAreaSqm != null ? (
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                  <p className="text-gray-500">{t("landAreaLabel")}</p>
                  <p className="font-semibold">{property.landAreaSqm.toLocaleString()} m²</p>
                </div>
              ) : null}
            </div>
            <div className="space-y-2 rounded-lg bg-gray-50 p-3 text-sm leading-relaxed text-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
              {descriptionLines.length > 0 ? (
                descriptionLines.map((line, index) => (
                  <p key={`${line}-${index}`} className="break-words">
                    {line}
                  </p>
                ))
              ) : (
                <p className="break-words">{property.description}</p>
              )}
            </div>
            <SalesListingExportActions
              listing={{
                title: property.title,
                heroImageUrl: property.heroImageUrl,
                imageUrls: property.imageUrls,
                description: property.description,
              }}
              translationNamespace="realEstate"
              variant="labeled"
            />
            {Object.keys(specifications).length > 0 ? (
              <div className="space-y-2 rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700">
                <p className="font-semibold">{t("specifications")}</p>
                {Object.entries(specifications).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between border-b border-gray-100 py-1 last:border-0 dark:border-gray-800"
                  >
                    <span className="text-gray-500">{key}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t("contactMethodsTitle")}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  asChild
                  className="w-full bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-600"
                >
                  <a href={ctaUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4" />
                    {t("contactWhatsapp")}
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-emerald-400 text-emerald-400 hover:bg-emerald-500/10 focus-visible:ring-emerald-500"
                >
                  <a href={lineUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4" />
                    {t("contactLine")}
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-sky-400 text-sky-400 hover:bg-sky-500/10 focus-visible:ring-sky-500"
                >
                  <a href={phoneUrl}>
                    <Phone className="h-4 w-4" />
                    {t("contactCall")}
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-amber-400 text-amber-400 hover:bg-amber-500/10 focus-visible:ring-amber-500"
                >
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
