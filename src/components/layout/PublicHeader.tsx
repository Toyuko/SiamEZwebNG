"use client";

import { Link, usePathname } from "@/i18n/navigation";
import Image from "next/image";
import { useState } from "react";
import {
  Menu,
  X,
  Languages,
  ChevronDown,
  LogOut,
  LayoutDashboard,
  Briefcase,
  Calendar,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedSearchHeaderControl } from "@/components/search";
import { publicNav, site, type PublicNavLink } from "@/config/site";
import { softLaunch } from "@/config/soft-launch";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useLocale } from "next-intl";
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

function isNavActive(item: PublicNavLink, pathname: string): boolean {
  if (item.match === "prefix") {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
  return pathname === item.href;
}

function isGroupActive(items: PublicNavLink[], pathname: string): boolean {
  return items.some((item) => isNavActive(item, pathname));
}

function accountHome(role: SessionUser["role"] | undefined): string {
  if (role === "freelancer") return "/portal/freelancer";
  if (role === "company") return "/portal/company";
  return "/portal";
}

function visiblePublicNav() {
  return publicNav
    .map((entry) => {
      if (entry.type === "group") {
        const items = entry.items.filter((item) => {
          if (item.href === "/freelancers") {
            return !softLaunch.enabled || softLaunch.showFreelancers;
          }
          return true;
        });
        return { ...entry, items };
      }
      return entry;
    })
    .filter((entry) => entry.type === "link" || entry.items.length > 0);
}

export function PublicHeader({ user = null }: PublicHeaderProps) {
  const [open, setOpen] = useState(false);
  const [mobileGroups, setMobileGroups] = useState<Record<string, boolean>>({});
  const t = useTranslations("nav");
  const tHero = useTranslations("hero");
  const pathname = usePathname();
  const locale = useLocale();
  const accountHref = accountHome(user?.role);
  const secondaryHref =
    user?.role === "freelancer" ? "/portal/freelancer-profile" : "/portal/cases";
  const secondaryLabel = user?.role === "freelancer" ? t("publicProfile") : t("myCases");

  const toggleMobileGroup = (id: string, currentlyOpen: boolean) => {
    setMobileGroups((prev) => ({ ...prev, [id]: !currentlyOpen }));
  };

  const closeMenu = () => setOpen(false);
  const navEntries = visiblePublicNav();

  return (
    <header className="sticky top-0 z-50 w-full bg-siam-navy text-white shadow-soft">
      {/* Slim utility bar */}
      <div className="hidden border-b border-white/10 bg-[#041248] sm:block">
        <div className="container mx-auto flex h-9 items-center justify-between gap-4 px-4 text-xs text-white/75">
          <p className="truncate">{t("topTagline")}</p>
          <div className="flex shrink-0 items-center gap-4">
            <a
              href={site.lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-siam-yellow"
            >
              LINE {site.line}
            </a>
            <a href={`tel:${site.phoneDigits}`} className="hover:text-siam-yellow">
              {site.phone}
            </a>
            <a href={`mailto:${site.email}`} className="hidden hover:text-siam-yellow lg:inline">
              {site.email}
            </a>
          </div>
        </div>
      </div>

      <div className="container mx-auto flex h-16 items-center justify-between gap-3 px-4 lg:h-[4.25rem]">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-90"
          onClick={closeMenu}
        >
          <Image
            src="/images/logo.png"
            alt={site.name}
            width={120}
            height={44}
            priority
            className="h-9 w-auto brightness-0 invert sm:h-10"
          />
          <span className="sr-only">{site.name}</span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex">
          {navEntries.map((entry) => {
            if (entry.type === "link") {
              const active = isNavActive(entry, pathname);
              return (
                <Link
                  key={`${entry.labelKey}-${entry.href}`}
                  href={entry.href}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-premium",
                    active
                      ? "bg-white/15 text-siam-yellow"
                      : "text-white/85 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {t(entry.labelKey)}
                </Link>
              );
            }

            const groupActive = isGroupActive(entry.items, pathname);
            return (
              <DropdownMenu key={entry.id}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-premium",
                      groupActive
                        ? "bg-white/15 text-siam-yellow"
                        : "text-white/85 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    {t(entry.labelKey)}
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[200px]">
                  {entry.items.map((item) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "w-full",
                          isNavActive(item, pathname) && "bg-siam-blue/10 text-siam-blue"
                        )}
                      >
                        {t(item.labelKey)}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <UnifiedSearchHeaderControl className="shrink-0 !border-white/20 !bg-white/10 !text-white hover:!border-siam-yellow/50 hover:!text-siam-yellow" />

          <div className="relative hidden items-center gap-1 rounded-full border border-white/15 bg-white/10 p-1 sm:flex">
            <Languages className="ml-1 h-3.5 w-3.5 text-white/70" aria-hidden />
            {LOCALES.map((loc) => (
              <Link
                key={loc.code}
                href={pathname}
                locale={loc.code}
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold transition-colors",
                  locale === loc.code
                    ? "bg-siam-yellow text-siam-navy"
                    : "text-white/80 hover:text-white"
                )}
              >
                {loc.label}
              </Link>
            ))}
          </div>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="hidden sm:flex">
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-white hover:bg-white/25"
                  aria-label="User menu"
                >
                  {user.name?.[0]?.toUpperCase() ?? user.email[0].toUpperCase()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={accountHref} className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    {t("dashboard")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={secondaryHref} className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    {secondaryLabel}
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
            <Link
              href="/login"
              className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white hover:bg-white/10 sm:inline-flex"
              aria-label={t("login")}
            >
              <User className="h-4 w-4" />
            </Link>
          )}

          <Button asChild variant="primary" size="default" className="hidden sm:inline-flex">
            <Link href="/services">
              <Calendar className="h-4 w-4" aria-hidden />
              {tHero("primaryCta")}
            </Link>
          </Button>

          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={open}
            className="rounded-lg p-2 text-white hover:bg-white/10 lg:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          "border-t border-white/10 bg-siam-navy lg:hidden",
          open ? "block" : "hidden"
        )}
      >
        <nav className="container mx-auto flex flex-col gap-1 px-4 py-4">
          {navEntries.map((entry) => {
            if (entry.type === "link") {
              const active = isNavActive(entry, pathname);
              return (
                <Link
                  key={`${entry.labelKey}-${entry.href}-m`}
                  href={entry.href}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-sm font-medium",
                    active ? "bg-white/15 text-siam-yellow" : "text-white/90 hover:bg-white/10"
                  )}
                  onClick={closeMenu}
                >
                  {t(entry.labelKey)}
                </Link>
              );
            }

            const expanded =
              entry.id in mobileGroups
                ? Boolean(mobileGroups[entry.id])
                : isGroupActive(entry.items, pathname);
            return (
              <div key={entry.id} className="flex flex-col">
                <button
                  type="button"
                  aria-expanded={expanded}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium",
                    isGroupActive(entry.items, pathname)
                      ? "text-siam-yellow"
                      : "text-white/90 hover:bg-white/10"
                  )}
                  onClick={() => toggleMobileGroup(entry.id, expanded)}
                >
                  {t(entry.labelKey)}
                  <ChevronDown
                    className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
                  />
                </button>
                {expanded && (
                  <div className="ml-2 flex flex-col gap-0.5 border-l border-white/15 pl-2">
                    {entry.items.map((item) => {
                      const active = isNavActive(item, pathname);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "rounded-lg px-3 py-2 text-sm font-medium",
                            active
                              ? "bg-white/15 text-siam-yellow"
                              : "text-white/75 hover:bg-white/10 hover:text-white"
                          )}
                          onClick={closeMenu}
                        >
                          {t(item.labelKey)}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          <div className="mt-2 flex gap-2 px-1">
            {LOCALES.map((loc) => (
              <Link
                key={loc.code}
                href={pathname}
                locale={loc.code}
                className={cn(
                  "flex-1 rounded-lg py-2 text-center text-sm font-semibold",
                  locale === loc.code
                    ? "bg-siam-yellow text-siam-navy"
                    : "bg-white/10 text-white"
                )}
                onClick={closeMenu}
              >
                {loc.label}
              </Link>
            ))}
          </div>

          {user ? (
            <>
              <Link
                href={accountHref}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10"
                onClick={closeMenu}
              >
                {t("dashboard")}
              </Link>
              <Link
                href={secondaryHref}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10"
                onClick={closeMenu}
              >
                {secondaryLabel}
              </Link>
              <form action={logout} className="mt-1">
                <button
                  type="submit"
                  className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-white/90 hover:bg-white/10"
                >
                  {t("logout")}
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10"
              onClick={closeMenu}
            >
              {t("login")}
            </Link>
          )}

          <Link
            href="/services"
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-siam-md bg-siam-yellow px-3 py-3 text-center text-sm font-bold text-siam-navy hover:bg-siam-yellow-light"
            onClick={closeMenu}
          >
            <Calendar className="h-4 w-4" aria-hidden />
            {tHero("primaryCta")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
