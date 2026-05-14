/**
 * Writes prisma/sunset-scooters-batch-listings.ts from live Sunset Scooters listing pages.
 * Scrapes vehicle-specifics table + price + VirtualYard gallery (og:image prefix filter).
 * Run: node scripts/generate-sunset-seed-module.mjs
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

/** All listing page URLs (deduped by slug derived from /buy/{slug-segment}/id) */
const SOURCE_URLS = [
  // Original batch
  "https://sunsetscootersthailand.shop/buy/2015-bmw-r9t-/uwm3IT-24NXmjkbtbBB6Zg",
  "https://sunsetscootersthailand.shop/buy/2022-cfmoto-250nk-/dO0c0J960Hs-SNZx4iscNQ",
  "https://sunsetscootersthailand.shop/buy/2015-ducati-monster-821-/kYIiM2psZRN4XAHEwCNIJQ",
  "https://sunsetscootersthailand.shop/buy/2017-ducati-multistrada-1200-abs-/nVOut4RW3--KolVwG7XJqQ",
  "https://sunsetscootersthailand.shop/buy/2019-honda-cb650-f-/TbQfN1UzDOIl9qKcNkF2Jw",
  "https://sunsetscootersthailand.shop/buy/2022-honda-cb500x-/YtHIXonhrkiZdeF2nfzitA",
  "https://sunsetscootersthailand.shop/buy/2025-honda-nt-1100-dct-/nTnu9u8Te0exV9upvKSdwA",
  "https://sunsetscootersthailand.shop/buy/2016-kawasaki-1400gtr-abs-/Oav8tqjVYCIczjj0SEkkoA",
  "https://sunsetscootersthailand.shop/buy/2021-kawasaki-z-900-abs-sp-/V8e0lkIoem3_OsEy5FjesQ",
  // Added listings
  "https://sunsetscootersthailand.shop/buy/2023-kawasaki-klr-650-/He4vYzv05WW7ZqNdl8NFlw",
  "https://sunsetscootersthailand.shop/buy/2026-indian-scout-bobber-/WulSdUpf8CqHItFw3jMX0w",
  "https://sunsetscootersthailand.shop/buy/2025-honda-forza-350-/m7ERS0TgLTkCwsVzJp7RDQ",
  "https://sunsetscootersthailand.shop/buy/2026-honda-scoopy-i-prestige-/blOE_ThtXboqaX_S4TJCpw",
  "https://sunsetscootersthailand.shop/buy/2024-honda-click-125-/xpqWQgB5xvboSnXP8KcIyg",
  "https://sunsetscootersthailand.shop/buy/2024-honda-click-160-abs-/JeSOen1xD4lhpCEbHFXbUQ",
  "https://sunsetscootersthailand.shop/buy/2023-suzuki-bergman-/pQP-WAKT7OYRtzAzzfeGbw",
  "https://sunsetscootersthailand.shop/buy/2025-suzuki-hayabusa-/rfF-HRx6C9mCFxFqNHoGjA",
  "https://sunsetscootersthailand.shop/buy/2018-triumph-bonneville-bobber-1200-/arT0iBmZDjMm524CRWsN-A",
  "https://sunsetscootersthailand.shop/buy/2025-yamaha-fino-125-/AnBfDt84ZZnVjdza1LoE-w",
  "https://sunsetscootersthailand.shop/buy/2024-yamaha-mt15-/i0JWCkeUsusQFdpb7DbDkw",
  "https://sunsetscootersthailand.shop/buy/2025-yamaha-grand-filano-125-abs-/-MQql36tggQCBa08DKqf5g",
  "https://sunsetscootersthailand.shop/buy/2023-yamaha-mt15-/CwnzzG_QPNcFsCadDn1t_w",
  "https://sunsetscootersthailand.shop/buy/2015-yamaha-tricity-/znXqrjrC-IW8pV8nIv6aQQ",
  "https://sunsetscootersthailand.shop/buy/2023-yamaha-mt-07-/D4D9NRlr7pv2b7onwf2Ovw",
  "https://sunsetscootersthailand.shop/buy/2024-yamaha-r7-/4baw-tW1-CMxwEKMLqvmzg",
  "https://sunsetscootersthailand.shop/buy/2012-yamaha-t-max-/r6wDJdiEmgiLClvh6sfUTw",
  "https://sunsetscootersthailand.shop/buy/2024-yamaha-xsr-155-/1kp-t59q1nDvqv5eiTlroA",
  "https://sunsetscootersthailand.shop/buy/2024-yamaha-pg-115-/rxK878ZwZe9acNkPjLY2lQ",
  "https://sunsetscootersthailand.shop/buy/2025-yamaha-yzf-15-m-abs-/DOpS-LNYr9mUF0XhzucSNw",
  "https://sunsetscootersthailand.shop/buy/2025-yamaha-x-max-300-connect-/yrpdHPsctTOxsqC6LGPGEA",
  "https://sunsetscootersthailand.shop/buy/2020-ktm-390rc-/M-n5eWw6OVAxp983ct1z_g",
  "https://sunsetscootersthailand.shop/buy/2025-zontes-350d-abs-/VqiM4nvfZ_9HYrOmtjSr6A",
];

function slugFromListingUrl(url) {
  const { pathname } = new URL(url);
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 3 || parts[0] !== "buy") {
    throw new Error(`Unexpected listing path: ${pathname}`);
  }
  return parts[1].replace(/-+$/, "");
}

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseVehicleRows(html) {
  const idx = html.indexOf('<table class="vehicle-specifics"');
  if (idx === -1) throw new Error("No vehicle-specifics table");
  const slice = html.slice(idx, idx + 20000);
  const end = slice.indexOf("</table>");
  const table = slice.slice(0, end);
  const map = {};
  const rowRe = /<tr>\s*<td class="title">([^<]+)<\/td>\s*<td class="detail">([\s\S]*?)<\/td>/g;
  let m;
  while ((m = rowRe.exec(table)) !== null) {
    const key = m[1].trim();
    map[key] = stripTags(m[2]);
  }
  return map;
}

function parsePriceThb(html) {
  const m = html.match(/<h4 class="vehicle-price">\s*(?:<[^>]+>\s*)*&#3647;([\d,]+)/);
  if (!m) {
    const m2 = html.match(/<h4 class="vehicle-price">\s*฿([\d,]+)/);
    if (!m2) throw new Error("Could not parse price");
    return parseInt(m2[1].replace(/,/g, ""), 10);
  }
  return parseInt(m[1].replace(/,/g, ""), 10);
}

function parseOdometerKm(odometerRaw) {
  const t = odometerRaw.toLowerCase();
  if (t.includes("new") || /^0\s*km/.test(t)) return 0;
  const digits = t.replace(/,/g, "").match(/(\d+)\s*km/i);
  return digits ? parseInt(digits[1], 10) : 0;
}

function formatTransmission(raw) {
  const t = raw.toLowerCase();
  if (t === "automatic") return "Automatic";
  if (t === "manual") return "Manual";
  return raw;
}

function titleCaseMake(make) {
  if (!make) return "";
  const lower = make.toLowerCase();
  const specials = { bmw: "BMW", ktm: "KTM", cfmoto: "CFMOTO", kawasaki: "Kawasaki", honda: "Honda", yamaha: "Yamaha", ducati: "Ducati", suzuki: "Suzuki", triumph: "Triumph", indian: "Indian", zontes: "Zontes" };
  return specials[lower] ?? make.charAt(0) + make.slice(1).toLowerCase();
}

function normalizePhotoUrl(u) {
  return u.replace("https://virtualyard.com.au/photos//", "https://virtualyard.com.au/photos/");
}

function commonPrefix(strings) {
  if (strings.length === 0) return "";
  let p = strings[0];
  for (const s of strings) {
    while (!s.startsWith(p)) {
      p = p.slice(0, -1);
      if (!p) return "";
    }
  }
  return p;
}

function extractGalleryUrls(html) {
  const ogImages = [
    ...html.matchAll(/property="og:image" content="(https:\/\/virtualyard\.com\.au\/photos\/[^"]+)"/g),
  ].map((x) => normalizePhotoUrl(x[1]));
  if (ogImages.length === 0) throw new Error("No og:image (VirtualYard) on page");
  const prefix = commonPrefix(ogImages);
  const allPhotos = [
    ...html.matchAll(/https:\/\/virtualyard\.com\.au\/photos\/[^"'<> ]+\.jpg/g),
  ].map((x) => normalizePhotoUrl(x[0]));
  let filtered = [...new Set(allPhotos.filter((u) => u.startsWith(prefix)))].sort();
  if (filtered.length < 3) {
    filtered = [...new Set(ogImages)].sort();
  }
  if (filtered.length === 0) throw new Error("No gallery images");
  return filtered;
}

async function fetchHtml(listingUrl) {
  const res = await fetch(listingUrl, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; SiamEZListingSync/1.0)" },
  });
  const html = await res.text();
  if (html.includes("Verify you are human")) {
    throw new Error(`Captcha / blocked: ${listingUrl}`);
  }
  return html;
}

function esc(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

const seen = new Map();
for (const url of SOURCE_URLS) {
  const slug = slugFromListingUrl(url);
  if (seen.has(slug)) {
    process.stderr.write(`Skip duplicate slug ${slug}\n`);
    continue;
  }
  seen.set(slug, url);
}

const rows = [];
for (const [slug, sourceUrl] of seen) {
  process.stderr.write(`Fetching ${slug}...\n`);
  const html = await fetchHtml(sourceUrl);
  const v = parseVehicleRows(html);
  const makeRaw = v.Make;
  const modelRaw = v.Model;
  if (!makeRaw || !modelRaw) throw new Error(`${slug}: missing Make/Model`);

  const year = parseInt(v.Year, 10);
  if (Number.isNaN(year) || year < 1990 || year > new Date().getFullYear() + 2) {
    throw new Error(`${slug}: bad year ${v.Year}`);
  }

  const mileageKm = parseOdometerKm(v.Odometer ?? "0");
  const priceAmount = parsePriceThb(html);
  const transmission = formatTransmission(v.Transmission ?? "manual");
  const condition = v.Condition ?? "—";
  const make = titleCaseMake(makeRaw);
  const model = modelRaw.replace(/\s+/g, " ").trim();
  const title = `${year} ${make} ${model}`;
  const imageUrls = extractGalleryUrls(html);

  const description = [
    `${title} — SiamEZ public inventory.`,
    `Advertised odometer: ${mileageKm === 0 && /new/i.test(v.Odometer ?? "") ? "0 km (advertised as new)" : `${mileageKm.toLocaleString("en-US")} km`}. Transmission: ${transmission}. Condition (advertised): ${condition}.`,
    `Advertised price: THB ${priceAmount.toLocaleString("en-US")} excluding government charges — confirm final pricing and paperwork before purchase.`,
    "SiamEZ Auto & Bike Finder can assist with inspection, negotiation, and transfer — contact us if you want support beyond browsing this inventory.",
  ].join("\\n\\n");

  const specifications = {
    Make: make,
    Model: model,
    Year: String(year),
    "Odometer (advertised)": v.Odometer ?? "—",
    Transmission: transmission,
    "Fuel type": v["Fuel Type"] ?? "Unleaded",
    "Condition (advertised)": condition,
    "Price note": "THB excluding government charges",
  };

  rows.push({
    slug,
    sourceUrl,
    title,
    make,
    model,
    year,
    mileageKm,
    priceAmount,
    imageUrls,
    description,
    specifications,
  });
}

let out = `/**\n * Sunset Scooters Thailand listings — synced for prisma seed (public inventory).\n * Generated by scripts/generate-sunset-seed-module.mjs — re-run to refresh from source pages.\n */\n\n`;
out += `export type SunsetBatchListing = {\n`;
out += `  slug: string;\n  sourceUrl: string;\n  title: string;\n  make: string;\n  model: string;\n  year: number;\n  mileageKm: number;\n  priceAmount: number;\n  imageUrls: string[];\n  description: string;\n  specifications: Record<string, string>;\n};\n\n`;
out += `export const SUNSET_SCOOTERS_BATCH_LISTINGS: SunsetBatchListing[] = [\n`;

for (const r of rows) {
  out += `  {\n`;
  out += `    slug: '${esc(r.slug)}',\n`;
  out += `    sourceUrl: '${esc(r.sourceUrl)}',\n`;
  out += `    title: '${esc(r.title)}',\n`;
  out += `    make: '${esc(r.make)}',\n`;
  out += `    model: '${esc(r.model)}',\n`;
  out += `    year: ${r.year},\n`;
  out += `    mileageKm: ${r.mileageKm},\n`;
  out += `    priceAmount: ${r.priceAmount},\n`;
  out += `    imageUrls: [\n`;
  for (const u of r.imageUrls) {
    out += `      '${esc(u)}',\n`;
  }
  out += `    ],\n`;
  out += `    description: \`${r.description.replace(/`/g, "\\`")}\`,\n`;
  out += `    specifications: {\n`;
  for (const [k, v] of Object.entries(r.specifications)) {
    out += `      '${esc(k)}': '${esc(v)}',\n`;
  }
  out += `    },\n`;
  out += `  },\n`;
}

out += `];\n`;

const dest = join(root, "prisma", "sunset-scooters-batch-listings.ts");
writeFileSync(dest, out, "utf8");
process.stderr.write(`Wrote ${dest} (${rows.length} listings)\n`);
