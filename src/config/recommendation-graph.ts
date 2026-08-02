/**
 * Configurable recommendation relationships (Platform 2.0).
 * Defaults seed the graph; admin DB edges override/extend at runtime.
 * Never invent service slugs that are not in the catalog.
 */

export type RecommendationTrigger =
  | "motorcycle"
  | "vehicle"
  | "property"
  | "query:motorcycle"
  | "query:vehicle"
  | "query:property";

export type RecommendationTargetKind = "service" | "life_event";

export type RecommendationEdgeDef = {
  /** Stable key for upsert/seed identity. */
  key: string;
  triggerKey: RecommendationTrigger;
  targetKind: RecommendationTargetKind;
  targetKey: string;
  score: number;
  reasonEn: string;
  reasonTh: string;
  sortOrder?: number;
};

/** Default cross-sell graph — editable via admin RecommendationEdge rows. */
export const DEFAULT_RECOMMENDATION_EDGES: RecommendationEdgeDef[] = [
  {
    key: "motorcycle-registration",
    triggerKey: "motorcycle",
    targetKind: "service",
    targetKey: "vehicle-registration",
    score: 100,
    reasonEn: "You viewed a motorcycle — register or transfer ownership with DLT support.",
    reasonTh: "คุณกำลังดูมอเตอร์ไซค์ — จดทะเบียนหรือโอนกรรมสิทธิ์พร้อมช่วยเหลือที่กรมขนส่ง",
    sortOrder: 0,
  },
  {
    key: "motorcycle-finder",
    triggerKey: "motorcycle",
    targetKind: "service",
    targetKey: "car-motorbike-finder-selling-service",
    score: 99,
    reasonEn: "Need help buying or selling a bike? Our Auto & Bike Finder handles paperwork.",
    reasonTh: "ต้องการซื้อ/ขายมอเตอร์ไซค์? บริการหาซื้อรถช่วยเจรจาและเอกสาร",
    sortOrder: 1,
  },
  {
    key: "motorcycle-license",
    triggerKey: "motorcycle",
    targetKind: "service",
    targetKey: "driver-license",
    score: 98,
    reasonEn: "A Thai driver's license (including motorcycle classes) pairs well with a new bike.",
    reasonTh: "ใบขับขี่ไทย (รวมรถจักรยานยนต์) เหมาะกับรถคันใหม่ของคุณ",
    sortOrder: 2,
  },
  {
    key: "vehicle-registration",
    triggerKey: "vehicle",
    targetKind: "service",
    targetKey: "vehicle-registration",
    score: 92,
    reasonEn: "Complete registration, plates, and tax renewals for your vehicle.",
    reasonTh: "จดทะเบียน ป้ายทะเบียน และต่อภาษีรถให้ครบ",
    sortOrder: 0,
  },
  {
    key: "vehicle-finder",
    triggerKey: "vehicle",
    targetKind: "service",
    targetKey: "car-motorbike-finder-selling-service",
    score: 91,
    reasonEn: "Source, negotiate, and transfer vehicles with SiamEZ support.",
    reasonTh: "หา เจรจา และโอนรถพร้อมสนับสนุนจาก SiamEZ",
    sortOrder: 1,
  },
  {
    key: "property-services",
    triggerKey: "property",
    targetKind: "service",
    targetKey: "real-estate-services",
    score: 90,
    reasonEn: "Property viewing, contracts, and buyer/seller support.",
    reasonTh: "ช่วยดูบ้าน สัญญา และสนับสนุนผู้ซื้อ/ผู้ขาย",
    sortOrder: 0,
  },
  {
    key: "property-translation",
    triggerKey: "property",
    targetKind: "service",
    targetKey: "translation-services",
    score: 89,
    reasonEn: "Certified translation for leases, title deeds, and contracts.",
    reasonTh: "แปลเอกสารรับรองสำหรับสัญญาเช่า โฉนด และสัญญา",
    sortOrder: 1,
  },
  {
    key: "property-moving-event",
    triggerKey: "property",
    targetKind: "life_event",
    targetKey: "moving-to-thailand",
    score: 88,
    reasonEn: "Settling in? Follow the Moving to Thailand checklist (home → docs → vehicle).",
    reasonTh: "กำลังย้ายมาอยู่ไทย? ตามเช็กลิสต์ย้ายมาอยู่ประเทศไทย",
    sortOrder: 2,
  },
];

export function edgesForTriggers(
  edges: RecommendationEdgeDef[],
  triggers: RecommendationTrigger[]
): RecommendationEdgeDef[] {
  const set = new Set(triggers);
  return edges
    .filter((e) => set.has(e.triggerKey))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || b.score - a.score);
}
