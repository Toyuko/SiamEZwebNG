"use client";

import { Link, usePathname } from "@/i18n/navigation";
import Image from "next/image";
import { useState } from "react";
import { Menu, X, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { site } from "@/config/site";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useLocale } from "next-intl";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";

const LOCALES = [
  { code: "en" as const, label: "EN" },
  { code: "th" as const, label: "TH" },
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const locale = useLocale();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-header-border bg-header-bg shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:h-18">
        <Link
          href="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-90"
          onClick={() => setOpen(false)}
        >
          <Image
            src="/images/logo.png"
            alt={site.name}
            width={120}
            height={44}
            className="h-9 w-auto sm:h-10"
          />
          <span className="sr-only">{site.name}</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/"
            className="text-sm font-medium text-header-text-muted transition-colors hover:text-siam-blue"
          >
            {t("home")}
          </Link>
          <Link
            href="/services"
            className="text-sm font-medium text-header-text-muted transition-colors hover:text-siam-blue"
          >
            {t("services")}
          </Link>
          <Link
            href="/about"
            className="text-sm font-medium text-header-text-muted transition-colors hover:text-siam-blue"
          >
            {t("about")}
          </Link>
          <Link
            href="/gallery"
            className="text-sm font-medium text-header-text-muted transition-colors hover:text-siam-blue"
          >
            {t("gallery")}
          </Link>
          <Link
            href="/testimonials"
            className="text-sm font-medium text-header-text-muted transition-colors hover:text-siam-blue"
          >
            {t("testimonials")}
          </Link>
          <Link
            href="/contact"
            className="text-sm font-medium text-header-text-muted transition-colors hover:text-siam-blue"
          >
            {t("contact")}
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeSwitcher className="shrink-0" />
          <div className="relative flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            <Languages className="h-4 w-4 text-muted" aria-hidden />
            {LOCALES.map((loc) => (
              <Link
                key={loc.code}
                href={pathname}
                locale={loc.code}
                className={cn(
                  "rounded-md px-2 py-1 text-sm font-medium transition-colors",
                  locale === loc.code
                    ? "bg-background text-siam-blue shadow-sm dark:bg-gray-800"
                    : "text-foreground hover:text-siam-blue dark:text-gray-300 dark:hover:text-siam-yellow"
                )}
              >
                {loc.label}
              </Link>
            ))}
          </div>
          <Button asChild size="default" className="hidden sm:inline-flex">
            <Link href="/contact">{tCommon("getStarted")}</Link>
          </Button>
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={open}
            className="rounded-lg p-2 text-header-text-muted hover:bg-black/5 dark:hover:bg-white/10 md:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>
      {/* Mobile menu */}
      <div
        className={cn(
          "border-t border-header-border bg-header-bg md:hidden",
          open ? "block" : "hidden"
        )}
      >
        <nav className="container mx-auto flex flex-col gap-1 px-4 py-4">
          <Link
            href="/"
            className="rounded-lg px-3 py-2.5 text-sm font-medium text-header-text hover:bg-black/5 dark:hover:bg-white/10 hover:text-siam-blue"
            onClick={() => setOpen(false)}
          >
            {t("home")}
          </Link>
          <Link
            href="/services"
            className="rounded-lg px-3 py-2.5 text-sm font-medium text-header-text hover:bg-black/5 dark:hover:bg-white/10 hover:text-siam-blue"
            onClick={() => setOpen(false)}
          >
            {t("services")}
          </Link>
          <Link
            href="/about"
            className="rounded-lg px-3 py-2.5 text-sm font-medium text-header-text hover:bg-black/5 dark:hover:bg-white/10 hover:text-siam-blue"
            onClick={() => setOpen(false)}
          >
            {t("about")}
          </Link>
          <Link
            href="/gallery"
            className="rounded-lg px-3 py-2.5 text-sm font-medium text-header-text hover:bg-black/5 dark:hover:bg-white/10 hover:text-siam-blue"
            onClick={() => setOpen(false)}
          >
            {t("gallery")}
          </Link>
          <Link
            href="/testimonials"
            className="rounded-lg px-3 py-2.5 text-sm font-medium text-header-text hover:bg-black/5 dark:hover:bg-white/10 hover:text-siam-blue"
            onClick={() => setOpen(false)}
          >
            {t("testimonials")}
          </Link>
          <Link
            href="/contact"
            className="rounded-lg px-3 py-2.5 text-sm font-medium text-header-text hover:bg-black/5 dark:hover:bg-white/10 hover:text-siam-blue"
            onClick={() => setOpen(false)}
          >
            {t("contact")}
          </Link>
          <Link
            href="/contact"
            className="mt-2 rounded-lg bg-siam-blue px-3 py-2.5 text-center text-sm font-medium text-white hover:bg-siam-blue-light"
            onClick={() => setOpen(false)}
          >
            {tCommon("getStarted")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
