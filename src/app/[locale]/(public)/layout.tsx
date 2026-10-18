import { LazyAiConciergeShell } from "@/components/ai";
import { PublicHeaderWithAuth } from "@/components/layout/PublicHeaderWithAuth";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { isChatwootConfigured } from "@/lib/chatwoot";
import { getConciergeSettings } from "@/lib/concierge-settings";
import { isFeatureEnabled } from "@/lib/feature-flags";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, flagEnabled] = await Promise.all([
    getConciergeSettings(),
    isFeatureEnabled("concierge_enabled"),
  ]);
  const showConcierge = settings.enabled && flagEnabled;
  // Sit above Chatwoot when the live-chat bubble shares the bottom-right corner.
  const conciergePlacement = isChatwootConfigured() ? "stacked" : "default";

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeaderWithAuth />
      <main className="flex-1">{children}</main>
      <PublicFooter />
      {showConcierge ? <LazyAiConciergeShell placement={conciergePlacement} /> : null}
    </div>
  );
}
