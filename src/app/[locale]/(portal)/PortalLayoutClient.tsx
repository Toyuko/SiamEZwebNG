"use client";

import { PortalSidebar } from "@/components/layout/PortalSidebar";
import { PortalTopBar } from "@/components/portal/PortalTopBar";
import { useState, useEffect } from "react";
import { usePathname } from "@/i18n/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth";

export function PortalLayoutClient({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SessionUser;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden lg:flex-row">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-64 transform transition-transform duration-300 lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <PortalSidebar />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden lg:ml-0">
        <div className="flex h-14 items-center gap-4 border-b border-gray-200 bg-white px-4 lg:hidden dark:border-gray-800 dark:bg-gray-900">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        <PortalTopBar
          userName={user.name || user.email}
          userRole="Client Account"
          userAvatar={user.image ?? undefined}
        />

        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6 lg:p-8 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
}
