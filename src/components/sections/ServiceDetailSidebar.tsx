"use client";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, Phone, MessageCircle, Star, HelpCircle, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { site } from "@/config/site";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface ServiceDetailSidebarProps {
  priceAmount: number | null;
  priceCurrency: string;
  processingTime?: string;
  visaDuration?: string;
  serviceSlug: string;
  rating?: number;
  reviewCount?: number;
  showBestValue?: boolean;
}

export function ServiceDetailSidebar({
  priceAmount,
  priceCurrency,
  processingTime,
  visaDuration,
  serviceSlug,
  rating = 4.9,
  reviewCount = 150,
  showBestValue = false,
}: ServiceDetailSidebarProps) {
  const t = useTranslations("services");
  const whatsappUrl = `https://wa.me/${site.phone.replace(/\D/g, "")}`;

  return (
    <div className="space-y-6 lg:sticky lg:top-24">
      {/* Pricing Card */}
      <Card className="relative overflow-hidden border-0 bg-white shadow-lg dark:bg-gray-800">
        {showBestValue && (
          <div className="absolute right-0 top-0 z-10">
            <span className="inline-block bg-blue-100 px-3 py-1 text-xs font-semibold uppercase text-siam-blue dark:bg-siam-blue/20 dark:text-blue-300">
              {t("bestValue")}
            </span>
          </div>
        )}
        {/* Blue Header Section */}
        <div className="bg-siam-blue px-6 py-6 text-white">
          <p className="text-xs font-medium uppercase tracking-wider opacity-90">
            {t("startingFrom")}
          </p>
          {priceAmount != null ? (
            <p className="mt-2 text-5xl font-bold">{formatCurrency(priceAmount, priceCurrency)}</p>
          ) : (
            <p className="mt-2 text-3xl font-bold">Quote-based</p>
          )}
        </div>

        {/* White Content Section */}
        <CardContent className="p-6">
          {processingTime && (
            <div className="space-y-4 border-b border-gray-200 pb-4 text-sm dark:border-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">{t("processingTime")}</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{processingTime}</span>
              </div>
              {visaDuration && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t("visaDuration")}</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{visaDuration}</span>
                </div>
              )}
            </div>
          )}
          <Button
            asChild
            className="mt-6 w-full bg-siam-blue text-white hover:bg-siam-blue-light"
            size="lg"
          >
            <Link href={`/booking/${serviceSlug}`}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              {t("bookThisService")}
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="mt-3 w-full border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            size="lg"
          >
            <Link href="/contact">{t("requestCustomQuote")}</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Rating/Trust Card */}
      <Card className="border-0 bg-white shadow-md dark:bg-gray-800">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <Star className="h-5 w-5 fill-siam-yellow text-siam-yellow" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {rating.toFixed(1)} / 5.0
              </span>
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-4 w-4",
                      i < Math.floor(rating)
                        ? "fill-siam-yellow text-siam-yellow"
                        : i < rating
                          ? "fill-siam-yellow/50 text-siam-yellow/50"
                          : "text-gray-300 dark:text-gray-600"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t("basedOnReviews", { count: reviewCount })}
          </p>
          <div className="mt-4 flex items-start gap-3 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Expert Consultation
              </p>
              <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                Free initial 15-min call
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Need Help Card */}
      <Card className="border-0 bg-gray-900 text-white shadow-lg dark:bg-gray-800">
        <CardContent className="relative p-6">
          <div className="absolute right-4 top-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 dark:bg-gray-700">
              <HelpCircle className="h-5 w-5 text-white/80" />
            </div>
          </div>
          <h3 className="mb-2 text-lg font-semibold">{t("needHelp")}</h3>
          <p className="mb-6 text-sm text-white/80">
            Our visa experts are ready to answer your questions.
          </p>
          <div className="space-y-3">
            <a
              href={`tel:${site.phone.replace(/\s/g, "")}`}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-800 px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              <Phone className="h-4 w-4" />
              {site.phone}
            </a>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-800 px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              <MessageCircle className="h-4 w-4" />
              {t("chatOnWhatsApp")}
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
