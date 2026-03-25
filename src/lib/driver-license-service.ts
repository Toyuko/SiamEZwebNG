import type { getTranslations } from "next-intl/server";
import {
  Shield,
  Languages,
  Zap,
  Eye,
  CircleDollarSign,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  shield: Shield,
  languages: Languages,
  zap: Zap,
  eye: Eye,
  "circle-dollar-sign": CircleDollarSign,
  "graduation-cap": GraduationCap,
};

export type ServiceDetailContent = {
  subtitle: string;
  overview: string;
  features: Array<{ icon: LucideIcon; title: string; description: string }>;
  requirements: string[];
  processSteps: Array<{ title: string; description: string }>;
  documents: { foreigner: string[]; thaiPartner?: string[] };
  processingTime?: string;
  visaDuration?: string;
  galleryTitle?: string;
  galleryDescription?: string;
  galleryVideoSrc?: string;
  galleryVideoAriaLabel?: string;
  galleryImages?: Array<{ src: string; alt: string; width: number; height: number }>;
};

type DriverLicenseTranslator = Awaited<ReturnType<typeof getTranslations<"driverLicensePage">>>;

const THAI_LICENSE_GALLERY_BASE = "https://siam-ez.com/assets";
const THAI_LICENSE_PROMO_VIDEO = `${THAI_LICENSE_GALLERY_BASE}/thai-license-promo.mp4`;
const THAI_LICENSE_GALLERY_FILES = [
  "thai-license-customers-1.png",
  "thai-license-service-counter.png",
  "thai-license-success-1.png",
  "thai-license-customers-2.png",
] as const;

export function buildDriverLicenseServiceContent(t: DriverLicenseTranslator): ServiceDetailContent {
  const featuresRaw = t.raw("features") as Array<{
    icon: string;
    title: string;
    description: string;
  }>;
  const galleryAlts = t.raw("galleryImageAlts") as string[];

  return {
    subtitle: t("subtitle"),
    overview: t("overview"),
    features: featuresRaw.map((f) => ({
      icon: iconMap[f.icon] ?? Shield,
      title: f.title,
      description: f.description,
    })),
    requirements: t.raw("requirements") as string[],
    processSteps: t.raw("processSteps") as Array<{ title: string; description: string }>,
    documents: { foreigner: t.raw("documentsForeigner") as string[] },
    processingTime: t("processingTime"),
    galleryTitle: t("galleryTitle"),
    galleryDescription: t("galleryDescription"),
    galleryVideoSrc: THAI_LICENSE_PROMO_VIDEO,
    galleryVideoAriaLabel: t("galleryVideoAriaLabel"),
    galleryImages: THAI_LICENSE_GALLERY_FILES.map((file, i) => ({
      src: `${THAI_LICENSE_GALLERY_BASE}/${file}`,
      alt: galleryAlts[i] ?? "",
      width: 768,
      height: 1024,
    })),
  };
}
