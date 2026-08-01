"use client";

import dynamic from "next/dynamic";
import type { AiConciergeShellProps } from "@/components/ai/AiConciergeShell";

/**
 * Client-only Concierge shell — keeps framer-motion / chat hooks off the
 * public SSR payload so they do not compete with LCP.
 */
export const LazyAiConciergeShell = dynamic<AiConciergeShellProps>(
  () =>
    import("@/components/ai/AiConciergeShell").then((m) => m.AiConciergeShell),
  { ssr: false }
);
