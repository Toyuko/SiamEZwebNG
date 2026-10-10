"use client";

import { useState } from "react";
import {
  commitDirectoryImport,
  downloadDirectoryTemplate,
  exportDirectoryCsv,
  previewDirectoryImport,
} from "@/actions/directory";
import type { DirectoryCopy } from "@/lib/directory/copy";
import type { DirectoryQuery } from "@/lib/directory/search";
import type { CsvPreviewRow } from "@/lib/directory/csv";

function download(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ImportExportPanel({
  copy,
  query,
}: {
  copy: DirectoryCopy;
  query: DirectoryQuery;
}) {
  const [rows, setRows] = useState<CsvPreviewRow[]>([]);
  const [headerErrors, setHeaderErrors] = useState<string[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{copy.importHelp}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold"
          onClick={async () => download("siamez-office-directory-template.csv", await downloadDirectoryTemplate())}
        >
          {copy.template}
        </button>
        <button
          type="button"
          className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold"
          onClick={async () => download("siamez-office-directory.csv", await exportDirectoryCsv(query))}
        >
          {copy.export}
        </button>
      </div>
      <label className="block text-sm">
        CSV
        <input
          type="file"
          accept=".csv,text/csv"
          className="mt-1 block w-full text-sm"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setBusy(true);
            const text = await file.text();
            const preview = await previewDirectoryImport(text);
            setHeaderErrors(preview.headerErrors);
            setRows(preview.rows);
            setSummary(
              `${preview.summary.ready} ready, ${preview.summary.skipped} ${copy.skipped.toLowerCase()}, ${preview.summary.rejected} ${copy.rejected.toLowerCase()}`
            );
            setBusy(false);
          }}
        />
      </label>
      {headerErrors.map((error) => (
        <p key={error} className="text-sm text-rose-700">
          {error}
        </p>
      ))}
      {summary ? <p className="text-sm">{summary}</p> : null}
      {rows.length ? (
        <div className="max-h-[28rem] overflow-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="sticky top-0 bg-slate-50">
              <tr>
                <th className="p-2">#</th>
                <th className="p-2">{copy.nameEn}</th>
                <th className="p-2">{copy.province}</th>
                <th className="p-2">{copy.status}</th>
                <th className="p-2"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.rowNumber} className="border-t border-border align-top">
                  <td className="p-2">{row.rowNumber}</td>
                  <td className="p-2">
                    <input
                      className="w-full rounded border px-2 py-1"
                      value={row.values.name_en}
                      onChange={(event) => {
                        const next = [...rows];
                        const current = next[index];
                        if (!current) return;
                        next[index] = { ...current, values: { ...current.values, name_en: event.target.value } };
                        setRows(next);
                      }}
                    />
                    <input
                      className="mt-1 w-full rounded border px-2 py-1"
                      value={row.values.name_th}
                      onChange={(event) => {
                        const next = [...rows];
                        const current = next[index];
                        if (!current) return;
                        next[index] = { ...current, values: { ...current.values, name_th: event.target.value } };
                        setRows(next);
                      }}
                    />
                  </td>
                  <td className="p-2">{row.values.province_code}</td>
                  <td className="p-2">
                    <p className="font-medium">{row.action}</p>
                    {row.errors.map((error) => (
                      <p key={`${error.column}-${error.message}`} className="text-rose-700">
                        {error.column}: {error.message}
                      </p>
                    ))}
                    {row.warnings.map((warning) => (
                      <p key={warning} className="text-amber-800">
                        {warning}
                      </p>
                    ))}
                  </td>
                  <td className="p-2">{row.duplicateOf ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={updateExisting} onChange={(event) => setUpdateExisting(event.target.checked)} />
        {copy.updateExisting}
      </label>
      <button
        type="button"
        disabled={busy || rows.length === 0}
        className="min-h-11 rounded-xl bg-siam-blue px-4 text-sm font-semibold text-white disabled:opacity-50"
        onClick={async () => {
          setBusy(true);
          const result = await commitDirectoryImport({
            rows: rows.map((row) => row.values),
            updateExisting,
          });
          setSummary(
            `${copy.imported} ${result.imported}, updated ${result.updated}, ${copy.skipped} ${result.skipped}, ${copy.rejected} ${result.rejected}`
          );
          if (result.errors.length) setHeaderErrors(result.errors);
          setBusy(false);
        }}
      >
        {copy.commit}
      </button>
    </div>
  );
}
