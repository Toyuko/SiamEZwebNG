import { Link } from "@/i18n/navigation";
import { Bell } from "lucide-react";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminSidebar />
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900">
          <Link href="/admin" className="flex items-center gap-2 font-semibold text-siam-blue">
            <Bell className="h-5 w-5" />
            SiamEZ Admin
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <ThemeSwitcher />
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-siam-blue dark:text-gray-400"
            >
              Public site
            </Link>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
