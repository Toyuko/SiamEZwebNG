"use client";

import { useMemo, useState, useTransition } from "react";
import { Link } from "@/i18n/navigation";
import { Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { site } from "@/config/site";
import { VEHICLE_LEAD_STATUSES } from "@/config/vehicle-intake";
import { formatThb } from "@/lib/vehicle-leads/display";
import { createVehicleShareTokenAction } from "@/actions/vehicle-leads";

type LeadRow = {
  id: string;
  leadNumber: string;
  type: "sell" | "buy";
  status: string;
  displayTitle: string;
  customerName: string;
  province: string | null;
  askingPrice: number | null;
  budgetMax: number | null;
  officialListingPrice: number | null;
  aiLeadScore: string | null;
  source: string | null;
  createdAt: Date | string;
  assignedStaff: { name: string | null; email: string } | null;
  case: { id: string; caseNumber: string } | null;
};

type Stats = {
  newCount: number;
  selling: number;
  buying: number;
  followUp: number;
  negotiating: number;
  completed: number;
  pipelineValue: number;
};

function shareUrl(path: string, source?: string, ref?: string) {
  const url = new URL(path, site.url);
  if (source) url.searchParams.set("source", source);
  if (ref) url.searchParams.set("ref", ref);
  return url.toString();
}

export function VehicleLeadsDashboard({
  leads,
  stats,
}: {
  leads: LeadRow[];
  stats: Stats;
}) {
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      if (type !== "all" && lead.type !== type) return false;
      if (status !== "all" && lead.status !== status) return false;
      if (q.trim()) {
        const hay = `${lead.leadNumber} ${lead.displayTitle} ${lead.customerName}`.toLowerCase();
        if (!hay.includes(q.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [leads, type, status, q]);

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  function share(url: string) {
    if (navigator.share) {
      void navigator.share({ title: "SiamEZ Vehicle Form", url });
      return;
    }
    void copy("share", url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vehicle Leads</h1>
          <p className="text-sm text-muted">Buy and sell intake from quick links and chat.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Share vehicle form</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted">
            Send a customer this link in LINE, WhatsApp, Facebook Messenger, or SMS. No account required.
          </p>
          {[
            ["Sell vehicle", shareUrl("/en/vehicle/sell", "staff")],
            ["Find a vehicle", shareUrl("/en/vehicle/buy", "staff")],
          ].map(([label, url]) => (
            <div key={label} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="flex-1 truncate rounded-lg bg-muted px-3 py-2 text-xs">{url}</code>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => void copy(label, url)}>
                  <Copy className="h-4 w-4" /> Copy
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => share(url)}>
                  <Share2 className="h-4 w-4" /> Share
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const token = await createVehicleShareTokenAction();
                const url = shareUrl("/en/vehicle/sell", "staff", token);
                await copy("token", url);
              })
            }
          >
            Copy staff-attributed sell link
          </Button>
          {copied ? <p className="text-sm text-siam-blue">Copied {copied}.</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["New", stats.newCount],
          ["Selling", stats.selling],
          ["Buying", stats.buying],
          ["Follow-up", stats.followUp],
          ["Negotiating", stats.negotiating],
          ["Completed", stats.completed],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardContent className="p-4">
              <p className="text-xs text-muted">{label}</p>
              <p className="text-2xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-sm text-muted">Estimated pipeline value: {formatThb(stats.pipelineValue)}</p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input placeholder="Search name, vehicle, lead ID" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">All types</option>
          <option value="sell">Sell</option>
          <option value="buy">Buy</option>
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {VEHICLE_LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2">Lead</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Vehicle</th>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Score</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead) => (
              <tr key={lead.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <Link href={`/admin/vehicle-leads/${lead.id}`} className="font-medium text-siam-blue hover:underline">
                    {lead.leadNumber}
                  </Link>
                  <div className="text-xs text-muted">{new Date(lead.createdAt).toLocaleString()}</div>
                </td>
                <td className="px-3 py-2 uppercase">{lead.type}</td>
                <td className="px-3 py-2">{lead.customerName}</td>
                <td className="px-3 py-2">{lead.displayTitle}</td>
                <td className="px-3 py-2">{lead.province ?? "—"}</td>
                <td className="px-3 py-2">
                  {formatThb(lead.officialListingPrice ?? lead.askingPrice ?? lead.budgetMax)}
                </td>
                <td className="px-3 py-2">{lead.status.replace(/_/g, " ")}</td>
                <td className="px-3 py-2">{lead.aiLeadScore ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? <p className="p-6 text-sm text-muted">No vehicle leads yet.</p> : null}
      </div>
    </div>
  );
}
