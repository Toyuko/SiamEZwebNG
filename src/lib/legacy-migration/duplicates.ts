import { normalizeEmail, normalizePhone } from "./normalize";
import type { DuplicateRecord, DuplicateReport, LegacyClient } from "./types";

export type DestinationUserLite = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  legacyCustomerId?: number | null;
};

function nameKey(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function detectDuplicates(options: {
  clients: LegacyClient[];
  destinationUsers?: DestinationUserLite[];
}): DuplicateReport {
  const { clients, destinationUsers = [] } = options;
  const exactMatches: DuplicateRecord[] = [];
  const likelyDuplicates: DuplicateRecord[] = [];
  const conflicts: DuplicateRecord[] = [];
  const destByEmail = new Map(
    destinationUsers
      .map((u) => [normalizeEmail(u.email), u] as const)
      .filter((entry): entry is [string, DestinationUserLite] => Boolean(entry[0]))
  );
  const destByLegacyId = new Map(
    destinationUsers
      .filter((u) => u.legacyCustomerId != null)
      .map((u) => [u.legacyCustomerId as number, u])
  );
  const destByPhone = new Map<string, DestinationUserLite[]>();
  for (const u of destinationUsers) {
    const phone = normalizePhone(u.phone);
    if (!phone) continue;
    const list = destByPhone.get(phone) ?? [];
    list.push(u);
    destByPhone.set(phone, list);
  }

  const emailGroups = new Map<string, number[]>();
  const phoneGroups = new Map<string, number[]>();
  const namePhoneGroups = new Map<string, number[]>();
  const nameEmailGroups = new Map<string, number[]>();

  for (const c of clients) {
    const email = normalizeEmail(c.email);
    const phone = normalizePhone(c.phone);
    const name = nameKey(c.name);
    if (email) {
      const list = emailGroups.get(email) ?? [];
      list.push(c.id);
      emailGroups.set(email, list);
    }
    if (phone) {
      const list = phoneGroups.get(phone) ?? [];
      list.push(c.id);
      phoneGroups.set(phone, list);
    }
    if (name && phone) {
      const key = `${name}|${phone}`;
      const list = namePhoneGroups.get(key) ?? [];
      list.push(c.id);
      namePhoneGroups.set(key, list);
    }
    if (name && email) {
      const key = `${name}|${email}`;
      const list = nameEmailGroups.get(key) ?? [];
      list.push(c.id);
      nameEmailGroups.set(key, list);
    }
  }

  const matchedLegacy = new Set<number>();

  for (const c of clients) {
    const dest = destByLegacyId.get(c.id);
    if (dest) {
      exactMatches.push({
        kind: "exact_legacy_id",
        confidence: "exact",
        legacyCustomerIds: [c.id],
        destinationUserId: dest.id,
        reason: "legacy_customer_id already present on destination user",
        needsManualReview: false,
      });
      matchedLegacy.add(c.id);
    }
  }

  for (const [email, ids] of emailGroups) {
    if (ids.length > 1) {
      conflicts.push({
        kind: "exact_email",
        confidence: "exact",
        legacyCustomerIds: ids,
        reason: `Multiple legacy clients share email ${email}`,
        needsManualReview: true,
      });
      ids.forEach((id) => matchedLegacy.add(id));
    }
    const dest = destByEmail.get(email);
    if (dest && ids.length === 1) {
      exactMatches.push({
        kind: "exact_email",
        confidence: "exact",
        legacyCustomerIds: ids,
        destinationUserId: dest.id,
        reason: "Email matches an existing destination user",
        needsManualReview: false,
      });
      ids.forEach((id) => matchedLegacy.add(id));
    }
  }

  for (const [phone, ids] of phoneGroups) {
    if (ids.length > 1) {
      likelyDuplicates.push({
        kind: "exact_phone",
        confidence: "likely",
        legacyCustomerIds: ids,
        reason: `Multiple legacy clients share phone ${phone}`,
        needsManualReview: true,
      });
    }
    const destHits = destByPhone.get(phone) ?? [];
    if (destHits.length === 1 && ids.length === 1 && !matchedLegacy.has(ids[0])) {
      likelyDuplicates.push({
        kind: "exact_phone",
        confidence: "likely",
        legacyCustomerIds: ids,
        destinationUserId: destHits[0].id,
        reason: "Phone matches an existing destination user; not auto-merged",
        needsManualReview: true,
      });
    }
  }

  for (const [, ids] of namePhoneGroups) {
    if (ids.length > 1) {
      likelyDuplicates.push({
        kind: "name_phone",
        confidence: "likely",
        legacyCustomerIds: ids,
        reason: "Same normalized name + phone in legacy extract",
        needsManualReview: true,
      });
    }
  }
  for (const [, ids] of nameEmailGroups) {
    if (ids.length > 1) {
      likelyDuplicates.push({
        kind: "name_email",
        confidence: "likely",
        legacyCustomerIds: ids,
        reason: "Same normalized name + email in legacy extract",
        needsManualReview: true,
      });
    }
  }

  const newCustomers = clients.map((c) => c.id).filter((id) => !matchedLegacy.has(id));
  const manualReview = [...conflicts, ...likelyDuplicates.filter((d) => d.needsManualReview)];

  return { exactMatches, likelyDuplicates, newCustomers, conflicts, manualReview };
}
