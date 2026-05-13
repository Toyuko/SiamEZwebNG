/**
 * Seed services from siam-ez.com content and optional admin user.
 * Run: npm run db:seed (requires DATABASE_URL and prisma migrate/deploy or db push).
 */

import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import {
  BENELLI_TRK_502X_IMAGE_URLS,
  BENELLI_TRK_502X_SLUG,
  benelliTrk502xListingDescription,
  benelliTrk502xSpecifications,
} from "./benelli-trk-502x-listing";
import {
  KAWASAKI_NINJA_ZX636R_2003_IMAGE_URLS,
  KAWASAKI_NINJA_ZX636R_2003_SLUG,
  kawasakiNinjaZx636r2003Description,
  kawasakiNinjaZx636r2003Specifications,
} from "./kawasaki-ninja-zx636r-2003-listing";
import {
  DUCATI_PANIGALE_R_2015_IMAGE_URLS,
  DUCATI_PANIGALE_R_2015_SLUG,
  ducatiPanigaleR2015Description,
  ducatiPanigaleR2015Specifications,
} from "./ducati-panigale-r-2015-listing";
import { SUNSET_SCOOTERS_BATCH_LISTINGS } from "./sunset-scooters-batch-listings";

const prisma = new PrismaClient();

const services = [
  {
    slug: "marriage-registration",
    name: "Marriage Registration",
    shortDescription: "Complete assistance with Thai marriage registration, documentation, and legal requirements.",
    description: "We provide full support for marriage registration in Thailand, including documentation preparation, translation of required documents, and guidance through the legal process at the district office (Amphur).",
    type: "quote" as const,
    sortOrder: 1,
  },
  {
    slug: "translation-services",
    name: "Translation Services",
    shortDescription: "Certified translations for official documents, legal paperwork, and government submissions.",
    description: "Certified translation services for official documents, legal paperwork, and government submissions. Our translations are accepted by Thai authorities and embassies.",
    type: "quote" as const,
    sortOrder: 2,
  },
  {
    slug: "driver-license",
    name: "Driver's License",
    shortDescription:
      "Thai driver's license under 2026 DLT rules: conversion, renewal, new car/bike, IDP, FastTrack, and bilingual coordinators in Bangkok.",
    description:
      "Fast-track appointments, exam prep, and escorted DLT visits for conversion, renewal, new licenses, and IDP — updated for 2026 health, address, and theory requirements.",
    type: "quote" as const,
    sortOrder: 3,
  },
  {
    slug: "police-clearance",
    name: "Police Clearance",
    shortDescription: "Assistance with police clearance certificates and background checks for visas.",
    description: "Assistance with police clearance certificates and background checks required for visa applications and other official purposes in Thailand.",
    type: "quote" as const,
    sortOrder: 4,
  },
  {
    slug: "visa-services",
    name: "Visa Services",
    shortDescription: "Professional guidance on visa applications, extensions, and immigration matters.",
    description: "Professional guidance on visa applications, extensions, and immigration matters. We help with tourist visas, long-term stays, retirement visas, and business-related immigration.",
    type: "quote" as const,
    sortOrder: 5,
  },
  {
    slug: "construction-handyman",
    name: "Construction & Handyman",
    shortDescription: "Professional home repairs, renovations, and construction services for residential and commercial properties.",
    description: "Professional home repairs, renovations, and construction services for residential and commercial properties in Thailand.",
    type: "quote" as const,
    sortOrder: 6,
  },
  {
    slug: "car-motorbike-finder-selling-service",
    name: "Car & Motorbike Finding and Selling Service",
    shortDescription:
      "Buy or sell cars and motorcycles in Thailand with full negotiation, paperwork, and registration support from start to finish.",
    description:
      "SiamEZ Auto & Bike Finder helps you buy or sell cars, motorcycles, vans, and big bikes in Thailand. We handle sourcing, negotiation, paperwork, and registration with transparent support for locals and expats.",
    type: "quote" as const,
    sortOrder: 7,
  },
  {
    slug: "vehicle-registration",
    name: "Vehicle Registration",
    shortDescription:
      "Professional car and motorcycle registration in Bangkok — 1-day process for BKK plates; DLT paperwork and renewals handled for you.",
    description:
      "Professional vehicle registration assistance across Thailand: ownership transfers, tax and insurance renewals, plate changes, book updates, and lost book replacement. Bangkok one-day processing for qualifying BKK-plated cars and motorcycles; other provinces quoted on inquiry. Service fees are transparent; DLT fees are separate.",
    type: "quote" as const,
    sortOrder: 8,
  },
  {
    slug: "transportation-services",
    name: "Transportation Services",
    shortDescription: "Reliable airport transfers, city tours, and inter-city transportation with comfortable vehicles.",
    description: "Reliable airport transfers, city tours, and inter-city transportation with comfortable vehicles. Book for a single trip or regular transfers.",
    type: "quote" as const,
    sortOrder: 9,
  },
  {
    slug: "private-driver-service",
    name: "Private Driver Service",
    shortDescription: "Professional private drivers for daily use, business trips, or special occasions with flexible packages.",
    description: "Professional private drivers for daily use, business trips, or special occasions. Flexible hourly, daily, or monthly packages available.",
    type: "quote" as const,
    sortOrder: 10,
  },
  {
    slug: "basic-translation",
    name: "Basic Translation (Fixed Price)",
    shortDescription: "Simple document translation with fixed pricing per page.",
    description: "Simple certified translation for standard documents. Fixed price per page - pay immediately upon booking.",
    type: "fixed" as const,
    priceAmount: 50000, // 500 THB in satang (smallest unit)
    priceCurrency: "THB",
    sortOrder: 11,
  },
  {
    slug: "event-planning-venue-services",
    name: "Event Planning and Venue Services",
    shortDescription:
      "Event planning and venue services in partnership with The Red Door Bkk.",
    description:
      "We have partnered with The Red Door Bkk to bring you exceptional event planning and venue services.",
    type: "quote" as const,
    sortOrder: 12,
  },
];

async function main() {
  for (const s of services) {
    await prisma.service.upsert({
      where: { slug: s.slug },
      create: s,
      update: {
        name: s.name,
        shortDescription: s.shortDescription,
        description: s.description,
        type: s.type,
        sortOrder: s.sortOrder,
      },
    });
  }
  console.log("Seeded", services.length, "services.");

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@siamez.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMeInProduction!";
  const hash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: "Admin",
      role: "admin",
      passwordHash: hash,
    },
    update: {},
  });
  console.log("Admin user ensured:", adminEmail);

  // Common typo / brand-style email (same password as SEED_ADMIN_PASSWORD)
  const brandAdminEmail = "siam@siamez.com";
  if (brandAdminEmail !== adminEmail.toLowerCase()) {
    await prisma.user.upsert({
      where: { email: brandAdminEmail },
      create: {
        email: brandAdminEmail,
        name: "Admin",
        role: "admin",
        passwordHash: hash,
      },
      update: {},
    });
    console.log("Admin user ensured:", brandAdminEmail);
  }

  const customerEmail = process.env.SEED_CUSTOMER_EMAIL ?? "customer@example.com";
  const customerPassword = process.env.SEED_CUSTOMER_PASSWORD ?? "Customer123!";
  const customerHash = await bcrypt.hash(customerPassword, 10);
  await prisma.user.upsert({
    where: { email: customerEmail },
    create: {
      email: customerEmail,
      name: "Alex Thompson",
      role: "customer",
      passwordHash: customerHash,
    },
    update: {},
  });
  console.log("Customer user ensured:", customerEmail);

  const adminForListings = await prisma.user.findFirst({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const heroUrl = BENELLI_TRK_502X_IMAGE_URLS[0];
  if (!heroUrl) {
    console.warn("Benelli TRK 502X seed skipped: no image URLs.");
  } else {
    await prisma.salesVehicle.upsert({
      where: { slug: BENELLI_TRK_502X_SLUG },
      create: {
        slug: BENELLI_TRK_502X_SLUG,
        title: "2022 Benelli TRK 502X ABS",
        make: "Benelli",
        model: "TRK 502X ABS",
        year: 2022,
        mileageKm: 6898,
        priceAmount: 149_800,
        priceCurrency: "THB",
        category: "motorcycle",
        status: "available",
        heroMediaType: "image",
        heroImageUrl: heroUrl,
        heroVideoUrl: null,
        imageUrls: BENELLI_TRK_502X_IMAGE_URLS,
        videoUrls: [],
        description: benelliTrk502xListingDescription,
        specifications: benelliTrk502xSpecifications,
        published: true,
        createdById: adminForListings?.id ?? null,
      },
      update: {
        title: "2022 Benelli TRK 502X ABS",
        make: "Benelli",
        model: "TRK 502X ABS",
        year: 2022,
        mileageKm: 6898,
        priceAmount: 149_800,
        priceCurrency: "THB",
        category: "motorcycle",
        status: "available",
        heroMediaType: "image",
        heroImageUrl: heroUrl,
        heroVideoUrl: null,
        imageUrls: BENELLI_TRK_502X_IMAGE_URLS,
        videoUrls: [],
        description: benelliTrk502xListingDescription,
        specifications: benelliTrk502xSpecifications,
        published: true,
      },
    });
    console.log("Sales listing upserted:", BENELLI_TRK_502X_SLUG, `(${BENELLI_TRK_502X_IMAGE_URLS.length} photos)`);
  }

  const kawasakiHeroUrl = KAWASAKI_NINJA_ZX636R_2003_IMAGE_URLS[0];
  if (!kawasakiHeroUrl) {
    console.warn("Kawasaki Ninja ZX-636R seed skipped: no image URLs.");
  } else {
    await prisma.salesVehicle.upsert({
      where: { slug: KAWASAKI_NINJA_ZX636R_2003_SLUG },
      create: {
        slug: KAWASAKI_NINJA_ZX636R_2003_SLUG,
        title: "2003 Kawasaki Ninja ZX-636R",
        make: "Kawasaki",
        model: "Ninja ZX-636R",
        year: 2003,
        mileageKm: 41_000,
        priceAmount: 109_000,
        priceCurrency: "THB",
        category: "motorcycle",
        status: "available",
        heroMediaType: "image",
        heroImageUrl: kawasakiHeroUrl,
        heroVideoUrl: null,
        imageUrls: KAWASAKI_NINJA_ZX636R_2003_IMAGE_URLS,
        videoUrls: [],
        description: kawasakiNinjaZx636r2003Description,
        specifications: kawasakiNinjaZx636r2003Specifications,
        published: true,
        createdById: adminForListings?.id ?? null,
      },
      update: {
        title: "2003 Kawasaki Ninja ZX-636R",
        make: "Kawasaki",
        model: "Ninja ZX-636R",
        year: 2003,
        mileageKm: 41_000,
        priceAmount: 109_000,
        priceCurrency: "THB",
        category: "motorcycle",
        status: "available",
        heroMediaType: "image",
        heroImageUrl: kawasakiHeroUrl,
        heroVideoUrl: null,
        imageUrls: KAWASAKI_NINJA_ZX636R_2003_IMAGE_URLS,
        videoUrls: [],
        description: kawasakiNinjaZx636r2003Description,
        specifications: kawasakiNinjaZx636r2003Specifications,
        published: true,
      },
    });
    console.log(
      "Sales listing upserted:",
      KAWASAKI_NINJA_ZX636R_2003_SLUG,
      `(${KAWASAKI_NINJA_ZX636R_2003_IMAGE_URLS.length} photos)`
    );
  }

  const ducatiHeroUrl = DUCATI_PANIGALE_R_2015_IMAGE_URLS[0];
  if (!ducatiHeroUrl) {
    console.warn("Ducati Panigale R seed skipped: no image URLs.");
  } else {
    await prisma.salesVehicle.upsert({
      where: { slug: DUCATI_PANIGALE_R_2015_SLUG },
      create: {
        slug: DUCATI_PANIGALE_R_2015_SLUG,
        title: "2015 Ducati Panigale R",
        make: "Ducati",
        model: "Panigale R",
        year: 2015,
        mileageKm: 17_200,
        priceAmount: 450_000,
        priceCurrency: "THB",
        category: "motorcycle",
        status: "available",
        heroMediaType: "image",
        heroImageUrl: ducatiHeroUrl,
        heroVideoUrl: null,
        imageUrls: DUCATI_PANIGALE_R_2015_IMAGE_URLS,
        videoUrls: [],
        description: ducatiPanigaleR2015Description,
        specifications: ducatiPanigaleR2015Specifications,
        published: true,
        createdById: adminForListings?.id ?? null,
      },
      update: {
        title: "2015 Ducati Panigale R",
        make: "Ducati",
        model: "Panigale R",
        year: 2015,
        mileageKm: 17_200,
        priceAmount: 450_000,
        priceCurrency: "THB",
        category: "motorcycle",
        status: "available",
        heroMediaType: "image",
        heroImageUrl: ducatiHeroUrl,
        heroVideoUrl: null,
        imageUrls: DUCATI_PANIGALE_R_2015_IMAGE_URLS,
        videoUrls: [],
        description: ducatiPanigaleR2015Description,
        specifications: ducatiPanigaleR2015Specifications,
        published: true,
      },
    });
    console.log(
      "Sales listing upserted:",
      DUCATI_PANIGALE_R_2015_SLUG,
      `(${DUCATI_PANIGALE_R_2015_IMAGE_URLS.length} photos)`
    );
  }

  for (const listing of SUNSET_SCOOTERS_BATCH_LISTINGS) {
    const hero = listing.imageUrls[0];
    if (!hero) {
      console.warn("Sunset batch listing skipped (no images):", listing.slug);
      continue;
    }
    await prisma.salesVehicle.upsert({
      where: { slug: listing.slug },
      create: {
        slug: listing.slug,
        title: listing.title,
        make: listing.make,
        model: listing.model,
        year: listing.year,
        mileageKm: listing.mileageKm,
        priceAmount: listing.priceAmount,
        priceCurrency: "THB",
        category: "motorcycle",
        status: "available",
        heroMediaType: "image",
        heroImageUrl: hero,
        heroVideoUrl: null,
        imageUrls: listing.imageUrls,
        videoUrls: [],
        description: listing.description,
        specifications: listing.specifications,
        published: true,
        createdById: adminForListings?.id ?? null,
      },
      update: {
        title: listing.title,
        make: listing.make,
        model: listing.model,
        year: listing.year,
        mileageKm: listing.mileageKm,
        priceAmount: listing.priceAmount,
        priceCurrency: "THB",
        category: "motorcycle",
        status: "available",
        heroMediaType: "image",
        heroImageUrl: hero,
        heroVideoUrl: null,
        imageUrls: listing.imageUrls,
        videoUrls: [],
        description: listing.description,
        specifications: listing.specifications,
        published: true,
      },
    });
    console.log("Sales listing upserted:", listing.slug, `(${listing.imageUrls.length} photos)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
