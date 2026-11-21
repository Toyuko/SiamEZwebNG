"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./UserMenu";
import { useTranslations } from "next-intl";

interface PortalTopBarProps {
  userName?: string;
  userRole?: string;
  userAvatar?: string;
}

function pageTitleKey(pathname: string): string {
  if (pathname === "/portal") return "dashboard";
  if (pathname.startsWith("/portal/cases")) return "myCases";
  if (pathname.startsWith("/portal/invoices")) return "invoices";
  if (pathname.startsWith("/portal/documents")) return "documents";
  if (pathname.startsWith("/portal/sales")) return "mySales";
  if (pathname.startsWith("/portal/real-estate")) return "myRealEstate";
  if (pathname.startsWith("/portal/profile")) return "settings";
  if (pathname.startsWith("/portal/freelancer-profile")) return "publicProfile";
  if (pathname.startsWith("/portal/notifications")) return "notifications";
  if (pathname.startsWith("/portal/enquiries")) return "listingEnquiries";
  if (pathname.startsWith("/portal/saved")) return "savedListings";
  if (pathname.startsWith("/portal/goals")) return "goalsLifeEvents";
  if (pathname.startsWith("/portal/workflows")) return "workflows";
  if (pathname.startsWith("/portal/freelancer")) return "freelancerDashboard";
  if (pathname.startsWith("/portal/company")) return "companyDashboard";
  return "portalName";
}

export function PortalTopBar({
  userName = "Alex Thompson",
  userRole = "Client Account",
  userAvatar,
}: PortalTopBarProps) {
  const t = useTranslations("portal");
  const pathname = usePathname();
  const title = t(pageTitleKey(pathname));

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-[#DCE6F5] bg-white/95 px-4 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-siam-ink dark:text-white sm:text-base">
          {title}
        </p>
      </div>

      <div className="mx-auto flex items-center">
        <Button
          asChild
          variant="primary"
          size="default"
          className="gap-2 font-semibold shadow-soft"
        >
          <Link href="/services">
            <Plus className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">{t("bookNewService")}</span>
            <span className="sm:hidden">{t("bookAService")}</span>
          </Link>
        </Button>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Button asChild variant="ghost" size="icon" className="relative">
          <Link href="/portal/notifications" aria-label={t("notifications")}>
            <Bell className="h-5 w-5" />
          </Link>
        </Button>
        <UserMenu userName={userName} userRole={userRole} userAvatar={userAvatar} />
      </div>
    </header>
  );
}
