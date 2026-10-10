export type DirectoryRole = "admin" | "staff" | "customer" | "freelancer" | "company";

export type DirectoryPrincipal = {
  role: DirectoryRole;
  active: boolean;
  /** Explicit grant. Required for freelancers. Ignored for staff and admin. */
  directoryAccess: boolean;
  freelancerVerified: boolean;
};

export type DirectoryPermission = {
  canRead: boolean;
  canManage: boolean;
  canContribute: boolean;
};

/**
 * Browsing the directory is public. These flags gate staff tools only.
 * Staff and admin may suggest corrections and, for admin, edit records.
 * Freelancers may suggest only after an administrator verifies them and grants access.
 * Revoking the grant, rejecting verification, or deactivating the user removes that access.
 */
export function directoryPermission(principal: DirectoryPrincipal): DirectoryPermission {
  if (!principal.active) {
    return { canRead: false, canManage: false, canContribute: false };
  }

  if (principal.role === "admin") {
    return { canRead: true, canManage: true, canContribute: true };
  }

  if (principal.role === "staff") {
    return { canRead: true, canManage: false, canContribute: true };
  }

  if (
    principal.role === "freelancer" &&
    principal.freelancerVerified &&
    principal.directoryAccess
  ) {
    return { canRead: true, canManage: false, canContribute: true };
  }

  return { canRead: false, canManage: false, canContribute: false };
}

export function canReadDirectory(principal: DirectoryPrincipal): boolean {
  return directoryPermission(principal).canRead;
}

export function canManageDirectory(principal: DirectoryPrincipal): boolean {
  return directoryPermission(principal).canManage;
}
