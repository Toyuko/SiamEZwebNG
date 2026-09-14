"use client";

import { useTransition } from "react";
import { exportFinancialReportCsvAction } from "@/actions/finance";
import { Button } from "@/components/ui/button";
import type { DatePreset } from "@/lib/finance/dates";

export function ExportCsvButton({
  report,
  preset,
  label = "Export CSV",
}: {
  report:
    | "pnl"
    | "service"
    | "staff"
    | "cases"
    | "receivables"
    | "payables"
    | "expenses";
  preset?: DatePreset;
  label?: string;
}) {
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        start(async () => {
          const { filename, csv } = await exportFinancialReportCsvAction({
            report,
            preset: preset ?? "this_month",
          });
          const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
        });
      }}
    >
      {pending ? "Exporting…" : label}
    </Button>
  );
}
