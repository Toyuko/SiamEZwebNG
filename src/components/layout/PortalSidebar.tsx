"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  Settings,
  CreditCard,
  Moon,
  Car,
  Briefcase,
  Building2,
  Home,
  Megaphone,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { LanguageSwitcher } from "@/components/portal/LanguageSwitcher";

const clientNav = [
  { labelKey: "dashboard", href: "/portal", icon: LayoutDashboard },
  { labelKey: "myCases", href: "/portal/cases", icon: FolderOpen },
  { labelKey: "mySales", href: "/portal/sales", icon: Car },
  { labelKey: "myRealEstate", href: "/portal/real-estate", icon: Home },
  { labelKey: "invoices", href: "/portal/invoices", icon: CreditCard },
  { labelKey: "documents", href: "/portal/documents", icon: FileText },
  { labelKey: "publicProfile", href: "/portal/freelancer-profile", icon: UserRound },
  { labelKey: "settings", href: "/portal/profile", icon: Settings },
];

const freelancerNav = [
  { labelKey: "freelancerDashboard", href: "/portal/freelancer", icon: Briefcase },
  { labelKey: "publicProfile", href: "/portal/freelancer-profile", icon: UserRound },
  { labelKey: "settings", href: "/portal/profile", icon: Settings },
];

const companyNav = [
  { labelKey: "companyDashboard", href: "/portal/company", icon: Building2 },
  { labelKey: "companyJobs", href: "/portal/company?tab=jobs", icon: Briefcase },
  { labelKey: "companyAds", href: "/portal/company?tab=ads", icon: Megaphone },
  { labelKey: "settings", href: "/portal/profile", icon: Settings },
];

export function PortalSidebar({
  isFreelancer = false,
  isCompany = false,
}: {
  isFreelancer?: boolean;
  isCompany?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("portal");
  const nav = isCompany ? companyNav : isFreelancer ? freelancerNav : clientNav;
  const currentTab = searchParams.get("tab");

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-[#21438F] dark:bg-[#1a3569]">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-blue-600/30 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
          <span className="text-xl font-bold text-white">SZ</span>
        </div>
        <span className="text-lg font-bold text-white">SiamEZ</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-4 py-4">
        {nav.map((item) => {
          const hrefPath = item.href.split("?")[0] ?? item.href;
          const hrefTab = item.href.includes("tab=")
            ? new URLSearchParams(item.href.split("?")[1]).get("tab")
            : null;
          let isActive = false;
          if (isCompany && hrefPath === "/portal/company") {
            if (hrefTab) {
              isActive = pathname === "/portal/company" && currentTab === hrefTab;
            } else {
              isActive =
                pathname === "/portal/company" &&
                (!currentTab || currentTab === "overview");
            }
          } else {
            isActive =
              pathname === hrefPath ||
              (hrefPath !== "/portal" && pathname.startsWith(hrefPath));
          }
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white transition-colors",
                isActive
                  ? "bg-[#3468E8] text-white"
                  : "text-white/90 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Theme Toggle */}
      <div className="border-t border-blue-600/30 px-4 py-4">
        <div className="mb-3 flex items-center gap-2 text-sm text-white/80">
          <Moon className="h-4 w-4" />
          <span>{t("switchTheme")}</span>
        </div>
        <div className="mb-4 flex flex-col gap-2">
          <ThemeSwitcher className="w-full" variant="sidebar" />
          <LanguageSwitcher className="w-full" variant="sidebar" />
        </div>
      </div>
    </aside>
  );
}
