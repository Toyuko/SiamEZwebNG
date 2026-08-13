import type { HelpSearchDocument } from "@/lib/search/types";

/**
 * Lightweight help / site stubs for unified search.
 * Points at existing public routes — no CMS required for M3.
 */
export function getHelpSearchStubs(locale: "en" | "th" = "en"): HelpSearchDocument[] {
  const isTh = locale === "th";

  const stubs: Array<{
    id: string;
    titleEn: string;
    titleTh: string;
    subtitleEn: string;
    subtitleTh: string;
    keywords: string[];
    href: string;
  }> = [
    {
      id: "help-contact",
      titleEn: "Contact SiamEZ",
      titleTh: "ติดต่อ SiamEZ",
      subtitleEn: "Get in touch with our team",
      subtitleTh: "ติดต่อทีมงานของเรา",
      keywords: ["contact", "support", "help", "line", "ติดต่อ", "ช่วยเหลือ"],
      href: "/contact",
    },
    {
      id: "help-about",
      titleEn: "About SiamEZ",
      titleTh: "เกี่ยวกับ SiamEZ",
      subtitleEn: "Who we are and how we help",
      subtitleTh: "เราคือใคร และช่วยคุณอย่างไร",
      keywords: ["about", "company", "siamez", "เกี่ยวกับ"],
      href: "/about",
    },
    {
      id: "help-testimonials",
      titleEn: "Customer testimonials & reviews",
      titleTh: "คำรับรองและความคิดเห็นจากลูกค้า",
      subtitleEn: "Google, Facebook, and YouTube reviews from SiamEZ clients",
      subtitleTh: "รีวิวจากลูกค้า SiamEZ บน Google, Facebook และ YouTube",
      keywords: [
        "testimonials",
        "reviews",
        "google",
        "facebook",
        "youtube",
        "คำรับรอง",
        "รีวิว",
      ],
      href: "/testimonials",
    },
    {
      id: "help-services",
      titleEn: "Browse all services",
      titleTh: "ดูบริการทั้งหมด",
      subtitleEn: "Directory of expat & admin services",
      subtitleTh: "ไดเรกทอรีบริการสำหรับชาวต่างชาติ",
      keywords: ["services", "directory", "catalog", "บริการ"],
      href: "/services",
    },
    {
      id: "help-sales",
      titleEn: "Vehicle sales",
      titleTh: "ขายรถยนต์ / มอเตอร์ไซค์",
      subtitleEn: "Browse cars and motorcycles for sale",
      subtitleTh: "ดูรถยนต์และมอเตอร์ไซค์ที่ขาย",
      keywords: ["sales", "cars", "motorcycle", "vehicle", "ขายรถ"],
      href: "/sales",
    },
    {
      id: "help-real-estate",
      titleEn: "Real estate listings",
      titleTh: "อสังหาริมทรัพย์",
      subtitleEn: "Browse properties for sale and rent",
      subtitleTh: "ดูอสังหาฯ ขายและเช่า",
      keywords: ["real estate", "property", "condo", "house", "อสังหา"],
      href: "/real-estate",
    },
    {
      id: "help-goals",
      titleEn: "Goals & life event journeys",
      titleTh: "เป้าหมายและเส้นทางชีวิต",
      subtitleEn: "Track goals and guided checklists in your portal",
      subtitleTh: "ติดตามเป้าหมายและเช็กลิสต์ใน Portal",
      keywords: ["goals", "life event", "journey", "checklist", "portal", "เป้าหมาย"],
      href: "/portal/goals",
    },
  ];

  return stubs.map((s) => {
    const title = isTh ? s.titleTh : s.titleEn;
    const subtitle = isTh ? s.subtitleTh : s.subtitleEn;
    return {
      id: s.id,
      division: "help" as const,
      title,
      subtitle,
      keywords: s.keywords,
      searchText: [title, subtitle, ...s.keywords].join(" "),
      href: s.href,
    };
  });
}
