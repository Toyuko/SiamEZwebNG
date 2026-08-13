/** Shared vehicle intake catalogs — used by public forms, admin, and AI. */

export const VEHICLE_FINDER_SERVICE_SLUG = "car-motorbike-finder-selling-service";

export const VEHICLE_LEAD_STATUSES = [
  "new",
  "reviewing",
  "contacted",
  "info_confirmed",
  "price_evaluation",
  "customer_approved",
  "listing_or_search",
  "negotiating",
  "sold_or_purchased",
  "completed",
  "cancelled",
] as const;

export type VehicleLeadStatusValue = (typeof VEHICLE_LEAD_STATUSES)[number];

export const VEHICLE_MEDIA_CATEGORIES = [
  "front",
  "rear",
  "left",
  "right",
  "interior",
  "dashboard",
  "engine",
  "tires",
  "damage",
  "registration",
  "video",
  "other",
] as const;

export type VehicleMediaCategory = (typeof VEHICLE_MEDIA_CATEGORIES)[number];

export const PRIVATE_MEDIA_CATEGORIES: ReadonlySet<string> = new Set(["registration"]);

export const SOCIAL_PHOTO_ORDER: VehicleMediaCategory[] = [
  "front",
  "left",
  "right",
  "rear",
  "interior",
  "dashboard",
  "engine",
  "tires",
  "other",
];

export const CAR_MAKES = [
  "Toyota",
  "Honda",
  "Isuzu",
  "Mazda",
  "Mitsubishi",
  "Nissan",
  "Ford",
  "Chevrolet",
  "Suzuki",
  "Hyundai",
  "Kia",
  "MG",
  "BYD",
  "BMW",
  "Mercedes-Benz",
  "Audi",
  "Volkswagen",
  "Volvo",
  "Lexus",
  "Subaru",
  "Tesla",
  "Peugeot",
  "Other",
] as const;

export const MOTORCYCLE_MAKES = [
  "Honda",
  "Yamaha",
  "Kawasaki",
  "Suzuki",
  "GPX",
  "Vespa",
  "Piaggio",
  "Ducati",
  "BMW",
  "Harley-Davidson",
  "KTM",
  "Triumph",
  "Royal Enfield",
  "CFMoto",
  "Other",
] as const;

export const THAI_PROVINCES = [
  "Bangkok",
  "Amnat Charoen",
  "Ang Thong",
  "Bueng Kan",
  "Buriram",
  "Chachoengsao",
  "Chai Nat",
  "Chaiyaphum",
  "Chanthaburi",
  "Chiang Mai",
  "Chiang Rai",
  "Chonburi",
  "Chumphon",
  "Kalasin",
  "Kamphaeng Phet",
  "Kanchanaburi",
  "Khon Kaen",
  "Krabi",
  "Lampang",
  "Lamphun",
  "Loei",
  "Lopburi",
  "Mae Hong Son",
  "Maha Sarakham",
  "Mukdahan",
  "Nakhon Nayok",
  "Nakhon Pathom",
  "Nakhon Phanom",
  "Nakhon Ratchasima",
  "Nakhon Sawan",
  "Nakhon Si Thammarat",
  "Nan",
  "Narathiwat",
  "Nong Bua Lamphu",
  "Nong Khai",
  "Nonthaburi",
  "Pathum Thani",
  "Pattani",
  "Phang Nga",
  "Phatthalung",
  "Phayao",
  "Phetchabun",
  "Phetchaburi",
  "Phichit",
  "Phitsanulok",
  "Phrae",
  "Phuket",
  "Prachinburi",
  "Prachuap Khiri Khan",
  "Ranong",
  "Ratchaburi",
  "Rayong",
  "Roi Et",
  "Sa Kaeo",
  "Sakon Nakhon",
  "Samut Prakan",
  "Samut Sakhon",
  "Samut Songkhram",
  "Saraburi",
  "Satun",
  "Sing Buri",
  "Sisaket",
  "Songkhla",
  "Sukhothai",
  "Suphan Buri",
  "Surat Thani",
  "Surin",
  "Tak",
  "Trang",
  "Trat",
  "Ubon Ratchathani",
  "Udon Thani",
  "Uthai Thani",
  "Uttaradit",
  "Yala",
  "Yasothon",
] as const;

export const TRANSMISSION_OPTIONS = ["automatic", "manual", "cvt", "dct", "other"] as const;
export const FUEL_OPTIONS = ["gasoline", "diesel", "hybrid", "ev", "lpg", "other"] as const;
export const CONDITION_OPTIONS = ["excellent", "good", "fair", "needs_work"] as const;
export const YES_NO_UNKNOWN = ["yes", "no", "unknown"] as const;
export const OWNERSHIP_OPTIONS = ["owner", "family", "company", "other"] as const;
export const SELL_TIMELINE_OPTIONS = ["asap", "2_weeks", "1_month", "flexible"] as const;
export const CONTACT_METHODS = ["line", "phone", "whatsapp", "email"] as const;
export const CONTACT_TIMES = ["morning", "afternoon", "evening", "anytime"] as const;
export const NEW_OR_USED = ["new", "used", "either"] as const;
export const PURCHASE_PAYMENT = ["cash", "financing", "either"] as const;
export const PURCHASE_TIMEFRAME = ["asap", "1_month", "3_months", "flexible"] as const;

export const LEAD_SOURCES = [
  "line",
  "whatsapp",
  "facebook",
  "instagram",
  "sms",
  "email",
  "staff",
  "website",
  "booking_wizard",
  "other",
] as const;

export function makesForKind(kind: "car" | "motorcycle" | "other"): readonly string[] {
  if (kind === "motorcycle") return MOTORCYCLE_MAKES;
  if (kind === "car") return CAR_MAKES;
  return [...new Set([...CAR_MAKES, ...MOTORCYCLE_MAKES])];
}
