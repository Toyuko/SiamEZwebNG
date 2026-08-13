export const LEGACY_ADMIN_DEFAULT_BASE = "https://siam-ez.com/admin/";
export const SYNTHETIC_EMAIL_DOMAIN = "imported.invalid";
export const MIGRATION_BOT_EMAIL = "migration-bot@siamez.internal";

export type LegacyClient = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  total_bookings?: number | null;
  total_spent?: number | string | null;
};

export type LegacyAssignedStaff = {
  id: number;
  name?: string | null;
  email?: string | null;
};

export type LegacyJob = {
  id: number;
  client_id: number;
  service_id: number;
  booking_date: string | null;
  status: string | null;
  total_amount: number | string | null;
  cost: number | string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  service_name: string | null;
  service_category: string | null;
  client_name?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  order_id?: number | null;
  order_number?: string | null;
  payment_status?: string | null;
  assigned_staff?: LegacyAssignedStaff[] | null;
};

export type LegacyOrder = {
  id: number;
  order_number: string;
  client_id: number;
  service_id: number | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  service_name: string | null;
  service_data?: unknown;
  payment_method: string | null;
  payment_status: string | null;
  payment_details?: unknown;
  subtotal: number | string | null;
  tax: number | string | null;
  total_amount: number | string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  source_type?: string | null;
};

export type LegacyService = {
  id: number;
  name: string;
  description?: string | null;
  category?: string | null;
  price?: number | string | null;
  status?: string | null;
};

export type LegacyStaff = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  status?: string | null;
  hire_date?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type LegacyCalendarEvent = {
  id: number | string;
  title?: string | null;
  start?: string | null;
  end?: string | null;
  allDay?: boolean;
  extendedProps?: { description?: string; location?: string };
};

export type LegacyExtract = {
  extractedAt: string;
  sourceBaseUrl: string;
  dashboard: Record<string, unknown> | null;
  clients: LegacyClient[];
  jobs: LegacyJob[];
  orders: LegacyOrder[];
  services: LegacyService[];
  staff: LegacyStaff[];
  calendarEvents: LegacyCalendarEvent[];
  assetsCount: number;
  legalDocumentsCount: number;
};

export type DuplicateMatchKind =
  | "exact_legacy_id"
  | "exact_email"
  | "exact_phone"
  | "name_phone"
  | "name_email";

export type DuplicateRecord = {
  kind: DuplicateMatchKind;
  confidence: "exact" | "likely";
  legacyCustomerIds: number[];
  destinationUserId?: string;
  reason: string;
  needsManualReview: boolean;
};

export type DuplicateReport = {
  exactMatches: DuplicateRecord[];
  likelyDuplicates: DuplicateRecord[];
  newCustomers: number[];
  conflicts: DuplicateRecord[];
  manualReview: DuplicateRecord[];
};

export type TransformedCustomer = {
  legacyCustomerId: number;
  email: string;
  emailIsSynthetic: boolean;
  name: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  line: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  metadata: Record<string, unknown>;
};

export type TransformedStaff = {
  legacyStaffId: number;
  email: string;
  name: string;
  phone: string | null;
  role: "staff" | "freelancer";
  notes: string | null;
  createdAt: string | null;
};

export type TransformedCase = {
  legacyJobId: number;
  legacyOrderNumber: string | null;
  legacyCustomerId: number;
  legacyServiceId: number;
  serviceSlug: string;
  serviceName: string;
  status: string;
  caseNumber: string;
  bookingDate: string | null;
  notes: string | null;
  internalNotes: string | null;
  totalAmountSatang: number;
  costSatang: number;
  taxSatang: number;
  paymentStatus: string | null;
  paymentMethod: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  formData: Record<string, unknown>;
};

export type TransformedInvoice = {
  legacyOrderId: number;
  legacyJobId: number;
  legacyCustomerId: number;
  amountSatang: number;
  taxSatang: number;
  status: "paid" | "unpaid";
  paymentMethod: "bank" | "qr" | "wise" | "stripe" | null;
  createdAt: string | null;
  paidAt: string | null;
  clientAddress: string | null;
  lineItems: Array<{ description: string; amountSatang: number }>;
};

export type TransformedPayment = {
  legacyOrderId: number;
  legacyJobId: number;
  amountSatang: number;
  method: "bank" | "qr" | "wise" | "stripe";
  status: "approved";
  idempotencyKey: string;
  createdAt: string | null;
  approvedAt: string | null;
};

export type TransformedEvent = {
  legacyJobId: number;
  title: string;
  start: string;
  end: string;
  description: string | null;
};

export type TransformedBundle = {
  customers: TransformedCustomer[];
  staff: TransformedStaff[];
  cases: TransformedCase[];
  invoices: TransformedInvoice[];
  payments: TransformedPayment[];
  events: TransformedEvent[];
  servicesToEnsure: Array<{ slug: string; name: string; active: boolean }>;
  skipped: Array<{ entity: string; legacyId: string | number; reason: string }>;
};

export type ValidationIssue = {
  severity: "error" | "warning";
  entity: string;
  legacyId?: string | number;
  message: string;
};

export type LegacyMoneyTotals = {
  jobTotalThb: number;
  jobCostThb: number;
  orderTotalThb: number;
  orderSubtotalThb: number;
  orderTaxThb: number;
  paidThb: number;
  cancelledThb: number;
  completedJobThb: number;
  outstandingThb: number;
  refundsThb: number;
  depositsThb: number;
};

export type MigrationReportCounts = {
  customers: { legacy: number; migrated: number; duplicates: number; errors: number };
  jobs: { legacy: number; migrated: number; errors: number };
  bookings: { legacy: number; migrated: number; errors: number };
  invoices: { legacy: number; migrated: number; errors: number };
  payments: { legacy: number; migrated: number; errors: number };
  revenueThb: { legacy: number; neu: number; difference: number };
  outstandingThb: { legacy: number; neu: number; difference: number };
  expensesThb: { legacy: number; neu: number; difference: number };
};
