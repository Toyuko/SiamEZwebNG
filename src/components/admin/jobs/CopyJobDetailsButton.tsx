"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyJobDetailsButton({
  copyText,
  className = "min-h-11",
}: {
  copyText: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(copyText);
      setError(null);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setError("Copy is not available in this browser.");
    }
  }

  return (
    <div>
      <Button type="button" variant="outline" className={className} onClick={() => void copy()}>
        {copied ? "Copied!" : "Copy Job Details"}
      </Button>
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
