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

/** Saturated fills so neighbouring provinces stay easy to tell apart on a busy day. */
const HIGHLIGHTS: Record<string, { color: string; textColor: string }> = {
  Bangkok: { color: "#93c5fd", textColor: "#1e3a8a" },
  Chonburi: { color: "#6ee7b7", textColor: "#064e3b" },
  "Chiang Mai": { color: "#c4b5fd", textColor: "#4c1d95" },
  Phuket: { color: "#fdba74", textColor: "#7c2d12" },
  Nonthaburi: { color: "#f9a8d4", textColor: "#831843" },
  "Samut Prakan": { color: "#67e8f9", textColor: "#164e63" },
  "Chiang Rai": { color: "#bef264", textColor: "#365314" },
  Rayong: { color: "#fde047", textColor: "#713f12" },
};

export type ProvinceStyle = { name: string; color: string; textColor: string; accent: string };

const ACCENTS: Record<string, string> = {
  Bangkok: "#1d4ed8",
  Chonburi: "#047857",
  "Chiang Mai": "#6d28d9",
  Phuket: "#c2410c",
  Nonthaburi: "#be185d",
  "Samut Prakan": "#0e7490",
  "Chiang Rai": "#4d7c0f",
  Rayong: "#a16207",
};

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
  if (!canonical) return { name: "Province needed", color: "#d1d5db", textColor: "#111827", accent: "#374151" };
  const highlight = HIGHLIGHTS[canonical];
  const index = THAI_PROVINCE_NAMES.indexOf(canonical);
  const hue = Math.round((index * 137.508) % 360);
  const fillLight = [74, 80, 68][index % 3];
  const accent = ACCENTS[canonical] ?? `hsl(${hue} 78% 30%)`;
  if (highlight) return { name: canonical, ...highlight, accent };
  return {
    name: canonical,
    color: `hsl(${hue} 78% ${fillLight}%)`,
    textColor: `hsl(${hue} 70% 14%)`,
    accent,
  };
}

/** Filled chip colours for a job or appointment, keyed by where it happens. */
export function provinceChipStyle(name: string | null | undefined): {
  backgroundColor: string;
  color: string;
  borderColor: string;
  boxShadow: string;
} {
  const style = provinceStyle(name);
  return {
    backgroundColor: style.color,
    color: style.textColor,
    borderColor: style.accent,
    boxShadow: `inset 5px 0 0 ${style.accent}`,
  };
}

export function provinceOptions(): ThaiProvinceName[] {
  return [...THAI_PROVINCE_NAMES].sort((a, b) => a.localeCompare(b));
}
