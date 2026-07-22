#!/usr/bin/env node
/**
 * Upload property folders from Google Drive into SalesProperty listings.
 *
 * Usage:
 *   node scripts/import-drive-properties.mjs
 *
 * Requires BLOB_READ_WRITE_TOKEN and DATABASE_URL in .env / .env.local.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { put } from "@vercel/blob";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DRIVE_BASE = String.raw`k:\My Drive\SIAMEZ\Miscellaneous\For sale properties`;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(path.join(ROOT, ".env"));
loadEnvFile(path.join(ROOT, ".env.local"));

const prisma = new PrismaClient();

const IMAGE_RE = /\.(jpe?g|png|webp|gif)$/i;

function toSlug(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function naturalImageSort(a, b) {
  const num = (name) => {
    const m = name.match(/_(\d+)\./);
    return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
  };
  const na = num(a);
  const nb = num(b);
  if (na !== nb) return na - nb;
  return a.localeCompare(b);
}

function listImages(dir) {
  return fs
    .readdirSync(dir)
    .filter((n) => IMAGE_RE.test(n))
    .sort(naturalImageSort)
    .map((n) => path.join(dir, n));
}

async function uploadImages(slug, imagePaths) {
  const urls = [];
  for (let i = 0; i < imagePaths.length; i++) {
    const filePath = imagePaths[i];
    const ext = path.extname(filePath).toLowerCase() || ".jpg";
    const safeName = `${slug}-${String(i + 1).padStart(2, "0")}${ext}`;
    const pathname = `sales-listings/${Date.now()}-${safeName}`;
    const buf = fs.readFileSync(filePath);
    const contentType =
      ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
    process.stdout.write(`  uploading ${i + 1}/${imagePaths.length}: ${path.basename(filePath)} … `);
    const blob = await put(pathname, buf, {
      access: "public",
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    console.log("ok");
    urls.push(blob.url);
  }
  return urls;
}

async function upsertListing(listing) {
  const existing = await prisma.salesProperty.findUnique({
    where: { slug: listing.slug },
    select: { id: true },
  });

  const data = {
    title: listing.title,
    propertyType: listing.propertyType,
    listingType: listing.listingType,
    bedrooms: listing.bedrooms ?? null,
    bathrooms: listing.bathrooms ?? null,
    areaSqm: listing.areaSqm,
    landAreaSqm: listing.landAreaSqm ?? null,
    floor: listing.floor ?? null,
    yearBuilt: listing.yearBuilt ?? null,
    province: listing.province,
    district: listing.district ?? null,
    neighborhood: listing.neighborhood ?? null,
    priceAmount: listing.priceAmount,
    priceCurrency: "THB",
    sellerKind: "private",
    status: "available",
    furnished: listing.furnished ?? "not_applicable",
    heroMediaType: "image",
    heroImageUrl: listing.heroImageUrl,
    heroVideoUrl: null,
    imageUrls: listing.imageUrls,
    videoUrls: [],
    description: listing.description,
    specifications: listing.specifications ?? undefined,
    published: true,
    isBoosted: false,
    boostExpiresAt: null,
    boostTier: null,
  };

  if (existing) {
    const updated = await prisma.salesProperty.update({
      where: { slug: listing.slug },
      data,
    });
    console.log(`Updated listing: ${updated.slug} (${listing.imageUrls.length} photos)`);
    return updated;
  }

  const created = await prisma.salesProperty.create({
    data: { ...data, slug: listing.slug },
  });
  console.log(`Created listing: ${created.slug} (${listing.imageUrls.length} photos)`);
  return created;
}

const PROPERTIES = [
  {
    folder: "Patio Srinakarin Rama 9",
    slug: "townhouse-bangkok-patio-srinakarin-rama-9",
    title: "Patio Srinakarin – Rama 9 Townhouse",
    propertyType: "townhouse",
    listingType: "sale",
    bedrooms: 3,
    bathrooms: 3,
    areaSqm: 141,
    landAreaSqm: null,
    floor: 3,
    province: "Bangkok",
    district: "Suan Luang",
    neighborhood: "Patio Srinakarin – Rama 9",
    priceAmount: 7_500_000,
    furnished: "partially",
    specifications: {
      "Also available for rent": "THB 47,500 / month",
      Parking: "2 cars",
      "Air-conditioning": "5 units",
      Kitchen: "1",
      "Multipurpose room": "1",
      Amenities: "Pool, fitness, clubhouse, park, playground, CCTV, 24-hour security",
      Contact: "property@thaimartin.com / +66 81 720 0643",
    },
    description: [
      "EXCLUSIVE PROPERTY OPPORTUNITY | PATIO SRINAKARIN – RAMA 9",
      "Only 1 unit available for rent — also offered for sale.",
      "A beautifully positioned 3-storey townhouse next to Unico Golf Course, with 141 sq.m. of living space and convenient access to Rama 9, Srinakarin, the Motorway, and Bangkok city centre.",
      "Layout: 3 bedrooms, 1 multipurpose room, 3 bathrooms, 1 kitchen, parking for 2 cars, 5 air-conditioning units, curtains throughout, water pump & storage tank.",
      "Ideal for comfortable family living or professional office use. Residents enjoy a swimming pool, fitness centre, clubhouse, park, children's playground, CCTV, and 24-hour security.",
      "Sale price: THB 7,500,000. Rent: THB 47,500 / month.",
      "Near major shopping centres, hospitals, schools, the Airport Rail Link, and key transport routes.",
      "Contact: property@thaimartin.com · +66 81 720 0643 · +66 89 220 2222 · +66 2 661 6619 / 29",
    ].join("\n\n"),
  },
  {
    folder: "Setthasiri Krungthep Kreetha",
    slug: "house-bangkok-setthasiri-krungthep-kreetha",
    title: "Setthasiri Krungthep Kreetha House for Rent",
    propertyType: "house",
    listingType: "rent",
    bedrooms: 3,
    bathrooms: 4,
    areaSqm: 287,
    landAreaSqm: 481, // 120.20 sq.wa ≈ 480.8 sq.m
    floor: null,
    province: "Bangkok",
    district: "Saphan Sung",
    neighborhood: "Setthasiri Krungthep Kreetha",
    priceAmount: 145_000,
    furnished: "not_applicable",
    specifications: {
      "Living area": "1",
      "Maid room": "1",
      Parking: "2 cars",
      "Land area": "120.20 sq.wa (≈ 481 sq.m)",
      "Usable area": "287 sq.m",
      Developer: "Sansiri Public Company Limited",
      "Current lease expires": "26 June 2026",
      Technology: "Dust-free home technology",
      Contact: "+66 81 720 0643 / +66 89 220 2222",
    },
    description: [
      "Setthasiri Krungthep Kreetha — available for rent.",
      "Single-family home by Sansiri on a main road near the Si Racha Expressway entrance. Project area about 96 rai with dust-free home technology. Homes are freehold (title deed) in Saphan Sung district, adjacent to Bangkok Kreetha Road.",
      "287 sq.m. living space on 120.20 sq.wa of land. Layout: living area, 3 bedrooms, 4 bathrooms, maid room, and parking for 2 cars.",
      "Nearby: Suvarnabhumi Airport, Samitivej Srinakarin Hospital, Lotus Pattana, Paradise Park, CentralFestival EastVille, and Triam Udom Suksa Pattana School.",
      "About 1.75 km from the Si Racha Expressway entrance and close to Hua Mak Airport Rail Link, Rama 9 Road, the new Bangkok Kreetha–Romklao Road, and the future Yellow Line MRT.",
      "Rental price: THB 145,000 / month. Current lease expires 26 June 2026.",
      "Contact: +66 81 720 0643 · +66 89 220 2222",
    ].join("\n\n"),
  },
  {
    folder: "Townhouse for Rent near Mega Bangna & IKEA Suvarnabhumi Airport",
    slug: "townhouse-samut-prakan-pruksa-ville-66-mega-bangna",
    title: "Townhouse for Rent near Mega Bangna & IKEA",
    propertyType: "townhouse",
    listingType: "rent",
    bedrooms: 3,
    bathrooms: 2,
    areaSqm: 120,
    landAreaSqm: null,
    floor: 2,
    province: "Samut Prakan",
    district: "Bang Phli",
    neighborhood: "Pruksa Ville 66/1, Avenue Nam Daeng",
    priceAmount: 20_000,
    furnished: "furnished",
    specifications: {
      Project: "Pruksa Ville 66/1, Avenue Nam Daeng",
      "Air conditioners": "3 (2 bedrooms + living room)",
      Parking: "Covered front parking",
      "Lease terms": "2-month deposit + 1-month advance; min. 1-year contract",
      Utilities: "Water & electricity per government bills",
      Pets: "Not allowed",
      "Company registration": "Not allowed",
      "Foreign tenants": "Welcome",
    },
    description: [
      "Townhouse for rent near Mega Bangna & IKEA / Suvarnabhumi Airport — fully furnished and ready to move in.",
      "Located at Pruksa Ville 66/1, Avenue Nam Daeng, in a peaceful neighborhood near the village entrance for easy parking.",
      "2-storey townhouse with 3 bedrooms, 2 bathrooms, and 3 air conditioners (2 bedrooms + living room). Fully furnished with new furniture, beds & mattresses, dining table & sofa, curtains, mosquito screens & security bars, water heater, water pump & tank, kitchen, and covered front parking.",
      "Nearby: Mega Bangna & IKEA (about 5 minutes), Sarasas Suvarnabhumi School, SISB, Rajavinit Bangkaew School, Concordian International School, The Glass Market Bangna, Market Village Suvarnabhumi, and Suvarnabhumi Airport. Easy access to Bangna-Trad Road and major routes.",
      "Rent: THB 20,000 / month. Water & electricity charged per government bills. Terms: 2-month security deposit + 1-month advance rent; minimum 1-year contract.",
      "Foreign tenants are welcome. No pets. Company registration is not allowed.",
    ].join("\n\n"),
  },
  {
    folder: "2-Storey Townhome for Rent Near Mega Bangna - Fully Furnished & Ready to Move",
    slug: "townhouse-samut-prakan-supalai-bella-mega-bangna",
    title: "2-Storey Townhome for Rent Near Mega Bangna",
    propertyType: "townhouse",
    listingType: "rent",
    bedrooms: 3,
    bathrooms: 2,
    areaSqm: 120,
    landAreaSqm: null,
    floor: 2,
    province: "Samut Prakan",
    district: "Bang Phli",
    neighborhood: "Supalai Bella Kingkaew-Srinakarin (Nam Daeng)",
    priceAmount: 20_900,
    furnished: "furnished",
    specifications: {
      Project: "Supalai Bella Kingkaew-Srinakarin (Nam Daeng)",
      "Air conditioners": "4",
      Kitchen: "Fully equipped (refrigerator, microwave)",
      "Lease terms": "2-month deposit + 1-month advance; min. 1-year lease",
      Utilities: "Water & electricity per government bills",
      Pets: "Not allowed",
      "Company registration": "Not permitted",
      "Foreign tenants": "Welcome",
    },
    description: [
      "2-storey townhome for rent near Mega Bangna — fully furnished and ready to move in.",
      "Located at Supalai Bella Kingkaew-Srinakarin (Nam Daeng), with excellent access to Suvarnabhumi Airport.",
      "3 bedrooms, 2 bathrooms, 4 air conditioners, refrigerator, microwave, water heater, beds & mattresses, fully equipped kitchen, curtains, window screens & security grilles, water pump & storage tank.",
      "Nearby: Mega Bangna & IKEA, Suvarnabhumi Airport, Concordian International School, SISB Suvarnabhumi, plus local markets, convenience stores, and restaurants. Easy access to Bangna-Trad, Srinakarin, Thepharak, and Kanchanaphisek Ring Road.",
      "Rent: THB 20,900 / month. Water & electricity charged according to government utility bills. Move-in: 2 months' security deposit + 1 month's rent in advance; minimum 1-year lease.",
      "Foreign tenants are welcome. No pets allowed. Company registration is not permitted.",
    ].join("\n\n"),
  },
];

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!fs.existsSync(DRIVE_BASE)) {
    throw new Error(`Drive folder not found: ${DRIVE_BASE}`);
  }

  // Resolve folder names (en-dash vs hyphen variants)
  const available = fs.readdirSync(DRIVE_BASE, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const prop of PROPERTIES) {
    const folderName =
      available.find((n) => n === prop.folder) ||
      available.find((n) => n.replace(/[–—]/g, "-") === prop.folder.replace(/[–—]/g, "-"));
    if (!folderName) {
      console.error(`Folder not found for: ${prop.folder}`);
      continue;
    }
    const dir = path.join(DRIVE_BASE, folderName);
    console.log(`\n=== ${prop.title} ===`);
    console.log(`Folder: ${dir}`);
    const images = listImages(dir);
    if (images.length === 0) {
      console.error("No images found — skipping");
      continue;
    }
    console.log(`Found ${images.length} images`);
    const imageUrls = await uploadImages(prop.slug, images);
    await upsertListing({
      ...prop,
      heroImageUrl: imageUrls[0],
      imageUrls,
    });
  }

  const all = await prisma.salesProperty.findMany({
    select: { slug: true, title: true, listingType: true, priceAmount: true, published: true },
    orderBy: { createdAt: "desc" },
  });
  console.log("\nAll sales properties:");
  for (const row of all) {
    console.log(
      `  - [${row.listingType}] ${row.slug} · ${row.priceAmount.toLocaleString()} THB · published=${row.published}`
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
