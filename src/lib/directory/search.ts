import { BANGKOK_PROVINCE_CODE } from "@/lib/directory/provinces";
import {
  isVerificationStatus,
  verificationCutoff,
  type VerificationStatus,
} from "@/lib/directory/constants";

export type DirectorySort = "updated" | "verified" | "name";

export type DirectoryQuery = {
  q?: string;
  province?: string;
  district?: string;
  category?: string;
  service?: string;
  area?: "bangkok" | "other" | "";
  status?: string;
  sort?: DirectorySort;
  page?: number;
  includeArchived?: boolean;
  archivedOnly?: boolean;
  stale?: boolean;
  reminderDays?: number;
  now?: Date;
  browse?: boolean;
};

export type TextFilter = { contains: string; mode: "insensitive" };

export type DirectoryWhere = {
  AND?: DirectoryWhere[];
  OR?: DirectoryWhere[];
  NOT?: DirectoryWhere;
  archivedAt?: null | { not: null };
  provinceCode?: string | { not: string };
  district?: TextFilter;
  verificationStatus?: VerificationStatus | { in: VerificationStatus[] };
  category?: { slug: string; active?: boolean };
  services?: { some: { service: { slug: string } } };
  searchText?: TextFilter;
  lastVerifiedAt?: null | { lt: Date };
};

/** NFC, case-fold Latin, keep Thai letters and digits, collapse separators. */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFC")
    .toLowerCase()
    .replace(/[\u200b\u00a0]/g, " ")
    .replace(/[^\p{L}\p{M}\p{N}+@.]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function searchTokens(query: string | null | undefined): string[] {
  const normalized = normalizeSearchText(query ?? "");
  if (!normalized) return [];
  const tokens: string[] = [];
  for (const token of normalized.split(" ")) {
    if (!token || tokens.includes(token)) continue;
    tokens.push(token);
    if (tokens.length >= 8) break;
  }
  return tokens;
}

export function recordMatchesQuery(searchText: string, query: string): boolean {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return true;
  const haystack = normalizeSearchText(searchText);
  return tokens.every((token) => haystack.includes(token));
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function buildSearchText(parts: Array<string | null | undefined>): string {
  const joined = parts
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" ");
  const phoneDigits = (joined.match(/\+?\d[\d\s().-]{2,}\d/g) ?? [])
    .map((phone) => digitsOnly(phone))
    .filter((phone) => phone.length >= 3);
  return normalizeSearchText([joined, ...phoneDigits].join(" "));
}

export function parseDirectoryQuery(
  params: Record<string, string | string[] | undefined>
): DirectoryQuery {
  const one = (key: string) => {
    const value = params[key];
    const raw = Array.isArray(value) ? value[0] : value;
    return raw?.trim() ?? "";
  };
  const area = one("area");
  const sort = one("sort");
  const page = Number(one("page") || "1");
  return {
    q: one("q"),
    province: one("province"),
    district: one("district"),
    category: one("category"),
    service: one("service"),
    area: area === "bangkok" || area === "other" ? area : "",
    status: one("status"),
    sort: sort === "verified" || sort === "name" || sort === "updated" ? sort : "updated",
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
    includeArchived: one("archived") === "1",
    archivedOnly: one("archived") === "only",
    stale: one("stale") === "1",
    browse: one("browse") === "1",
  };
}

export function hasActiveDirectoryFilters(query: DirectoryQuery): boolean {
  return Boolean(
    query.q ||
      query.province ||
      query.district ||
      query.category ||
      query.service ||
      query.area ||
      query.status ||
      query.stale ||
      query.includeArchived ||
      query.archivedOnly ||
      query.browse
  );
}

export function buildDirectoryWhere(query: DirectoryQuery): DirectoryWhere {
  const and: DirectoryWhere[] = [];

  if (query.archivedOnly) {
    and.push({ archivedAt: { not: null } });
  } else if (!query.includeArchived) {
    and.push({ archivedAt: null });
  }

  const tokens = searchTokens(query.q);
  for (const token of tokens) {
    and.push({ searchText: { contains: token, mode: "insensitive" } });
  }

  if (query.province) {
    and.push({ provinceCode: query.province });
  }

  if (query.area === "bangkok") {
    and.push({ provinceCode: BANGKOK_PROVINCE_CODE });
  } else if (query.area === "other") {
    and.push({ provinceCode: { not: BANGKOK_PROVINCE_CODE } });
  }

  if (query.district) {
    and.push({ district: { contains: query.district, mode: "insensitive" } });
  }

  if (query.category) {
    and.push({ category: { slug: query.category, active: true } });
  }

  if (query.service) {
    and.push({ services: { some: { service: { slug: query.service } } } });
  }

  if (query.status && isVerificationStatus(query.status)) {
    and.push({ verificationStatus: query.status });
  }

  if (query.stale) {
    const cutoff = verificationCutoff(query.reminderDays ?? 90, query.now ?? new Date());
    and.push({
      NOT: { verificationStatus: "permanently_closed" },
    });
    and.push({
      OR: [
        { verificationStatus: { in: ["unverified", "needs_verification"] } },
        { lastVerifiedAt: null },
        { lastVerifiedAt: { lt: cutoff } },
      ],
    });
  }

  if (and.length === 0) return {};
  if (and.length === 1) return and[0] ?? {};
  return { AND: and };
}

export function directoryOrderBy(sort: DirectorySort | undefined): Array<Record<string, "asc" | "desc">> {
  if (sort === "name") return [{ nameEn: "asc" }];
  if (sort === "verified") return [{ lastVerifiedAt: "desc" }, { updatedAt: "desc" }];
  return [{ updatedAt: "desc" }];
}
