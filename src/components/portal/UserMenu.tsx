"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, User, LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { logout } from "@/actions/auth";

interface UserMenuProps {
  userName: string;
  userRole: string;
  userAvatar?: string;
}

export function UserMenu({ userName, userRole, userAvatar }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("portal");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Generate initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <div className="flex flex-col items-end">
          <span className="text-sm font-medium text-gray-900 dark:text-white">{userName}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{userRole}</span>
        </div>
        {userAvatar ? (
          <img src={userAvatar} alt={userName} className="h-10 w-10 rounded-full" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-siam-blue text-sm font-semibold text-white">
            {getInitials(userName)}
          </div>
        )}
        <ChevronDown className={cn("h-4 w-4 text-gray-500 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="p-2">
            <Link
              href="/portal/profile"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              onClick={() => setOpen(false)}
            >
              <User className="h-4 w-4" />
              {t("profile")}
            </Link>
            <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
            <form action={logout}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <LogOut className="h-4 w-4" />
                {t("logout")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
