/**
 * Structured Thai provinces for the company calendar.
 * Colours live here so calendar screens do not invent their own palette.
 */

export const THAI_PROVINCE_NAMES = [
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
  "Phra Nakhon Si Ayutthaya",
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

export type ThaiProvinceName = (typeof THAI_PROVINCE_NAMES)[number];

const HIGHLIGHTS: Record<string, { color: string; textColor: string }> = {
  Bangkok: { color: "#dbeafe", textColor: "#1e3a8a" },
  Chonburi: { color: "#d1fae5", textColor: "#064e3b" },
  "Chiang Mai": { color: "#ede9fe", textColor: "#4c1d95" },
  Phuket: { color: "#ffedd5", textColor: "#9a3412" },
  Nonthaburi: { color: "#fce7f3", textColor: "#9d174d" },
  "Samut Prakan": { color: "#e0e7ff", textColor: "#312e81" },
  "Chiang Rai": { color: "#ccfbf1", textColor: "#134e4a" },
  Rayong: { color: "#fef3c7", textColor: "#78350f" },
};

export type ProvinceStyle = { name: string; color: string; textColor: string };

export function normalizeProvince(value: string | null | undefined): ThaiProvinceName | null {
  const raw = value?.trim();
  if (!raw) return null;
  const match = THAI_PROVINCE_NAMES.find((name) => name.toLowerCase() === raw.toLowerCase());
  return match ?? null;
}

export function detectProvince(location: string | null | undefined): ThaiProvinceName | null {
  const text = location?.trim();
  if (!text) return null;
  const ordered = [...THAI_PROVINCE_NAMES].sort((a, b) => b.length - a.length);
  for (const name of ordered) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(?:^|[^a-z])${escaped}(?:[^a-z]|$)`, "i").test(text)) return name;
  }
  return null;
}

/** A staff-chosen province wins. Detection only fills an empty choice. */
export function suggestedProvince(
  selected: string | null | undefined,
  location: string | null | undefined
): ThaiProvinceName | null {
  const raw = selected?.trim() ?? "";
  if (raw) return normalizeProvince(raw);
  return detectProvince(location);
}

export function provinceStyle(name: string | null | undefined): ProvinceStyle {
  const canonical = normalizeProvince(name);
  if (!canonical) return { name: "Province needed", color: "#f3f4f6", textColor: "#1f2937" };
  const highlight = HIGHLIGHTS[canonical];
  if (highlight) return { name: canonical, ...highlight };
  const hue = (THAI_PROVINCE_NAMES.indexOf(canonical) * 47) % 360;
  return { name: canonical, color: `hsl(${hue} 42% 90%)`, textColor: `hsl(${hue} 45% 20%)` };
}

export function provinceOptions(): ThaiProvinceName[] {
  return [...THAI_PROVINCE_NAMES].sort((a, b) => a.localeCompare(b));
}
