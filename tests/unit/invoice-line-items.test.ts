import { describe, expect, it } from "vitest";
import {
  areFormLinesValid,
  fallbackLineItemsFromAmount,
  formLinesToPayload,
  lineItemsToForm,
  parseInvoiceLineItems,
  thbToSatang,
  totalSatangFromForm,
} from "@/lib/invoices/line-items";
import {
  invoiceDocumentTitle,
  invoiceStatusLabel,
  invoiceTotalLabel,
} from "@/lib/invoices/status";

describe("invoice line items", () => {
  it("parses stored line items and ignores empty rows", () => {
    const items = parseInvoiceLineItems([
      { description: "Visa run", quantity: 1, unitAmountSatang: 250000, lineTotalSatang: 250000 },
      { description: "", quantity: 1, unitAmountSatang: 0, lineTotalSatang: 0 },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]?.description).toBe("Visa run");
    expect(items[0]?.lineTotalSatang).toBe(250000);
  });

  it("computes totals from the edit form", () => {
    const lines = [
      { description: "Service fee", quantity: "2", unitThb: "1500" },
      { description: "Translation", quantity: "1", unitThb: "800.50" },
    ];
    expect(areFormLinesValid(lines)).toBe(true);
    expect(totalSatangFromForm(lines)).toBe(2 * 150000 + 80050);
    expect(formLinesToPayload(lines)[1]?.lineTotalSatang).toBe(80050);
  });

  it("rejects incomplete line items", () => {
    expect(areFormLinesValid([{ description: "", quantity: "1", unitThb: "100" }])).toBe(false);
    expect(areFormLinesValid([{ description: "Fee", quantity: "0", unitThb: "100" }])).toBe(false);
    expect(areFormLinesValid([])).toBe(false);
  });

  it("round-trips stored items into the form", () => {
    const form = lineItemsToForm([
      { description: "Deposit", quantity: 1, unitAmountSatang: 10000, lineTotalSatang: 10000 },
    ]);
    expect(form[0]).toEqual({ description: "Deposit", quantity: "1", unitThb: "100.00" });
    expect(fallbackLineItemsFromAmount(250000)[0]?.unitThb).toBe("2500.00");
  });

  it("converts THB strings to satang", () => {
    expect(thbToSatang("1,250.50")).toBe(125050);
    expect(thbToSatang("-1")).toBe(-1);
  });
});

describe("invoice status copy", () => {
  it("uses friendly labels for admin editing", () => {
    expect(invoiceStatusLabel("unpaid")).toBe("Unpaid (sent)");
    expect(invoiceStatusLabel("paid")).toBe("Paid");
  });

  it("marks paid invoices on the generated PDF", () => {
    expect(invoiceDocumentTitle("paid")).toBe("PAID INVOICE");
    expect(invoiceTotalLabel("paid")).toBe("PAID IN FULL");
    expect(invoiceDocumentTitle("unpaid")).toBe("INVOICE");
    expect(invoiceTotalLabel("unpaid")).toBe("TOTAL DUE");
  });
});
