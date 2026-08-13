"use client";

import { useEffect, useState, useTransition } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { VEHICLE_LEAD_STATUSES } from "@/config/vehicle-intake";
import { formatThb } from "@/lib/vehicle-leads/display";
import { PRICE_ESTIMATE_DISCLAIMER } from "@/lib/vehicle-leads/analysis";
import type { VehicleMarketingPackage } from "@/lib/vehicle-leads/marketing";
import {
  addVehicleLeadNoteAction,
  approveMarketingPackageAction,
  assignVehicleLeadAction,
  convertVehicleLeadAction,
  generateCustomerResponseAction,
  generateMarketingPackageAction,
  generateSoldPostAction,
  recordSocialPostAction,
  saveCustomerResponseAction,
  saveMarketingPackageAction,
  setOfficialListingPriceAction,
  updateVehicleLeadStatusAction,
} from "@/actions/vehicle-leads";
import type { VehicleLeadStatus, VehicleSocialPlatform } from "@prisma/client";

type Staff = { id: string; name: string | null; email: string };

type Lead = {
  id: string;
  leadNumber: string;
  type: "sell" | "buy";
  status: VehicleLeadStatus;
  source: string | null;
  customerName: string;
  customerPhone: string | null;
  customerLineId: string | null;
  customerEmail: string | null;
  preferredContactMethod: string | null;
  preferredContactTime: string | null;
  customerLocation: string | null;
  displayTitle: string;
  province: string | null;
  askingPrice: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
  officialListingPrice: number | null;
  aiEstimatedMin: number | null;
  aiEstimatedMax: number | null;
  aiSuggestedPrice: number | null;
  aiMinAcceptablePrice: number | null;
  aiSummary: string | null;
  aiLeadScore: string | null;
  aiAnalysis: unknown;
  aiCustomerDraft: string | null;
  socialStatus: string;
  assignedStaffId: string | null;
  createdAt: Date | string;
  vehicle: Record<string, unknown> | null;
  media: {
    id: string;
    name: string;
    storageKey: string;
    category: string;
    mediaType: string;
    isPrivate: boolean;
  }[];
  statusHistory: { id: string; fromStatus: string | null; toStatus: string; createdAt: Date | string; note: string | null }[];
  leadNotes: { id: string; content: string; createdAt: Date | string; user: { name: string | null; email: string } }[];
  socialContent: { id: string; language: string; status: string; packageJson: unknown; createdAt: Date | string }[];
  socialPosts: { id: string; platform: string; postUrl: string | null; postedAt: Date | string | null }[];
  case: { id: string; caseNumber: string } | null;
};

const PLATFORMS: VehicleSocialPlatform[] = [
  "facebook",
  "instagram",
  "tiktok",
  "line",
  "whatsapp",
  "marketplace",
];

function analysisOf(lead: Lead) {
  return lead.aiAnalysis && typeof lead.aiAnalysis === "object"
    ? (lead.aiAnalysis as Record<string, unknown>)
    : {};
}

function packageOf(json: unknown): VehicleMarketingPackage | null {
  if (!json || typeof json !== "object") return null;
  return json as VehicleMarketingPackage;
}

function platformText(pkg: VehicleMarketingPackage, platform: VehicleSocialPlatform): string {
  const block = pkg[platform];
  return (
    block.post ||
    block.caption ||
    block.script ||
    block.message ||
    block.description ||
    ""
  );
}

export function VehicleLeadDetailClient({
  lead,
  staff,
}: {
  lead: Lead;
  staff: Staff[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [price, setPrice] = useState(lead.officialListingPrice?.toString() ?? "");
  const [draft, setDraft] = useState(lead.aiCustomerDraft ?? "");
  const [tab, setTab] = useState<VehicleSocialPlatform>("facebook");
  const [lang, setLang] = useState<"en" | "th" | "both">("en");
  const [message, setMessage] = useState<string | null>(null);
  const [soldPost, setSoldPost] = useState<string | null>(null);
  const analysis = analysisOf(lead);
  const latestSocial = lead.socialContent[0];
  const pkg = latestSocial ? packageOf(latestSocial.packageJson) : null;
  const [edited, setEdited] = useState("");

  useEffect(() => {
    if (pkg) setEdited(platformText(pkg, tab));
  }, [pkg, tab, latestSocial?.id]);

  const publicPhotos = lead.media.filter((m) => !m.isPrivate && m.mediaType === "image");

  function run(fn: () => Promise<void>) {
    setMessage(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Action failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted">{lead.leadNumber}</p>
          <h1 className="text-2xl font-bold">
            {lead.type === "sell" ? "SELL" : "FIND"} — {lead.displayTitle}
          </h1>
          <p className="text-sm text-muted">
            {lead.province ?? "—"} · {new Date(lead.createdAt).toLocaleString()} · source {lead.source ?? "website"}
          </p>
        </div>
        {lead.case ? (
          <Button asChild>
            <Link href={`/admin/cases/${lead.case.id}`}>Booking {lead.case.caseNumber}</Link>
          </Button>
        ) : (
          <Button
            disabled={pending}
            onClick={() =>
              run(async () => {
                const created = await convertVehicleLeadAction(lead.id);
                setMessage(`Converted to ${created.caseNumber}`);
              })
            }
          >
            Convert to Booking
          </Button>
        )}
      </div>
      {message ? <p className="text-sm text-siam-blue">{message}</p> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Pipeline</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={lead.status}
              disabled={pending}
              onChange={(e) =>
                run(() => updateVehicleLeadStatusAction(lead.id, e.target.value as VehicleLeadStatus))
              }
            >
              {VEHICLE_LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </Select>
            <Select
              value={lead.assignedStaffId ?? ""}
              disabled={pending}
              onChange={(e) => run(() => assignVehicleLeadAction(lead.id, e.target.value || null))}
            >
              <option value="">Unassigned</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.name || s.email}</option>
              ))}
            </Select>
            <ol className="max-h-40 space-y-1 overflow-auto text-xs text-muted">
              {lead.statusHistory.map((h) => (
                <li key={h.id}>
                  {h.fromStatus ?? "—"} → {h.toStatus} · {new Date(h.createdAt).toLocaleString()}
                  {h.note ? ` · ${h.note}` : ""}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{lead.customerName}</p>
            <p>{lead.customerPhone ?? "No phone"}</p>
            <p>LINE: {lead.customerLineId ?? "—"}</p>
            <p>{lead.customerEmail ?? "No email"}</p>
            <p>Prefer {lead.preferredContactMethod ?? "—"} / {lead.preferredContactTime ?? "—"}</p>
            <p>{lead.customerLocation ?? "—"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>Asking: {formatThb(lead.askingPrice)}</p>
            <p>Budget: {formatThb(lead.budgetMin)} – {formatThb(lead.budgetMax)}</p>
            <p>AI range (estimate): {formatThb(lead.aiEstimatedMin)} – {formatThb(lead.aiEstimatedMax)}</p>
            <p>AI suggested (estimate): {formatThb(lead.aiSuggestedPrice)}</p>
            <p className="text-xs text-muted">{PRICE_ESTIMATE_DISCLAIMER}</p>
            <label className="block text-xs font-medium">Official listing price</label>
            <div className="flex gap-2">
              <Input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  run(() =>
                    setOfficialListingPriceAction(lead.id, price.trim() ? Number(price) : null)
                  )
                }
              >
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>AI analysis</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Score:</strong> {lead.aiLeadScore ?? "—"}</p>
          <p>{lead.aiSummary}</p>
          <p>{String(analysis.conditionAssessment ?? "")}</p>
          <p><strong>Missing:</strong> {Array.isArray(analysis.missingInformation) ? analysis.missingInformation.join(", ") : "—"}</p>
          <p><strong>Concerns:</strong> {Array.isArray(analysis.potentialConcerns) ? analysis.potentialConcerns.join(" ") : "—"}</p>
          <p><strong>Next:</strong> {String(analysis.recommendedNextAction ?? "")}</p>
          <p><strong>Service:</strong> {String(analysis.recommendedService ?? "")}</p>
          <p className="text-xs text-muted">{PRICE_ESTIMATE_DISCLAIMER}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Customer response (review before sending)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea rows={5} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={pending} onClick={() => run(async () => { const text = await generateCustomerResponseAction(lead.id, "en"); setDraft(text); })}>
              Generate English
            </Button>
            <Button type="button" variant="outline" disabled={pending} onClick={() => run(async () => { const text = await generateCustomerResponseAction(lead.id, "th"); setDraft(text); })}>
              Generate Thai
            </Button>
            <Button type="button" disabled={pending} onClick={() => run(() => saveCustomerResponseAction(lead.id, draft))}>
              Save draft
            </Button>
            <Button type="button" variant="outline" onClick={() => void navigator.clipboard.writeText(draft)}>
              Copy
            </Button>
          </div>
          <p className="text-xs text-muted">Do not send AI pricing or promises without review. Copy and send via LINE/WhatsApp yourself.</p>
        </CardContent>
      </Card>

      {lead.vehicle ? (
        <Card>
          <CardHeader><CardTitle>Vehicle details</CardTitle></CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            {Object.entries(lead.vehicle)
              .filter(([key, value]) => !["id", "leadId", "createdAt", "updatedAt"].includes(key) && value != null && value !== "")
              .map(([key, value]) => (
                <div key={key}>
                  <span className="text-muted">{key}: </span>
                  {String(value)}
                </div>
              ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle>Photos & documents</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {lead.media.map((m) => (
            <div key={m.id} className="rounded-lg border border-border p-2 text-xs">
              <p className="font-medium">{m.category}{m.isPrivate ? " (private)" : ""}</p>
              {m.mediaType === "image" && !m.isPrivate && m.storageKey.startsWith("http") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.storageKey} alt={m.name} className="mt-2 h-32 w-full rounded object-cover" />
              ) : (
                <p className="mt-2 break-all">{m.name}</p>
              )}
            </div>
          ))}
          {lead.media.length === 0 ? <p className="text-sm text-muted">No media uploaded.</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Social media listing</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Select value={lang} onChange={(e) => setLang(e.target.value as typeof lang)}>
              <option value="en">English</option>
              <option value="th">Thai</option>
              <option value="both">English + Thai</option>
            </Select>
            <Button
              type="button"
              disabled={pending || lead.type !== "sell"}
              onClick={() => run(async () => { await generateMarketingPackageAction(lead.id, lang); })}
            >
              Generate marketing package
            </Button>
          </div>
          {lead.type !== "sell" ? <p className="text-sm text-muted">Social listings are for sell leads.</p> : null}
          {pkg ? (
            <>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => (
                  <Button key={p} type="button" size="sm" variant={tab === p ? "default" : "outline"} onClick={() => setTab(p)}>
                    {p}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted">Status: {latestSocial?.status} · Official price used: {pkg.priceIsOfficial ? "yes" : "no"}</p>
              <Textarea rows={10} value={edited} onChange={(e) => setEdited(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => void navigator.clipboard.writeText(edited)}>Copy text</Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending || !latestSocial}
                  onClick={() =>
                    run(async () => {
                      if (!latestSocial || !pkg) return;
                      const next = { ...pkg, [tab]: { ...pkg[tab], post: edited, caption: edited, message: edited, description: edited } };
                      await saveMarketingPackageAction(latestSocial.id, next);
                    })
                  }
                >
                  Save edits
                </Button>
                <Button type="button" disabled={pending || !latestSocial} onClick={() => run(async () => { if (latestSocial) await approveMarketingPackageAction(latestSocial.id); })}>
                  Approve
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (navigator.share) void navigator.share({ title: pkg.officialTitle, text: edited });
                  }}
                >
                  Share
                </Button>
              </div>
              {pkg.headlines?.length ? (
                <div>
                  <p className="text-xs font-medium">Headlines</p>
                  <ul className="list-disc pl-5 text-sm">{pkg.headlines.map((h) => <li key={h}>{h}</li>)}</ul>
                </div>
              ) : null}
              {pkg.sellingPoints?.length ? (
                <p className="text-sm">Selling points: {pkg.sellingPoints.join(" · ")}</p>
              ) : null}
              <p className="text-xs text-muted">Recommended public photos (documents excluded): {pkg.imageRecommendations.map((i) => i.category).join(", ") || "none"}</p>
            </>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  setSoldPost(await generateSoldPostAction(lead.id, lang === "th" ? "th" : "en"));
                })
              }
            >
              Generate sold post
            </Button>
          </div>
          {soldPost ? (
            <Textarea readOnly value={soldPost} />
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            {PLATFORMS.map((platform) => (
              <Button
                key={platform}
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => run(() => recordSocialPostAction({ leadId: lead.id, platform }))}
              >
                Mark {platform} posted
              </Button>
            ))}
          </div>
          {publicPhotos[0] && publicPhotos[0].storageKey.startsWith("http") ? (
            <SocialGraphicPreview
              imageUrl={publicPhotos[0].storageKey}
              title={lead.displayTitle}
              price={formatThb(lead.officialListingPrice ?? lead.askingPrice)}
              location={lead.province ?? ""}
            />
          ) : (
            <p className="text-xs text-muted">Add a public vehicle photo to create a branded graphic.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Internal note" />
          <Button type="button" disabled={pending || !note.trim()} onClick={() => run(async () => { await addVehicleLeadNoteAction(lead.id, note); setNote(""); })}>
            Add note
          </Button>
          <ul className="space-y-2 text-sm">
            {lead.leadNotes.map((n) => (
              <li key={n.id} className="rounded-lg bg-muted/40 p-3">
                <p>{n.content}</p>
                <p className="text-xs text-muted">{n.user.name || n.user.email} · {new Date(n.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function SocialGraphicPreview({
  imageUrl,
  title,
  price,
  location,
}: {
  imageUrl: string;
  title: string;
  price: string;
  location: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <p className="px-3 py-2 text-xs font-medium">SiamEZ branded graphic preview (public info only)</p>
      <div className="relative aspect-square bg-siam-blue">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="h-full w-full object-cover opacity-90" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
          <p className="text-xs uppercase tracking-wide">SiamEZ</p>
          <p className="text-lg font-semibold">{title}</p>
          <p>{price} · {location}</p>
          <p className="text-xs">LINE @siamez</p>
        </div>
      </div>
    </div>
  );
}
