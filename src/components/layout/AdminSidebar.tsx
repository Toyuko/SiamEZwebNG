"use client";

import { useEffect, useState } from "react";
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
  Megaphone,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

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
];

const navGroups: NavGroup[] = [
  {
    id: "operations",
    label: "groupOperations",
    icon: Briefcase,
    items: [
      { label: "serviceJobs", href: "/admin/service-jobs", icon: Briefcase },
      { label: "cases", href: "/admin/cases", icon: FolderOpen },
      { label: "calendar", href: "/admin/calendar", icon: Calendar },
    ],
  },
  {
    id: "people",
    label: "groupPeople",
    icon: Users,
    items: [
      { label: "clients", href: "/admin/clients", icon: Users },
      { label: "freelancers", href: "/admin/freelancers", icon: UserCheck },
      { label: "freelancerJobs", href: "/admin/service-jobs?source=freelancer", icon: ClipboardList },
      { label: "staff", href: "/admin/staff", icon: UserCog },
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
    items: [
      { label: "services", href: "/admin/services", icon: Package },
      { label: "sales", href: "/admin/sales", icon: Car },
    ],
  },
  {
    id: "finance",
    label: "groupFinance",
    icon: CreditCard,
    items: [
      { label: "invoices", href: "/admin/invoices", icon: FileText },
      { label: "paymentsOrders", href: "/admin/payments", icon: CreditCard },
      { label: "documents", href: "/admin/documents", icon: FileStack },
    ],
  },
  {
    id: "insights",
    label: "groupInsights",
    icon: BarChart3,
    items: [{ label: "reports", href: "/admin/reports", icon: BarChart3 }],
  },
];

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
  return (
    pathname === item.href ||
    (item.href !== "/admin/dashboard" && pathname.startsWith(baseHref))
  );
}

function NavLink({
  item,
  active,
  nested = false,
}: {
  item: NavItem;
  active: boolean;
  nested?: boolean;
}) {
  const t = useTranslations("adminNav");
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        nested && "pl-9",
        active
          ? "bg-siam-blue text-white"
          : "text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="truncate">{t(item.label)}</span>
    </Link>
  );
}

export function AdminSidebar() {
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
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {topNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isItemActive(item, pathname, isMarketplaceJobs)}
          />
        ))}

        <div className="mt-1 space-y-1">
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
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    hasActiveChild && !isOpen
                      ? "bg-gray-200/80 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                      : "text-gray-700 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                  )}
                >
                  <GroupIcon className="h-5 w-5 shrink-0" />
                  <span className="flex-1 truncate text-left">{t(group.label)}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>

                <div
                  className={cn(
                    "grid transition-[grid-template-rows] duration-200 ease-out",
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
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-auto border-t border-gray-200 pt-2 dark:border-gray-800">
          {bottomNav.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isItemActive(item, pathname, isMarketplaceJobs)}
            />
          ))}
        </div>
      </nav>
    </aside>
  );
}
