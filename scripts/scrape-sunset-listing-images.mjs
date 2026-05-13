/**
 * One-off: fetch Sunset Scooters listing pages and extract listing-specific
 * virtualyard.com.au/photos URLs (filters noise via og:image common prefix).
 * Run: node scripts/scrape-sunset-listing-images.mjs
 */

const urls = [
  "https://sunsetscootersthailand.shop/buy/2022-benelli-trk-502x-abs-/6fuAYcpaHnnEAvaNhHChPA",
  "https://sunsetscootersthailand.shop/buy/2015-bmw-r9t-/uwm3IT-24NXmjkbtbBB6Zg",
  "https://sunsetscootersthailand.shop/buy/2022-cfmoto-250nk-/dO0c0J960Hs-SNZx4iscNQ",
  "https://sunsetscootersthailand.shop/buy/2015-ducati-monster-821-/kYIiM2psZRN4XAHEwCNIJQ",
  "https://sunsetscootersthailand.shop/buy/2017-ducati-multistrada-1200-abs-/nVOut4RW3--KolVwG7XJqQ",
  "https://sunsetscootersthailand.shop/buy/2019-honda-cb650-f-/TbQfN1UzDOIl9qKcNkF2Jw",
  "https://sunsetscootersthailand.shop/buy/2022-honda-cb500x-/YtHIXonhrkiZdeF2nfzitA",
  "https://sunsetscootersthailand.shop/buy/2025-honda-nt-1100-dct-/nTnu9u8Te0exV9upvKSdwA",
  "https://sunsetscootersthailand.shop/buy/2016-kawasaki-1400gtr-abs-/Oav8tqjVYCIczjj0SEkkoA",
  "https://sunsetscootersthailand.shop/buy/2021-kawasaki-z-900-abs-sp-/V8e0lkIoem3_OsEy5FjesQ",
];

function normalizePhotoUrl(u) {
  return u.replace("https://virtualyard.com.au/photos//", "https://virtualyard.com.au/photos/");
}

function commonPrefix(strings) {
  if (strings.length === 0) return "";
  let p = strings[0];
  for (const s of strings) {
    while (!s.startsWith(p)) {
      p = p.slice(0, -1);
      if (!p) return "";
    }
  }
  return p;
}

async function scrape(listingUrl) {
  const res = await fetch(listingUrl, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; SiamEZListingSync/1.0)" },
  });
  const html = await res.text();

  if (html.includes("Verify you are human") || res.status === 403) {
    return { listingUrl, error: "blocked_or_captcha", images: [] };
  }

  const ogImages = [
    ...html.matchAll(/property="og:image" content="(https:\/\/virtualyard\.com\.au\/photos\/[^"]+)"/g),
  ].map((m) => normalizePhotoUrl(m[1]));

  const allPhotos = [
    ...html.matchAll(/https:\/\/virtualyard\.com\.au\/photos\/[^"'<> ]+\.jpg/g),
  ].map((m) => normalizePhotoUrl(m[0]));

  if (ogImages.length === 0) {
    return { listingUrl, error: "no_og_images", images: [] };
  }

  const prefix = commonPrefix(ogImages);
  const filtered = [...new Set(allPhotos.filter((u) => u.startsWith(prefix)))].sort();
  return { listingUrl, prefix, count: filtered.length, images: filtered };
}

for (const u of urls) {
  const r = await scrape(u);
  console.log(JSON.stringify(r, null, 0));
}
