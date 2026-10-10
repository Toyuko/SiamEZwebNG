"use client";

import { useState } from "react";
import type { DirectoryCopy } from "@/lib/directory/copy";

export function OfficeActions({
  copy,
  callHref,
  mapsHref,
  phoneCopy,
  addressCopy,
  websiteHref,
  shareTitle,
}: {
  copy: DirectoryCopy;
  callHref: string | null;
  mapsHref: string | null;
  phoneCopy: string | null;
  addressCopy: string | null;
  websiteHref: string | null;
  shareTitle: string;
}) {
  const [notice, setNotice] = useState<string | null>(null);

  async function copyText(value: string | null) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setNotice(copy.copied);
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: shareTitle, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    setNotice(copy.copied);
  }

  const item = "inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-semibold";

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
      <div className="mx-auto flex max-w-3xl gap-2 overflow-x-auto md:flex-wrap">
        {callHref ? (
          <a className={`${item} bg-siam-blue text-white`} href={callHref}>
            {copy.call}
          </a>
        ) : null}
        {mapsHref ? (
          <a className={`${item} bg-siam-yellow text-siam-blue-dark`} href={mapsHref} target="_blank" rel="noreferrer">
            {copy.maps}
          </a>
        ) : null}
        <button type="button" className={`${item} border border-border`} disabled={!phoneCopy} onClick={() => copyText(phoneCopy)}>
          {copy.copyPhone}
        </button>
        <button type="button" className={`${item} border border-border`} disabled={!addressCopy} onClick={() => copyText(addressCopy)}>
          {copy.copyAddress}
        </button>
        {websiteHref ? (
          <a className={`${item} border border-border`} href={websiteHref} target="_blank" rel="noreferrer">
            {copy.website}
          </a>
        ) : null}
        <button type="button" className={`${item} border border-border`} onClick={() => share()}>
          {copy.share}
        </button>
      </div>
      {notice ? <p className="mt-2 text-center text-xs text-emerald-700">{notice}</p> : null}
    </div>
  );
}
