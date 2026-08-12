"use client";

import { trackEvent, type AnalyticsEventName } from "@/lib/analytics";

type TrackedContactLinkProps = {
  href: string;
  event: AnalyticsEventName;
  source: string;
  className?: string;
  target?: string;
  rel?: string;
  children: React.ReactNode;
  ariaLabel?: string;
};

export function TrackedContactLink({
  href,
  event,
  source,
  className,
  target,
  rel,
  children,
  ariaLabel,
}: TrackedContactLinkProps) {
  return (
    <a
      href={href}
      className={className}
      target={target}
      rel={rel}
      aria-label={ariaLabel}
      onClick={() => trackEvent(event, { source, href })}
    >
      {children}
    </a>
  );
}
