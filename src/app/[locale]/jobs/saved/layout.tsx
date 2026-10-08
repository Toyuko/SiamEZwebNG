import type { Metadata } from "next";
import { noindexRobots } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: "Saved job",
  robots: noindexRobots,
};

export default function SavedJobLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <p className="text-sm font-semibold text-siam-blue">SiamEZ</p>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Saved job</h1>
      </header>
      <main className="px-4 py-4">{children}</main>
    </div>
  );
}
