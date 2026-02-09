"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { LayoutDashboard, FolderOpen, FileText, User, CreditCard, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { LanguageSwitcher } from "@/components/portal/LanguageSwitcher";

const nav = [
  { labelKey: "dashboard", href: "/portal", icon: LayoutDashboard },
  { labelKey: "myCases", href: "/portal/cases", icon: FolderOpen },
  { labelKey: "invoices", href: "/portal/invoices", icon: CreditCard },
  { labelKey: "documents", href: "/portal/documents", icon: FileText },
  { labelKey: "profile", href: "/portal/profile", icon: User },
];

export function PortalSidebar() {
  const pathname = usePathname();
  const t = useTranslations("portal");

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
          const isActive =
            pathname === item.href || (item.href !== "/portal" && pathname.startsWith(item.href));
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
