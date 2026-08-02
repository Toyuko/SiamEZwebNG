import { requireStaff } from "@/lib/auth";
import { getPlatformAnalytics } from "@/lib/analytics/platform-metrics";

export async function GET() {
  await requireStaff();
  const analytics = await getPlatformAnalytics();
  const rows = [
    ["metric", "value"],
    ["marketplace_views_7d", analytics.marketplace.views7d],
    ["marketplace_views_30d", analytics.marketplace.views30d],
    ["marketplace_enquiries_30d", analytics.marketplace.enquiries30d],
    ["published_listings", analytics.marketplace.publishedListings],
    ["cases_created_30d", analytics.caseFunnel.created30d],
    ["cases_paidish_30d", analytics.caseFunnel.paidish30d],
    ["workflow_completion_rate", analytics.workflows.completionRate],
    ["revenue_approved_30d", analytics.revenue30d],
    ...analytics.events.map((event) => [`event_${event.kind}`, event.count]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="siamez-platform-analytics.csv"' } });
}
