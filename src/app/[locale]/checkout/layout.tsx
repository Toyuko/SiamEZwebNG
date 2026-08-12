import type { Metadata } from "next";
import { noindexRobots } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: "Checkout",
  robots: noindexRobots,
};

/**
 * Checkout layout. Auth is optional – guests can checkout with valid token from booking email.
 */
export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
