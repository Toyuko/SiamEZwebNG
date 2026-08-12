import type { Metadata } from "next";
import { noindexRobots } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: "Book a service",
  robots: noindexRobots,
};

/**
 * Booking layout. Auth is optional – guests can book without an account.
 * Booking steps are noindex so private/temporary URLs do not rank.
 */
export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
