/**
 * Seed services from siam-ez.com content and optional admin user.
 * Run: npm run db:seed (requires DATABASE_URL and prisma migrate/deploy or db push).
 */

import { Prisma, PrismaClient } from "@prisma/client";
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
import {
  HONDA_CB650F_2013_IMAGE_URLS,
  HONDA_CB650F_2013_SLUG,
  hondaCb650f2013Description,
  hondaCb650f2013Specifications,
} from "./honda-cb650f-2013-listing";
import {
  MAZDA_2_SEDAN_2017_IMAGE_URLS,
  MAZDA_2_SEDAN_2017_SLUG,
  mazda2Sedan2017Description,
  mazda2Sedan2017Specifications,
} from "./mazda-2-sedan-2017-listing";
import { SUNSET_SCOOTERS_BATCH_LISTINGS } from "./sunset-scooters-batch-listings";

const prisma = new PrismaClient();

function assertSeedAllowed(): void {
  const vercelEnv = process.env.VERCEL_ENV;
  const allow =
    process.env.ALLOW_PRODUCTION_SEED === "true" ||
    process.env.ALLOW_PRODUCTION_SEED === "1";
  if ((vercelEnv === "production" || vercelEnv === "preview") && !allow) {
    throw new Error(
      "Refusing to seed on Vercel production/preview. Set ALLOW_PRODUCTION_SEED=true only if intentional."
    );
  }
  if (process.env.NODE_ENV === "production" && vercelEnv === "production" && !allow) {
    throw new Error(
      "Refusing to seed production database. Set ALLOW_PRODUCTION_SEED=true only if intentional."
    );
  }
}

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
    slug: "real-estate-services",
    name: "Real Estate Services",
    shortDescription:
      "Buy, sell, rent, or invest in property across Thailand — simple, safe, and stress-free with a trusted local team.",
    description:
      "SiamEZ Real Estate Services helps you buy, sell, rent, or invest in property across Thailand. From finding the right home or condo to viewing, negotiation, and transfer, we make property simple, safe, and stress-free with a bilingual Thai & English speaking team.",
    type: "quote" as const,
    sortOrder: 7,
  },
  {
    slug: "car-motorbike-finder-selling-service",
    name: "Car & Motorbike Finding and Selling Service",
    shortDescription:
      "Buy or sell cars and motorcycles in Thailand with full negotiation, paperwork, and registration support from start to finish.",
    description:
      "SiamEZ Auto & Bike Finder helps you buy or sell cars, motorcycles, vans, and big bikes in Thailand. We handle sourcing, negotiation, paperwork, and registration with transparent support for locals and expats.",
    type: "quote" as const,
    sortOrder: 8,
  },
  {
    slug: "vehicle-registration",
    name: "Vehicle Registration",
    shortDescription:
      "Professional car and motorcycle registration in Bangkok — 1-day process for BKK plates; DLT paperwork and renewals handled for you.",
    description:
      "Professional vehicle registration assistance across Thailand: ownership transfers, tax and insurance renewals, plate changes, book updates, and lost book replacement. Bangkok one-day processing for qualifying BKK-plated cars and motorcycles; other provinces quoted on inquiry. Service fees are transparent; DLT fees are separate.",
    type: "quote" as const,
    sortOrder: 9,
  },
  {
    slug: "transportation-services",
    name: "Transportation Services",
    shortDescription: "Reliable airport transfers, city tours, and inter-city transportation with comfortable vehicles.",
    description: "Reliable airport transfers, city tours, and inter-city transportation with comfortable vehicles. Book for a single trip or regular transfers.",
    type: "quote" as const,
    sortOrder: 10,
  },
  {
    slug: "private-driver-service",
    name: "Private Driver Service",
    shortDescription: "Professional private drivers for daily use, business trips, or special occasions with flexible packages.",
    description: "Professional private drivers for daily use, business trips, or special occasions. Flexible hourly, daily, or monthly packages available.",
    type: "quote" as const,
    sortOrder: 11,
  },
  {
    slug: "basic-translation",
    name: "Basic Translation (Fixed Price)",
    shortDescription: "Simple document translation with fixed pricing per page.",
    description: "Simple certified translation for standard documents. Fixed price per page - pay immediately upon booking.",
    type: "fixed" as const,
    priceAmount: 50000, // 500 THB in satang (smallest unit)
    priceCurrency: "THB",
    sortOrder: 12,
  },
  {
    slug: "event-planning-venue-services",
    name: "Event Planning and Venue Services",
    shortDescription:
      "Event planning and venue services in partnership with The Red Door Bkk.",
    description:
      "We have partnered with The Red Door Bkk to bring you exceptional event planning and venue services.",
    type: "quote" as const,
    sortOrder: 13,
  },
];

async function main() {
  assertSeedAllowed();

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

  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@siamez.com").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMeInProduction!";
  const hash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: "Admin",
      role: "admin",
      passwordHash: hash,
      active: true,
    },
    update: {
      name: "Admin",
      role: "admin",
      passwordHash: hash,
      active: true,
    },
  });
  console.log("Admin user ensured:", adminEmail);

  // Common typo / brand-style email (same password as SEED_ADMIN_PASSWORD)
  const brandAdminEmail = "siam@siamez.com";
  if (brandAdminEmail !== adminEmail) {
    await prisma.user.upsert({
      where: { email: brandAdminEmail },
      create: {
        email: brandAdminEmail,
        name: "Admin",
        role: "admin",
        passwordHash: hash,
        active: true,
      },
      update: {
        name: "Admin",
        role: "admin",
        passwordHash: hash,
        active: true,
      },
    });
    console.log("Admin user ensured:", brandAdminEmail);
  }

  const customerEmail = (process.env.SEED_CUSTOMER_EMAIL ?? "customer@example.com").toLowerCase();
  const customerPassword = process.env.SEED_CUSTOMER_PASSWORD ?? "Customer123!";
  const customerHash = await bcrypt.hash(customerPassword, 10);
  await prisma.user.upsert({
    where: { email: customerEmail },
    create: {
      email: customerEmail,
      name: "Alex Thompson",
      role: "customer",
      passwordHash: customerHash,
      active: true,
    },
    update: {
      name: "Alex Thompson",
      role: "customer",
      passwordHash: customerHash,
      active: true,
    },
  });
  console.log("Customer user ensured:", customerEmail);

  const customerUser = await prisma.user.findUnique({
    where: { email: customerEmail },
    select: { id: true },
  });

  const freelancerEmail = (process.env.SEED_FREELANCER_EMAIL ?? "freelancer@example.com").toLowerCase();
  const freelancerPassword = process.env.SEED_FREELANCER_PASSWORD ?? "Freelancer123!";
  const freelancerHash = await bcrypt.hash(freelancerPassword, 10);
  const freelancerProfileData = {
    slug: "sam-freelancer",
    isPublic: true,
    title: "Thailand Relocation Specialist",
    skills: ["Translation", "Visa support", "Document prep"],
    bio: "Experienced Thailand relocation specialist helping expats with visas, documents, and settling in.",
    hourlyRate: 80_000,
    services: [
      {
        title: "Marriage Registration Assistance",
        description: "Full support for marriage registration at the district office.",
        price: 500_000,
        currency: "THB",
      },
      {
        title: "Document Translation (EN ↔ TH)",
        description: "Certified translation for official documents.",
        price: 150_000,
        currency: "THB",
      },
    ],
    verificationStatus: "verified" as const,
    averageRating: 4.8,
  };
  const freelancerUser = await prisma.user.upsert({
    where: { email: freelancerEmail },
    create: {
      email: freelancerEmail,
      name: "Sam Freelancer",
      role: "freelancer",
      passwordHash: freelancerHash,
      active: true,
    },
    update: {
      name: "Sam Freelancer",
      role: "freelancer",
      passwordHash: freelancerHash,
      active: true,
    },
    select: { id: true },
  });
  await prisma.freelancerProfile.upsert({
    where: { userId: freelancerUser.id },
    create: { userId: freelancerUser.id, ...freelancerProfileData },
    update: freelancerProfileData,
  });
  console.log("Freelancer user ensured:", freelancerEmail);

  const companyEmail = (process.env.SEED_COMPANY_EMAIL ?? "company@example.com").toLowerCase();
  const companyPassword = process.env.SEED_COMPANY_PASSWORD ?? "Company123!";
  const companyHash = await bcrypt.hash(companyPassword, 10);
  const companyUser = await prisma.user.upsert({
    where: { email: companyEmail },
    create: {
      email: companyEmail,
      name: "Bangkok Legal Partners",
      role: "company",
      passwordHash: companyHash,
      active: true,
    },
    update: {
      name: "Bangkok Legal Partners",
      role: "company",
      passwordHash: companyHash,
      active: true,
    },
    select: { id: true },
  });
  const companyProfileData = {
    slug: "bangkok-legal-partners",
    companyName: "Bangkok Legal Partners",
    website: "https://example.com",
    description:
      "Full-service corporate and immigration support for foreign businesses operating in Thailand.",
    industry: "Legal Services",
    companySize: "11-50",
    taxId: "0105551234567",
    address: "Sukhumvit Rd, Bangkok, Thailand",
    isVerified: true,
  };
  const company = await prisma.company.upsert({
    where: { userId: companyUser.id },
    create: { userId: companyUser.id, ...companyProfileData },
    update: companyProfileData,
  });
  const existingPosting = await prisma.jobPosting.findFirst({
    where: { companyId: company.id, title: "Thai-English legal translator (contract)" },
  });
  if (!existingPosting) {
    await prisma.jobPosting.create({
      data: {
        companyId: company.id,
        title: "Thai-English legal translator (contract)",
        description:
          "Translate and certify corporate contracts for a Bangkok-based foreign investment firm. Remote-friendly with occasional in-person meetings.",
        budget: 250_000,
        currency: "THB",
        requiredSkills: ["Translation", "Legal", "Thai", "English"],
        status: "OPEN",
      },
    });
  }
  const existingAd = await prisma.adCampaign.findFirst({
    where: { companyId: company.id, title: "Hire verified freelancers with BLP" },
  });
  if (!existingAd) {
    await prisma.adCampaign.create({
      data: {
        companyId: company.id,
        title: "Hire verified freelancers with BLP",
        imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200",
        targetUrl: "https://example.com/careers",
        budget: 50_000,
        dailyLimit: 5_000,
        impressions: 120,
        clicks: 8,
        status: "ACTIVE",
      },
    });
  }
  console.log("Company user ensured:", companyEmail);

  if (customerUser) {
    const sampleJobs = [
      {
        title: "Company registration document review",
        description:
          "Review Thai company registration documents and prepare an English summary for foreign directors.",
        amount: 450_000,
      },
      {
        title: "Work permit application support",
        description:
          "Assist a Bangkok-based company with work permit paperwork and BOI liaison.",
        amount: 850_000,
      },
      {
        title: "Thai-English contract translation",
        description:
          "Translate a 12-page service agreement between a Thai vendor and EU buyer.",
        amount: 120_000,
      },
    ];

    for (const job of sampleJobs) {
      const existing = await prisma.job.findFirst({
        where: { title: job.title, postedById: customerUser.id },
      });
      if (!existing) {
        await prisma.job.create({
          data: {
            ...job,
            currency: "THB",
            postedById: customerUser.id,
            status: "open",
          },
        });
      }
    }
    console.log("Sample freelancer jobs ensured for customer:", customerEmail);
  }

  const adminForListings = await prisma.user.findFirst({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  // Sales upserts: heroMediaType / heroImageUrl / heroVideoUrl are set only on create so
  // re-seeding refreshes catalog copy and galleries without overwriting admin "Set hero" picks.
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

  const hondaCbHeroUrl = HONDA_CB650F_2013_IMAGE_URLS[0];
  if (!hondaCbHeroUrl) {
    console.warn("Honda CB650F 2013 seed skipped: no image URLs.");
  } else {
    await prisma.salesVehicle.upsert({
      where: { slug: HONDA_CB650F_2013_SLUG },
      create: {
        slug: HONDA_CB650F_2013_SLUG,
        title: "2013 Honda CB650F — Black & Gold Custom",
        make: "Honda",
        model: "CB650F",
        year: 2013,
        mileageKm: 30_000,
        priceAmount: 0,
        priceCurrency: "THB",
        category: "motorcycle",
        sellerKind: "private",
        status: "available",
        heroMediaType: "image",
        heroImageUrl: hondaCbHeroUrl,
        heroVideoUrl: null,
        imageUrls: HONDA_CB650F_2013_IMAGE_URLS,
        videoUrls: [],
        description: hondaCb650f2013Description,
        specifications: hondaCb650f2013Specifications,
        published: true,
        createdById: adminForListings?.id ?? null,
      },
      update: {
        title: "2013 Honda CB650F — Black & Gold Custom",
        make: "Honda",
        model: "CB650F",
        year: 2013,
        mileageKm: 30_000,
        priceAmount: 0,
        priceCurrency: "THB",
        category: "motorcycle",
        sellerKind: "private",
        status: "available",
        imageUrls: HONDA_CB650F_2013_IMAGE_URLS,
        videoUrls: [],
        description: hondaCb650f2013Description,
        specifications: hondaCb650f2013Specifications,
        published: true,
      },
    });
    console.log(
      "Sales listing upserted:",
      HONDA_CB650F_2013_SLUG,
      `(${HONDA_CB650F_2013_IMAGE_URLS.length} photos)`
    );
  }

  const mazdaHeroUrl = MAZDA_2_SEDAN_2017_IMAGE_URLS[0];
  if (!mazdaHeroUrl) {
    console.warn("Mazda 2 Sedan 2017 seed skipped: no image URLs.");
  } else {
    await prisma.salesVehicle.upsert({
      where: { slug: MAZDA_2_SEDAN_2017_SLUG },
      create: {
        slug: MAZDA_2_SEDAN_2017_SLUG,
        title: "2017 Mazda 2 Sedan 1.3 Skyactiv Auto",
        make: "Mazda",
        model: "2 Sedan",
        year: 2017,
        mileageKm: 105_360,
        priceAmount: 285_000,
        priceCurrency: "THB",
        category: "car",
        sellerKind: "private",
        status: "available",
        heroMediaType: "image",
        heroImageUrl: mazdaHeroUrl,
        heroVideoUrl: null,
        imageUrls: MAZDA_2_SEDAN_2017_IMAGE_URLS,
        videoUrls: [],
        description: mazda2Sedan2017Description,
        specifications: mazda2Sedan2017Specifications,
        published: true,
        createdById: adminForListings?.id ?? null,
      },
      update: {
        title: "2017 Mazda 2 Sedan 1.3 Skyactiv Auto",
        make: "Mazda",
        model: "2 Sedan",
        year: 2017,
        mileageKm: 105_360,
        priceAmount: 285_000,
        priceCurrency: "THB",
        category: "car",
        sellerKind: "private",
        status: "available",
        heroMediaType: "image",
        heroImageUrl: mazdaHeroUrl,
        heroVideoUrl: null,
        imageUrls: MAZDA_2_SEDAN_2017_IMAGE_URLS,
        videoUrls: [],
        description: mazda2Sedan2017Description,
        specifications: mazda2Sedan2017Specifications,
        published: true,
      },
    });
    console.log(
      "Sales listing upserted:",
      MAZDA_2_SEDAN_2017_SLUG,
      `(${MAZDA_2_SEDAN_2017_IMAGE_URLS.length} photos)`
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
        sellerKind: "dealer",
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
        imageUrls: listing.imageUrls,
        videoUrls: [],
        description: listing.description,
        specifications: listing.specifications,
        published: true,
        sellerKind: "dealer",
      },
    });
    console.log("Sales listing upserted:", listing.slug, `(${listing.imageUrls.length} photos)`);
  }

  // Platform Wave M4 — example life event journey (admin-editable after seed).
  await seedMovingToThailandLifeEvent();

  // Platform Wave M7 — universal workflow templates (inspection + viewing).
  await seedWorkflowTemplates();

  // Platform 2.0 — configurable recommendation graph defaults.
  await seedRecommendationEdges();
}

/**
 * "Moving to Thailand" checklist:
 * property → translation → driver license → vehicle finder → vehicle registration
 * Links existing service slugs / marketplace directories (cuid listing URLs when listingId set).
 */
async function seedMovingToThailandLifeEvent() {
  const key = "moving-to-thailand";
  const event = await prisma.lifeEvent.upsert({
    where: { key },
    create: {
      key,
      titleEn: "Moving to Thailand",
      titleTh: "ย้ายมาอยู่ประเทศไทย",
      descriptionEn:
        "A guided checklist for settling in: find a home, translate documents, get a Thai driver's license, source a vehicle, and complete registration.",
      descriptionTh:
        "เช็กลิสต์สำหรับตั้งถิ่นฐาน: หาที่อยู่ แปลเอกสาร ทำใบขับขี่ไทย หารถ และจดทะเบียน",
      active: true,
      sortOrder: 1,
    },
    update: {
      titleEn: "Moving to Thailand",
      titleTh: "ย้ายมาอยู่ประเทศไทย",
      descriptionEn:
        "A guided checklist for settling in: find a home, translate documents, get a Thai driver's license, source a vehicle, and complete registration.",
      descriptionTh:
        "เช็กลิสต์สำหรับตั้งถิ่นฐาน: หาที่อยู่ แปลเอกสาร ทำใบขับขี่ไทย หารถ และจดทะเบียน",
      active: true,
      sortOrder: 1,
    },
  });

  const steps: Array<{
    titleEn: string;
    titleTh: string;
    descriptionEn: string;
    descriptionTh: string;
    sortOrder: number;
    target: Prisma.InputJsonValue;
  }> = [
    {
      titleEn: "Find a place to live",
      titleTh: "หาที่อยู่อาศัย",
      descriptionEn: "Browse property listings for sale or rent.",
      descriptionTh: "ค้นหารายการอสังหาริมทรัพย์เพื่อซื้อหรือเช่า",
      sortOrder: 1,
      target: {
        listingType: "property",
        listingFilters: { listingType: "rent" },
        serviceSlug: "real-estate-services",
      },
    },
    {
      titleEn: "Translate official documents",
      titleTh: "แปลเอกสารราชการ",
      descriptionEn: "Book certified translation for visas, contracts, and DLT paperwork.",
      descriptionTh: "จองบริการแปลเอกสารรับรองสำหรับวีซ่า สัญญา และเอกสารกรมขนส่ง",
      sortOrder: 2,
      target: { serviceSlug: "translation-services" },
    },
    {
      titleEn: "Get a Thai driver's license",
      titleTh: "ทำใบขับขี่ไทย",
      descriptionEn: "Conversion, renewal, or new license with DLT support.",
      descriptionTh: "เปลี่ยนใบขับขี่ ต่ออายุ หรือทำใหม่พร้อมช่วยเหลือที่กรมขนส่ง",
      sortOrder: 3,
      target: { serviceSlug: "driver-license" },
    },
    {
      titleEn: "Find a car or motorbike",
      titleTh: "หารถยนต์หรือมอเตอร์ไซค์",
      descriptionEn: "Browse marketplace vehicles or book the finder service.",
      descriptionTh: "ค้นหารถในตลาด หรือจองบริการหาซื้อรถ",
      sortOrder: 4,
      target: {
        listingType: "vehicle",
        serviceSlug: "car-motorbike-finder-selling-service",
      },
    },
    {
      titleEn: "Register your vehicle",
      titleTh: "จดทะเบียนรถ",
      descriptionEn: "Ownership transfer, plates, and tax renewals.",
      descriptionTh: "โอนกรรมสิทธิ์ ป้ายทะเบียน และต่อภาษี",
      sortOrder: 5,
      target: { serviceSlug: "vehicle-registration" },
    },
  ];

  const existing = await prisma.lifeEventStep.findMany({
    where: { lifeEventId: event.id },
    select: { id: true, sortOrder: true },
  });

  // Upsert by sortOrder within this event (seed-stable).
  for (const step of steps) {
    const match = existing.find((e) => e.sortOrder === step.sortOrder);
    if (match) {
      await prisma.lifeEventStep.update({
        where: { id: match.id },
        data: {
          titleEn: step.titleEn,
          titleTh: step.titleTh,
          descriptionEn: step.descriptionEn,
          descriptionTh: step.descriptionTh,
          target: step.target,
        },
      });
    } else {
      await prisma.lifeEventStep.create({
        data: {
          lifeEventId: event.id,
          titleEn: step.titleEn,
          titleTh: step.titleTh,
          descriptionEn: step.descriptionEn,
          descriptionTh: step.descriptionTh,
          sortOrder: step.sortOrder,
          target: step.target,
        },
      });
    }
  }

  console.log("Life event seeded:", key, `(${steps.length} steps)`);
}

/**
 * Platform Wave M7 — seed reusable workflow templates:
 * 1) Vehicle inspection booking-style
 * 2) Real-estate viewing booking-style
 * Deep links use cuid helpers when listingId is set; directories use /sales and /real-estate.
 */
async function seedWorkflowTemplates() {
  await seedOneWorkflowTemplate({
    key: "vehicle-inspection-booking",
    titleEn: "Vehicle inspection booking",
    titleTh: "จองตรวจสภาพรถ",
    descriptionEn:
      "Browse a vehicle, book related registration/inspection support, and wait for staff confirmation.",
    descriptionTh:
      "เลือกรถ จองบริการที่เกี่ยวข้องกับการจดทะเบียน/ตรวจสภาพ และรอเจ้าหน้าที่ยืนยัน",
    sortOrder: 1,
    steps: [
      {
        key: "browse-vehicle",
        titleEn: "Choose a vehicle listing",
        titleTh: "เลือกรายการรถ",
        descriptionEn: "Open the sales marketplace (cuid deep links when a specific listing is attached).",
        descriptionTh: "เปิดตลาดรถ (ลิงก์ cuid เมื่อระบุรายการเฉพาะ)",
        sortOrder: 1,
        kind: "action" as const,
        requiresApproval: false,
        target: { listingType: "vehicle" },
      },
      {
        key: "book-inspection-support",
        titleEn: "Book inspection / registration support",
        titleTh: "จองบริการตรวจสภาพ / จดทะเบียน",
        descriptionEn: "Book the vehicle-registration service for inspection-related paperwork.",
        descriptionTh: "จองบริการจดทะเบียนรถสำหรับเอกสารที่เกี่ยวข้องกับการตรวจสภาพ",
        sortOrder: 2,
        kind: "booking" as const,
        requiresApproval: false,
        target: { serviceSlug: "vehicle-registration" },
      },
      {
        key: "staff-confirm-inspection",
        titleEn: "Staff confirm inspection slot",
        titleTh: "เจ้าหน้าที่ยืนยันคิวตรวจสภาพ",
        descriptionEn: "Staff review and approve the inspection booking before completion.",
        descriptionTh: "เจ้าหน้าที่ตรวจสอบและอนุมัติการจองตรวจสภาพก่อนเสร็จสิ้น",
        sortOrder: 3,
        kind: "approval" as const,
        requiresApproval: true,
        target: {},
      },
    ],
  });

  await seedOneWorkflowTemplate({
    key: "property-viewing-booking",
    titleEn: "Property viewing booking",
    titleTh: "จองชมทรัพย์",
    descriptionEn:
      "Browse properties, book real-estate support for a viewing, and wait for staff confirmation.",
    descriptionTh:
      "เลือกอสังหาฯ จองบริการอสังหาฯ สำหรับนัดชม และรอเจ้าหน้าที่ยืนยัน",
    sortOrder: 2,
    steps: [
      {
        key: "browse-property",
        titleEn: "Choose a property listing",
        titleTh: "เลือกรายการอสังหาฯ",
        descriptionEn: "Browse real-estate listings (cuid deep links when a specific listing is attached).",
        descriptionTh: "ค้นหารายการอสังหาฯ (ลิงก์ cuid เมื่อระบุรายการเฉพาะ)",
        sortOrder: 1,
        kind: "action" as const,
        requiresApproval: false,
        target: {
          listingType: "property",
          listingFilters: { listingType: "sale" },
        },
      },
      {
        key: "book-viewing-support",
        titleEn: "Book viewing support",
        titleTh: "จองบริการนัดชม",
        descriptionEn: "Book real-estate-services to arrange a property viewing.",
        descriptionTh: "จองบริการอสังหาฯ เพื่อจัดนัดชมทรัพย์",
        sortOrder: 2,
        kind: "booking" as const,
        requiresApproval: false,
        target: { serviceSlug: "real-estate-services" },
      },
      {
        key: "staff-confirm-viewing",
        titleEn: "Staff confirm viewing appointment",
        titleTh: "เจ้าหน้าที่ยืนยันนัดชม",
        descriptionEn: "Staff approve the viewing appointment before the workflow completes.",
        descriptionTh: "เจ้าหน้าที่อนุมัตินัดชมก่อนเวิร์กโฟลว์เสร็จสิ้น",
        sortOrder: 3,
        kind: "approval" as const,
        requiresApproval: true,
        target: {},
      },
    ],
  });
}

async function seedOneWorkflowTemplate(input: {
  key: string;
  titleEn: string;
  titleTh: string;
  descriptionEn: string;
  descriptionTh: string;
  sortOrder: number;
  steps: Array<{
    key: string;
    titleEn: string;
    titleTh: string;
    descriptionEn: string;
    descriptionTh: string;
    sortOrder: number;
    kind: "info" | "action" | "booking" | "approval";
    requiresApproval: boolean;
    target: Prisma.InputJsonValue;
  }>;
}) {
  const template = await prisma.workflowTemplate.upsert({
    where: { key: input.key },
    create: {
      key: input.key,
      titleEn: input.titleEn,
      titleTh: input.titleTh,
      descriptionEn: input.descriptionEn,
      descriptionTh: input.descriptionTh,
      active: true,
      sortOrder: input.sortOrder,
    },
    update: {
      titleEn: input.titleEn,
      titleTh: input.titleTh,
      descriptionEn: input.descriptionEn,
      descriptionTh: input.descriptionTh,
      active: true,
      sortOrder: input.sortOrder,
    },
  });

  const existing = await prisma.workflowTemplateStep.findMany({
    where: { templateId: template.id },
    select: { id: true, sortOrder: true, key: true },
  });

  for (const step of input.steps) {
    const match =
      existing.find((e) => e.key === step.key) ??
      existing.find((e) => e.sortOrder === step.sortOrder);
    if (match) {
      await prisma.workflowTemplateStep.update({
        where: { id: match.id },
        data: {
          key: step.key,
          titleEn: step.titleEn,
          titleTh: step.titleTh,
          descriptionEn: step.descriptionEn,
          descriptionTh: step.descriptionTh,
          sortOrder: step.sortOrder,
          kind: step.kind,
          requiresApproval: step.requiresApproval,
          target: step.target,
        },
      });
    } else {
      await prisma.workflowTemplateStep.create({
        data: {
          templateId: template.id,
          key: step.key,
          titleEn: step.titleEn,
          titleTh: step.titleTh,
          descriptionEn: step.descriptionEn,
          descriptionTh: step.descriptionTh,
          sortOrder: step.sortOrder,
          kind: step.kind,
          requiresApproval: step.requiresApproval,
          target: step.target,
        },
      });
    }
  }

  console.log("Workflow template seeded:", input.key, `(${input.steps.length} steps)`);
}

/** Configurable recommendation graph — matches src/config/recommendation-graph.ts defaults. */
async function seedRecommendationEdges() {
  const edges: Array<{
    key: string;
    triggerKey: string;
    targetKind: string;
    targetKey: string;
    score: number;
    reasonEn: string;
    reasonTh: string;
    sortOrder: number;
  }> = [
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

  for (const edge of edges) {
    await prisma.recommendationEdge.upsert({
      where: { key: edge.key },
      create: { ...edge, active: true },
      update: {
        triggerKey: edge.triggerKey,
        targetKind: edge.targetKind,
        targetKey: edge.targetKey,
        score: edge.score,
        reasonEn: edge.reasonEn,
        reasonTh: edge.reasonTh,
        sortOrder: edge.sortOrder,
        active: true,
      },
    });
  }
  console.log("Recommendation edges seeded:", edges.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
