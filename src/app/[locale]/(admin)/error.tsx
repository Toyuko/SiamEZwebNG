"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error("Admin error:", error); }, [error]);
  return <div className="mx-auto flex max-w-lg flex-col items-center gap-4 p-8 text-center"><h2 className="text-xl font-semibold">Something went wrong</h2><p className="text-sm text-gray-600 dark:text-gray-400">We could not load this admin page. Try again.</p><Button type="button" onClick={reset}>Try again</Button></div>;
}
