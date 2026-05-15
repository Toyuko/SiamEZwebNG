/**
 * Seller listing — photos under /public/sales/mazda-2-sedan-2017/.
 */

const IMAGE_COUNT = 10;

export const MAZDA_2_SEDAN_2017_IMAGE_URLS: string[] = Array.from({ length: IMAGE_COUNT }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return `/sales/mazda-2-sedan-2017/${n}.jpg`;
});

export const MAZDA_2_SEDAN_2017_SLUG = "2017-mazda-2-sedan-skyactiv";

export const mazda2Sedan2017Description = [
  "🚗 FOR SALE — 2017 MAZDA 2 SEDAN 1.3 SKYACTIV AUTO 🚗",
  "",
  "Clean and stylish Mazda 2 sedan in silver with sporty upgrades and excellent fuel economy. Perfect city car with reliable Mazda Skyactiv technology.",
  "",
  "✨ Vehicle Details:",
  "• Year: 2017",
  "• Model: Mazda 2 Sedan",
  "• Engine: 1.3L Petrol Skyactiv",
  "• Transmission: Automatic",
  "• Mileage: 105,360 km",
  "• Registration: Bangkok plates",
  "• Color: Silver",
  "",
  "🔥 Features & Extras:",
  "✔ Skyactiv Technology Engine",
  "✔ Automatic Transmission",
  "✔ Leather Seats",
  "✔ Touchscreen Display",
  "✔ Rear Parking Sensors",
  "✔ Sport Body Kit",
  "✔ Tinted Windows",
  "✔ Push Start",
  "✔ Cold Air Conditioning",
  "✔ Spacious Trunk",
  "✔ Clean Interior & Exterior",
  "",
  "The car looks well maintained and is ready to drive. Ideal for daily use, work, or first-time buyers looking for a reliable and economical sedan.",
  "",
  "💰 Estimated market price: ฿275,000 – ฿290,000 depending on final inspection and transfer terms.",
  "",
  "📍 Available through SiamEZ Automotive Market",
  "We assist with:",
  "✅ Vehicle sourcing",
  "✅ Buying & selling",
  "✅ Negotiation",
  "✅ Documentation & transfer assistance",
  "",
  "📩 Contact SiamEZ for more information, viewing appointments, or financing assistance.",
].join("\n");

export const mazda2Sedan2017Specifications: Record<string, string> = {
  Make: "Mazda",
  Model: "2 Sedan",
  Year: "2017",
  Engine: "1.3L Petrol Skyactiv",
  Transmission: "Automatic",
  Mileage: "105,360 km",
  Registration: "Bangkok plates",
  Color: "Silver",
  "Price guide": "฿275,000 – ฿290,000 (per seller estimate)",
};
