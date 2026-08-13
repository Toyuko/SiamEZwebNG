/**
 * Create a restorable pg_dump of the Neon database (DIRECT_URL, not the pooler).
 * Does not print connection strings. Writes gitignored files under data/backups/.
 *
 *   node scripts/neon-backup.mjs
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

function parseEnvFile(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function preferDirectUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("-pooler.")) {
      u.hostname = u.hostname.replace("-pooler.", ".");
    }
    if (!u.searchParams.get("sslmode")) u.searchParams.set("sslmode", "require");
    return u.toString();
  } catch {
    return url;
  }
}

function pgEnv(url) {
  const u = new URL(url);
  return {
    PGHOST: u.hostname,
    PGPORT: u.port || "5432",
    PGUSER: decodeURIComponent(u.username),
    PGPASSWORD: decodeURIComponent(u.password),
    PGDATABASE: u.pathname.replace(/^\//, "").split("?")[0],
    PGSSLMODE: u.searchParams.get("sslmode") || "require",
  };
}

function run(cmd, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} exited ${code}: ${stderr.slice(0, 800)}`));
    });
  });
}

function findPgBin(name) {
  const candidates = [
    `/opt/homebrew/opt/libpq/bin/${name}`,
    `/usr/local/opt/libpq/bin/${name}`,
    name,
  ];
  for (const c of candidates) {
    try {
      if (c.includes("/") && !existsSync(c)) continue;
      return c;
    } catch {
      /* try next */
    }
  }
  return name;
}

async function main() {
  let env = {};
  for (const file of [".env.local", ".env"]) {
    try {
      env = { ...env, ...parseEnvFile(await readFile(file, "utf8")) };
    } catch {
      /* missing is fine */
    }
  }
  const raw = env.DIRECT_URL || env.DATABASE_URL;
  if (!raw) {
    throw new Error("DIRECT_URL or DATABASE_URL is required");
  }
  const databaseUrl = preferDirectUrl(raw);
  const pg = pgEnv(databaseUrl);
  const host = pg.PGHOST;
  const database = pg.PGDATABASE;
  if (host.includes("pooler")) {
    throw new Error("Refusing to dump via a pooler host; set DIRECT_URL");
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(process.cwd(), "data", "backups");
  await mkdir(outDir, { recursive: true });
  const dumpName = `neon-${database}-pre-legacy-migration-${stamp}.dump`;
  const dumpPath = path.join(outDir, dumpName);
  const pgDump = findPgBin("pg_dump");
  const pgRestore = findPgBin("pg_restore");

  console.log(`[neon-backup] dumping ${database} @ ${host} (custom format, no-owner)`);
  console.log(`[neon-backup] ${pgDump} → ${path.relative(process.cwd(), dumpPath)}`);

  await run(pgDump, ["-Fc", "--no-owner", "--no-acl", "-f", dumpPath], pg);

  const info = await stat(dumpPath);
  if (info.size < 1024) {
    throw new Error(`Dump is too small (${info.size} bytes)`);
  }

  const buf = await readFile(dumpPath);
  const sha256 = createHash("sha256").update(buf).digest("hex");

  const list = await run(pgRestore, ["-l", dumpPath], {});
  const tocLines = list.stdout.split("\n").filter((l) => l && !l.startsWith(";"));
  const tables = tocLines.filter((l) => /\bTABLE\b/.test(l) && !/\bDATA\b/.test(l)).length;
  const data = tocLines.filter((l) => /\bTABLE DATA\b/.test(l)).length;

  const meta = {
    createdAt: new Date().toISOString(),
    purpose: "pre-legacy-data-migration",
    host,
    database,
    format: "custom",
    file: dumpName,
    bytes: info.size,
    sha256,
    tocEntries: tocLines.length,
    tables,
    tableData: data,
    restore: `pg_restore --dbname="$DIRECT_URL" --no-owner --no-acl --clean --if-exists data/backups/${dumpName}`,
  };
  const metaPath = dumpPath.replace(/\.dump$/, ".json");
  await writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`);

  console.log(`[neon-backup] wrote ${dumpName} (${info.size} bytes, sha256=${sha256.slice(0, 16)}…)`);
  console.log(`[neon-backup] tables=${tables} tableData=${data} toc=${tocLines.length}`);
  console.log(`[neon-backup] metadata ${path.relative(process.cwd(), metaPath)}`);
  console.log("[neon-backup] dump is gitignored; do not commit it.");
}

main().catch((error) => {
  console.error("[neon-backup] failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
