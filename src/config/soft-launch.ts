/**
 * Soft-launch surface control.
 *
 * Prefer hiding unfinished product areas over deleting infrastructure.
 * Set SOFT_LAUNCH=false to restore the full platform IA.
 */
export const softLaunch = {
  /** When true, primary customer IA focuses on Services / Vehicles / RE / Concierge. */
  enabled: process.env.SOFT_LAUNCH !== "false",

  /**
   * Seller listing management in the customer portal (My Sales / My Properties).
   * Vehicles and real estate are core to the launch surface, so this stays on.
   */
  showSellerListings: true,

  /** Public marketplace freelancers directory in primary nav. */
  showFreelancers: false,

  /** Life-event journeys & goals teasers on homepage / portal. */
  showLifeEvents: false,

  /** Workflow runs in customer portal. */
  showWorkflows: false,

  /** Company ads / B2B surfaces in admin & portal. */
  showCompanies: false,

  /** Staff / freelancer ops depth in admin nav. */
  showFreelancerOps: false,

  /** Advanced admin insights (analytics depth can stay; hide experimental groups). */
  showAdvancedCatalog: false,
} as const;

export function isSoftLaunch(): boolean {
  return softLaunch.enabled;
}
