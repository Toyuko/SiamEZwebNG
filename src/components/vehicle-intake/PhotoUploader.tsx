"use client";

import { useRef, useState } from "react";
import { Camera, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UploadedVehicleMedia } from "@/lib/vehicle-leads/schema";
import { trackVehicleEvent } from "@/components/vehicle-intake/useVehicleLeadSource";

type Props = {
  category: UploadedVehicleMedia["category"];
  label: string;
  hint?: string;
  accept?: string;
  capture?: boolean;
  files: UploadedVehicleMedia[];
  onChange: (files: UploadedVehicleMedia[]) => void;
  multiple?: boolean;
};

export function PhotoUploader({
  category,
  label,
  hint,
  accept = "image/*",
  capture = true,
  files,
  onChange,
  multiple = true,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function uploadList(list: FileList | null) {
    if (!list?.length) return;
    setError(null);
    setUploading(true);
    trackVehicleEvent("vehicle_photo_upload_started", { category, count: list.length });
    const next = [...files];
    try {
      for (const file of Array.from(list)) {
        const body = new FormData();
        body.append("file", file);
        body.append("category", category);
        const res = await fetch("/api/vehicle-leads/upload", { method: "POST", body });
        const json = (await res.json()) as UploadedVehicleMedia & { error?: string };
        if (!res.ok) {
          setError(json.error || "Upload failed");
          continue;
        }
        next.push({
          name: json.name,
          storageKey: json.storageKey,
          mimeType: json.mimeType,
          size: json.size,
          mediaType: json.mediaType,
          category,
        });
        trackVehicleEvent("vehicle_photo_upload_completed", { category });
      }
      onChange(next);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-xl border border-border p-4">
      <p className="font-medium text-foreground">{label}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {capture ? <Camera className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
          {uploading ? "Uploading…" : "Add"}
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        capture={capture ? "environment" : undefined}
        multiple={multiple}
        onChange={(e) => void uploadList(e.target.files)}
      />
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      {files.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {files.map((file, index) => (
            <li
              key={`${file.storageKey}-${index}`}
              className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm"
            >
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                className="text-destructive"
                aria-label={`Remove ${file.name}`}
                onClick={() => onChange(files.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
