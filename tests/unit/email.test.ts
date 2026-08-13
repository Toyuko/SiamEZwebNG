import { describe, expect, it } from "vitest";
import { htmlToText } from "@/lib/email/send";
import { escapeHtml, emailLayout, ctaButton } from "@/lib/email/layout";
import { DEFAULT_OPS_INBOXES, getEmailStatus, getOpsInbox, getOpsInboxes, isEmailConfigured } from "@/lib/email/config";

describe("email helpers", () => {
  it("escapes HTML entities", () => {
    expect(escapeHtml(`<a href="x">&'"</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;&#39;&quot;&lt;/a&gt;"
    );
  });

  it("builds a branded layout with escaped content and brand assets", () => {
    const html = emailLayout({
      title: "Hello <script>",
      bodyHtml: "<p>Body</p>",
    });
    expect(html).toContain("Siam");
    expect(html).toContain("EZ");
    expect(html).toContain("Hello &lt;script&gt;");
    expect(html).toContain("<p>Body</p>");
    expect(html).toContain("cid:siamez-banner");
    expect(html).toContain("cid:siamez-logo");
    expect(html).toContain("#ffce2d");
    expect(html).toContain("#2c54c6");
    expect(html).toContain("Georgia");
  });

  it("loads brand image attachments from public/", async () => {
    const { getBrandEmailAttachments, htmlNeedsBrandAttachments } = await import(
      "@/lib/email/assets"
    );
    expect(htmlNeedsBrandAttachments("cid:siamez-banner")).toBe(true);
    const attachments = await getBrandEmailAttachments();
    expect(attachments).toHaveLength(2);
    expect(attachments.map((a) => a.contentId)).toEqual([
      "siamez-banner",
      "siamez-logo",
    ]);
    expect(attachments.every((a) => Buffer.isBuffer(a.content))).toBe(true);
  });

  it("uses yellow brand CTAs with blue text", () => {
    const html = ctaButton("https://example.com/portal", "Open portal");
    expect(html).toContain("#ffce2d");
    expect(html).toContain("#2344b0");
    expect(html).toContain("Open portal");
    expect(html).toContain("https://example.com/portal");
  });

  it("converts HTML to plain text", () => {
    const text = htmlToText("<p>Hi<br/>there</p><h1>Title</h1>");
    expect(text).toContain("Hi");
    expect(text).toContain("there");
    expect(text).toContain("Title");
    expect(text).not.toContain("<");
  });

  it("reports email as unconfigured without RESEND_API_KEY", () => {
    const prev = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    expect(isEmailConfigured()).toBe(false);
    expect(getEmailStatus().configured).toBe(false);
    if (prev !== undefined) process.env.RESEND_API_KEY = prev;
  });

  it("always sends ops alerts to both default inboxes", () => {
    const prev = process.env.EMAIL_OPS_TO;
    try {
      delete process.env.EMAIL_OPS_TO;
      expect(getOpsInboxes()).toEqual([...DEFAULT_OPS_INBOXES]);
      expect(getOpsInbox()).toContain("touy_smith@hotmail.com");
      expect(getOpsInbox()).toContain("inquiries@siam-ez.com");
      process.env.EMAIL_OPS_TO = "ops@example.com, touy_smith@hotmail.com";
      expect(getOpsInboxes()).toEqual([
        "touy_smith@hotmail.com",
        "inquiries@siam-ez.com",
        "ops@example.com",
      ]);
    } finally {
      if (prev !== undefined) process.env.EMAIL_OPS_TO = prev;
      else delete process.env.EMAIL_OPS_TO;
    }
  });
});
