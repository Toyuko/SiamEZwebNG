import { Link } from "@/i18n/navigation";
import {
  Bell,
  Bookmark,
  Car,
  CreditCard,
  FileText,
  Flag,
  FolderOpen,
  Home,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";

type QuickLinkIcon =
  | "cases"
  | "invoices"
  | "documents"
  | "notifications"
  | "saved"
  | "goals"
  | "enquiries"
  | "sales"
  | "realEstate";

type QuickLink = {
  href: string;
  label: string;
  hint: string;
  icon: QuickLinkIcon;
  badge?: number;
};

const icons = {
  cases: FolderOpen,
  invoices: CreditCard,
  documents: FileText,
  notifications: Bell,
  saved: Bookmark,
  goals: Flag,
  enquiries: Inbox,
  sales: Car,
  realEstate: Home,
};

export function QuickLinks({
  title,
  links,
}: {
  title: string;
  links: QuickLink[];
}) {
  return (
    <section className="mb-8">
      <h2 className="sr-only">{title}</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {links.map((link) => {
          const Icon = icons[link.icon];
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-colors",
                  "hover:border-siam-blue/30 hover:bg-siam-blue/[0.03] dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-800/80"
                )}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-siam-blue/10">
                  <Icon className="h-5 w-5 text-siam-blue" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {link.label}
                    {typeof link.badge === "number" && link.badge > 0 ? (
                      <span className="ml-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-siam-yellow px-1.5 text-xs font-semibold text-siam-blue-dark">
                        {link.badge}
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {link.hint}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
