import { site } from "@/config/site";
import { EMAIL_BRAND_CIDS } from "@/lib/email/assets";
import { getAppBaseUrl } from "@/lib/email/config";

/** Brand palette from SiamEZ logo / cover assets */
export const EMAIL_BRAND = {
  blue: "#2c54c6",
  blueDeep: "#2344b0",
  yellow: "#ffce2d",
  yellowDark: "#e6b828",
  ink: "#0f172a",
  body: "#334155",
  muted: "#64748b",
  canvas: "#eef2fb",
  white: "#ffffff",
} as const;

const SERIF =
  "Georgia,'Times New Roman',Times,Cambria,serif";
const SANS =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function emailLayout(input: {
  title: string;
  preheader?: string;
  bodyHtml: string;
}): string {
  const base = getAppBaseUrl();
  // Inline CIDs — attached by sendEmail from public/images/brand/*
  const bannerUrl = `cid:${EMAIL_BRAND_CIDS.banner}`;
  const logoUrl = `cid:${EMAIL_BRAND_CIDS.logo}`;
  const host = base.replace(/^https?:\/\//, "");
  const preheader = input.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">${escapeHtml(input.preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(input.title)}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background:${EMAIL_BRAND.canvas};font-family:${SANS};color:${EMAIL_BRAND.ink};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  ${preheader}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${EMAIL_BRAND.canvas};padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:${EMAIL_BRAND.white};border-radius:16px;overflow:hidden;border:1px solid #d9e2f5;box-shadow:0 8px 24px rgba(44,84,198,0.08);">
          <!-- Brand banner -->
          <tr>
            <td style="padding:0;line-height:0;font-size:0;background:${EMAIL_BRAND.blue};">
              <a href="${escapeHtml(base)}" style="display:block;text-decoration:none;">
                <img
                  src="${bannerUrl}"
                  width="600"
                  alt="${escapeHtml(site.name)} — ${escapeHtml(site.tagline)}"
                  style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;text-decoration:none;"
                />
              </a>
            </td>
          </tr>
          <!-- Wordmark strip (fallback + brand reinforcement) -->
          <tr>
            <td style="background:${EMAIL_BRAND.blueDeep};padding:14px 28px;border-top:3px solid ${EMAIL_BRAND.yellow};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;width:44px;">
                    <img
                      src="${logoUrl}"
                      width="40"
                      height="40"
                      alt=""
                      style="display:block;width:40px;height:40px;border:0;border-radius:50%;"
                    />
                  </td>
                  <td style="vertical-align:middle;padding-left:12px;">
                    <div style="font-family:${SERIF};font-size:20px;line-height:1.1;font-weight:700;color:${EMAIL_BRAND.white};letter-spacing:-0.01em;">
                      Siam<span style="color:${EMAIL_BRAND.yellow};">EZ</span>
                    </div>
                    <div style="font-family:${SANS};font-size:11px;line-height:1.3;color:#dbe4ff;margin-top:2px;">
                      ${escapeHtml(site.tagline)}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 28px 24px;font-family:${SANS};">
              ${input.bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:${EMAIL_BRAND.blue};padding:22px 28px;border-top:3px solid ${EMAIL_BRAND.yellow};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:top;width:52px;">
                    <img
                      src="${logoUrl}"
                      width="44"
                      height="44"
                      alt="${escapeHtml(site.name)}"
                      style="display:block;width:44px;height:44px;border:0;border-radius:50%;"
                    />
                  </td>
                  <td style="vertical-align:top;padding-left:12px;font-family:${SANS};font-size:12px;line-height:1.55;color:#dbe4ff;">
                    <div style="font-family:${SERIF};font-size:15px;font-weight:700;color:${EMAIL_BRAND.white};margin-bottom:4px;">
                      Siam<span style="color:${EMAIL_BRAND.yellow};">EZ</span>
                    </div>
                    <div style="margin:0 0 6px;color:#c5d2f5;">${escapeHtml(site.legal.companyName)}</div>
                    <div style="margin:0 0 6px;">
                      <a href="${escapeHtml(base)}" style="color:${EMAIL_BRAND.yellow};text-decoration:none;">${escapeHtml(host)}</a>
                      &nbsp;·&nbsp;
                      <a href="mailto:${escapeHtml(site.email)}" style="color:${EMAIL_BRAND.yellow};text-decoration:none;">${escapeHtml(site.email)}</a>
                    </div>
                    <div style="margin:0;color:#a8b8e8;">You received this because of activity on ${escapeHtml(site.name)}.</div>
                    <div style="margin:8px 0 0;color:#a8b8e8;">${escapeHtml(site.legal.companyName)}</div>
                    <div style="margin:4px 0 0;color:#a8b8e8;">${escapeHtml(site.address.full)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <div style="max-width:600px;margin:14px auto 0;font-family:${SANS};font-size:11px;line-height:1.4;color:${EMAIL_BRAND.muted};text-align:center;">
          Making life in Thailand <span style="color:${EMAIL_BRAND.blue};font-weight:700;">EZ</span>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function ctaButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px;">
  <tr>
    <td align="center" bgcolor="${EMAIL_BRAND.yellow}" style="border-radius:10px;background:${EMAIL_BRAND.yellow};">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${escapeHtml(href)}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="18%" stroke="f" fillcolor="${EMAIL_BRAND.yellow}">
        <w:anchorlock/>
        <center style="color:${EMAIL_BRAND.blueDeep};font-family:Arial,sans-serif;font-size:15px;font-weight:700;">
          ${escapeHtml(label)}
        </center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-- -->
      <a href="${escapeHtml(href)}" style="display:inline-block;background:${EMAIL_BRAND.yellow};color:${EMAIL_BRAND.blueDeep};text-decoration:none;font-family:${SANS};font-weight:700;font-size:15px;line-height:1.2;padding:14px 22px;border-radius:10px;border:2px solid ${EMAIL_BRAND.yellowDark};">
        ${escapeHtml(label)}
      </a>
      <!--<![endif]-->
    </td>
  </tr>
</table>`;
}

export function paragraph(text: string): string {
  return `<p style="margin:0 0 14px;font-family:${SANS};font-size:15px;line-height:1.6;color:${EMAIL_BRAND.body};">${escapeHtml(text)}</p>`;
}

export function heading(text: string): string {
  return `<h1 style="margin:0 0 16px;font-family:${SERIF};font-size:26px;line-height:1.25;font-weight:700;color:${EMAIL_BRAND.blueDeep};letter-spacing:-0.02em;">${escapeHtml(text)}</h1>`;
}

export function detailRow(label: string, value: string): string {
  return `<tr>
  <td style="padding:8px 0;font-family:${SANS};font-size:13px;color:${EMAIL_BRAND.muted};width:140px;vertical-align:top;border-bottom:1px solid #e8eef9;">${escapeHtml(label)}</td>
  <td style="padding:8px 0;font-family:${SANS};font-size:14px;color:${EMAIL_BRAND.ink};vertical-align:top;border-bottom:1px solid #e8eef9;font-weight:600;">${escapeHtml(value)}</td>
</tr>`;
}

export function detailTable(rows: { label: string; value: string }[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 18px;border-collapse:collapse;background:#f7f9ff;border:1px solid #e0e8fa;border-radius:10px;overflow:hidden;">
  <tr>
    <td style="padding:4px 14px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${rows.map((r) => detailRow(r.label, r.value)).join("")}
      </table>
    </td>
  </tr>
</table>`;
}
