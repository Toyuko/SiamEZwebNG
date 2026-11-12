import { timingSafeEqual } from "crypto";

export function accessTokensMatch(stored: string, presented: string): boolean {
  const left = Buffer.from(stored);
  const right = Buffer.from(presented);
  if (left.length === 0 || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function canAccessApplication(input: {
  applicationUserId: string | null;
  accessToken: string;
  presentedToken?: string | null;
  sessionUserId?: string | null;
  staff: boolean;
}): boolean {
  if (input.staff) return true;
  if (input.sessionUserId && input.applicationUserId && input.sessionUserId === input.applicationUserId) {
    return true;
  }
  if (!input.presentedToken) return false;
  return accessTokensMatch(input.accessToken, input.presentedToken);
}
