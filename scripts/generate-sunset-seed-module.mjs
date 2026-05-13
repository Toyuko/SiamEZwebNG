/**
 * Writes prisma/sunset-scooters-batch-listings.ts from live HTML (og:image prefix filter).
 * Run: node scripts/generate-sunset-seed-module.mjs
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const listings = [
  {
    slug: "2015-bmw-r9t",
    sourceUrl: "https://sunsetscootersthailand.shop/buy/2015-bmw-r9t-/uwm3IT-24NXmjkbtbBB6Zg",
    title: "2015 BMW R9T",
    make: "BMW",
    model: "R9T",
    year: 2015,
    mileageKm: 14987,
    priceAmount: 349800,
    transmission: "Manual",
    condition: "Excellent",
  },
  {
    slug: "2022-cfmoto-250nk",
    sourceUrl: "https://sunsetscootersthailand.shop/buy/2022-cfmoto-250nk-/dO0c0J960Hs-SNZx4iscNQ",
    title: "2022 CFMOTO 250NK",
    make: "CFMOTO",
    model: "250NK",
    year: 2022,
    mileageKm: 24123,
    priceAmount: 49800,
    transmission: "Manual",
    condition: "Excellent",
  },
  {
    slug: "2015-ducati-monster-821",
    sourceUrl: "https://sunsetscootersthailand.shop/buy/2015-ducati-monster-821-/kYIiM2psZRN4XAHEwCNIJQ",
    title: "2015 Ducati Monster 821",
    make: "Ducati",
    model: "Monster 821",
    year: 2015,
    mileageKm: 27125,
    priceAmount: 168800,
    transmission: "Manual",
    condition: "Excellent",
  },
  {
    slug: "2017-ducati-multistrada-1200-abs",
    sourceUrl: "https://sunsetscootersthailand.shop/buy/2017-ducati-multistrada-1200-abs-/nVOut4RW3--KolVwG7XJqQ",
    title: "2017 Ducati Multistrada 1200 ABS",
    make: "Ducati",
    model: "Multistrada 1200 ABS",
    year: 2017,
    mileageKm: 40464,
    priceAmount: 299800,
    transmission: "Manual",
    condition: "Good",
  },
  {
    slug: "2019-honda-cb650-f",
    sourceUrl: "https://sunsetscootersthailand.shop/buy/2019-honda-cb650-f-/TbQfN1UzDOIl9qKcNkF2Jw",
    title: "2019 Honda CB650F",
    make: "Honda",
    model: "CB650F",
    year: 2019,
    mileageKm: 28986,
    priceAmount: 119800,
    transmission: "Manual",
    condition: "Excellent",
  },
  {
    slug: "2022-honda-cb500x",
    sourceUrl: "https://sunsetscootersthailand.shop/buy/2022-honda-cb500x-/YtHIXonhrkiZdeF2nfzitA",
    title: "2022 Honda CB500X",
    make: "Honda",
    model: "CB500X",
    year: 2022,
    mileageKm: 23362,
    priceAmount: 174800,
    transmission: "Manual",
    condition: "Excellent",
  },
  {
    slug: "2025-honda-nt-1100-dct",
    sourceUrl: "https://sunsetscootersthailand.shop/buy/2025-honda-nt-1100-dct-/nTnu9u8Te0exV9upvKSdwA",
    title: "2025 Honda NT 1100 DCT",
    make: "Honda",
    model: "NT 1100 DCT",
    year: 2025,
    mileageKm: 346,
    priceAmount: 439800,
    transmission: "Automatic (DCT)",
    condition: "Excellent",
  },
  {
    slug: "2016-kawasaki-1400gtr-abs",
    sourceUrl: "https://sunsetscootersthailand.shop/buy/2016-kawasaki-1400gtr-abs-/Oav8tqjVYCIczjj0SEkkoA",
    title: "2016 Kawasaki 1400GTR ABS",
    make: "Kawasaki",
    model: "1400GTR ABS",
    year: 2016,
    mileageKm: 50291,
    priceAmount: 249800,
    transmission: "Manual",
    condition: "Excellent",
  },
  {
    slug: "2021-kawasaki-z-900-abs-sp",
    sourceUrl: "https://sunsetscootersthailand.shop/buy/2021-kawasaki-z-900-abs-sp-/V8e0lkIoem3_OsEy5FjesQ",
    title: "2021 Kawasaki Z 900 ABS SP",
    make: "Kawasaki",
    model: "Z 900 ABS SP",
    year: 2021,
    mileageKm: 4846,
    priceAmount: 248800,
    transmission: "Manual",
    condition: "Excellent",
  },
];

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

async function fetchImages(listingUrl) {
  const res = await fetch(listingUrl, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; SiamEZListingSync/1.0)" },
  });
  const html = await res.text();
  if (html.includes("Verify you are human")) {
    throw new Error(`Captcha on ${listingUrl}`);
  }
  const ogImages = [
    ...html.matchAll(/property="og:image" content="(https:\/\/virtualyard\.com\.au\/photos\/[^"]+)"/g),
  ].map((m) => normalizePhotoUrl(m[1]));
  if (ogImages.length === 0) {
    throw new Error(`No og:image for ${listingUrl}`);
  }
  const prefix = commonPrefix(ogImages);
  const allPhotos = [
    ...html.matchAll(/https:\/\/virtualyard\.com\.au\/photos\/[^"'<> ]+\.jpg/g),
  ].map((m) => normalizePhotoUrl(m[0]));
  const filtered = [...new Set(allPhotos.filter((u) => u.startsWith(prefix)))].sort();
  if (filtered.length === 0) throw new Error(`No gallery images for ${listingUrl}`);
  return filtered;
}

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

const rows = [];
for (const L of listings) {
  process.stderr.write(`Fetching ${L.slug}...\n`);
  const imageUrls = await fetchImages(L.sourceUrl);
  const description = [
    `${L.title} — mirrored for SiamEZ public inventory from the seller’s listing.`,
    `Advertised odometer: ${L.mileageKm.toLocaleString("en-US")} km. Transmission: ${L.transmission}. Condition (advertised): ${L.condition}.`,
    `Advertised price: THB ${L.priceAmount.toLocaleString("en-US")} excluding government charges — confirm final pricing and paperwork with the seller.`,
    `Source listing: ${L.sourceUrl}`,
    "SiamEZ Auto & Bike Finder can assist with inspection, negotiation, and transfer — contact us if you want support beyond browsing this inventory.",
  ].join("\\n\\n");

  const specs = {
    Make: L.make,
    Model: L.model,
    Year: String(L.year),
    "Odometer (advertised)": `${L.mileageKm.toLocaleString("en-US")} km`,
    Transmission: L.transmission,
    "Fuel type": "Unleaded",
    "Condition (advertised)": L.condition,
    "Price note": "THB excluding government charges (per source listing)",
    "Source listing": L.sourceUrl,
  };

  rows.push({
    ...L,
    imageUrls,
    description,
    specifications: specs,
  });
}

let out = `/**\n * Sunset Scooters Thailand listings — synced for prisma seed (public inventory).\n * Generated by scripts/generate-sunset-seed-module.mjs — re-run to refresh photos from source pages.\n */\n\n`;
out += `export type SunsetBatchListing = {\n`;
out += `  slug: string;\n  sourceUrl: string;\n  title: string;\n  make: string;\n  model: string;\n  year: number;\n  mileageKm: number;\n  priceAmount: number;\n  imageUrls: string[];\n  description: string;\n  specifications: Record<string, string>;\n};\n\n`;
out += `export const SUNSET_SCOOTERS_BATCH_LISTINGS: SunsetBatchListing[] = [\n`;

for (const r of rows) {
  out += `  {\n`;
  out += `    slug: '${r.slug}',\n`;
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
process.stderr.write(`Wrote ${dest}\n`);
