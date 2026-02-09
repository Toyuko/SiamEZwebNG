"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { LayoutDashboard, FolderOpen, FileText, User, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Dashboard", href: "/portal", icon: LayoutDashboard },
  { label: "My Cases", href: "/portal/cases", icon: FolderOpen },
  { label: "Invoices", href: "/portal/invoices", icon: CreditCard },
  { label: "Documents", href: "/portal/documents", icon: FileText },
  { label: "Profile", href: "/portal/profile", icon: User },
];

export function PortalSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <nav className="flex flex-col gap-1 p-4">
        {nav.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/portal" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-siam-blue text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
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
