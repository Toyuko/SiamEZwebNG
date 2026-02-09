"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { routing } from "@/i18n/routing";

interface LanguageSwitcherProps {
  className?: string;
  variant?: "default" | "sidebar";
}

export function LanguageSwitcher({ className, variant = "default" }: LanguageSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  if (variant === "sidebar") {
    return (
      <div className={cn("relative", className)}>
        <div className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 p-1 backdrop-blur-sm">
          <Globe className="h-4 w-4 text-white/80" />
          {routing.locales.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => handleLanguageChange(loc)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium text-white transition-colors",
                locale === loc
                  ? "bg-white/20 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              {loc.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
        <Globe className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        {routing.locales.map((loc) => (
          <button
            key={loc}
            type="button"
            onClick={() => handleLanguageChange(loc)}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              locale === loc
                ? "bg-siam-blue text-white"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            )}
          >
            {loc.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
