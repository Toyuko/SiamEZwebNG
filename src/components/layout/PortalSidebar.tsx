"use client";

import Image from "next/image";
import { Link, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  Settings,
  CreditCard,
  Car,
  Briefcase,
  Building2,
  Home,
  Megaphone,
  UserRound,
  Bookmark,
  Flag,
  Workflow,
  Inbox,
  Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { LanguageSwitcher } from "@/components/portal/LanguageSwitcher";
import { AskSiamEzSidebarCard } from "@/components/portal/AskSiamEzSidebarCard";
import { softLaunch } from "@/config/soft-launch";

type NavItem = {
  labelKey: string;
  href: string;
  icon: typeof LayoutDashboard;
};

type NavGroup = {
  sectionKey?: string;
  items: NavItem[];
};

const fullClientGroups: NavGroup[] = [
  {
    sectionKey: "navSections.overview",
    items: [{ labelKey: "dashboard", href: "/portal", icon: LayoutDashboard }],
  },
  {
    sectionKey: "navSections.services",
    items: [
      { labelKey: "myCases", href: "/portal/cases", icon: FolderOpen },
      { labelKey: "invoices", href: "/portal/invoices", icon: CreditCard },
      { labelKey: "documents", href: "/portal/documents", icon: FileText },
    ],
  },
  {
    sectionKey: "navSections.marketplace",
    items: [
      { labelKey: "mySales", href: "/portal/sales", icon: Car },
      { labelKey: "myRealEstate", href: "/portal/real-estate", icon: Home },
      { labelKey: "listingEnquiries", href: "/portal/enquiries", icon: Inbox },
      { labelKey: "savedListings", href: "/portal/saved", icon: Bookmark },
      { labelKey: "goalsLifeEvents", href: "/portal/goals", icon: Flag },
      { labelKey: "workflows", href: "/portal/workflows", icon: Workflow },
    ],
  },
  {
    sectionKey: "navSections.account",
    items: [
      { labelKey: "publicProfile", href: "/portal/freelancer-profile", icon: UserRound },
      { labelKey: "settings", href: "/portal/profile", icon: Settings },
    ],
  },
];

const softLaunchClientGroups: NavGroup[] = [
  {
    sectionKey: "navSections.overview",
    items: [{ labelKey: "dashboard", href: "/portal", icon: LayoutDashboard }],
  },
  {
    sectionKey: "navSections.services",
    items: [
      { labelKey: "myCases", href: "/portal/cases", icon: FolderOpen },
      { labelKey: "invoices", href: "/portal/invoices", icon: CreditCard },
      { labelKey: "documents", href: "/portal/documents", icon: FileText },
    ],
  },
  {
    sectionKey: "navSections.marketplace",
    items: [
      ...(softLaunch.showSellerListings
        ? [
            { labelKey: "mySales", href: "/portal/sales", icon: Car },
            { labelKey: "myRealEstate", href: "/portal/real-estate", icon: Home },
          ]
        : []),
      { labelKey: "browseCars", href: "/sales", icon: Car },
      { labelKey: "browseRealEstate", href: "/real-estate", icon: Home },
    ],
  },
  {
    sectionKey: "navSections.account",
    items: [
      { labelKey: "publicProfile", href: "/portal/freelancer-profile", icon: UserRound },
      { labelKey: "settings", href: "/portal/profile", icon: Settings },
    ],
  },
];

const clientGroups =
  softLaunch.enabled && !softLaunch.showLifeEvents && !softLaunch.showWorkflows
    ? softLaunchClientGroups
    : fullClientGroups;

const freelancerGroups: NavGroup[] = [
  {
    items: [
      { labelKey: "freelancerDashboard", href: "/portal/freelancer", icon: Briefcase },
      { labelKey: "officeDirectory", href: "/directory", icon: Landmark },
      { labelKey: "publicProfile", href: "/portal/freelancer-profile", icon: UserRound },
      { labelKey: "settings", href: "/portal/profile", icon: Settings },
    ],
  },
];

const companyGroups: NavGroup[] = [
  {
    items: [
      { labelKey: "companyDashboard", href: "/portal/company", icon: Building2 },
      { labelKey: "companyJobs", href: "/portal/company?tab=jobs", icon: Briefcase },
      { labelKey: "companyAds", href: "/portal/company?tab=ads", icon: Megaphone },
      { labelKey: "settings", href: "/portal/profile", icon: Settings },
    ],
  },
];

function isItemActive(
  item: NavItem,
  pathname: string,
  currentTab: string | null,
  isCompany: boolean
) {
  const hrefPath = item.href.split("?")[0] ?? item.href;
  const hrefTab = item.href.includes("tab=")
    ? new URLSearchParams(item.href.split("?")[1]).get("tab")
    : null;

  if (isCompany && hrefPath === "/portal/company") {
    if (hrefTab) {
      return pathname === "/portal/company" && currentTab === hrefTab;
    }
    return pathname === "/portal/company" && (!currentTab || currentTab === "overview");
  }

  return (
    pathname === hrefPath || (hrefPath !== "/portal" && pathname.startsWith(hrefPath))
  );
}

export function PortalSidebar({
  isFreelancer = false,
  isCompany = false,
  showDirectory = false,
  showAskSiamEz = true,
}: {
  isFreelancer?: boolean;
  isCompany?: boolean;
  showDirectory?: boolean;
  showAskSiamEz?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("portal");
  const baseGroups = isCompany
    ? companyGroups
    : isFreelancer
      ? freelancerGroups
      : clientGroups;
  const groups = baseGroups.map((group) => ({
    ...group,
    items: showDirectory
      ? group.items
      : group.items.filter((item) => item.href !== "/directory"),
  }));
  const currentTab = searchParams.get("tab");

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-siam-navy text-white">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <Image
          src="/images/logo.png"
          alt="SiamEZ"
          width={36}
          height={36}
          className="h-9 w-9 rounded-lg object-contain"
          priority
        />
        <span className="text-lg font-bold tracking-tight">SiamEZ</span>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {groups.map((group, groupIndex) => (
          <div key={group.sectionKey ?? `group-${groupIndex}`}>
            {group.sectionKey ? (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/45">
                {t(group.sectionKey)}
              </p>
            ) : null}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isItemActive(item, pathname, currentTab, isCompany);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-siam-blue text-white shadow-soft"
                        : "text-white/85 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" aria-hidden />
                    <span className="truncate">{t(item.labelKey)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        {showAskSiamEz && !isFreelancer && !isCompany ? (
          <AskSiamEzSidebarCard
            title={t("sidebarAsk.title")}
            subtitle={t("sidebarAsk.subtitle")}
          />
        ) : null}
        <div className="flex flex-col gap-2">
          <ThemeSwitcher className="w-full" variant="sidebar" />
          <LanguageSwitcher className="w-full" variant="sidebar" />
        </div>
      </div>
    </aside>
  );
}
