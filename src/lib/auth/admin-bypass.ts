/**
 * Admin auth bypass is for local/dev only.
 * Never honor BYPASS_ADMIN_AUTH on Vercel production/preview or NODE_ENV=production.
 */
export function isAdminAuthBypassEnabled(): boolean {
  if (process.env.BYPASS_ADMIN_AUTH !== "true") {
    return false;
  }

  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === "production" || vercelEnv === "preview") {
    console.error(
      "[security] BYPASS_ADMIN_AUTH=true ignored: VERCEL_ENV=%s",
      vercelEnv
    );
    return false;
  }

  if (process.env.NODE_ENV === "production") {
    console.error(
      "[security] BYPASS_ADMIN_AUTH=true ignored: NODE_ENV=production"
    );
    return false;
  }

  return true;
}
