import { getPlatformAnalytics } from "@/lib/analytics/platform-metrics";
import { Card, CardContent } from "@/components/ui/card";

export default async function AnalyticsPage() {
  const analytics = await getPlatformAnalytics();
  const cards = [
    ["Marketplace views (30d)", analytics.marketplace.views30d],
    ["Marketplace enquiries (30d)", analytics.marketplace.enquiries30d],
    ["Published listings", analytics.marketplace.publishedListings],
    ["Cases created (30d)", analytics.caseFunnel.created30d],
    ["Paid-ish cases (30d)", analytics.caseFunnel.paidish30d],
    ["Workflow completion", `${Math.round(analytics.workflows.completionRate * 100)}%`],
    ["Approved revenue (30d)", new Intl.NumberFormat("en-US", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(analytics.revenue30d)],
  ];
  return <div><h1 className="text-2xl font-bold">Platform analytics</h1><p className="mt-1 text-gray-600">Operational metrics from the past 30 days.</p><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cards.map(([label, value]) => <Card key={label}><CardContent className="p-5"><p className="text-2xl font-bold">{value}</p><p className="text-sm text-gray-500">{label}</p></CardContent></Card>)}</div><section className="mt-8"><h2 className="text-lg font-semibold">Tracked events</h2><ul className="mt-3 divide-y rounded-lg border">{analytics.events.map((event) => <li className="flex justify-between p-3" key={event.kind}><span>{event.kind}</span><span>{event.count}</span></li>)}</ul></section></div>;
}
