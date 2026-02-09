"use client";

import { Link } from "@/i18n/navigation";
import { Bell, Plus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./UserMenu";
import { useTranslations } from "next-intl";

interface PortalTopBarProps {
  userName?: string;
  userRole?: string;
  userAvatar?: string;
}

export function PortalTopBar({ userName = "Alex Thompson", userRole = "Client Account", userAvatar }: PortalTopBarProps) {
  const t = useTranslations("portal");

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900">
      {/* Left: Page context */}
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
        <Bell className="h-5 w-5" />
        <span className="text-sm font-medium">{t("portalName")}</span>
      </div>

      {/* Middle: CTA Button */}
      <div className="mx-auto flex items-center">
        <Button asChild variant="primary" size="default" className="gap-2">
          <Link href="/services">
            <Plus className="h-4 w-4" />
            {t("bookNewService")}
          </Link>
        </Button>
      </div>

      {/* Right: User Profile */}
      <div className="ml-auto flex items-center">
        <UserMenu userName={userName} userRole={userRole} userAvatar={userAvatar} />
      </div>
    </header>
  );
}
