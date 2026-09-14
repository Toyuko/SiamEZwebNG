import { Link } from "@/i18n/navigation";

const SUBNAV = [
  { href: "/admin/financials", label: "Overview" },
  { href: "/admin/financials/analytics", label: "Analytics" },
  { href: "/admin/financials/transactions", label: "Transactions" },
  { href: "/admin/financials/revenue", label: "Revenue" },
  { href: "/admin/financials/expenses", label: "Expenses" },
  { href: "/admin/financials/staff-payments", label: "Staff Payments" },
  { href: "/admin/financials/receivables", label: "Receivables" },
  { href: "/admin/financials/payables", label: "Payables" },
  { href: "/admin/financials/profitability", label: "Profitability" },
  { href: "/admin/financials/reports", label: "Reports" },
  { href: "/admin/financials/saved-reports", label: "Saved Reports" },
];

export function FinancialsSubnav({ current }: { current: string }) {
  return (
    <nav className="flex flex-wrap gap-1 border-b border-gray-200 pb-2 dark:border-gray-800">
      {SUBNAV.map((item) => {
        const active = current === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              active
                ? "rounded-md bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-800 dark:bg-teal-900/30 dark:text-teal-200"
                : "rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
