#!/usr/bin/env node
/**
 * Sync gallery images into public/images/gallery and regenerate src/config/gallery.ts.
 *
 * Usage:
 *   node scripts/sync-gallery.mjs --from "/path/to/SiamEZ Gallery"
 *
 * - Deduplicates by file MD5 (keeps first file when sorted by basename).
 * - Writes siamez-001.jpg, siamez-002.jpg, ...
 * - Assigns categories from parseInt(md5 hex prefix, 16) % 6 (stable, even spread).
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DEST_DIR = path.join(ROOT, "public", "images", "gallery");
const CONFIG_PATH = path.join(ROOT, "src", "config", "gallery.ts");

const CATEGORIES = [
  "marriageRegistration",
  "driversLicense",
  "vehicleRegistration",
  "translation",
  "officeServices",
  "happyClients",
];

const IMAGE_RE = /\.(jpe?g|png|webp|gif)$/i;

function md5File(absPath) {
  const buf = fs.readFileSync(absPath);
  return crypto.createHash("md5").update(buf).digest("hex");
}

function collectImages(sourceDir) {
  const names = fs.readdirSync(sourceDir).filter((n) => IMAGE_RE.test(n));
  const entries = names.map((name) => ({
    name,
    abs: path.join(sourceDir, name),
  }));
  entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  const byHash = new Map();
  for (const e of entries) {
    const hash = md5File(e.abs);
    if (byHash.has(hash)) continue;
    byHash.set(hash, e);
  }
  return Array.from(byHash.values());
}

function extFor(filePath) {
  let ext = path.extname(filePath).slice(1).toLowerCase();
  if (ext === "jpeg") ext = "jpg";
  return ext;
}

function copyAndBuildItems(uniqueEntries) {
  fs.mkdirSync(DEST_DIR, { recursive: true });
  for (const old of fs.readdirSync(DEST_DIR)) {
    fs.unlinkSync(path.join(DEST_DIR, old));
  }
  const items = [];
  uniqueEntries.forEach((e, i) => {
    const n = String(i + 1).padStart(3, "0");
    const ext = extFor(e.abs);
    const destName = `siamez-${n}.${ext}`;
    const destAbs = path.join(DEST_DIR, destName);
    fs.copyFileSync(e.abs, destAbs);
    const hash = md5File(destAbs);
    const catIdx = parseInt(hash.slice(0, 8), 16) % CATEGORIES.length;
    items.push({
      id: `g-${hash.slice(0, 10)}`,
      src: `/images/gallery/${destName}`,
      category: CATEGORIES[catIdx],
    });
  });
  return items;
}

function buildItemsFromPublicOnly() {
  const names = fs.readdirSync(DEST_DIR).filter((n) => IMAGE_RE.test(n)).sort();
  return names.map((name) => {
    const destAbs = path.join(DEST_DIR, name);
    const hash = md5File(destAbs);
    const catIdx = parseInt(hash.slice(0, 8), 16) % CATEGORIES.length;
    return {
      id: `g-${hash.slice(0, 10)}`,
      src: `/images/gallery/${name}`,
      category: CATEGORIES[catIdx],
    };
  });
}

function writeGalleryTs(items) {
  const lines = items.map(
    (i) =>
      `  { id: "${i.id}", src: "${i.src}", category: "${i.category}" },`
  );
  const body = `/** Gallery category keys – must match i18n gallery.categories */
export const GALLERY_CATEGORIES = [
  "all",
  "marriageRegistration",
  "driversLicense",
  "vehicleRegistration",
  "translation",
  "officeServices",
  "happyClients",
] as const;

export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

export interface GalleryItem {
  id: string;
  src: string;
  alt?: string;
  category: Exclude<GalleryCategory, "all">;
}

/**
 * Real photos in \`public/images/gallery/\`. To refresh from a source folder (dedupe by MD5, renumber files):
 * \`node scripts/sync-gallery.mjs --from "/path/to/SiamEZ Gallery"\`
 *
 * Categories are assigned from each file’s content MD5 so filters get an even mix without manual tagging.
 */
export const GALLERY_ITEMS: GalleryItem[] = [
${lines.join("\n")}
];
`;
  fs.writeFileSync(CONFIG_PATH, body, "utf8");
}

const args = process.argv.slice(2);
const fromIdx = args.indexOf("--from");
if (fromIdx !== -1 && args[fromIdx + 1]) {
  const sourceDir = path.resolve(args[fromIdx + 1]);
  if (!fs.statSync(sourceDir).isDirectory()) {
    console.error("Not a directory:", sourceDir);
    process.exit(1);
  }
  const unique = collectImages(sourceDir);
  console.error(`Unique images after MD5 dedupe: ${unique.length} (from ${fs.readdirSync(sourceDir).filter((n) => IMAGE_RE.test(n)).length} files)`);
  const items = copyAndBuildItems(unique);
  writeGalleryTs(items);
  console.error("Wrote", DEST_DIR, "and", CONFIG_PATH);
} else if (args[0] === "--regenerate") {
  const items = buildItemsFromPublicOnly();
  writeGalleryTs(items);
  console.error("Regenerated", CONFIG_PATH, `(${items.length} items)`);
} else {
  console.error(`Usage:
  node scripts/sync-gallery.mjs --from "/path/to/source/folder"
  node scripts/sync-gallery.mjs --regenerate   # rebuild TS from existing public/images/gallery`);
  process.exit(1);
}
