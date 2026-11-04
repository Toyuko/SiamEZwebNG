export type SalesTemplate = {
  id: string;
  name: string;
  purpose: string;
  body: string;
};

export const SALES_TEMPLATES: SalesTemplate[] = [
  { id: "new_enquiry", name: "New enquiry", purpose: "First reply to a new question.", body: "Hello {{name}},\n\nThank you for contacting SiamEZ. I can help with {{service}}.\n\nTell me the appointment date that suits you and I will confirm the next step.\n\nSiamEZ" },
  { id: "service_intro", name: "Service introduction", purpose: "Explain a service without inventing a price.", body: "Hello {{name}},\n\n{{service}} is handled by SiamEZ staff from the first document check through to completion.\n\nI will send the document list and the recorded price before we book.\n\nSiamEZ" },
  { id: "quotation", name: "Price quotation", purpose: "Send a price that is already on the quotation.", body: "Hello {{name}},\n\nThe quotation for {{service}} is {{amount}}.\n\nThis price comes from the quotation saved on your record. Reply if you want to proceed.\n\nSiamEZ" },
  { id: "booking_confirmation", name: "Booking confirmation", purpose: "Confirm a job that already exists.", body: "Hello {{name}},\n\nYour {{service}} booking is {{caseNumber}}.\n\nWe will send the document checklist next. Please wait for that list before visiting an office.\n\nSiamEZ" },
  { id: "deposit", name: "Deposit request", purpose: "Ask for a deposit that is already on the invoice.", body: "Hello {{name}},\n\nA deposit is recorded on {{caseNumber}}. The amount due is {{amount}}.\n\nReply to this email after you transfer it and we will match the payment.\n\nSiamEZ" },
  { id: "missing_documents", name: "Missing documents", purpose: "Ask for documents the checklist still lacks.", body: "Hello {{name}},\n\nWe still need the missing documents for {{caseNumber}} before {{service}} can move ahead.\n\nSend clear copies by reply. We will check them against the checklist.\n\nSiamEZ" },
  { id: "follow_up", name: "Follow-up", purpose: "Check in when a customer has gone quiet.", body: "Hello {{name}},\n\nI am checking whether you still want help with {{service}}.\n\nReply with a convenient time and I will continue from booking {{caseNumber}}.\n\nSiamEZ" },
  { id: "unpaid", name: "Unpaid invoice", purpose: "Remind a customer about a recorded balance.", body: "Hello {{name}},\n\nInvoice {{caseNumber}} still shows {{amount}} outstanding.\n\nIf you have already paid, reply with the transfer time and we will check the receipt.\n\nSiamEZ" },
  { id: "completed", name: "Completed service", purpose: "Tell a customer the job is finished.", body: "Hello {{name}},\n\n{{service}} for booking {{caseNumber}} is complete.\n\nKeep this email with your documents. Contact us if the office asks for anything else.\n\nSiamEZ" },
  { id: "thank_you", name: "Thank you", purpose: "Close a completed job politely.", body: "Hello {{name}},\n\nThank you for using SiamEZ for {{service}}.\n\nWe are glad to help with the next appointment when you need it.\n\nSiamEZ" },
  { id: "vehicle_sourcing", name: "Vehicle sourcing", purpose: "Reply to a customer looking for a vehicle.", body: "Hello {{name}},\n\nThank you for the vehicle search. Tell me the budget, type, and location you prefer.\n\nI will only suggest vehicles that are already in the SiamEZ records.\n\nSiamEZ" },
  { id: "vehicle_sales", name: "Vehicle sales", purpose: "Reply to a customer who wants to sell.", body: "Hello {{name}},\n\nThank you for asking SiamEZ about selling a vehicle.\n\nSend the make, model, year, and mileage. We will confirm the next step from the sales team.\n\nSiamEZ" },
  { id: "promotion", name: "Promotion", purpose: "A general service note with no invented offer.", body: "Hello {{name}},\n\nSiamEZ can help with {{service}}. I will quote from the current price list before you decide.\n\nReply if you want the checklist and the recorded price.\n\nSiamEZ" },
  { id: "objection", name: "Price objection", purpose: "Answer a price concern without changing the price.", body: "Hello {{name}},\n\nI understand the price is a concern. The figure I sent is the recorded SiamEZ price for {{service}}, not an estimate.\n\nIf you want, I can explain what that service includes. I cannot change the price from this message.\n\nSiamEZ" },
];

export function recommendTemplate(text: string): SalesTemplate {
  const t = text.toLowerCase();
  const pick = (id: string) => SALES_TEMPLATES.find((item) => item.id === id) ?? SALES_TEMPLATES[0]!;
  if (/objection|too expensive|too dear|competitor/.test(t)) return pick("objection");
  if (/thank/.test(t)) return pick("thank_you");
  if (/completed|finished/.test(t)) return pick("completed");
  if (/unpaid|outstanding invoice/.test(t)) return pick("unpaid");
  if (/deposit/.test(t)) return pick("deposit");
  if (/missing document|documents/.test(t)) return pick("missing_documents");
  if (/follow-?up|gone quiet|no reply/.test(t)) return pick("follow_up");
  if (/confirm/.test(t) && /book/.test(t)) return pick("booking_confirmation");
  if (/quot|price/.test(t)) return pick("quotation");
  if (/vehicle/.test(t) && /sell/.test(t)) return pick("vehicle_sales");
  if (/vehicle|sourcing|looking for a (car|bike|motorcycle)/.test(t)) return pick("vehicle_sourcing");
  if (/promo/.test(t)) return pick("promotion");
  if (/introduc|what is included|explain/.test(t)) return pick("service_intro");
  return pick("new_enquiry");
}

export function fillTemplate(body: string, fields: Record<string, string | null | undefined>): string {
  return body
    .split("\n")
    .map((line) => {
      const keys = [...line.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1] ?? "");
      if (keys.some((key) => !fields[key]?.trim())) return "";
      return line.replace(/\{\{(\w+)\}\}/g, (_, key: string) => fields[key]?.trim() ?? "");
    })
    .filter((line, index, all) => line.length > 0 || (index > 0 && all[index - 1] !== ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function translationKeepsFacts(source: string, translated: string): boolean {
  const figures = source.match(/\d[\d,]*/g) ?? [];
  return figures.every((figure) => translated.includes(figure));
}
