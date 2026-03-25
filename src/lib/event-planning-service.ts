import type { getTranslations } from "next-intl/server";
import { Briefcase, PartyPopper, Armchair, type LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  briefcase: Briefcase,
  "party-popper": PartyPopper,
  armchair: Armchair,
};

export type EventPlanningServiceDetailContent = {
  subtitle: string;
  overview: string;
  features: Array<{ icon: LucideIcon; title: string; description: string }>;
  requirements: string[];
  processSteps: Array<{ title: string; description: string }>;
  documents: { foreigner: string[]; thaiPartner?: string[] };
  processingTime?: string;
};

type EventPlanningTranslator = Awaited<ReturnType<typeof getTranslations<"eventPlanningVenuePage">>>;

export function buildEventPlanningServiceContent(
  t: EventPlanningTranslator,
): EventPlanningServiceDetailContent {
  const featuresRaw = t.raw("features") as Array<{
    icon: string;
    title: string;
    description: string;
  }>;

  return {
    subtitle: t("subtitle"),
    overview: t("overview"),
    features: featuresRaw.map((f) => ({
      icon: iconMap[f.icon] ?? Briefcase,
      title: f.title,
      description: f.description,
    })),
    requirements: t.raw("requirements") as string[],
    processSteps: t.raw("processSteps") as Array<{ title: string; description: string }>,
    documents: { foreigner: t.raw("documentsForeigner") as string[] },
    processingTime: t("processingTime"),
  };
}
