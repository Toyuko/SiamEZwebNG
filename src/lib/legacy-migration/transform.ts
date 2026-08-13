import { detectDuplicates } from "./duplicates";
import { thbToSatang } from "./money";
import { extractLineId, normalizeEmail, parseLegacyDate, splitName, syntheticCustomerEmail, syntheticStaffEmail } from "./normalize";
import { mapLegacyServiceToSlug, SERVICES_TO_ENSURE } from "./service-map";
import {
  isCancelledJob,
  isPaidOrder,
  mapJobStatusToCaseStatus,
  mapPaymentMethod,
  stableCaseNumber,
} from "./status-map";
import type {
  DuplicateReport,
  LegacyExtract,
  LegacyMoneyTotals,
  TransformedBundle,
  TransformedCase,
  TransformedCustomer,
  TransformedEvent,
  TransformedInvoice,
  TransformedPayment,
  TransformedStaff,
} from "./types";

function addHours(iso: string, hours: number): string {
  const d = new Date(iso);
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

export function computeLegacyMoneyTotals(extract: LegacyExtract): LegacyMoneyTotals {
  const jobTotalThb = extract.jobs.reduce((s, j) => s + thbToSatang(j.total_amount), 0) / 100;
  const jobCostThb = extract.jobs.reduce((s, j) => s + thbToSatang(j.cost), 0) / 100;
  const orderTotalThb = extract.orders.reduce((s, o) => s + thbToSatang(o.total_amount), 0) / 100;
  const orderSubtotalThb = extract.orders.reduce((s, o) => s + thbToSatang(o.subtotal), 0) / 100;
  const orderTaxThb = extract.orders.reduce((s, o) => s + thbToSatang(o.tax), 0) / 100;
  const paidThb =
    extract.orders.filter(isPaidOrder).reduce((s, o) => s + thbToSatang(o.total_amount), 0) / 100;
  const cancelledThb =
    extract.jobs.filter(isCancelledJob).reduce((s, j) => s + thbToSatang(j.total_amount), 0) / 100;
  const completedJobThb =
    extract.jobs
      .filter((j) => (j.status ?? "").toLowerCase() === "completed")
      .reduce((s, j) => s + thbToSatang(j.total_amount), 0) / 100;
  return {
    jobTotalThb,
    jobCostThb,
    orderTotalThb,
    orderSubtotalThb,
    orderTaxThb,
    paidThb,
    cancelledThb,
    completedJobThb,
    outstandingThb: 0,
    refundsThb: 0,
    depositsThb: 0,
  };
}

export function transformLegacyExtract(extract: LegacyExtract): {
  bundle: TransformedBundle;
  duplicates: DuplicateReport;
  money: LegacyMoneyTotals;
} {
  const duplicates = detectDuplicates({ clients: extract.clients });
  const skipped: TransformedBundle["skipped"] = [];
  const ordersById = new Map(extract.orders.map((o) => [o.id, o]));

  const emailFirstOwner = new Map<string, number>();
  const customers: TransformedCustomer[] = [];
  for (const client of extract.clients) {
    const realEmail = normalizeEmail(client.email);
    if (realEmail) {
      const owner = emailFirstOwner.get(realEmail);
      if (owner != null && owner !== client.id) {
        skipped.push({
          entity: "customer",
          legacyId: client.id,
          reason: `Duplicate email of customer ${owner}; imported with synthetic email (not merged)`,
        });
      } else {
        emailFirstOwner.set(realEmail, client.id);
      }
    }
    const { firstName, lastName } = splitName(client.name);
    const line = extractLineId(client.notes) ?? extractLineId(client.address);
    const claimedEmail = realEmail && emailFirstOwner.get(realEmail) === client.id ? realEmail : null;
    customers.push({
      legacyCustomerId: client.id,
      email: claimedEmail ?? syntheticCustomerEmail(client.id),
      emailIsSynthetic: !claimedEmail,
      name: (client.name ?? "").trim() || `Legacy customer ${client.id}`,
      firstName,
      lastName,
      phone: client.phone?.trim() || null,
      address: client.address?.trim() || null,
      notes: client.notes?.trim() || null,
      line,
      createdAt: client.created_at,
      updatedAt: client.updated_at,
      metadata: {
        firstName,
        lastName,
        line,
        country: null,
        customerType: "customer",
        lastActivityAt: client.updated_at,
        totalBookings: client.total_bookings ?? null,
        totalSpent: client.total_spent ?? null,
        source: "siam-ez.com/admin",
      },
    });
  }

  const staff: TransformedStaff[] = extract.staff.map((s) => {
    const role = (s.role ?? "").toLowerCase() === "freelancer" ? "freelancer" : "staff";
    return {
      legacyStaffId: s.id,
      email: normalizeEmail(s.email) ?? syntheticStaffEmail(s.id),
      name: (s.name ?? "").trim() || `Legacy staff ${s.id}`,
      phone: s.phone?.trim() || null,
      role,
      notes: s.notes?.trim() || null,
      createdAt: s.created_at ?? null,
    };
  });

  const cases: TransformedCase[] = [];
  const invoices: TransformedInvoice[] = [];
  const payments: TransformedPayment[] = [];
  const events: TransformedEvent[] = [];

  for (const job of extract.jobs) {
    const order = ordersById.get(job.id);
    const slug = mapLegacyServiceToSlug(job.service_name);
    if (!slug) {
      skipped.push({
        entity: "job",
        legacyId: job.id,
        reason: `Unmapped service name: ${job.service_name ?? "(none)"}`,
      });
    }
    const paymentStatus = order?.payment_status ?? job.payment_status ?? null;
    const totalSatang = thbToSatang(order?.total_amount ?? job.total_amount);
    const taxSatang = thbToSatang(order?.tax);
    const costSatang = thbToSatang(job.cost);
    const orderNumber = order?.order_number ?? job.order_number ?? null;
    const status = mapJobStatusToCaseStatus(job.status, paymentStatus);
    const completedAt =
      status === "completed" ? job.updated_at ?? job.created_at : null;

    cases.push({
      legacyJobId: job.id,
      legacyOrderNumber: orderNumber,
      legacyCustomerId: job.client_id,
      legacyServiceId: job.service_id,
      serviceSlug: slug ?? "legacy-test-service",
      serviceName: job.service_name ?? "Unknown service",
      status,
      caseNumber: stableCaseNumber(job.id, orderNumber),
      bookingDate: job.booking_date,
      notes: job.notes ?? order?.notes ?? null,
      internalNotes: job.notes,
      totalAmountSatang: totalSatang,
      costSatang,
      taxSatang,
      paymentStatus,
      paymentMethod: order?.payment_method ?? null,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      completedAt,
      formData: {
        legacy: {
          jobId: job.id,
          orderId: order?.id ?? null,
          orderNumber,
          serviceId: job.service_id,
          serviceName: job.service_name,
          serviceCategory: job.service_category,
          jobStatus: job.status,
          paymentStatus,
          paymentMethod: order?.payment_method ?? null,
          totalAmountThb: satangDisplay(totalSatang),
          costThb: satangDisplay(costSatang),
          taxThb: satangDisplay(taxSatang),
          sourceType: order?.source_type ?? "booking",
        },
      },
    });

    const booking = parseLegacyDate(job.booking_date);
    if (booking) {
      const start = booking.toISOString();
      events.push({
        legacyJobId: job.id,
        title: `${job.service_name ?? "Service"} — ${job.client_name ?? "Client"}`,
        start,
        end: addHours(start, 1),
        description: job.notes,
      });
    }

    if (isCancelledJob(job)) {
      continue;
    }

    const method = mapPaymentMethod(order?.payment_method);
    invoices.push({
      legacyOrderId: order?.id ?? job.id,
      legacyJobId: job.id,
      legacyCustomerId: job.client_id,
      amountSatang: totalSatang,
      taxSatang,
      status: isPaidOrder(order ?? { payment_status: paymentStatus }) ? "paid" : "unpaid",
      paymentMethod: method,
      createdAt: order?.created_at ?? job.created_at,
      paidAt: isPaidOrder(order ?? { payment_status: paymentStatus })
        ? order?.updated_at ?? job.updated_at ?? job.created_at
        : null,
      clientAddress: order?.customer_address ?? null,
      lineItems: [
        {
          description: job.service_name ?? "Service",
          amountSatang: totalSatang - taxSatang,
        },
        ...(taxSatang
          ? [{ description: "Tax", amountSatang: taxSatang }]
          : []),
      ],
    });

    if (order && isPaidOrder(order)) {
      payments.push({
        legacyOrderId: order.id,
        legacyJobId: job.id,
        amountSatang: totalSatang,
        method,
        status: "approved",
        idempotencyKey: `legacy-order-${order.order_number}`,
        createdAt: order.created_at,
        approvedAt: order.updated_at ?? order.created_at,
      });
    }
  }

  const bundle: TransformedBundle = {
    customers,
    staff,
    cases,
    invoices,
    payments,
    events,
    servicesToEnsure: SERVICES_TO_ENSURE,
    skipped,
  };

  return { bundle, duplicates, money: computeLegacyMoneyTotals(extract) };
}

function satangDisplay(satang: number): number {
  return satang / 100;
}
