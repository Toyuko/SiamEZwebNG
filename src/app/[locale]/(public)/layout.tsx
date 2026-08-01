import { LazyAiConciergeShell } from "@/components/ai";
import { PublicHeaderWithAuth } from "@/components/layout/PublicHeaderWithAuth";
import { PublicFooter } from "@/components/layout/PublicFooter";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeaderWithAuth />
      <main className="flex-1">{children}</main>
      <PublicFooter />
      <LazyAiConciergeShell placement="stacked" />
    </div>
  );
}
