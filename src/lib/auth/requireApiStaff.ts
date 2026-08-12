import { NextRequest } from "next/server";
import { getApiUser, type ApiUser } from "@/lib/auth/getApiUser";
import { isStaffRole } from "@/lib/auth/roles";

/** Bearer JWT user that must be admin or staff. */
export async function requireApiStaff(request: NextRequest): Promise<ApiUser> {
  const user = await getApiUser(request);
  if (!isStaffRole(user.role)) {
    throw new Error("Forbidden");
  }
  return user;
}
