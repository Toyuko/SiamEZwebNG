import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicSalesVehicleById } from "@/data-access/sales";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { site } from "@/config/site";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { SalesVehicleImageGallery } from "@/components/sales/SalesVehicleImageGallery";

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
  const descriptionLines = formatDescription(vehicle.description);
  const videoUrls = Array.isArray(vehicle.videoUrls)
    ? vehicle.videoUrls.filter((url): url is string => typeof url === "string")
    : [];
  const heroMediaType = vehicle.heroMediaType === "video" ? "video" : "image";
  const heroVideoUrl =
    heroMediaType === "video" && typeof vehicle.heroVideoUrl === "string" ? vehicle.heroVideoUrl : null;
  const heroEmbedUrl = heroVideoUrl ? getVideoEmbedUrl(heroVideoUrl) : null;
  const heroIsDirectVideo = heroVideoUrl ? /\.(mp4|webm|ogg)(\?.*)?$/i.test(heroVideoUrl) : false;

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <Link href="/sales" className="text-sm font-medium text-siam-blue hover:underline">
        {t("backToInventory")}
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {heroMediaType === "video" && heroVideoUrl ? (
            heroEmbedUrl ? (
              <div className="relative aspect-video overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                <iframe
                  src={heroEmbedUrl}
                  title={`${vehicle.make} ${vehicle.model} hero video`}
                  className="h-full w-full"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            ) : heroIsDirectVideo ? (
              <video controls preload="metadata" className="w-full rounded-xl border border-gray-200 bg-black dark:border-gray-700">
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
            title={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
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
                      <div key={videoUrl} className="relative aspect-video overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                        <iframe
                          src={embedUrl}
                          title={`${vehicle.make} ${vehicle.model} video`}
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
            <div className="space-y-2 rounded-lg bg-gray-50 p-3 text-sm leading-relaxed text-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
              {descriptionLines.length > 0 ? (
                descriptionLines.map((line, index) => (
                  <p key={`${line}-${index}`} className="break-words">
                    {line}
                  </p>
                ))
              ) : (
                <p className="break-words">{vehicle.description}</p>
              )}
            </div>
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
