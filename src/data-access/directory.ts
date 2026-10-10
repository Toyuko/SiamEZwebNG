import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isAdminAuthBypassEnabled } from "@/lib/auth/admin-bypass";
import { directoryPermission, type DirectoryRole } from "@/lib/directory/access";
import {
  DIRECTORY_MAP_LIMIT,
  DIRECTORY_PAGE_SIZE,
  DIRECTORY_REMINDER_DAYS_DEFAULT,
  DIRECTORY_REMINDER_SETTING_KEY,
  clampReminderDays,
} from "@/lib/directory/constants";
import { getProvince } from "@/lib/directory/provinces";
import {
  buildDirectoryWhere,
  buildSearchText,
  directoryOrderBy,
  type DirectoryQuery,
} from "@/lib/directory/search";
import {
  STARTER_CATEGORIES,
  STARTER_OFFICES,
  STARTER_SERVICES,
} from "@/lib/directory/starter-data";

export type DirectoryAccessContext = {
  authenticated: boolean;
  allowed: boolean;
  canManage: boolean;
  canContribute: boolean;
  userId: string | null;
  bypass: boolean;
};

const denied: DirectoryAccessContext = {
  authenticated: false,
  allowed: false,
  canManage: false,
  canContribute: false,
  userId: null,
  bypass: false,
};

export async function resolveDirectoryAccess(): Promise<DirectoryAccessContext> {
  const session = await getSession();
  if (!session?.user.id) return denied;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      active: true,
      directoryAccess: true,
      freelancerProfile: { select: { verificationStatus: true } },
    },
  });
  if (!user) return denied;
  const permission = directoryPermission({
    role: user.role as DirectoryRole,
    active: user.active,
    directoryAccess: user.directoryAccess,
    freelancerVerified: user.freelancerProfile?.verificationStatus === "verified",
  });
  return {
    authenticated: true,
    allowed: permission.canRead,
    canManage: permission.canManage,
    canContribute: permission.canContribute,
    userId: user.id,
    bypass: false,
  };
}

export async function requireDirectoryReader(): Promise<DirectoryAccessContext> {
  const access = await resolveDirectoryAccess();
  if (!access.allowed) {
    throw new Error(access.authenticated ? "Forbidden" : "Unauthorized");
  }
  return access;
}

export async function requireDirectoryAdmin(): Promise<DirectoryAccessContext> {
  if (isAdminAuthBypassEnabled()) {
    const session = await getSession();
    return {
      authenticated: Boolean(session?.user.id),
      allowed: true,
      canManage: true,
      canContribute: true,
      userId: session?.user.id ?? null,
      bypass: true,
    };
  }
  const access = await resolveDirectoryAccess();
  if (!access.canManage) throw new Error("Forbidden");
  return access;
}

export async function getVerificationReminderDays(): Promise<number> {
  const row = await prisma.appSetting.findUnique({
    where: { key: DIRECTORY_REMINDER_SETTING_KEY },
  });
  const raw = row?.value;
  const days =
    raw && typeof raw === "object" && !Array.isArray(raw) && "days" in raw
      ? Number((raw as { days?: unknown }).days)
      : DIRECTORY_REMINDER_DAYS_DEFAULT;
  return clampReminderDays(days);
}

const officeListInclude = {
  category: { select: { id: true, slug: true, nameEn: true, nameTh: true } },
  services: {
    include: { service: { select: { id: true, slug: true, nameEn: true, nameTh: true } } },
  },
} satisfies Prisma.GovOfficeInclude;

export type DirectoryOfficeListItem = Prisma.GovOfficeGetPayload<{ include: typeof officeListInclude }>;

function whereFor(query: DirectoryQuery, reminderDays: number): Prisma.GovOfficeWhereInput {
  return buildDirectoryWhere({ ...query, reminderDays }) as Prisma.GovOfficeWhereInput;
}

export async function searchDirectoryOffices(query: DirectoryQuery) {
  const publicQuery = { ...query, includeArchived: false, archivedOnly: false };
  const reminderDays = publicQuery.reminderDays ?? (await getVerificationReminderDays());
  const where = whereFor(publicQuery, reminderDays);
  const page = Math.max(1, query.page ?? 1);
  const [total, offices] = await Promise.all([
    prisma.govOffice.count({ where }),
    prisma.govOffice.findMany({
      where,
      include: officeListInclude,
      orderBy: directoryOrderBy(query.sort),
      skip: (page - 1) * DIRECTORY_PAGE_SIZE,
      take: DIRECTORY_PAGE_SIZE,
    }),
  ]);
  return {
    offices,
    total,
    page,
    pageSize: DIRECTORY_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / DIRECTORY_PAGE_SIZE)),
    reminderDays,
  };
}

export async function searchDirectoryOfficesForAdmin(query: DirectoryQuery) {
  await requireDirectoryAdmin();
  const reminderDays = query.reminderDays ?? (await getVerificationReminderDays());
  const where = whereFor(query, reminderDays);
  const page = Math.max(1, query.page ?? 1);
  const [total, offices, openReports, pendingSubmissions] = await Promise.all([
    prisma.govOffice.count({ where }),
    prisma.govOffice.findMany({
      where,
      include: officeListInclude,
      orderBy: directoryOrderBy(query.sort),
      skip: (page - 1) * DIRECTORY_PAGE_SIZE,
      take: DIRECTORY_PAGE_SIZE,
    }),
    prisma.govOfficeReport.count({ where: { status: { in: ["open", "in_review"] } } }),
    prisma.govOfficeSubmission.count({ where: { status: "pending" } }),
  ]);
  return {
    offices,
    total,
    page,
    pageSize: DIRECTORY_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / DIRECTORY_PAGE_SIZE)),
    reminderDays,
    openReports,
    pendingSubmissions,
  };
}

export async function listDirectoryMapPoints(query: DirectoryQuery) {
  const publicQuery = { ...query, includeArchived: false, archivedOnly: false };
  if (!publicQuery.province && !searchHasScope(publicQuery)) return [];
  const reminderDays = publicQuery.reminderDays ?? (await getVerificationReminderDays());
  const where = whereFor(publicQuery, reminderDays);
  return prisma.govOffice.findMany({
    where: { AND: [where, { latitude: { not: null } }, { longitude: { not: null } }] },
    select: {
      id: true,
      slug: true,
      nameEn: true,
      nameTh: true,
      latitude: true,
      longitude: true,
      provinceCode: true,
      category: { select: { nameEn: true, nameTh: true } },
    },
    take: DIRECTORY_MAP_LIMIT,
  });
}

function searchHasScope(query: DirectoryQuery): boolean {
  return Boolean(query.q || query.category || query.service || query.district || query.area || query.status);
}

export async function getDirectoryOffice(idOrSlug: string) {
  const office = await prisma.govOffice.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], archivedAt: null },
    include: {
      ...officeListInclude,
      lastVerifiedBy: { select: { id: true, name: true } },
    },
  });
  return office;
}

export async function getOfficeForAdmin(id: string) {
  await requireDirectoryAdmin();
  return prisma.govOffice.findUnique({
    where: { id },
    include: {
      ...officeListInclude,
      audits: { orderBy: { createdAt: "desc" }, take: 12, include: { actor: { select: { name: true, email: true } } } },
    },
  });
}

async function requireSameUser(userId: string) {
  const session = await getSession();
  if (!session?.user.id) throw new Error("Unauthorized");
  if (session.user.id !== userId) throw new Error("Forbidden");
}

export async function listFavoriteOffices(userId: string) {
  await requireSameUser(userId);
  const rows = await prisma.govOfficeFavorite.findMany({
    where: { userId, office: { archivedAt: null } },
    include: { office: { include: officeListInclude } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map((row) => row.office);
}

export async function listRecentOffices(userId: string) {
  await requireSameUser(userId);
  const rows = await prisma.govOfficeView.findMany({
    where: { userId, office: { archivedAt: null } },
    include: { office: { include: officeListInclude } },
    orderBy: { viewedAt: "desc" },
    take: 8,
  });
  return rows.map((row) => row.office);
}

export async function listRecentlyUpdatedOffices() {
  return prisma.govOffice.findMany({
    where: { archivedAt: null },
    include: officeListInclude,
    orderBy: { updatedAt: "desc" },
    take: 6,
  });
}

export async function favoriteIdSet(userId: string, officeIds: string[]) {
  if (!userId || officeIds.length === 0) return new Set<string>();
  const rows = await prisma.govOfficeFavorite.findMany({
    where: { userId, officeId: { in: officeIds } },
    select: { officeId: true },
  });
  return new Set(rows.map((row) => row.officeId));
}

export async function listActiveCategories() {
  return prisma.govOfficeCategory.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
  });
}

export async function listActiveServices() {
  return prisma.govOfficeService.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
  });
}

export async function listDistricts(provinceCode?: string) {
  const rows = await prisma.govOffice.findMany({
    where: {
      archivedAt: null,
      district: { not: null },
      ...(provinceCode ? { provinceCode } : {}),
    },
    select: { district: true },
    distinct: ["district"],
    orderBy: { district: "asc" },
    take: 200,
  });
  return rows.map((row) => row.district).filter((district): district is string => Boolean(district));
}

export async function recordOfficeView(userId: string, officeId: string) {
  await prisma.govOfficeView.upsert({
    where: { userId_officeId: { userId, officeId } },
    create: { userId, officeId },
    update: { viewedAt: new Date() },
  });
}

export function starterSearchText(office: (typeof STARTER_OFFICES)[number]): string {
  const category = STARTER_CATEGORIES.find((item) => item.slug === office.categorySlug);
  const province = getProvince(office.provinceCode);
  return buildSearchText([
    office.nameEn,
    office.nameTh,
    office.branchNameEn,
    office.branchNameTh,
    office.parentOrganizationEn,
    office.parentOrganizationTh,
    (office.keywords ?? []).join(" "),
    office.provinceCode,
    province?.nameEn,
    province?.nameTh,
    category?.nameEn,
    category?.nameTh,
    office.contactNotes,
    office.website,
  ]);
}

/** Inserts missing taxonomy and starter offices. Does not overwrite offices that already exist. */
export async function ensureDirectoryStarterData() {
  const categoryCount = await prisma.govOfficeCategory.count();
  if (categoryCount > 0) return { inserted: false };

  await prisma.$transaction(async (tx) => {
    for (const category of STARTER_CATEGORIES) {
      await tx.govOfficeCategory.upsert({
        where: { slug: category.slug },
        create: category,
        update: {},
      });
    }
    for (const service of STARTER_SERVICES) {
      await tx.govOfficeService.upsert({
        where: { slug: service.slug },
        create: service,
        update: {},
      });
    }
    const categories = await tx.govOfficeCategory.findMany({
      select: { id: true, slug: true },
    });
    const categoryId = new Map(categories.map((category) => [category.slug, category.id]));
    for (const office of STARTER_OFFICES) {
      const category = categoryId.get(office.categorySlug);
      if (!category) continue;
      await tx.govOffice.upsert({
        where: { slug: office.slug },
        create: {
          slug: office.slug,
          nameEn: office.nameEn,
          nameTh: office.nameTh,
          categoryId: category,
          provinceCode: office.provinceCode,
          parentOrganizationEn: office.parentOrganizationEn,
          parentOrganizationTh: office.parentOrganizationTh,
          branchNameEn: office.branchNameEn,
          branchNameTh: office.branchNameTh,
          keywords: office.keywords ?? [],
          website: office.website,
          sourceUrl: office.sourceUrl,
          sourceNotes: office.sourceNotes,
          contactNotes: office.contactNotes,
          verificationStatus: office.verificationStatus,
          searchText: starterSearchText(office),
        },
        update: {},
      });
    }
    await tx.appSetting.upsert({
      where: { key: DIRECTORY_REMINDER_SETTING_KEY },
      create: { key: DIRECTORY_REMINDER_SETTING_KEY, value: { days: DIRECTORY_REMINDER_DAYS_DEFAULT } },
      update: {},
    });
  });
  return { inserted: true };
}

export async function loadMissingStarterOffices() {
  await requireDirectoryAdmin();
  const categories = await prisma.govOfficeCategory.findMany({ select: { id: true, slug: true } });
  const categoryId = new Map(categories.map((category) => [category.slug, category.id]));
  let created = 0;
  for (const category of STARTER_CATEGORIES) {
    if (!categoryId.has(category.slug)) {
      const row = await prisma.govOfficeCategory.create({ data: category });
      categoryId.set(row.slug, row.id);
    }
  }
  for (const service of STARTER_SERVICES) {
    await prisma.govOfficeService.upsert({
      where: { slug: service.slug },
      create: service,
      update: {},
    });
  }
  for (const office of STARTER_OFFICES) {
    const category = categoryId.get(office.categorySlug);
    if (!category) continue;
    const existing = await prisma.govOffice.findUnique({ where: { slug: office.slug }, select: { id: true } });
    if (existing) continue;
    await prisma.govOffice.create({
      data: {
        slug: office.slug,
        nameEn: office.nameEn,
        nameTh: office.nameTh,
        categoryId: category,
        provinceCode: office.provinceCode,
        parentOrganizationEn: office.parentOrganizationEn,
        parentOrganizationTh: office.parentOrganizationTh,
        branchNameEn: office.branchNameEn,
        branchNameTh: office.branchNameTh,
        keywords: office.keywords ?? [],
        website: office.website,
        sourceUrl: office.sourceUrl,
        sourceNotes: office.sourceNotes,
        contactNotes: office.contactNotes,
        verificationStatus: "unverified",
        searchText: starterSearchText(office),
      },
    });
    created += 1;
  }
  return created;
}
