import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getPaymentSettings } from "@/lib/payment-settings";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { NextResponse } from "next/server";

function formatMoney(satang: number, currency: string) {
  return new Intl.NumberFormat("en-TH", {
    style: "currency",
    currency: currency || "THB",
    minimumFractionDigits: 2,
  }).format(satang / 100);
}

type LineRow = {
  description?: string;
  quantity?: number;
  unitAmountSatang?: number;
  lineTotalSatang?: number;
};

function parseLineItems(raw: unknown): LineRow[] | null {
  if (!raw || !Array.isArray(raw)) return null;
  return raw as LineRow[];
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-US").format(d);
}

function textOrDash(v: string | null | undefined) {
  return v?.trim() || "-";
}

async function readThaiQrDataUrl(configured: string | null) {
  const candidates = [
    configured,
    path.join(process.cwd(), "public", "images", "payments", "thai-qr-payment.png"),
  ].filter(Boolean) as string[];

  for (const filePath of candidates) {
    try {
      const bytes = await readFile(filePath);
      return `data:image/png;base64,${bytes.toString("base64")}`;
    } catch {
      // Try next candidate.
    }
  }
  return null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (role === "customer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const inv = await prisma.invoice.findUnique({
    where: { id },
    include: {
      case: { include: { service: true, user: true } },
      user: true,
    },
  });

  if (!inv) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const clientName = inv.user?.name ?? inv.case.guestName ?? inv.user?.email ?? inv.case.guestEmail ?? "—";
  const clientEmail = inv.user?.email ?? inv.case.guestEmail ?? "—";
  const clientPhone = inv.user?.phone ?? inv.case.guestPhone ?? "—";
  const clientAddress = inv.clientAddress?.trim() || "—";
  const issueDate = formatDate(inv.createdAt);
  const dueDate = inv.dueDate ? formatDate(inv.dueDate) : "-";
  const invoiceRef = `INV-${inv.id.slice(0, 8).toUpperCase()}`;
  const paymentSettings = await getPaymentSettings();
  const thaiQrDataUrl = await readThaiQrDataUrl(paymentSettings.qrImagePath);

  const doc = new jsPDF();
  const margin = 16;
  const pageW = doc.internal.pageSize.getWidth();
  let y = margin;

  // Header / company block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("SiamEZ", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y += 6;
  doc.text("615/93 Lumpini Sukhumvit 77, Suan Luang", margin, y);
  y += 4.5;
  doc.text("Bangkok, Thailand, 10250", margin, y);
  y += 4.5;
  doc.text("Phone +66 64 343 8768", margin, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("INVOICE", pageW - margin, margin + 2, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`INVOICE NO. ${invoiceRef}`, pageW - margin, margin + 9, { align: "right" });
  doc.text(`DATE ${issueDate}`, pageW - margin, margin + 14, { align: "right" });
  doc.text(`DUE ${dueDate}`, pageW - margin, margin + 19, { align: "right" });

  y += 10;
  doc.setDrawColor(220);
  doc.line(margin, y, pageW - margin, y);
  y += 7;

  // Bill-to + info section
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO", margin, y);
  doc.text("INSTRUCTIONS", pageW / 2 + 10, y);
  doc.setFont("helvetica", "normal");
  y += 5;
  doc.text(clientName, margin, y);
  y += 4.5;
  doc.text(clientEmail, margin, y);
  y += 4.5;
  doc.text(clientPhone, margin, y);
  y += 4.5;
  const addressLines = doc.splitTextToSize(clientAddress, pageW / 2 - margin - 6);
  doc.text(addressLines, margin, y);
  y += Math.max(4.5, addressLines.length * 4.2);
  doc.text(`Case: ${inv.case.caseNumber}`, margin, y);
  y += 4.5;
  doc.text(`Service: ${inv.case.service.name}`, margin, y);

  const instructions = doc.splitTextToSize(
    "Please make payment as soon as possible to secure your reservation. Payment details are on page 2.",
    pageW / 2 - margin - 8
  );
  doc.text(instructions, pageW / 2 + 10, y - 18);
  y += 8;

  const lines = parseLineItems(inv.lineItems);
  const body: (string | number)[][] =
    lines?.length ?
      lines.map((row) => [
        String(row.quantity ?? 1),
        String(row.description ?? ""),
        formatMoney(Number(row.unitAmountSatang ?? 0), inv.currency).replace(/[^\d.,-]/g, ""),
        formatMoney(Number(row.lineTotalSatang ?? 0), inv.currency).replace(/[^\d.,-]/g, ""),
      ])
    : [[
        "1",
        "Invoice total",
        formatMoney(inv.amount, inv.currency).replace(/[^\d.,-]/g, ""),
        formatMoney(inv.amount, inv.currency).replace(/[^\d.,-]/g, ""),
      ]];

  autoTable(doc, {
    startY: y,
    head: [["Quantity", "Description", "Unit Price", "Total"]],
    body,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 2.5, lineWidth: 0.1, lineColor: [220, 220, 220] },
    headStyles: { fillColor: [245, 245, 245], textColor: [20, 20, 20], fontStyle: "bold" },
    columnStyles: {
      0: { halign: "center", cellWidth: 24 },
      1: { cellWidth: "auto" },
      2: { halign: "right", cellWidth: 35 },
      3: { halign: "right", cellWidth: 35 },
    },
    margin: { left: margin, right: margin },
  });

  type DocWithTable = typeof doc & { lastAutoTable?: { finalY: number } };
  const finalY = (doc as DocWithTable).lastAutoTable?.finalY ?? y + 40;

  const subtotalText = formatMoney(inv.amount, inv.currency);
  doc.setFontSize(10);
  doc.text("SUBTOTAL", pageW - margin - 50, finalY + 8);
  doc.text(subtotalText, pageW - margin, finalY + 8, { align: "right" });
  doc.text("TOTAL DUE", pageW - margin - 50, finalY + 14);
  doc.setFont("helvetica", "bold");
  doc.text(subtotalText, pageW - margin, finalY + 14, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text("Thank you for your business!", margin, finalY + 18);

  // Page 2 - payment details
  doc.addPage();
  const p2w = doc.internal.pageSize.getWidth();
  let p2y = margin;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Payment Details", margin, p2y);
  p2y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    "Please use one of the methods below and include your invoice reference with payment.",
    margin,
    p2y
  );
  p2y += 8;

  if (thaiQrDataUrl) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Thai QR Payment", margin, p2y);
    p2y += 3;
    doc.addImage(thaiQrDataUrl, "PNG", margin, p2y, 62, 84);
    p2y += 90;
  }

  autoTable(doc, {
    startY: p2y,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 2.3, lineWidth: 0.1, lineColor: [220, 220, 220] },
    headStyles: { fillColor: [245, 245, 245], textColor: [20, 20, 20], fontStyle: "bold" },
    head: [["Method", "Details"]],
    body: [
      ["PromptPay", `ID: ${textOrDash(paymentSettings.promptPayId)}\nReference: ${invoiceRef}\nAmount: ${subtotalText}`],
      [
        "Bank Transfer",
        `Bank: ${textOrDash(paymentSettings.bankName)}\nBranch: ${textOrDash(paymentSettings.bankBranch)}\nAccount Name: ${textOrDash(paymentSettings.bankAccountName)}\nAccount Number: ${textOrDash(paymentSettings.bankAccountNumber)}\nReference: ${invoiceRef}\nAmount: ${subtotalText}`,
      ],
      [
        "Wise",
        `Beneficiary: ${textOrDash(paymentSettings.wiseBeneficiary)}\nAccount ID: ${textOrDash(paymentSettings.wiseAccountId)}\nCurrency: ${textOrDash(paymentSettings.wiseCurrency)}\nDetails: ${textOrDash(paymentSettings.wiseDetails).replace("[Your invoice reference]", invoiceRef)}\nNote: ${textOrDash(paymentSettings.wiseNote)}`,
      ],
    ],
    columnStyles: {
      0: { cellWidth: 35, fontStyle: "bold" },
      1: { cellWidth: p2w - margin * 2 - 35 },
    },
    margin: { left: margin, right: margin },
  });

  const p2finalY = (doc as DocWithTable).lastAutoTable?.finalY ?? p2y + 40;
  doc.setFontSize(10);
  doc.text(`Invoice Reference: ${invoiceRef}`, margin, p2finalY + 8);
  doc.text("Please keep this invoice for your records.", margin, p2finalY + 14);

  const buf = doc.output("arraybuffer");
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${inv.id.slice(0, 8)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
