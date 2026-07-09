"use client";

import { useEffect, useState } from "react";

type ActiveAd = {
  id: string;
  title: string;
  imageUrl: string;
  targetUrl: string;
  company: { companyName: string; slug: string; isVerified: boolean };
};

/** Fetches a random ACTIVE campaign and records impression/click for feed injection. */
export function SponsoredAdBanner({ className }: { className?: string }) {
  const [ad, setAd] = useState<ActiveAd | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/ads/active");
        const json = (await res.json()) as { success?: boolean; data?: ActiveAd | null };
        if (cancelled || !json.success || !json.data) return;
        setAd(json.data);
        void fetch(`/api/ads/${json.data.id}/impression`, { method: "POST" });
      } catch {
        // Ads are optional; fail silently.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ad) return null;

  return (
    <a
      href={ad.targetUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={className}
      onClick={() => {
        void fetch(`/api/ads/${ad.id}/click`, { method: "POST" });
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ad.imageUrl}
        alt={ad.title}
        className="h-auto w-full rounded-xl object-cover"
      />
      <span className="mt-1 block text-xs text-gray-500">
        Sponsored · {ad.company.companyName}
      </span>
    </a>
  );
}
