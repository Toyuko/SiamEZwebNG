import { prisma } from "@/lib/db";
import { DEFAULT_PRICE_CATALOGUE } from "@/lib/backoffice/pricing";

const KNOWLEDGE = [
  {
    slug: "assistant-rules",
    title: "How the back-office assistant is allowed to act",
    category: "policy" as const,
    priority: 100,
    body: "The assistant reads live SiamEZ records. It must not invent payments, balances, or bookings. It must not overwrite a customer record. Draft messages are not sent. External email, refunds, and payment changes wait for a staff confirmation or stay in the finance screens. Document reading is a staff aid and never certifies authenticity or legal validity.",
  },
  {
    slug: "price-catalogue",
    title: "Service prices",
    category: "pricing" as const,
    priority: 90,
    body: "Quotation prices come from the assistant price catalogue, which administrators can edit. Do not quote a number from memory. If a service is inactive or missing, say so. Combined car and motorcycle licences use the catalogue package when that package is active.",
  },
  {
    slug: "driving-licence-documents",
    title: "Driving licence document checklist",
    category: "document" as const,
    priority: 80,
    body: "Thai driving licence work usually needs a passport, a residential certificate or address proof, photographs, and the current licence when the customer is renewing or converting. International driving permit requests also need the Thai licence. Staff confirm the exact office checklist before an appointment. Missing items should be requested from the customer, not assumed.",
  },
  {
    slug: "marriage-documents",
    title: "Marriage registration document checklist",
    category: "document" as const,
    priority: 80,
    body: "Marriage registration usually needs passports, translations, legalisation where required, and marital-status evidence. Requirements differ by nationality. The assistant can list what is on the case and what is still missing. It cannot decide that a file is legally complete.",
  },
  {
    slug: "communication-approval",
    title: "Customer communication approval",
    category: "template" as const,
    priority: 70,
    body: "Staff can ask for a message in Thai or English. The assistant prepares the wording. LINE, email, WhatsApp, and SMS are not sent until a person confirms. Appointment reminders use the email address already stored on the booking.",
  },
  {
    slug: "renewal-schedule",
    title: "Driving licence renewal follow-up schedule",
    category: "procedure" as const,
    priority: 70,
    body: "Renewal attention is due about 90, 60, 30, and 7 days before the licence expiry recorded by staff. The expiry date on the renewal record is the source of truth. Contact status and the assigned staff member stay on that record.",
  },
  {
    slug: "vehicle-operations",
    title: "Vehicle finding and selling",
    category: "vehicle" as const,
    priority: 60,
    body: "Buy leads are customers looking for a vehicle. Sell leads are customers asking SiamEZ to sell. Sourcing and selling fees come from the vehicle service pricing settings, not from a guessed amount. A fee is outstanding only when an invoice or payment record says so. Listing inventory is the published sales catalogue.",
  },
  {
    slug: "services-overview",
    title: "SiamEZ services the assistant should recognise",
    category: "service" as const,
    priority: 50,
    body: "Core services include marriage registration, Thai car and motorcycle driving licences, licence renewal and conversion, international driving permits, police clearance, certified translation, MFA legalisation, residential certificates, and vehicle registration. Descriptions and live catalogue prices stay on the service records. The assistant price catalogue is the quotation reference for the standard licence packages.",
  },
];

export async function ensureBackofficeCatalogue(): Promise<void> {
  const [prices, articles] = await Promise.all([
    prisma.backofficePriceItem.count(),
    prisma.backofficeKnowledgeArticle.count(),
  ]);
  if (prices === 0) {
    await prisma.backofficePriceItem.createMany({
      data: DEFAULT_PRICE_CATALOGUE.map((item) => ({
        code: item.code,
        name: item.name,
        amountSatang: item.amountSatang,
        sortOrder: item.sortOrder,
        currency: "THB",
        active: true,
      })),
    });
  }
  if (articles === 0) {
    await prisma.backofficeKnowledgeArticle.createMany({
      data: KNOWLEDGE.map((article) => ({
        slug: article.slug,
        title: article.title,
        category: article.category,
        body: article.body,
        priority: article.priority,
        locale: "en",
        active: true,
      })),
    });
  }
}
