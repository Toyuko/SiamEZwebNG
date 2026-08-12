import type { Metadata } from "next";
import { PublicHeaderWithAuth } from "@/components/layout/PublicHeaderWithAuth";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { noindexRobots } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: "Booking",
  robots: noindexRobots,
};

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeaderWithAuth />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
