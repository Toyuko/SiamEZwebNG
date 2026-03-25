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
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Service Jobs", href: "/admin/service-jobs", icon: Briefcase },
  { label: "Cases", href: "/admin/cases", icon: FolderOpen },
  { label: "Clients", href: "/admin/clients", icon: Users },
  { label: "Services", href: "/admin/services", icon: Package },
  { label: "Invoices", href: "/admin/invoices", icon: FileText },
  { label: "Payments & Orders", href: "/admin/payments", icon: CreditCard },
  { label: "Documents", href: "/admin/documents", icon: FileStack },
  { label: "Calendar", href: "/admin/calendar", icon: Calendar },
  { label: "Staff", href: "/admin/staff", icon: UserCog },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

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
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
