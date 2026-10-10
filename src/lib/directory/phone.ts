import { officeMapsHref } from "@/lib/directory/maps";

export function phoneToTel(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/[^\d+]/g, "");
  const digits = normalized.replace(/\D/g, "");
  if (digits.length < 3 || digits.length > 15) return null;
  return `tel:${normalized}`;
}

export function phoneCopyText(phone: string | null | undefined): string | null {
  const trimmed = phone?.trim();
  return trimmed ? trimmed : null;
}

export function addressCopyText(input: {
  addressTh?: string | null;
  addressEn?: string | null;
  district?: string | null;
  subdistrict?: string | null;
  provinceName?: string | null;
  postalCode?: string | null;
}): string | null {
  const lines = [
    input.addressTh,
    input.addressEn,
    [input.subdistrict, input.district, input.provinceName, input.postalCode]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" "),
  ]
    .map((part) => part?.trim())
    .filter(Boolean);
  const unique = [...new Set(lines)];
  return unique.length ? unique.join("\n") : null;
}

export type OfficeActions = {
  callHref: string | null;
  mapsHref: string | null;
  phoneCopy: string | null;
  addressCopy: string | null;
  websiteHref: string | null;
};

export function officeActions(input: {
  phonePrimary?: string | null;
  googleMapsUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  addressEn?: string | null;
  addressTh?: string | null;
  nameEn?: string | null;
  nameTh?: string | null;
  provinceName?: string | null;
  district?: string | null;
  subdistrict?: string | null;
  postalCode?: string | null;
  website?: string | null;
}): OfficeActions {
  const website = input.website?.trim();
  let websiteHref: string | null = null;
  if (website) {
    try {
      const url = new URL(website);
      if (url.protocol === "https:" || url.protocol === "http:") websiteHref = url.toString();
    } catch {
      websiteHref = null;
    }
  }
  return {
    callHref: phoneToTel(input.phonePrimary),
    mapsHref: requireMaps(input),
    phoneCopy: phoneCopyText(input.phonePrimary),
    addressCopy: addressCopyText(input),
    websiteHref,
  };
}

function requireMaps(input: Parameters<typeof officeActions>[0]): string | null {
  return officeMapsHref(input);
}
