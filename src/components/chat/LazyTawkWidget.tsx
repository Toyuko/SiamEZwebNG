"use client";

import dynamic from "next/dynamic";

/** Client-only tawk.to embed — keep the third-party script off the SSR path. */
export const LazyTawkWidget = dynamic(
  () => import("@/components/chat/TawkWidget").then((m) => m.TawkWidget),
  { ssr: false }
);
