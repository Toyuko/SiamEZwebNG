"use client";

import { Suspense, useEffect, useState } from "react";
import { Bell, Menu, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";

export function AdminChrome({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {menuOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <Suspense
        fallback={
          <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-gray-50 md:block dark:border-gray-800 dark:bg-gray-900" />
        }
      >
        <AdminSidebar mobileOpen={menuOpen} />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-gray-200 bg-white px-3 dark:border-gray-800 dark:bg-gray-900">
          <button
            type="button"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-700 md:hidden dark:text-gray-200"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link href="/admin/dashboard" className="flex min-w-0 items-center gap-2 font-semibold text-siam-blue">
            <Bell className="h-5 w-5 shrink-0" />
            <span className="truncate">SiamEZ Admin</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/admin/calendar"
              className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-siam-blue"
            >
              Calendar
            </Link>
            <Link
              href="/admin/jobs/new"
              className="inline-flex min-h-11 items-center rounded-lg bg-siam-yellow px-3 text-sm font-semibold text-siam-blue-dark"
            >
              + New Job
            </Link>
            <ThemeSwitcher />
            <Link
              href="/"
              className="hidden text-sm text-gray-600 hover:text-siam-blue sm:inline dark:text-gray-400"
            >
              Public site
            </Link>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
