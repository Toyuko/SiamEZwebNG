export const PROVINCE_REGIONS = [
  "bangkok",
  "central",
  "east",
  "north",
  "northeast",
  "west",
  "south",
] as const;

export type ProvinceRegion = (typeof PROVINCE_REGIONS)[number];

export type ThaiProvince = {
  code: string;
  nameEn: string;
  nameTh: string;
  region: ProvinceRegion;
};

export const BANGKOK_PROVINCE_CODE = "10";

/** Official 77-province set. Codes are the Thai administrative geocodes. */
export const THAI_PROVINCES: readonly ThaiProvince[] = [
  { code: "10", nameEn: "Bangkok", nameTh: "กรุงเทพมหานคร", region: "bangkok" },
  { code: "11", nameEn: "Samut Prakan", nameTh: "สมุทรปราการ", region: "central" },
  { code: "12", nameEn: "Nonthaburi", nameTh: "นนทบุรี", region: "central" },
  { code: "13", nameEn: "Pathum Thani", nameTh: "ปทุมธานี", region: "central" },
  { code: "14", nameEn: "Phra Nakhon Si Ayutthaya", nameTh: "พระนครศรีอยุธยา", region: "central" },
  { code: "15", nameEn: "Ang Thong", nameTh: "อ่างทอง", region: "central" },
  { code: "16", nameEn: "Lopburi", nameTh: "ลพบุรี", region: "central" },
  { code: "17", nameEn: "Sing Buri", nameTh: "สิงห์บุรี", region: "central" },
  { code: "18", nameEn: "Chai Nat", nameTh: "ชัยนาท", region: "central" },
  { code: "19", nameEn: "Saraburi", nameTh: "สระบุรี", region: "central" },
  { code: "60", nameEn: "Nakhon Sawan", nameTh: "นครสวรรค์", region: "central" },
  { code: "61", nameEn: "Uthai Thani", nameTh: "อุทัยธานี", region: "central" },
  { code: "62", nameEn: "Kamphaeng Phet", nameTh: "กำแพงเพชร", region: "central" },
  { code: "64", nameEn: "Sukhothai", nameTh: "สุโขทัย", region: "central" },
  { code: "65", nameEn: "Phitsanulok", nameTh: "พิษณุโลก", region: "central" },
  { code: "66", nameEn: "Phichit", nameTh: "พิจิตร", region: "central" },
  { code: "67", nameEn: "Phetchabun", nameTh: "เพชรบูรณ์", region: "central" },
  { code: "72", nameEn: "Suphan Buri", nameTh: "สุพรรณบุรี", region: "central" },
  { code: "73", nameEn: "Nakhon Pathom", nameTh: "นครปฐม", region: "central" },
  { code: "74", nameEn: "Samut Sakhon", nameTh: "สมุทรสาคร", region: "central" },
  { code: "75", nameEn: "Samut Songkhram", nameTh: "สมุทรสงคราม", region: "central" },
  { code: "20", nameEn: "Chon Buri", nameTh: "ชลบุรี", region: "east" },
  { code: "21", nameEn: "Rayong", nameTh: "ระยอง", region: "east" },
  { code: "22", nameEn: "Chanthaburi", nameTh: "จันทบุรี", region: "east" },
  { code: "23", nameEn: "Trat", nameTh: "ตราด", region: "east" },
  { code: "24", nameEn: "Chachoengsao", nameTh: "ฉะเชิงเทรา", region: "east" },
  { code: "25", nameEn: "Prachin Buri", nameTh: "ปราจีนบุรี", region: "east" },
  { code: "26", nameEn: "Nakhon Nayok", nameTh: "นครนายก", region: "east" },
  { code: "27", nameEn: "Sa Kaeo", nameTh: "สระแก้ว", region: "east" },
  { code: "50", nameEn: "Chiang Mai", nameTh: "เชียงใหม่", region: "north" },
  { code: "51", nameEn: "Lamphun", nameTh: "ลำพูน", region: "north" },
  { code: "52", nameEn: "Lampang", nameTh: "ลำปาง", region: "north" },
  { code: "53", nameEn: "Uttaradit", nameTh: "อุตรดิตถ์", region: "north" },
  { code: "54", nameEn: "Phrae", nameTh: "แพร่", region: "north" },
  { code: "55", nameEn: "Nan", nameTh: "น่าน", region: "north" },
  { code: "56", nameEn: "Phayao", nameTh: "พะเยา", region: "north" },
  { code: "57", nameEn: "Chiang Rai", nameTh: "เชียงราย", region: "north" },
  { code: "58", nameEn: "Mae Hong Son", nameTh: "แม่ฮ่องสอน", region: "north" },
  { code: "63", nameEn: "Tak", nameTh: "ตาก", region: "north" },
  { code: "30", nameEn: "Nakhon Ratchasima", nameTh: "นครราชสีมา", region: "northeast" },
  { code: "31", nameEn: "Buri Ram", nameTh: "บุรีรัมย์", region: "northeast" },
  { code: "32", nameEn: "Surin", nameTh: "สุรินทร์", region: "northeast" },
  { code: "33", nameEn: "Si Sa Ket", nameTh: "ศรีสะเกษ", region: "northeast" },
  { code: "34", nameEn: "Ubon Ratchathani", nameTh: "อุบลราชธานี", region: "northeast" },
  { code: "35", nameEn: "Yasothon", nameTh: "ยโสธร", region: "northeast" },
  { code: "36", nameEn: "Chaiyaphum", nameTh: "ชัยภูมิ", region: "northeast" },
  { code: "37", nameEn: "Amnat Charoen", nameTh: "อำนาจเจริญ", region: "northeast" },
  { code: "38", nameEn: "Bueng Kan", nameTh: "บึงกาฬ", region: "northeast" },
  { code: "39", nameEn: "Nong Bua Lam Phu", nameTh: "หนองบัวลำภู", region: "northeast" },
  { code: "40", nameEn: "Khon Kaen", nameTh: "ขอนแก่น", region: "northeast" },
  { code: "41", nameEn: "Udon Thani", nameTh: "อุดรธานี", region: "northeast" },
  { code: "42", nameEn: "Loei", nameTh: "เลย", region: "northeast" },
  { code: "43", nameEn: "Nong Khai", nameTh: "หนองคาย", region: "northeast" },
  { code: "44", nameEn: "Maha Sarakham", nameTh: "มหาสารคาม", region: "northeast" },
  { code: "45", nameEn: "Roi Et", nameTh: "ร้อยเอ็ด", region: "northeast" },
  { code: "46", nameEn: "Kalasin", nameTh: "กาฬสินธุ์", region: "northeast" },
  { code: "47", nameEn: "Sakon Nakhon", nameTh: "สกลนคร", region: "northeast" },
  { code: "48", nameEn: "Nakhon Phanom", nameTh: "นครพนม", region: "northeast" },
  { code: "49", nameEn: "Mukdahan", nameTh: "มุกดาหาร", region: "northeast" },
  { code: "70", nameEn: "Ratchaburi", nameTh: "ราชบุรี", region: "west" },
  { code: "71", nameEn: "Kanchanaburi", nameTh: "กาญจนบุรี", region: "west" },
  { code: "76", nameEn: "Phetchaburi", nameTh: "เพชรบุรี", region: "west" },
  { code: "77", nameEn: "Prachuap Khiri Khan", nameTh: "ประจวบคีรีขันธ์", region: "west" },
  { code: "80", nameEn: "Nakhon Si Thammarat", nameTh: "นครศรีธรรมราช", region: "south" },
  { code: "81", nameEn: "Krabi", nameTh: "กระบี่", region: "south" },
  { code: "82", nameEn: "Phang Nga", nameTh: "พังงา", region: "south" },
  { code: "83", nameEn: "Phuket", nameTh: "ภูเก็ต", region: "south" },
  { code: "84", nameEn: "Surat Thani", nameTh: "สุราษฎร์ธานี", region: "south" },
  { code: "85", nameEn: "Ranong", nameTh: "ระนอง", region: "south" },
  { code: "86", nameEn: "Chumphon", nameTh: "ชุมพร", region: "south" },
  { code: "90", nameEn: "Songkhla", nameTh: "สงขลา", region: "south" },
  { code: "91", nameEn: "Satun", nameTh: "สตูล", region: "south" },
  { code: "92", nameEn: "Trang", nameTh: "ตรัง", region: "south" },
  { code: "93", nameEn: "Phatthalung", nameTh: "พัทลุง", region: "south" },
  { code: "94", nameEn: "Pattani", nameTh: "ปัตตานี", region: "south" },
  { code: "95", nameEn: "Yala", nameTh: "ยะลา", region: "south" },
  { code: "96", nameEn: "Narathiwat", nameTh: "นราธิวาส", region: "south" },
] as const;

const byCode = new Map(THAI_PROVINCES.map((province) => [province.code, province]));

export function getProvince(code: string | null | undefined): ThaiProvince | null {
  if (!code) return null;
  return byCode.get(code.trim()) ?? null;
}

export function isBangkokProvince(code: string | null | undefined): boolean {
  return code?.trim() === BANGKOK_PROVINCE_CODE;
}

function compact(value: string): string {
  return value.normalize("NFC").toLowerCase().replace(/[\s.\-]+/g, "");
}

/** Accepts a geocode, English name, or Thai name. */
export function resolveProvinceCode(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (byCode.has(trimmed)) return trimmed;
  const padded = trimmed.padStart(2, "0");
  if (byCode.has(padded)) return padded;
  const key = compact(trimmed);
  const match = THAI_PROVINCES.find(
    (province) => compact(province.nameEn) === key || province.nameTh.normalize("NFC") === trimmed.normalize("NFC")
  );
  return match?.code ?? null;
}

export function provinceLabel(code: string, locale: string): string {
  const province = getProvince(code);
  if (!province) return code;
  return locale === "th" ? province.nameTh : province.nameEn;
}

export function provincesByRegion(): Array<{ region: ProvinceRegion; provinces: ThaiProvince[] }> {
  return PROVINCE_REGIONS.map((region) => ({
    region,
    provinces: THAI_PROVINCES.filter((province) => province.region === region),
  }));
}
