/**
 * Seller listing — photos under /public/sales/kawasaki-ninja-zx636r-2003/.
 */

const IMAGE_COUNT = 11;

export const KAWASAKI_NINJA_ZX636R_2003_IMAGE_URLS: string[] = Array.from({ length: IMAGE_COUNT }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return `/sales/kawasaki-ninja-zx636r-2003/${n}.jpg`;
});

export const KAWASAKI_NINJA_ZX636R_2003_SLUG = "2003-kawasaki-ninja-zx-636r";

export const kawasakiNinjaZx636r2003Description = [
  "2003 KAWASAKI NINJA",
  "",
  "ขออนุญาตแอดมินค่ะ",
  "ของหายาก สะสมแนะนำ",
  "คาวาซากิ นินจา ZX 636 R",
  "ปี 2003",
  "41,000 กิโลเมตร",
  "ชำระภาษีแล้ว เอกสารพร้อมโอน",
  "",
  "บูรณะใหม่หมด ระบบระบายความร้อนใช้เทคโนโลยีการแข่งรถทั้งหมด",
  "ยางหลังใหม่ เบรกใหม่ น้ำมันเครื่องใหม่",
  "",
  "-------------------------------",
  "",
  "Rare item, collector's recommendation:",
  "",
  "Kawasaki Ninja ZX 636 R",
  "2003 model",
  "41,000 kilometers",
  "Tax paid, documents ready for transfer.",
  "",
  "Completely redone, cooling system uses racing technology.",
  "New rear tire, new brakes, new service.",
  "",
  "Driven 41,000 km",
  "",
  "Manual transmission",
  "",
  "Exterior color: Grey · Interior color: —",
  "",
  "109,000 THB",
].join("\n");

export const kawasakiNinjaZx636r2003Specifications: Record<string, string> = {
  Make: "Kawasaki",
  Model: "Ninja ZX-636R (ZX 636 R)",
  Year: "2003",
  Mileage: "41,000 km",
  Transmission: "Manual",
  "Exterior color": "Grey",
  "Interior color": "—",
  "Tax & documents": "Tax paid; documents ready for transfer (per seller)",
  Price: "THB 109,000 (per seller)",
};
