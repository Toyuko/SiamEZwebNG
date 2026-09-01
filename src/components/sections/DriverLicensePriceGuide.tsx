import type { DriverLicensePriceGuideRow, DriverLicensePriceGuideSection } from "@/config/driver-license-price-guide";

interface DriverLicensePriceGuideProps {
  title: string;
  sections: DriverLicensePriceGuideSection[];
  additionalTitle: string;
  additionalRows: DriverLicensePriceGuideRow[];
  /** Compact layout for the booking wizard summary step. */
  compact?: boolean;
  className?: string;
}

function PriceRows({ rows }: { rows: DriverLicensePriceGuideRow[] }) {
  return (
    <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-700 dark:border-gray-700">
      {rows.map((row) => (
        <li
          key={row.label}
          className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="text-gray-700 dark:text-gray-300">{row.label}</span>
          <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{row.price}</span>
        </li>
      ))}
    </ul>
  );
}

export function DriverLicensePriceGuide({
  title,
  sections,
  additionalTitle,
  additionalRows,
  compact = false,
  className,
}: DriverLicensePriceGuideProps) {
  return (
    <div className={className}>
      <h3
        className={
          compact
            ? "text-base font-semibold text-foreground"
            : "text-xl font-bold text-gray-900 dark:text-gray-100"
        }
      >
        {title}
      </h3>
      <div className={compact ? "mt-4 space-y-5" : "mt-6 space-y-8"}>
        {sections.map((section) => (
          <div key={section.title}>
            <h4
              className={
                compact
                  ? "text-sm font-semibold text-foreground"
                  : "text-lg font-semibold text-gray-900 dark:text-gray-100"
              }
            >
              {section.title}
            </h4>
            <div className="mt-3">
              <PriceRows rows={section.rows} />
            </div>
          </div>
        ))}
        <div>
          <h4
            className={
              compact
                ? "text-sm font-semibold text-foreground"
                : "text-lg font-semibold text-gray-900 dark:text-gray-100"
            }
          >
            {additionalTitle}
          </h4>
          <div className="mt-3">
            <PriceRows rows={additionalRows} />
          </div>
        </div>
      </div>
    </div>
  );
}
