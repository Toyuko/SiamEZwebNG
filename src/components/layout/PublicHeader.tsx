"use client";

import { Link, usePathname } from "@/i18n/navigation";
import Image from "next/image";
import { useState } from "react";
import { Menu, X, Languages, ChevronDown, LogOut, LayoutDashboard, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { site } from "@/config/site";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useLocale } from "next-intl";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/actions/auth";
import type { SessionUser } from "@/lib/auth";

interface PublicHeaderProps {
  user?: SessionUser | null;
}

const LOCALES = [
  { code: "en" as const, label: "EN" },
  { code: "th" as const, label: "TH" },
];

export function PublicHeader({ user = null }: PublicHeaderProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const locale = useLocale();
  const getStartedHref = user ? "/portal" : "/register";

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
            className={cn(
              "text-sm font-medium transition-colors hover:text-siam-blue",
              pathname === "/" ? "text-siam-blue" : "text-header-text-muted"
            )}
          >
            {t("home")}
          </Link>
          <Link
            href="/services"
            className={cn(
              "text-sm font-medium transition-colors hover:text-siam-blue",
              pathname === "/services" ? "text-siam-blue" : "text-header-text-muted"
            )}
          >
            {t("services")}
          </Link>
          <Link
            href="/about"
            className={cn(
              "text-sm font-medium transition-colors hover:text-siam-blue",
              pathname === "/about" ? "text-siam-blue" : "text-header-text-muted"
            )}
          >
            {t("about")}
          </Link>
          <Link
            href="/gallery"
            className={cn(
              "text-sm font-medium transition-colors hover:text-siam-blue",
              pathname === "/gallery" ? "text-siam-blue" : "text-header-text-muted"
            )}
          >
            {t("gallery")}
          </Link>
          <Link
            href="/testimonials"
            className={cn(
              "text-sm font-medium transition-colors hover:text-siam-blue",
              pathname === "/testimonials" ? "text-siam-blue" : "text-header-text-muted"
            )}
          >
            {t("testimonials")}
          </Link>
          <Link
            href="/contact"
            className={cn(
              "text-sm font-medium transition-colors hover:text-siam-blue",
              pathname === "/contact" ? "text-siam-blue" : "text-header-text-muted"
            )}
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
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                asChild
                className="hidden sm:flex"
              >
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-header-text hover:bg-black/5 dark:hover:bg-gray-800"
                  aria-label="User menu"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-siam-blue text-sm font-semibold text-white">
                    {user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
                  </span>
                  <span className="max-w-[100px] truncate hidden md:inline">{user.name ?? user.email}</span>
                  <ChevronDown className="h-4 w-4 shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/portal" className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    {t("dashboard")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/portal/cases" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    {t("myCases")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <form action={logout} className="flex w-full items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    <button type="submit" className="flex-1 text-left">
                      {t("logout")}
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-1 sm:flex">
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-header-text-muted transition-colors hover:text-siam-blue hover:bg-black/5 dark:hover:bg-gray-800"
              >
                {t("login")}
              </Link>
              <Link
                href="/register"
                className="rounded-lg px-3 py-2 text-sm font-medium text-header-text-muted transition-colors hover:text-siam-blue hover:bg-black/5 dark:hover:bg-gray-800"
              >
                {t("signUp")}
              </Link>
            </div>
          )}
          <Button asChild size="default" className="hidden sm:inline-flex">
            <Link href={getStartedHref}>{tCommon("getStarted")}</Link>
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
            className={cn(
              "rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10",
              pathname === "/" ? "text-siam-blue bg-black/5 dark:bg-white/10" : "text-header-text hover:text-siam-blue"
            )}
            onClick={() => setOpen(false)}
          >
            {t("home")}
          </Link>
          <Link
            href="/services"
            className={cn(
              "rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10",
              pathname === "/services" ? "text-siam-blue bg-black/5 dark:bg-white/10" : "text-header-text hover:text-siam-blue"
            )}
            onClick={() => setOpen(false)}
          >
            {t("services")}
          </Link>
          <Link
            href="/about"
            className={cn(
              "rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10",
              pathname === "/about" ? "text-siam-blue bg-black/5 dark:bg-white/10" : "text-header-text hover:text-siam-blue"
            )}
            onClick={() => setOpen(false)}
          >
            {t("about")}
          </Link>
          <Link
            href="/gallery"
            className={cn(
              "rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10",
              pathname === "/gallery" ? "text-siam-blue bg-black/5 dark:bg-white/10" : "text-header-text hover:text-siam-blue"
            )}
            onClick={() => setOpen(false)}
          >
            {t("gallery")}
          </Link>
          <Link
            href="/testimonials"
            className={cn(
              "rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10",
              pathname === "/testimonials" ? "text-siam-blue bg-black/5 dark:bg-white/10" : "text-header-text hover:text-siam-blue"
            )}
            onClick={() => setOpen(false)}
          >
            {t("testimonials")}
          </Link>
          <Link
            href="/contact"
            className={cn(
              "rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10",
              pathname === "/contact" ? "text-siam-blue bg-black/5 dark:bg-white/10" : "text-header-text hover:text-siam-blue"
            )}
            onClick={() => setOpen(false)}
          >
            {t("contact")}
          </Link>
          {user ? (
            <>
              <Link
                href="/portal"
                className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10 text-header-text hover:text-siam-blue"
                onClick={() => setOpen(false)}
              >
                {t("dashboard")}
              </Link>
              <Link
                href="/portal/cases"
                className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10 text-header-text hover:text-siam-blue"
                onClick={() => setOpen(false)}
              >
                {t("myCases")}
              </Link>
              <form action={logout} className="mt-1">
                <button
                  type="submit"
                  className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-header-text hover:bg-black/5 dark:hover:bg-white/10 hover:text-siam-blue"
                >
                  {t("logout")}
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10 text-header-text hover:text-siam-blue"
                onClick={() => setOpen(false)}
              >
                {t("login")}
              </Link>
              <Link
                href="/register"
                className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10 text-header-text hover:text-siam-blue"
                onClick={() => setOpen(false)}
              >
                {t("signUp")}
              </Link>
            </>
          )}
          <Link
            href={getStartedHref}
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
