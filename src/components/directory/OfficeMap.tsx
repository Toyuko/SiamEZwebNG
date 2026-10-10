"use client";

import dynamic from "next/dynamic";

export const OfficeMap = dynamic(() => import("./OfficeMapCanvas"), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-xl bg-slate-100" />,
});
