import type { EngagementOwner } from "./types";

export function userOwnerKey(userId: string): string {
  return `user:${userId}`;
}

export function anonOwnerKey(anonymousSessionId: string): string {
  return `anon:${anonymousSessionId}`;
}

export function buildUserOwner(userId: string): EngagementOwner {
  return { kind: "user", userId, ownerKey: userOwnerKey(userId) };
}

export function buildAnonOwner(anonymousSessionId: string): EngagementOwner {
  return {
    kind: "anon",
    anonymousSessionId,
    ownerKey: anonOwnerKey(anonymousSessionId),
  };
}

export function parseOwnerKey(ownerKey: string): EngagementOwner | null {
  if (ownerKey.startsWith("user:")) {
    const userId = ownerKey.slice("user:".length).trim();
    if (!userId) return null;
    return buildUserOwner(userId);
  }
  if (ownerKey.startsWith("anon:")) {
    const anonymousSessionId = ownerKey.slice("anon:".length).trim();
    if (!anonymousSessionId) return null;
    return buildAnonOwner(anonymousSessionId);
  }
  return null;
}
