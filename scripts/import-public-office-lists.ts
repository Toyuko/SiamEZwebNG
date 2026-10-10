/**
 * One-time import of public government office lists into the directory.
 * Sources are official pages and open data. Unknown phones, street addresses,
 * hours, and conflicting coordinates are left blank. Nothing is marked verified.
 *
 * Run from the repo root with DATABASE_URL set:
 *   npx tsx scripts/import-public-office-lists.ts
 */
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promisify } from "node:util";
import { PrismaClient } from "@prisma/client";
import { buildSearchText } from "../src/lib/directory/search";
import { getProvince, resolveProvinceCode, THAI_PROVINCES } from "../src/lib/directory/provinces";

const prisma = new PrismaClient();

const DOPA_DATASET = "https://data.go.th/dataset/gis-02";
const DLT_LIST = "https://www.thaitruckcenter.com/tdsc/CompanyCheck";
const BKK_DISTRICTS =
  "https://data.bangkok.go.th/dataset/1e04f888-6287-41ce-aaa8-91f3bc6dae25";
const IMMIGRATION_LIST =
  "https://brussels.thaiembassy.org/en/page/immigration-offices-in-thailand";

const SOURCE_NOTE =
  "Imported from a public government list. Telephone, street address, opening hours, and coordinates are stored only when that list published them. This record is not verified. Confirm the details with the agency before sending a client.";

type OfficeDraft = {
  slug: string;
  nameEn: string;
  nameTh: string;
  categorySlug: "district" | "dlt" | "immigration";
  provinceCode: string;
  district?: string | null;
  addressEn?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phonePrimary?: string | null;
  phones?: string[];
  email?: string | null;
  website?: string | null;
  keywords: string[];
  parentOrganizationEn: string;
  parentOrganizationTh: string;
  branchNameEn?: string | null;
  branchNameTh?: string | null;
  sourceUrl: string;
  sourceNotes: string;
  contactNotes?: string | null;
  serviceSlugs: string[];
};

function hash8(value: string): string {
  return createHash("sha1").update(value).digest("hex").slice(0, 8);
}

function norm(value: string): string {
  return value.normalize("NFC").replace(/\s+/g, "").toLowerCase();
}

function formatLandline(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!/^0[2-57]\d{7,8}$/.test(digits)) return null;
  if (/^0[689]/.test(digits)) return null;
  if (digits.startsWith("02")) {
    if (digits.length !== 9) return null;
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  if (digits.length === 9) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return null;
}

function inThailand(lat: number, lng: number): boolean {
  return lat >= 5.5 && lat <= 20.6 && lng >= 97.2 && lng <= 105.8;
}

const execFileAsync = promisify(execFile);

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "user-agent": "SiamEZ-directory-import/1.0" },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

/** catalog.dopa.go.th presents a certificate Node does not chain. curl uses the system store. */
async function curlText(url: string): Promise<string> {
  const { stdout } = await execFileAsync("curl", ["-fsSL", "--retry", "2", "-A", "SiamEZ-directory-import/1.0", url], {
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
    timeout: 90_000,
  });
  return stdout;
}

function modeCoordinate(points: Array<[number, number]>): { lat: number; lng: number } | null {
  const valid = points.filter(([lat, lng]) => inThailand(lat, lng));
  if (valid.length === 0) return null;
  const lats = valid.map(([lat]) => lat);
  const lngs = valid.map(([, lng]) => lng);
  if (Math.max(...lats) - Math.min(...lats) > 0.02 || Math.max(...lngs) - Math.min(...lngs) > 0.02) {
    return null;
  }
  const lat = lats.reduce((sum, value) => sum + value, 0) / lats.length;
  const lng = lngs.reduce((sum, value) => sum + value, 0) / lngs.length;
  return inThailand(lat, lng) ? { lat, lng } : null;
}

async function loadAmphoeOffices(): Promise<OfficeDraft[]> {
  const pkg = (await (await fetch("https://data.go.th/api/3/action/package_show?id=gis-02")).json()) as {
    result?: { resources?: Array<{ url?: string; name?: string }> };
  };
  const resources = (pkg.result?.resources ?? []).filter((resource) => resource.url);
  const offices: OfficeDraft[] = [];
  const queue = [...resources];
  async function worker() {
    for (;;) {
      const resource = queue.shift();
      if (!resource?.url) return;
      let payload: Array<Record<string, string>>;
      try {
        payload = JSON.parse(await curlText(resource.url)) as Array<Record<string, string>>;
      } catch (error) {
        console.error("skip resource", resource.name, error instanceof Error ? error.message : error);
        continue;
      }
      if (!Array.isArray(payload)) continue;
      const groups = new Map<string, { name: string; pcode: string; acode: string; aname: string; points: Array<[number, number]> }>();
      for (const row of payload) {
        const name = (row.oct_side01_name ?? "").trim();
        if (!name.startsWith("ที่ว่าการอำเภอ")) continue;
        const pcode = resolveProvinceCode(row.pcode) ?? resolveProvinceCode(row.pname);
        if (!pcode) continue;
        const acode = (row.acode ?? "").trim();
        const key = `${pcode}|${acode}|${norm(name)}`;
        const lat = Number(row.oct_side01_lat);
        const lng = Number(row.oct_side01_lon);
        const current = groups.get(key) ?? {
          name,
          pcode,
          acode,
          aname: (row.aname ?? "").trim(),
          points: [],
        };
        if (Number.isFinite(lat) && Number.isFinite(lng)) current.points.push([lat, lng]);
        groups.set(key, current);
      }
      for (const group of groups.values()) {
        const province = getProvince(group.pcode);
        if (!province) continue;
        const point = modeCoordinate(group.points);
        const conflict = group.points.length > 0 && !point;
        offices.push({
          slug: `amphoe-${group.pcode}-${group.acode || hash8(group.name)}`,
          nameEn: `${province.nameEn} district office (${group.aname || group.name})`,
          nameTh: group.name,
          categorySlug: "district",
          provinceCode: group.pcode,
          district: group.aname || null,
          latitude: point?.lat ?? null,
          longitude: point?.lng ?? null,
          keywords: ["district office", "amphoe", "ที่ว่าการอำเภอ", province.nameEn, province.nameTh],
          parentOrganizationEn: "Department of Provincial Administration",
          parentOrganizationTh: "กรมการปกครอง",
          sourceUrl: DOPA_DATASET,
          sourceNotes: conflict
            ? `${SOURCE_NOTE} The Department of Provincial Administration open dataset (data.go.th gis-02) listed more than one map point for this office, so coordinates were left blank.`
            : `${SOURCE_NOTE} Map point, when present, is the coordinate published in the Department of Provincial Administration open dataset (data.go.th gis-02, collected around budget year 2564). It is not a street address.`,
          contactNotes: "Street address and telephone were not in the open dataset.",
          serviceSlugs: ["marriage-registration", "civil-registration", "certified-civil-copies"],
        });
      }
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);
  return offices;
}

async function loadBangkokDistricts(): Promise<OfficeDraft[]> {
  const csv = await fetchText(
    "https://data.bangkok.go.th/dataset/1e04f888-6287-41ce-aaa8-91f3bc6dae25/resource/712d9fd9-1d25-401c-a508-3fb49c43e3fb/download/district.csv"
  );
  const lines = csv.replace(/^\uFEFF/, "").trim().split(/\r?\n/).slice(1);
  return lines.map((line) => {
    const [dcode, dname, dnameEn] = line.split(",");
    const code = dcode.trim();
    const thai = dname.trim();
    const english = dnameEn.trim();
    return {
      slug: `bkk-khet-${code}`,
      nameEn: `${english} District Office`,
      nameTh: `สำนักงาน${thai.startsWith("เขต") ? thai : `เขต${thai}`}`,
      categorySlug: "district" as const,
      provinceCode: "10",
      district: thai.replace(/^เขต/, ""),
      keywords: ["district office", "khet", "สำนักงานเขต", english, "Bangkok"],
      parentOrganizationEn: "Bangkok Metropolitan Administration",
      parentOrganizationTh: "กรุงเทพมหานคร",
      sourceUrl: BKK_DISTRICTS,
      sourceNotes: `${SOURCE_NOTE} Name comes from the Bangkok open-data district list. That file has no street address, telephone, or coordinates.`,
      contactNotes: "Address and telephone were not in the Bangkok district list.",
      serviceSlugs: ["marriage-registration", "civil-registration", "certified-civil-copies"],
    };
  });
}

function provinceFromDltName(name: string): string | null {
  const cleaned = name.replace(/^สำนักงานขนส่งจังหวัด/, "").replace(/^สำนักงานขนส่ง/, "").split("สาขา")[0].trim();
  return resolveProvinceCode(cleaned);
}

async function loadDltOffices(): Promise<OfficeDraft[]> {
  const html = await fetchText(DLT_LIST);
  const names = [...html.matchAll(/<option[^>]*>\s*([^<]*สำนักงานขนส่ง[^<]*)\s*<\/option>/g)].map((match) =>
    match[1].replace(/\s+/g, " ").trim()
  );
  const unique = [...new Set(names)];
  const offices: OfficeDraft[] = [];
  for (const name of unique) {
    const provinceCode = provinceFromDltName(name);
    const province = provinceCode ? getProvince(provinceCode) : null;
    if (!province) continue;
    const branch = name.includes("สาขา") ? name.split("สาขา").slice(1).join("สาขา").replace(/^อ\./, "").trim() : "";
    const isBranch = Boolean(branch);
    offices.push({
      slug: `dlt-${province.code}-${hash8(name)}`,
      nameEn: isBranch
        ? `${province.nameEn} Provincial Land Transport Office, ${branch} branch`
        : `${province.nameEn} Provincial Land Transport Office`,
      nameTh: name,
      categorySlug: "dlt",
      provinceCode: province.code,
      district: branch || null,
      branchNameTh: branch ? `สาขา${branch}` : null,
      branchNameEn: branch ? `${branch} branch` : null,
      keywords: ["DLT", "land transport", "สำนักงานขนส่ง", province.nameEn, province.nameTh, branch].filter(Boolean),
      parentOrganizationEn: "Department of Land Transport",
      parentOrganizationTh: "กรมการขนส่งทางบก",
      website: "https://www.dlt.go.th",
      sourceUrl: DLT_LIST,
      sourceNotes: `${SOURCE_NOTE} The office name is a licensing-office label from the Department of Land Transport truck-data service. That list does not publish a street address, telephone, or coordinates.`,
      contactNotes: "Address and telephone were not in the licensing-office list.",
      serviceSlugs: isBranch
        ? ["vehicle-registration", "vehicle-tax", "vehicle-ownership-transfer"]
        : [
            "thai-driving-licence",
            "licence-renewal",
            "vehicle-registration",
            "vehicle-tax",
            "vehicle-ownership-transfer",
            "blue-book-green-book",
          ],
    });
  }
  return offices;
}

/**
 * Public counters copied from the Royal Thai Embassy Brussels immigration-office
 * list (updated 19 Apr 2024). Checkpoint, airport, and port rows are omitted.
 * Mobile numbers are omitted. A trailing range such as 9982-3 is expanded to the
 * two published landlines.
 */
const IMMIGRATION_ROWS = `
Chiang Rai|Chiang Rai Immigration Office|Mae Sai|No. 117 Moo 10, Wiang Phang Kham Sub-district, Mae Sai District, Chiang Rai Province|57130|0 5373 1008|immigrationchiangrai@gmail.com|The published address is in Mae Sai, not Mueang Chiang Rai.
Mae Hong Son|Mae Hong Son Immigration Office|Mueang|No. 202 Moo 11, Pang Mu Sub-district, Mueang District, Mae Hong Son Province|58000|0 5361 2106||
Nan|Nan Immigration Office|Mueang|No. 557 Moo 11, Nan-Phayao Rd., Chai Sathan Sub-district, Muang District, Nan Province|55000|0 5471 6138;0 5471 9393||
Chiang Mai|Chiang Mai Immigration Office|Mueang|No. 71 Moo 3, Airport Rd., Suthep Sub-district, Mueang District, Chiang Mai Province|50200|0 5320 1755||
Phayao|Phayao Immigration Office|Mueang|No. 188 Moo 8, Mae Puem Sub-district, Mueang District, Phayao Province|56000|0 5443 0880||
Lampang|Lampang Immigration Office|Mueang|No. 400 Moo 4, Kluay Pae Sub-district, Mueang District, Lampang Province|52000|0 5420 9534||
Lamphun|Lamphun Immigration Office|Mueang|No. 293 Moo 2, Pasak Sub-district, Mueang District, Lamphun Province|51000|0 5358 4275||
Phrae|Phrae Immigration Office|Mueang|No. 249 Moo 1, Thung Kwao Sub-district, Mueang District, Phrae Province|54000|0 5452 0872||The embassy table omitted the office title on this row. The address is in Mueang Phrae.
Uttaradit|Uttaradit Immigration Office|Mueang|No. 27 Rajabhat Plaza Building, 1st Floor, In Jai Me Rd., Tha It Sub-district, Muang District, Uttaradit Province|53000|0 5547 9993||
Sukhothai|Sukhothai Immigration Office|Mueang|Provincial office Building 1, 2nd Floor, Nikorn Kasem Rd., Thani Sub-district, Mueang District, Sukhothai Province|64000|0 5561 0112||A mobile number on the same row was not stored.
Tak|Tak Immigration Office|Mae Sot|No. 188 Moo 2, Sai Asia Rd., Tha Sai Luat Sub-district, Mae Sot District, Tak Province|63110|0 5556 3000||The embassy table omitted a separate title. The address is in Mae Sot.
Kamphaeng Phet|Kamphaeng Phet Immigration Office|Mueang|No. 154 Pin Damri Rd., Nai Mueang Sub-district, Mueang District, Kamphaeng Phet Province|62000|0 5571 2209||
Phitsanulok|Phitsanulok Immigration Office|Mueang|No. 887/4-5 Borom Trailokkanart Rd., Mueang District, Phitsanulok Province|65000|0 5524 7722||
Phichit|Phichit Immigration Office|Mueang|No. 170 Srimala Rd., Nai Mueang Sub-district, Mueang District, Phichit Province|66000|0 5661 3429||
Phetchabun|Phetchabun Immigration Office|Mueang|Phetchabun provincial office, Sadiang Sub-district, Mueang District, Phetchabun Province|67000|0 5672 9730||
Nakhon Sawan|Nakhon Sawan Immigration Office|Mueang|No. 399 Moo 9, Sawanvithi Rd., Nakhon Sawan Tok Sub-district, Mueang District, Nakhon Sawan Province|60000|0 5688 1518||
Uthai Thani|Uthai Thani Immigration Office|Mueang|OTOP Center Building, Mueang Phra Chanok Chakri, Moo 5, Sakae Krang Sub-district, Mueang District, Uthai Thani Province|61000|0 5651 0623||
Bueng Kan|Bueng Kan Immigration Office|Mueang|No. 289 Moo 9, BuengKan Rd., Wisit Sub-district, Mueang District, Bueng Kan Province|38000|0 4249 1832||
Nong Khai|Nong Khai Immigration Office|Mueang|No. 106 Moo 7, Chalerm Phra Kiat Rd., Meechai Sub-district, Mueang District, Nong Khai Province|43000|0 4299 0935;0 4299 0919||
Nakhon Phanom|Nakhon Phanom Immigration Office|Mueang|No. 654/1 Sunthorn Wichit Rd., Nai Mueang Sub-district, Mueang District, Nakhon Phanom Province|48000|0 4251 1235|nkp.imm@gmail.com|
Sakon Nakhon|Sakon Nakhon Immigration Office|Mueang|No. 71 Jai Phasuk Rd., That Choeng Chum Sub-district, Mueang Sakon Nakhon District, Sakon Nakhon Province|47000|0 4271 5219|sakhon.imm@gmail.com|
Mukdahan|Mukdahan Immigration Office|Mueang|No. 333 Moo 7, Ban Kham Phaknok, Chayangkun Rd., Bang Sai Yai Sub-district, Mueang District, Mukdahan Province|49000|0 4267 4072||
Loei|Loei Immigration Office|Chiang Khan|No. 32 Moo 2, Chai Khong Rd., Chiang Khan Sub-district, Chiang Khan District, Loei Province|42110|0 4282 1284||The list also printed 0 4581 4800. That number was not stored because 045 is not a Loei area code. The published address is in Chiang Khan.
Udon Thani|Udon Thani Immigration Office|Mueang|No. 5 Phosri Rd., Mak Khaeng Sub-district, Muang District, Udon Thani Province|41000|0 4224 9982;0 4224 9983||Published as 0 4224 9982-3.
Nong Bua Lam Phu|Nong Bua Lam Phu Immigration Office|Mueang|No. 55/4 Moo 2, Lam Phu Sub-district, Nong Bua Lam Phu District, Nong Bua Lam Phu Province|39000|0 4231 5733||A mobile number on the same row was not stored.
Khon Kaen|Khon Kaen Immigration Office|Mueang|Khon Kaen Bus Terminal 3, Building 2, 2nd Floor, Mittraphap-Kut Kwang Rd., Muang Kao Sub-district, Mueang District, Khon Kaen Province|40000|0 4330 6642||
Kalasin|Kalasin Immigration Office|Mueang|No. 1 Kalasin Registry Office 2nd Floor, Nai Mueang Sub-district, Mueang District, Kalasin Province||0 4384 0288||The postal code on the list was incomplete, so it was left blank.
Maha Sarakham|Maha Sarakham Immigration Office|Mueang|No. 97 Moo 6, Jangsanit Rd., Kaeng Loeng Chan Sub-district, Mueang Maha Sarakham District, Maha Sarakham Province|44000|0 4375 0621;0 4397 1278||
Roi Et|Roi Et Immigration Office|Mueang|No. 3/1, Prem Pracharat Rd., Nai Mueang Sub-district, Mueang District, Roi Et Province|45000|0 4351 5179||
Chaiyaphum|Chaiyaphum Immigration Office|Mueang|333/1 Kor, Haruthai Rd, Nai Mueang Sub-district, Mueang District, Chaiyaphum Province|36000|0 4405 6411||
Amnat Charoen|Amnat Charoen Immigration Office|Mueang|Phaya Nakarin Auditorium Building, 2nd Floor, Amnat Charoen Provincial office, Non Nam Than Sub-district, Mueang District, Amnat Charoen Province|37000|0 4552 3239||
Yasothon|Yasothon Immigration Office|Mueang|No. 3, Pra-Pa Rd., Nai Muang Sub-district, Mueang District, Yasothon Province|35000|0 4571 3072||
Ubon Ratchathani|Ubon Ratchathani Immigration Office|Sirindhorn|No. 189 Moo 10, Nikhom Sang Thon-Eng Lam Dome Noi Sub-district, Sirindhorn District, Ubon Ratchathani Province|34350|0 4536 6000||The published address is in Sirindhorn, not Mueang Ubon Ratchathani.
Si Sa Ket|Si Sa Ket Immigration Office|Phu Sing|No. 999, Moo 8, Phrai Phatthana Sub-district, Phu Sing District, Si Sa Ket Province|33140|0 4582 6249;0 4581 4800||The published address is in Phu Sing, not Mueang Si Sa Ket.
Surin|Surin Immigration Office|Kap Choeng|No. 77 Moo 17, Surin-Chong Chom Rd, Kab Choeng Sub-district, Kap Choeng District, Surin Province|32210|0 4455 9127||The published address is in Kap Choeng, not Mueang Surin.
Buri Ram|Buri Ram Immigration Office|Mueang|Buriram Provincial Government Center, 3rd Floor, No. 1159 Khao Kradong, Samet Sub-district, Mueang District, Buri Ram Province|31000|0 4466 6903||
Nakhon Ratchasima|Nakhon Ratchasima Immigration Office|Mueang|No. 323 Moo 9, Nong Bua Sala Sub-district, Mueang District, Nakhon Ratchasima Province|30000|0 4421 2997;0 4421 2998;0 4421 2999||Published as 0 4421 2997-9.
Bangkok|Immigration Division 1|Lak Si|No. 120, Government Complex, Building B, South Zone, 2nd Floor, Chaeng Watthana 7 Alley, Chaeng Watthana Rd., Thung Song Hong Sub-district, Lak Si District, Bangkok|10210|0 2141 9889||Public visa counter at the Government Complex. A mobile number on the same row was not stored.
Pathum Thani|Pathum Thani Immigration Office|Mueang|No. 159 Moo 7, Suan Prik Thai Sub-district, Mueang Pathum Thani District, Pathum Thani Province|12000|0 2147 5111;0 2147 5112||Published as 0 2147 5111-2.
Nonthaburi|Nonthaburi Immigration Office|Bang Kruai|No. 954 Moo 1, Ruammit Alley, Nakhon In Rd., Bang Khanun Sub-district, Bang Kruai District, Nonthaburi Province|11130|0 2408 2320||
Samut Prakan|Samut Prakan Immigration Office|Mueang|No. 5 Alley 2, Suthipirom Rd., Pak Nam Sub-district, Mueang District, Samut Prakan Province|10270|0 2395 0029||
Samut Sakhon|Samut Sakhon Immigration Office|Mueang|No. 17, Moo 3, Ekachai 147 Alley, Ekachai-Bang Bon Rd., Bang Nam Chuet Sub-district, Mueang District, Samut Sakhon Province|74000|0 3486 7666||A mobile number on the same row was not stored.
Nakhon Pathom|Nakhon Pathom Immigration Office|Sam Phran|No. 53/11 Moo 2, Rai Khing 14 Alley, Rai Khing Sub-district, Sam Phran District, Nakhon Pathom Province|73210|0 3431 8996;0 3431 8997||Published as 0 3431 8996-7. The address is in Sam Phran, not Mueang Nakhon Pathom.
Samut Songkhram|Samut Songkhram Immigration Office|Mueang|No. 11/90 Moo 3, Ekachai Rd., Mae Klong Sub-district, Mueang District, Samut Songkhram Province|75000|0 3471 1878||
Ratchaburi|Ratchaburi Immigration Office|Mueang|No. 159 Moo 10, Ratchaburi Bus Terminal Building No. 2, Chedee Hak Sub-district, Mueang District, Ratchaburi Province|70000|0 3224 0321||
Phetchaburi|Phetchaburi Immigration Office|Tha Yang|No. 189 Moo 5, Phetkasem Rd., Tha Yang Sub-district, Tha Yang District, Phetchaburi Province|76130|0 3289 8191||The published address is in Tha Yang, not Mueang Phetchaburi.
Prachuap Khiri Khan|Prachuap Khiri Khan Immigration Office|Hua Hin|No. 439 Moo 1, Thap Tai Sub-district, Hua Hin District, Prachuap Khiri Khan Province|77110|0 3252 0617;0 3252 0620|Prachuapimmigration3@gmail.com|The published address is in Hua Hin.
Chai Nat|Chai Nat Immigration Office|Mueang|Chai Nat Provincial office, Phrom Prasert Rd., Nai Mueang Sub-district, Mueang District, Chai Nat Province|17000|0 5641 0802|chainat.imm3@gmail.com|
Sing Buri|Sing Buri Immigration Office|Mueang|No. 1/2 Moo 2, Jaksi Sub-district, Mueang District, Sing Buri Province|16000|0 3651 0960||
Lopburi|Lopburi Immigration Office|Mueang|No. 88/88, Phrapiya Rd., Talay Chupson Sub-district, Mueang District, Lopburi Province|15000|0 3642 4686||
Suphan Buri|Suphan Buri Immigration Office|Mueang|No. 99/328 Moo 5, Phai Khwang-Pamok Rd., Tha Rahat Sub-district, Mueang District, Suphan Buri Province|72000|0 3544 0464||
Saraburi|Saraburi Immigration Office|Mueang|No. 126/3 Moo 1, Phahon Yothin Rd., Nong Yao Sub-district, Mueang District, Saraburi Province|18000|0 3622 5368||
Nakhon Nayok|Nakhon Nayok Immigration Office|Mueang|Moo 9, Tha Chang Sub-district, Mueang District, Nakhon Nayok Province|26000|0 3734 9930||
Phra Nakhon Si Ayutthaya|Phra Nakhon Si Ayutthaya Immigration Office|Phra Nakhon Si Ayutthaya|No. 134 Uthong Rd., Ho Rattanachai Sub-district, Phra Nakhon Si Ayutthaya District, Phra Nakhon Si Ayutthaya Province|13000|0 3532 8411||
Ang Thong|Ang Thong Immigration Office|Wiset Chai Chan|San Chao Rong Thong Sub-district, Wiset Chai Chan District, Ang Thong Province|14110|0 3561 0773||The published address is in Wiset Chai Chan, not Mueang Ang Thong.
Kanchanaburi|Kanchanaburi Immigration Office|Mueang|100/22, Mae Nam Mae Klong Rd., Pakprak Sub-district, Mueang District, Kanchanaburi Province|71000|0 3456 4279||
Prachin Buri|Prachin Buri Immigration Office|Mueang|Jang Pattana Rd., Na Muang Sub-district, Mueang District, Prachin Buri Province|25000|0 3721 0548||
Chachoengsao|Chachoengsao Immigration Office|Mueang|No. 118 Moo 11, Bang Kaeo Sub-district, Mueang District, Chachoengsao Province|24000|0 3855 4516;0 3851 4011||
Sa Kaeo|Sa Kaeo Immigration Office|Aranyaprathet|No. 6 Mahadthai Rd., Aranyaprathet Sub-district, Aranyaprathet District, Sa Kaeo Province|27120|0 3723 1131||The published address is in Aranyaprathet.
Chanthaburi|Chanthaburi Immigration Office|Pong Nam Ron|No. 96/3 Moo 1, Thap Sai Sub-district, Pong Nam Ron District, Chanthaburi Province|22140|0 3938 7127||The published address is in Pong Nam Ron, not Mueang Chanthaburi.
Chon Buri|Chon Buri Immigration Office|Bang Lamung|No. 75/265 Moo 12, Alley 5, Jomtien Beach Rd., Nong Prue Sub-district, Bang Lamung District, Chon Buri Province|20150|0 3825 2750;0 3823 1373;0 3831 2571;0 3821 6215;0 3840 9346||Published main number 0 3825 2750-4. The list also labels 0 3823 1373 Pattaya, 0 3831 2571 Sriracha, 0 3821 6215 Koh Sichang, and 0 3840 9346 Laem Chabang. The street address is in Bang Lamung (Jomtien).
Rayong|Rayong Immigration Office|Mueang|No. 5 Moo 5, Sukhumvit 20 Alley, Sukhumvit Rd., Huay Pong Sub-district, Mueang District, Rayong Province|21150|0 3868 4544||
Trat|Trat Immigration Office|Khlong Yai|No. 25 Moo 9, Khlong Yai Sub-district, Khlong Yai District, Trat Province|23110|0 3951 0242||The published address is in Khlong Yai, not Mueang Trat.
Chumphon|Chumphon Immigration Office|Mueang|No. 23/11 Moo 1, Khun Krating Sub-district, Mueang District, Chumphon Province|86190|0 7763 0282;0 7751 0384||
Ranong|Ranong Immigration Office|Mueang|No. 71/10 Moo 59, Chalerm Prakiat Rd., Bang Rue Sub-district, Mueang District, Ranong Province|85000|0 7782 6938||
Surat Thani|Surat Thani Immigration Office|Kanchanadit|No. 41/12 Moo 2, Thung Rang Sub-district, Kanchanadit District, Surat Thani Province|84290|0 7738 0881;0 7738 0882||Published as 0 7738 0881-2. The address is in Kanchanadit, not Mueang Surat Thani.
Surat Thani|Samui Immigration Office|Ko Samui|No. 333 Moo 1, Alley 1, Maenam Sub-district, Ko Samui District, Surat Thani Province|84330|0 7742 3440;0 7742 3441||Published as 0 7742 3440-1.
Phang Nga|Phang Nga Immigration Office|Mueang|No. 37 Moo 3, Tham Nam Phut Sub-district, Mueang District, Phang Nga Province|82000|0 7646 0512;0 7646 0647||
Krabi|Krabi Immigration Office|Mueang|No. 382 Moo 7, Saithai Sub-district, Mueang District, Krabi Province|81000|0 7561 1097||
Phuket|Phuket Immigration Office|Mueang|No. 482 Phuket Rd., Talat Yai Sub-district, Mueang District, Phuket Province|83000|0 7622 1905||
Trang|Trang Immigration Office|Kantang|No. 270, Trang Khaphum Rd., Kantang Sub-district, Kantang District, Trang Province|92110|0 7525 1030||The published address is in Kantang, not Mueang Trang.
Nakhon Si Thammarat|Nakhon Si Thammarat Immigration Office|Mueang|No. 99/34 The Vintage Project, Wachirawut Rd., Tha Wang Sub-district, Mueang District, Nakhon Si Thammarat Province|80000|0 7545 0491;0 7545 0492||Published as 0 7545 0491-2.
Phatthalung|Phatthalung Immigration Office|Mueang|No. 77/7-8 Chow Bowon Uthit Alley, Chai Buri Rd., Mueang District, Phatthalung Province|93000|0 7460 3641||
Songkhla|Songkhla Immigration Office|Hat Yai|No. 103 Petchkasem Rd., Hat Yai District, Songkhla Province|90110|0 7425 7019||The published address is in Hat Yai.
Satun|Satun Immigration Office|Mueang|No. 1, Buri Wanich Rd., Phiman Sub-district, Mueang District, Satun Province|91000|0 7471 1080;0 7472 2191||
Pattani|Pattani Immigration Office|Mueang|No. 2/12 Paknam Rd., Rusamilae Sub-district, Mueang District, Pattani Province||0 7346 0202||The postal code on the list was incomplete, so it was left blank.
Yala|Yala Immigration Office|Mueang|Pathadung Ramet Rd., Tha Sap Sub-district, Mueang District, Yala Province|95000|0 7329 9948||The email on the list was garbled, so it was not stored.
Narathiwat|Narathiwat Immigration Office|Su-ngai Kolok|No. 70 Charoen Khet Rd., Su-ngai Kolok Sub-district, Su-ngai Kolok District, Narathiwat Province|96120|0 7361 1231|narathiwatimm@hotmail.com|The published address is in Su-ngai Kolok.
`.trim();

function loadImmigrationOffices(): OfficeDraft[] {
  return IMMIGRATION_ROWS.split("\n").map((line) => {
    const [provinceName, nameEn, district, addressEn, postal, phonesRaw, email, note] = line.split("|");
    const province = THAI_PROVINCES.find((item) => item.nameEn === provinceName.trim());
    if (!province) throw new Error(`Unknown province ${provinceName}`);
    const phones = phonesRaw
      .split(";")
      .map((phone) => formatLandline(phone))
      .filter((phone): phone is string => Boolean(phone));
    const postalCode = /^\d{5}$/.test(postal) ? postal : null;
    const cleanEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
    const nameTh =
      nameEn === "Immigration Division 1"
        ? "กองบังคับการตรวจคนเข้าเมือง 1"
        : nameEn === "Samui Immigration Office"
          ? "สำนักงานตรวจคนเข้าเมืองอำเภอเกาะสมุย"
          : `สำนักงานตรวจคนเข้าเมืองจังหวัด${province.nameTh}`;
    return {
      slug:
        nameEn === "Chiang Mai Immigration Office"
          ? "immigration-chiang-mai"
          : nameEn === "Phuket Immigration Office"
            ? "immigration-phuket"
            : nameEn === "Chon Buri Immigration Office"
              ? "immigration-chon-buri"
              : `imm-${province.code}-${hash8(nameEn + "|" + district)}`,
      nameEn,
      nameTh,
      categorySlug: "immigration",
      provinceCode: province.code,
      district,
      addressEn,
      postalCode,
      phonePrimary: phones[0] ?? null,
      phones: phones.slice(1),
      email: cleanEmail,
      website: "https://www.immigration.go.th",
      keywords: ["Immigration", "ตรวจคนเข้าเมือง", province.nameEn, province.nameTh, district, "visa", "90-day"].filter(
        Boolean
      ) as string[],
      parentOrganizationEn: "Immigration Bureau",
      parentOrganizationTh: "สำนักงานตรวจคนเข้าเมือง",
      branchNameEn: district === "Mueang" ? null : district,
      sourceUrl: IMMIGRATION_LIST,
      sourceNotes: `${SOURCE_NOTE} Address and landline come from the Royal Thai Embassy Brussels immigration-office list, updated 19 April 2024. ${note ?? ""}`.trim(),
      contactNotes: note || null,
      serviceSlugs: ["immigration-appointment", "address-reporting"],
    };
  });
}

function searchTextFor(office: OfficeDraft, categoryNameEn: string, categoryNameTh: string, serviceNames: string[]): string {
  return buildSearchText([
    office.nameEn,
    office.nameTh,
    office.branchNameEn,
    office.branchNameTh,
    office.parentOrganizationEn,
    office.parentOrganizationTh,
    office.keywords.join(" "),
    office.provinceCode,
    getProvince(office.provinceCode)?.nameEn,
    getProvince(office.provinceCode)?.nameTh,
    office.district,
    office.addressEn,
    office.postalCode,
    office.phonePrimary,
    ...(office.phones ?? []),
    office.email,
    office.website,
    categoryNameEn,
    categoryNameTh,
    serviceNames.join(" "),
    office.contactNotes,
  ]);
}

async function main() {
  console.log("Loading public lists...");
  const [amphoe, bangkok, dlt] = await Promise.all([loadAmphoeOffices(), loadBangkokDistricts(), loadDltOffices()]);
  const immigration = loadImmigrationOffices();
  const drafts = [...amphoe, ...bangkok, ...dlt, ...immigration];
  console.log(
    JSON.stringify({
      amphoe: amphoe.length,
      bangkok: bangkok.length,
      dlt: dlt.length,
      immigration: immigration.length,
      withCoordinates: drafts.filter((office) => office.latitude != null).length,
      withPhone: drafts.filter((office) => office.phonePrimary).length,
    })
  );

  const categories = await prisma.govOfficeCategory.findMany();
  const services = await prisma.govOfficeService.findMany();
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
  const serviceBySlug = new Map(services.map((service) => [service.slug, service]));
  for (const slug of ["district", "dlt", "immigration"]) {
    if (!categoryBySlug.has(slug)) throw new Error(`Missing category ${slug}`);
  }

  const existing = await prisma.govOffice.findMany({
    select: {
      id: true,
      slug: true,
      nameTh: true,
      nameEn: true,
      provinceCode: true,
      latitude: true,
      phonePrimary: true,
      addressEn: true,
      sourceUrl: true,
      sourceNotes: true,
    },
  });
  const bySlug = new Map(existing.map((office) => [office.slug, office]));
  const byName = new Map(
    existing
      .filter((office) => office.nameTh)
      .map((office) => [`${norm(office.nameTh!)}|${office.provinceCode}`, office])
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const linkRows: Array<{ officeId: string; serviceId: string }> = [];

  function queueLinks(officeId: string, slugs: string[]) {
    for (const slug of slugs) {
      const service = serviceBySlug.get(slug);
      if (service) linkRows.push({ officeId, serviceId: service.id });
    }
  }

  const toCreate: OfficeDraft[] = [];
  const seenSlugs = new Set<string>();
  for (const draft of drafts) {
    const match = bySlug.get(draft.slug) ?? byName.get(`${norm(draft.nameTh)}|${draft.provinceCode}`);
    if (!match) {
      if (seenSlugs.has(draft.slug)) {
        skipped += 1;
        continue;
      }
      seenSlugs.add(draft.slug);
      toCreate.push(draft);
      continue;
    }
    const data: {
      latitude?: number;
      longitude?: number;
      phonePrimary?: string;
      phones?: string[];
      email?: string;
      addressEn?: string;
      postalCode?: string;
      district?: string;
      sourceUrl?: string;
      sourceNotes?: string;
      contactNotes?: string | null;
    } = {};
    if (match.latitude == null && draft.latitude != null && draft.longitude != null) {
      data.latitude = draft.latitude;
      data.longitude = draft.longitude;
    }
    if (!match.phonePrimary && draft.phonePrimary) {
      data.phonePrimary = draft.phonePrimary;
      data.phones = draft.phones ?? [];
    }
    if (!match.addressEn && draft.addressEn) {
      data.addressEn = draft.addressEn;
      if (draft.postalCode) data.postalCode = draft.postalCode;
      if (draft.district) data.district = draft.district;
      if (draft.email) data.email = draft.email;
    }
    if (draft.addressEn && match.sourceUrl !== draft.sourceUrl) data.sourceUrl = draft.sourceUrl;
    if (draft.latitude != null && match.sourceUrl == null) data.sourceUrl = draft.sourceUrl;
    const note = draft.sourceNotes;
    if (note && !(match.sourceNotes ?? "").includes(note.slice(0, 80))) {
      data.sourceNotes = [match.sourceNotes, note].filter(Boolean).join("\n\n");
    }
    if (Object.keys(data).length > 0) {
      await prisma.govOffice.update({ where: { id: match.id }, data });
      updated += 1;
    } else {
      skipped += 1;
    }
    queueLinks(match.id, draft.serviceSlugs);
  }

  for (let index = 0; index < toCreate.length; index += 100) {
    const chunk = toCreate.slice(index, index + 100);
    await prisma.govOffice.createMany({
      data: chunk.map((office) => {
        const category = categoryBySlug.get(office.categorySlug)!;
        const serviceNames = office.serviceSlugs.flatMap((slug) => {
          const service = serviceBySlug.get(slug);
          return service ? [service.nameEn, service.nameTh] : [];
        });
        return {
          slug: office.slug,
          nameEn: office.nameEn,
          nameTh: office.nameTh,
          categoryId: category.id,
          provinceCode: office.provinceCode,
          district: office.district,
          addressEn: office.addressEn,
          postalCode: office.postalCode,
          latitude: office.latitude,
          longitude: office.longitude,
          phonePrimary: office.phonePrimary,
          phones: office.phones ?? [],
          email: office.email,
          website: office.website,
          keywords: office.keywords,
          parentOrganizationEn: office.parentOrganizationEn,
          parentOrganizationTh: office.parentOrganizationTh,
          branchNameEn: office.branchNameEn,
          branchNameTh: office.branchNameTh,
          sourceUrl: office.sourceUrl,
          sourceNotes: office.sourceNotes,
          contactNotes: office.contactNotes,
          verificationStatus: "unverified" as const,
          searchText: searchTextFor(office, category.nameEn, category.nameTh, serviceNames),
        };
      }),
      skipDuplicates: true,
    });
    created += chunk.length;
    console.log(`inserted ${Math.min(index + chunk.length, toCreate.length)} / ${toCreate.length}`);
  }

  const createdRows = await prisma.govOffice.findMany({
    where: { slug: { in: toCreate.map((office) => office.slug) } },
    select: { id: true, slug: true },
  });
  const idBySlug = new Map(createdRows.map((office) => [office.slug, office.id]));
  for (const office of toCreate) {
    const id = idBySlug.get(office.slug);
    if (id) queueLinks(id, office.serviceSlugs);
  }
  for (let index = 0; index < linkRows.length; index += 500) {
    await prisma.govOfficeServiceLink.createMany({
      data: linkRows.slice(index, index + 500),
      skipDuplicates: true,
    });
  }

  const [offices, links, provinces] = await Promise.all([
    prisma.govOffice.groupBy({ by: ["categoryId"], _count: true }),
    prisma.govOfficeServiceLink.count(),
    prisma.govOffice.findMany({ distinct: ["provinceCode"], select: { provinceCode: true } }),
  ]);
  console.log(
    JSON.stringify(
      {
        created,
        updated,
        skipped,
        serviceLinks: links,
        provinces: provinces.length,
        byCategory: offices,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
