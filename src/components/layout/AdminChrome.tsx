"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Bell, CalendarDays, ExternalLink, Menu, Plus, Sparkles, X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminSearchPalette } from "@/components/admin/AdminSearchPalette";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { cn } from "@/lib/utils";

const SECTION_TITLES: { match: RegExp; title: string }[] = [
  { match: /^\/admin\/dashboard/, title: "Dashboard" },
  { match: /^\/admin\/assistant/, title: "AI Command Centre" },
  { match: /^\/admin\/work-center/, title: "Work Center" },
  { match: /^\/admin\/cases/, title: "Work Center" },
  { match: /^\/admin\/service-jobs/, title: "Freelancer Jobs" },
  { match: /^\/admin\/jobs\/new/, title: "New Job" },
  { match: /^\/admin\/jobs/, title: "Work Center" },
  { match: /^\/admin\/calendar/, title: "Appointments" },
  { match: /^\/admin\/followups/, title: "Follow-ups" },
  { match: /^\/admin\/driver-license-followups/, title: "DL Follow-ups" },
  { match: /^\/admin\/licence-verification/, title: "Licence Verification" },
  { match: /^\/admin\/dlt-centre/, title: "DLT Centre" },
  { match: /^\/admin\/clients/, title: "Clients" },
  { match: /^\/admin\/freelancers/, title: "Freelancers" },
  { match: /^\/admin\/staff/, title: "Staff" },
  { match: /^\/admin\/companies/, title: "Companies" },
  { match: /^\/admin\/services/, title: "Catalog & Services" },
  { match: /^\/admin\/invoices/, title: "Invoices" },
  { match: /^\/admin\/payments/, title: "Payments" },
  { match: /^\/admin\/financials/, title: "Financials" },
  { match: /^\/admin\/reports/, title: "Reports" },
  { match: /^\/admin\/analytics/, title: "Analytics" },
  { match: /^\/admin\/settings/, title: "Settings" },
  { match: /^\/admin\/work-queue/, title: "Work Queue" },
  { match: /^\/admin\/quotes/, title: "Quotes" },
  { match: /^\/admin\/documents/, title: "Documents" },
];

function sectionTitle(pathname: string) {
  for (const row of SECTION_TITLES) {
    if (row.match.test(pathname)) return row.title;
  }
  return "SiamEZ Admin";
}

export function AdminChrome({
  children,
  adminName = "Admin",
  adminInitial = "A",
}: {
  children: React.ReactNode;
  adminName?: string;
  adminInitial?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const title = useMemo(() => sectionTitle(pathname), [pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-siam-admin-bg md:flex-row">
      {menuOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-siam-navy/50 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <Suspense
        fallback={
          <aside className="hidden w-60 shrink-0 bg-siam-navy md:block" />
        }
      >
        <AdminSidebar mobileOpen={menuOpen} onNavigate={() => setMenuOpen(false)} />
      </Suspense>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-[#DCE6F5] bg-white/95 px-3 backdrop-blur print:hidden sm:gap-3 sm:px-4">
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-siam-ink md:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="hidden min-w-0 items-center gap-2 md:flex">
            <p className="truncate text-sm font-bold text-siam-ink sm:text-base">{title}</p>
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2 md:justify-start md:pl-4">
            <AdminSearchPalette />
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              href="/admin/work-queue"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-siam-ink-muted transition-colors hover:bg-siam-surface hover:text-siam-blue"
              aria-label="Notifications"
              title="Work queue"
            >
              <Bell className="h-4.5 w-4.5 h-[18px] w-[18px]" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" aria-hidden />
            </Link>

            <Link
              href="/admin/calendar"
              className="hidden h-10 items-center gap-1.5 rounded-xl border border-[#DCE6F5] px-3 text-sm font-semibold text-siam-ink transition-colors hover:border-siam-blue/30 hover:bg-siam-surface sm:inline-flex"
            >
              <CalendarDays className="h-4 w-4 text-siam-blue" aria-hidden />
              Calendar
            </Link>

            <Link
              href="/admin/jobs/new"
              prefetch
              className="inline-flex h-10 items-center gap-1 rounded-xl bg-siam-yellow px-3 text-sm font-bold text-siam-navy shadow-soft transition-opacity duration-premium hover:opacity-90"
            >
              <Plus className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">New Job</span>
              <span className="sm:hidden">Job</span>
            </Link>

            <Link
              href="/"
              className="hidden h-10 items-center gap-1.5 rounded-xl px-2 text-sm font-medium text-siam-ink-muted transition-colors hover:text-siam-blue lg:inline-flex"
              title="Public site"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Site
            </Link>

            <ThemeSwitcher />

            <div
              className="hidden h-9 items-center gap-2 rounded-full border border-[#DCE6F5] bg-siam-admin-bg pl-1 pr-2.5 sm:inline-flex"
              title={adminName}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-siam-blue text-xs font-bold text-white">
                {adminInitial}
              </span>
              <span className="max-w-[7rem] truncate text-xs font-semibold text-siam-ink">
                {adminName}
              </span>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 pb-24 md:p-6 md:pb-24 print:p-0">
          {children}
        </main>

        {pathname.startsWith("/admin/assistant") ? null : (
          <Link
            href="/admin/assistant"
            prefetch
            className={cn(
              "fixed bottom-4 right-4 z-40 inline-flex min-h-11 items-center gap-2 rounded-full bg-siam-blue px-4 text-sm font-semibold text-white shadow-card print:hidden",
              "transition-transform duration-premium hover:scale-[1.02]"
            )}
          >
            <Sparkles className="h-4 w-4 text-siam-yellow" />
            AI Assistant
          </Link>
        )}
      </div>
    </div>
  );
}
