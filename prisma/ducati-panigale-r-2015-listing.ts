/**
 * Seller listing — photos under /public/sales/ducati-panigale-r-2015/.
 */

const IMAGE_COUNT = 17;

export const DUCATI_PANIGALE_R_2015_IMAGE_URLS: string[] = Array.from({ length: IMAGE_COUNT }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return `/sales/ducati-panigale-r-2015/${n}.jpg`;
});

export const DUCATI_PANIGALE_R_2015_SLUG = "2015-ducati-panigale-r";

export const ducatiPanigaleR2015Description = [
  "Ducati Panigale R",
  "",
  "Ducati ยืนยันแล้วว่ามีเพียง 3 คันเท่านั้นที่นำเข้าประเทศไทย ดังนั้นคันนี้จึงเป็นของหายากมากและควรมีไว้ในคอลเลคชั่นมอเตอร์ไซค์ของทุกคน",
  "",
  "รถไม่เคยล้ม ไม่เคยเกิดอุบัติเหตุ สีถูกเปลี่ยนเพราะผมชอบขับรถที่มีสีและดีไน์ไม่เหมือนใคร",
  "",
  "ผมเข้าใจว่าสีนี้อาจไม่ถูกใจทุกคน ดังนั้นผมจึงเสนอให้เปลี่ยนกลับเป็นสีเดิมหากต้องการ",
  "",
  "นี่ไม่ใช่ 1199 R แต่เป็น Panigale R ใช้พื้นฐานจาก Panigale 1299 แต่ใช้เครื่องยนต์ 1198 ซีซี เพื่อสมรรถนะในการแข่งขัน มีหลักฐานการยืนยันจาก Ducati Italy 🇮🇹",
  "",
  "รถคันนี้เป็นรถมอเตอร์ไซค์ระดับสูงสุดที่สามารถขับขี่บนถนนได้อย่างถูกกฎหมาย และยังสามารถใช้คว้าแชมป์โลกซูเปอร์ไบค์ได้อีกด้วย",
  "",
  "หากมีคำถามเพิ่มเติมหรือต้องการข้อเสนอที่จริงจัง โปรดติดต่อผม",
  "ปล. เจ้าของขายเองค่ะ",
  "",
  "--------------------------------------",
  "",
  "Ducati Panigale R",
  "",
  "1 out of 3 in Thailand!",
  "Super Rare",
  "2.2 Million Baht new price (when new, per seller).",
  "",
  "The bike has never been dropped or involved in an accident. The color was changed because I prefer riding unique bikes!",
  "",
  "Driven 17,200 km",
  "",
  "Manual transmission",
  "",
  "Exterior color: White · Interior color: —",
  "",
  "450,000 THB",
].join("\n");

export const ducatiPanigaleR2015Specifications: Record<string, string> = {
  Make: "Ducati",
  Model: "Panigale R",
  Year: "2015",
  Mileage: "17,200 km",
  Transmission: "Manual",
  "Exterior color": "White",
  "Interior color": "—",
  "Rarity (seller)": "1 of 3 officially imported to Thailand (per seller / Ducati)",
  "When new (seller)": "ca. THB 2,200,000",
  Price: "THB 450,000 (per seller — private sale)",
};
