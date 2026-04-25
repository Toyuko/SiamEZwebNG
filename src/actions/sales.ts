"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const listingSchema = z.object({
  title: z.string().min(3),
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1950).max(new Date().getFullYear() + 1),
  mileageKm: z.number().int().min(0),
  priceAmount: z.number().int().min(1),
  priceCurrency: z.string().min(3).max(3).default("THB"),
  category: z.enum(["car", "motorcycle"]),
  status: z.enum(["available", "reserved", "sold"]),
  heroImageUrl: z.string().url(),
  imageUrls: z.array(z.string().url()).min(1),
  description: z.string().min(20),
  specifications: z.record(z.string(), z.string()).optional(),
  published: z.boolean().default(true),
});

function toSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function ensureStaffAccess() {
  const session = await getSession();
  if (!session || (session.user.role !== "admin" && session.user.role !== "staff")) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

async function ensureUniqueSlug(base: string, excludeId?: string) {
  let slug = base || `listing-${Date.now()}`;
  let suffix = 1;
  while (true) {
    const found = await prisma.salesVehicle.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (!found) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

export async function createSalesListing(input: z.infer<typeof listingSchema>) {
  const createdById = await ensureStaffAccess();
  const parsed = listingSchema.parse(input);
  const slug = await ensureUniqueSlug(toSlug(`${parsed.make}-${parsed.model}-${parsed.year}`));

  return prisma.salesVehicle.create({
    data: {
      ...parsed,
      slug,
      createdById,
    },
  });
}

export async function updateSalesListing(id: string, input: z.infer<typeof listingSchema>) {
  await ensureStaffAccess();
  const parsed = listingSchema.parse(input);
  const slug = await ensureUniqueSlug(toSlug(`${parsed.make}-${parsed.model}-${parsed.year}`), id);

  return prisma.salesVehicle.update({
    where: { id },
    data: {
      ...parsed,
      slug,
    },
  });
}

export async function deleteSalesListing(id: string) {
  await ensureStaffAccess();
  return prisma.salesVehicle.delete({
    where: { id },
  });
}
