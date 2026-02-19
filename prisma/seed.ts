/**
 * Seed services from siam-ez.com content and optional admin user.
 * Run: npm run db:seed (requires DATABASE_URL and prisma migrate/deploy or db push).
 */

import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

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
    shortDescription: "Expert help obtaining or converting your Thai driver's license with minimal hassle.",
    description: "Expert assistance with obtaining or converting your Thai driver's license. We guide you through the process at the Department of Land Transport and help with document preparation.",
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
    slug: "vehicle-registration",
    name: "Vehicle Registration",
    shortDescription: "Complete car and motorcycle registration services including transfers, renewals, and documentation.",
    description: "Complete car and motorcycle registration services including transfers, renewals, and documentation at the Department of Land Transport.",
    type: "quote" as const,
    sortOrder: 7,
  },
  {
    slug: "transportation-services",
    name: "Transportation Services",
    shortDescription: "Reliable airport transfers, city tours, and inter-city transportation with comfortable vehicles.",
    description: "Reliable airport transfers, city tours, and inter-city transportation with comfortable vehicles. Book for a single trip or regular transfers.",
    type: "quote" as const,
    sortOrder: 8,
  },
  {
    slug: "basic-translation",
    name: "Basic Translation (Fixed Price)",
    shortDescription: "Simple document translation with fixed pricing per page.",
    description: "Simple certified translation for standard documents. Fixed price per page - pay immediately upon booking.",
    type: "fixed" as const,
    priceAmount: 50000, // 500 THB in satang (smallest unit)
    priceCurrency: "THB",
    sortOrder: 10,
  },
  {
    slug: "private-driver-service",
    name: "Private Driver Service",
    shortDescription: "Professional private drivers for daily use, business trips, or special occasions with flexible packages.",
    description: "Professional private drivers for daily use, business trips, or special occasions. Flexible hourly, daily, or monthly packages available.",
    type: "quote" as const,
    sortOrder: 9,
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
