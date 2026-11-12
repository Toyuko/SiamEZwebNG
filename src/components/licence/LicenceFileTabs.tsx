import { Link } from "@/i18n/navigation";

const TABS = [
  ["file", "Customer, documents and AI"],
  ["package", "Document package"],
  ["appointment", "DLT appointment"],
  ["completion", "Job completion"],
] as const;

export function LicenceFileTabs({ id, current }: { id: string; current: (typeof TABS)[number][0] }) {
  return (
    <nav className="flex gap-2 overflow-x-auto pb-1">
      {TABS.map(([key, label]) => {
        const href = key === "file" ? `/admin/licence-verification/${id}` : `/admin/licence-verification/${id}/${key}`;
        const active = key === current;
        return (
          <Link
            key={key}
            href={href}
            className={`shrink-0 rounded-full px-3 py-2 text-sm font-semibold ${active ? "bg-siam-blue text-white" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
