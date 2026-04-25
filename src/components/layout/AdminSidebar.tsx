"use client";

import { Link, usePathname } from "@/i18n/navigation";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const nav = [
  { label: "dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "serviceJobs", href: "/admin/service-jobs", icon: Briefcase },
  { label: "cases", href: "/admin/cases", icon: FolderOpen },
  { label: "clients", href: "/admin/clients", icon: Users },
  { label: "services", href: "/admin/services", icon: Package },
  { label: "sales", href: "/admin/sales", icon: Car },
  { label: "invoices", href: "/admin/invoices", icon: FileText },
  { label: "paymentsOrders", href: "/admin/payments", icon: CreditCard },
  { label: "documents", href: "/admin/documents", icon: FileStack },
  { label: "calendar", href: "/admin/calendar", icon: Calendar },
  { label: "staff", href: "/admin/staff", icon: UserCog },
  { label: "reports", href: "/admin/reports", icon: BarChart3 },
  { label: "settings", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const t = useTranslations("adminNav");

  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
      <nav className="flex flex-col gap-1 p-4">
        {nav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-siam-blue text-white"
                  : "text-gray-600 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              )}
            >
              <Icon className="h-5 w-5" />
              {t(item.label)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
