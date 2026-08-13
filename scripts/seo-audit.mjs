#!/usr/bin/env node
/**
 * Lightweight production SEO checks for SiamEZ.
 * Usage:
 *   node scripts/seo-audit.mjs
 *   node scripts/seo-audit.mjs https://siam-ez.com
 *
 * Does not crawl private/account URLs. Exits 1 if critical public checks fail.
 */

const origin = (process.argv[2] || process.env.NEXT_PUBLIC_SITE_URL || "https://siam-ez.com").replace(
  /\/$/,
  ""
);

const PUBLIC_PATHS = [
  "/en",
  "/en/services",
  "/en/services/driver-license",
  "/en/services/marriage-registration",
  "/en/services/translation-services",
  "/en/services/police-clearance",
  "/en/services/vehicle-registration",
  "/en/services/car-motorbike-finder-selling-service",
  "/en/about",
  "/en/contact",
  "/en/privacy",
  "/en/terms",
  "/th",
];

const PRIVATE_PATHS = ["/en/login", "/en/portal", "/en/admin", "/en/book/driver-license"];

function fail(message) {
  console.error(`FAIL  ${message}`);
}

function ok(message) {
  console.log(`OK    ${message}`);
}

async function fetchText(path) {
  const res = await fetch(`${origin}${path}`, { redirect: "follow" });
  const text = await res.text();
  return { res, text };
}

async function main() {
  let errors = 0;
  console.log(`SEO audit against ${origin}\n`);

  const robots = await fetchText("/robots.txt");
  if (!robots.res.ok) {
    fail("robots.txt is not reachable");
    errors += 1;
  } else {
    ok("robots.txt reachable");
    if (!robots.text.includes("Sitemap:")) {
      fail("robots.txt missing Sitemap");
      errors += 1;
    }
    for (const disallowed of ["/admin", "/portal", "/api/", "/book/", "/login"]) {
      if (!robots.text.includes(disallowed)) {
        fail(`robots.txt should disallow ${disallowed}`);
        errors += 1;
      }
    }
  }

  const sitemap = await fetchText("/sitemap.xml");
  if (!sitemap.res.ok || !sitemap.text.includes("<urlset")) {
    fail("sitemap.xml missing or invalid");
    errors += 1;
  } else {
    ok("sitemap.xml reachable");
    if (sitemap.text.includes("/book/") || sitemap.text.includes("/portal/") || sitemap.text.includes("/login")) {
      fail("sitemap includes private URLs");
      errors += 1;
    }
    if (!sitemap.text.includes("/en/services/driver-license")) {
      fail("sitemap missing driver-license URL");
      errors += 1;
    }
  }

  const titles = new Map();
  const descriptions = new Map();

  for (const path of PUBLIC_PATHS) {
    const { res, text } = await fetchText(path);
    if (!res.ok) {
      fail(`${path} returned ${res.status}`);
      errors += 1;
      continue;
    }
    const title = text.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
    const description = text.match(/name="description"\s+content="([^"]+)"/i)?.[1];
    const canonical = text.match(/rel="canonical"\s+href="([^"]+)"/i)?.[1];
    const h1Count = (text.match(/<h1[\s>]/gi) || []).length;
    const jsonLd = text.includes("application/ld+json");

    if (!title) {
      fail(`${path} missing <title>`);
      errors += 1;
    } else {
      if (titles.has(title)) fail(`${path} duplicate title with ${titles.get(title)}`);
      titles.set(title, path);
    }
    if (!description) {
      fail(`${path} missing meta description`);
      errors += 1;
    } else if (descriptions.has(description)) {
      fail(`${path} duplicate description with ${descriptions.get(description)}`);
      errors += 1;
    } else {
      descriptions.set(description, path);
    }
    if (!canonical) {
      fail(`${path} missing canonical`);
      errors += 1;
    }
    if (h1Count !== 1) {
      fail(`${path} expected 1 H1, found ${h1Count}`);
      errors += 1;
    }
    if (!jsonLd && !path.includes("/privacy") && !path.includes("/terms")) {
      fail(`${path} missing JSON-LD`);
      errors += 1;
    }
    ok(`${path} ${res.status} title="${title ?? ""}"`);
  }

  for (const path of PRIVATE_PATHS) {
    const { res, text } = await fetchText(path);
    const robotsMeta = text.match(/name="robots"\s+content="([^"]+)"/i)?.[1] ?? "";
    if (res.status === 404) {
      ok(`${path} 404`);
      continue;
    }
    if (!/noindex/i.test(robotsMeta) && res.ok) {
      fail(`${path} should be noindex (robots="${robotsMeta}")`);
      errors += 1;
    } else {
      ok(`${path} status=${res.status} robots="${robotsMeta || "n/a"}"`);
    }
  }

  console.log(`\n${errors === 0 ? "PASS" : "FAIL"} — ${errors} issue(s)`);
  process.exit(errors === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
