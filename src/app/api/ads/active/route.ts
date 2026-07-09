import { ok, fail } from "@/lib/api-response";
import { getRandomActiveAdCampaign } from "@/data-access/company";

export async function GET() {
  try {
    const campaign = await getRandomActiveAdCampaign();
    if (!campaign) {
      return ok(null);
    }
    return ok({
      id: campaign.id,
      title: campaign.title,
      imageUrl: campaign.imageUrl,
      targetUrl: campaign.targetUrl,
      company: campaign.company,
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Failed to fetch ad", 500);
  }
}
