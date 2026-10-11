import type { Metadata, Viewport } from "next";
import { noindexRobots } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: "Calendar",
  description: "SiamEZ staff schedule.",
  robots: noindexRobots,
  applicationName: "SiamEZ Calendar",
  manifest: "/staff-calendar.webmanifest",
  appleWebApp: {
    capable: true,
    title: "SiamEZ Calendar",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2c54c6",
};

export default function StaffCalendarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
