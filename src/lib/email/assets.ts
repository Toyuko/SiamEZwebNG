import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Attachment } from "resend";

/** Content-IDs referenced by `emailLayout` img tags (`cid:…`). */
export const EMAIL_BRAND_CIDS = {
  banner: "siamez-banner",
  logo: "siamez-logo",
} as const;

type BrandAttachment = {
  cid: string;
  relativePath: string;
  filename: string;
  contentType: string;
};

const BRAND_FILES: BrandAttachment[] = [
  {
    cid: EMAIL_BRAND_CIDS.banner,
    relativePath: "images/brand/banner-email.jpg",
    filename: "banner-email.jpg",
    contentType: "image/jpeg",
  },
  {
    cid: EMAIL_BRAND_CIDS.logo,
    relativePath: "images/brand/logo-circle-email.png",
    filename: "logo-circle-email.png",
    contentType: "image/png",
  },
];

let cached: Attachment[] | null = null;

/**
 * Inline brand images for Resend (CID). Loaded from `public/` so emails do not
 * depend on the live site URL — which breaks when assets are undeployed or
 * behind deployment protection.
 */
export async function getBrandEmailAttachments(): Promise<Attachment[]> {
  if (cached) return cached;

  const attachments: Attachment[] = [];
  for (const file of BRAND_FILES) {
    const absolute = path.join(process.cwd(), "public", file.relativePath);
    try {
      const content = await readFile(absolute);
      attachments.push({
        filename: file.filename,
        content,
        contentType: file.contentType,
        contentId: file.cid,
      });
    } catch (err) {
      console.warn(
        `[email] missing brand asset ${file.relativePath}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  if (attachments.length === BRAND_FILES.length) {
    cached = attachments;
  }
  return attachments;
}

/** True when HTML references our branded CID images. */
export function htmlNeedsBrandAttachments(html: string): boolean {
  return (
    html.includes(`cid:${EMAIL_BRAND_CIDS.banner}`) ||
    html.includes(`cid:${EMAIL_BRAND_CIDS.logo}`)
  );
}
