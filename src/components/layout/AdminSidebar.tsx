"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Link, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Calendar,
  BarChart3,
  Settings,
  Package,
  FileText,
  CreditCard,
  FileStack,
  UserCog,
  Briefcase,
  Car,
  UserCheck,
  ClipboardList,
  Building2,
  Home,
  Megaphone,
  ChevronDown,
  Route,
  Workflow,
  Sparkles,
  ListChecks,
  Activity,
  Flag,
  Bell,
  Wallet,
  Banknote,
  Landmark,
  ShieldCheck,
  Printer,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { softLaunch } from "@/config/soft-launch";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type NavGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
};

const topNav: NavItem[] = [
  { label: "dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "aiAssistant", href: "/admin/assistant", icon: Sparkles },
];

const allNavGroups: NavGroup[] = [
  {
    id: "operations",
    label: "groupOperations",
    icon: Briefcase,
    items: [
      { label: "cases", href: "/admin/cases", icon: FolderOpen },
      { label: "serviceJobs", href: "/admin/service-jobs", icon: Briefcase },
      { label: "jobList", href: "/admin/jobs", icon: ClipboardList },
      { label: "calendar", href: "/admin/calendar", icon: Calendar },
      { label: "followUps", href: "/admin/followups", icon: Bell },
      { label: "driverLicenseFollowups", href: "/admin/driver-license-followups", icon: ClipboardList },
      { label: "licenceVerification", href: "/admin/licence-verification", icon: ShieldCheck },
      { label: "licenceUploadReport", href: "/admin/licence-verification/sales", icon: BarChart3 },
      { label: "dltCentre", href: "/admin/dlt-centre", icon: Printer },
      { label: "workQueue", href: "/admin/work-queue", icon: ListChecks },
      { label: "vehicleLeads", href: "/admin/vehicle-leads", icon: Car },
      { label: "officeDirectory", href: "/directory", icon: Landmark },
    ],
  },
  {
    id: "people",
    label: "groupPeople",
    icon: Users,
    items: softLaunch.enabled && !softLaunch.showFreelancerOps
      ? [
          { label: "clients", href: "/admin/clients", icon: Users },
          { label: "staff", href: "/admin/staff", icon: UserCog },
          { label: "accountDeletionRequests", href: "/admin/account-deletion-requests", icon: UserCog },
        ]
      : [
          { label: "clients", href: "/admin/clients", icon: Users },
          { label: "freelancers", href: "/admin/freelancers", icon: UserCheck },
          { label: "freelancerJobs", href: "/admin/service-jobs?source=freelancer", icon: ClipboardList },
          { label: "staff", href: "/admin/staff", icon: UserCog },
          { label: "accountDeletionRequests", href: "/admin/account-deletion-requests", icon: UserCog },
        ],
  },
  {
    id: "companies",
    label: "groupCompanies",
    icon: Building2,
    items: [
      { label: "companies", href: "/admin/companies", icon: Building2 },
      { label: "companyJobs", href: "/admin/company-jobs", icon: Briefcase },
      { label: "adCampaigns", href: "/admin/ad-campaigns", icon: Megaphone },
    ],
  },
  {
    id: "catalog",
    label: "groupCatalog",
    icon: Package,
    items: softLaunch.enabled && !softLaunch.showAdvancedCatalog
      ? [
          { label: "services", href: "/admin/services", icon: Package },
          { label: "sales", href: "/admin/sales", icon: Car },
          { label: "realEstate", href: "/admin/real-estate", icon: Home },
        ]
      : [
          { label: "services", href: "/admin/services", icon: Package },
          { label: "lifeEvents", href: "/admin/life-events", icon: Route },
          { label: "workflows", href: "/admin/workflows", icon: Workflow },
          { label: "recommendations", href: "/admin/recommendations", icon: Sparkles },
          { label: "sales", href: "/admin/sales", icon: Car },
          { label: "realEstate", href: "/admin/real-estate", icon: Home },
        ],
  },
  {
    id: "finance",
    label: "groupFinance",
    icon: CreditCard,
    items: [
      { label: "invoices", href: "/admin/invoices", icon: FileText },
      { label: "paymentsOrders", href: "/admin/payments", icon: CreditCard },
      { label: "financials", href: "/admin/financials", icon: Wallet },
      { label: "quotes", href: "/admin/quotes", icon: Sparkles },
      { label: "staffPayments", href: "/admin/financials/staff-payments", icon: Banknote },
      { label: "documents", href: "/admin/documents", icon: FileStack },
      { label: "financialAnalytics", href: "/admin/financials/analytics", icon: BarChart3 },
    ],
  },
  {
    id: "insights",
    label: "groupInsights",
    icon: BarChart3,
    items: [
      { label: "reports", href: "/admin/reports", icon: BarChart3 },
      { label: "analytics", href: "/admin/analytics", icon: BarChart3 },
      { label: "staffActivity", href: "/admin/staff-activity", icon: Activity },
      { label: "featureFlags", href: "/admin/feature-flags", icon: Flag },
    ],
  },
];

const navGroups: NavGroup[] = allNavGroups.filter((group) => {
  if (!softLaunch.enabled) return true;
  if (group.id === "companies" && !softLaunch.showCompanies) return false;
  return true;
});

const bottomNav: NavItem[] = [
  { label: "settings", href: "/admin/settings", icon: Settings },
];

function isItemActive(
  item: NavItem,
  pathname: string,
  isMarketplaceJobs: boolean
): boolean {
  const baseHref = item.href.split("?")[0] ?? item.href;
  if (item.href.includes("source=freelancer")) {
    return pathname === "/admin/service-jobs" && isMarketplaceJobs;
  }
  if (baseHref === "/admin/service-jobs") {
    return pathname === "/admin/service-jobs" && !isMarketplaceJobs;
  }
  if (baseHref === "/admin/jobs/new") {
    return pathname === "/admin/jobs/new" || pathname.startsWith("/admin/jobs/new/");
  }
  if (baseHref === "/admin/jobs") {
    return pathname === "/admin/jobs" || /^\/admin\/jobs\/(?!new(?:\/|$))/.test(pathname);
  }
  return (
    pathname === item.href ||
    (item.href !== "/admin/dashboard" && pathname.startsWith(baseHref))
  );
}

function NavLink({
  item,
  active,
  nested = false,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  nested?: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations("adminNav");
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      prefetch
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-premium",
        nested && "pl-9",
        active
          ? "bg-siam-blue text-white shadow-soft"
          : "text-white/75 hover:bg-white/10 hover:text-white"
      )}
    >
      <Icon className="h-4.5 w-4.5 h-[18px] w-[18px] shrink-0" />
      <span className="truncate">{t(item.label)}</span>
    </Link>
  );
}

export function AdminSidebar({
  mobileOpen = false,
  onNavigate,
}: {
  mobileOpen?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMarketplaceJobs = searchParams.get("source") === "freelancer";
  const t = useTranslations("adminNav");

  const activeGroupIds = new Set(
    navGroups
      .filter((group) =>
        group.items.some((item) => isItemActive(item, pathname, isMarketplaceJobs))
      )
      .map((group) => group.id)
  );

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      navGroups.map((group) => [
        group.id,
        group.items.some((item) => isItemActive(item, pathname, isMarketplaceJobs)),
      ])
    )
  );

  useEffect(() => {
    setOpenGroups((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const group of navGroups) {
        const hasActive = group.items.some((item) =>
          isItemActive(item, pathname, isMarketplaceJobs)
        );
        if (hasActive && !next[group.id]) {
          next[group.id] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [pathname, isMarketplaceJobs]);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <aside
      className={cn(
        "z-50 w-60 shrink-0 flex-col bg-siam-navy text-white print:hidden",
        "fixed inset-y-0 left-0 md:sticky md:top-0 md:flex md:h-screen",
        mobileOpen ? "flex" : "hidden"
      )}
    >
      <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-4">
        <Image
          src="/images/logo.png"
          alt="SiamEZ"
          width={32}
          height={32}
          className="h-8 w-8 brightness-0 invert"
          priority
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold tracking-tight text-white">SiamEZ</p>
          <p className="truncate text-[11px] font-medium text-siam-yellow">Admin Portal</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
        <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
          Overview
        </p>
        {topNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isItemActive(item, pathname, isMarketplaceJobs)}
            onNavigate={onNavigate}
          />
        ))}

        <div className="mt-3 space-y-1">
          {navGroups.map((group) => {
            const isOpen = openGroups[group.id];
            const hasActiveChild = activeGroupIds.has(group.id);
            const GroupIcon = group.icon;

            return (
              <div key={group.id}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={isOpen}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-premium",
                    hasActiveChild && !isOpen
                      ? "bg-white/15 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <GroupIcon className="h-[18px] w-[18px] shrink-0" />
                  <span className="flex-1 truncate text-left">{t(group.label)}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-white/40 transition-transform duration-premium",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>

                <div
                  className={cn(
                    "grid transition-[grid-template-rows] duration-premium ease-out",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="mt-0.5 space-y-0.5 pb-1">
                      {group.items.map((item) => (
                        <NavLink
                          key={item.href}
                          item={item}
                          nested
                          active={isItemActive(item, pathname, isMarketplaceJobs)}
                          onNavigate={onNavigate}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-auto border-t border-white/10 pt-2">
          {bottomNav.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isItemActive(item, pathname, isMarketplaceJobs)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>

      <div
        className="pointer-events-none h-16 shrink-0 opacity-90"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgb(7 84 232 / 0.35) 55%, rgb(255 214 0 / 0.55) 100%)",
        }}
        aria-hidden
      />
    </aside>
  );
}
