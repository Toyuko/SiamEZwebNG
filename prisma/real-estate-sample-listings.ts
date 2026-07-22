/** Sample Thailand real-estate listings for local seed / demos. */

export type RealEstateSeedListing = {
  slug: string;
  title: string;
  propertyType: "condo" | "house" | "townhouse" | "land" | "commercial" | "villa";
  listingType: "sale" | "rent";
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqm: number;
  landAreaSqm: number | null;
  floor: number | null;
  yearBuilt: number | null;
  province: string;
  district: string | null;
  neighborhood: string | null;
  priceAmount: number;
  sellerKind: "dealer" | "private";
  furnished: "unfurnished" | "partially" | "furnished" | "not_applicable";
  isBoosted?: boolean;
  heroImageUrl: string;
  imageUrls: string[];
  description: string;
  specifications: Record<string, string>;
};

export const REAL_ESTATE_SAMPLE_LISTINGS: RealEstateSeedListing[] = [
  {
    slug: "sukhumvit-condo-2br-sale",
    title: "Modern 2-Bedroom Condo near BTS Asok",
    propertyType: "condo",
    listingType: "sale",
    bedrooms: 2,
    bathrooms: 2,
    areaSqm: 68,
    landAreaSqm: null,
    floor: 22,
    yearBuilt: 2019,
    province: "Bangkok",
    district: "Khlong Toei",
    neighborhood: "Asok",
    priceAmount: 8_900_000,
    sellerKind: "dealer",
    furnished: "furnished",
    isBoosted: true,
    heroImageUrl:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80",
    imageUrls: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=80",
    ],
    description:
      "Bright corner unit with city views, full furniture package, and pool/gym access. Walking distance to BTS Asok and Terminal 21. Ideal for owner-occupiers or rental investors.",
    specifications: {
      Parking: "1 covered space",
      Pets: "Small pets allowed",
      "Common fee": "฿55 / m² / month",
    },
  },
  {
    slug: "chiang-mai-pool-villa-sale",
    title: "4-Bedroom Pool Villa in Hang Dong",
    propertyType: "villa",
    listingType: "sale",
    bedrooms: 4,
    bathrooms: 4,
    areaSqm: 320,
    landAreaSqm: 800,
    floor: null,
    yearBuilt: 2016,
    province: "Chiang Mai",
    district: "Hang Dong",
    neighborhood: "Ban Waen",
    priceAmount: 14_500_000,
    sellerKind: "private",
    furnished: "partially",
    heroImageUrl:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1600&q=80",
    imageUrls: [
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
    ],
    description:
      "Spacious tropical villa with private pool, covered parking for two cars, and landscaped garden. Quiet residential pocket with easy access to Hang Dong Road and international schools.",
    specifications: {
      Pool: "Private saltwater",
      Security: "Gated community",
      "Land title": "Chanote",
    },
  },
  {
    slug: "phuket-townhouse-rent",
    title: "3-Bedroom Townhouse for Rent near Central Phuket",
    propertyType: "townhouse",
    listingType: "rent",
    bedrooms: 3,
    bathrooms: 3,
    areaSqm: 180,
    landAreaSqm: 120,
    floor: null,
    yearBuilt: 2018,
    province: "Phuket",
    district: "Kathu",
    neighborhood: "Kathu",
    priceAmount: 45_000,
    sellerKind: "dealer",
    furnished: "furnished",
    heroImageUrl:
      "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=1600&q=80",
    imageUrls: [
      "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=1600&q=80",
    ],
    description:
      "Fully furnished townhouse ready for move-in. Close to Central Festival Phuket, shops, and restaurants. Includes Wi-Fi, cable TV, and weekly garden service. Minimum 12-month lease.",
    specifications: {
      Deposit: "2 months",
      Utilities: "Tenant pays",
      Aircon: "All bedrooms",
    },
  },
  {
    slug: "pattaya-beachfront-condo-rent",
    title: "Sea-View Studio Condo for Rent in Jomtien",
    propertyType: "condo",
    listingType: "rent",
    bedrooms: 0,
    bathrooms: 1,
    areaSqm: 38,
    landAreaSqm: null,
    floor: 15,
    yearBuilt: 2021,
    province: "Chonburi",
    district: "Bang Lamung",
    neighborhood: "Jomtien",
    priceAmount: 22_000,
    sellerKind: "private",
    furnished: "furnished",
    isBoosted: true,
    heroImageUrl:
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1600&q=80",
    imageUrls: [
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1600&q=80",
    ],
    description:
      "Compact studio with balcony sea view, swimming pool, and 24-hour security. Perfect for long-stay visitors or remote workers. Walking distance to Jomtien Beach and cafes.",
    specifications: {
      View: "Sea view",
      Internet: "Fiber included",
      Laundry: "In-building",
    },
  },
  {
    slug: "hua-hin-land-sale",
    title: "1 Rai Chanote Land near Hua Hin Town",
    propertyType: "land",
    listingType: "sale",
    bedrooms: null,
    bathrooms: null,
    areaSqm: 1600,
    landAreaSqm: 1600,
    floor: null,
    yearBuilt: null,
    province: "Prachuap Khiri Khan",
    district: "Hua Hin",
    neighborhood: "Nong Kae",
    priceAmount: 6_200_000,
    sellerKind: "dealer",
    furnished: "not_applicable",
    heroImageUrl:
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80",
    imageUrls: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1600&q=80",
    ],
    description:
      "Flat rectangular plot with Chanote title, road access, and utilities nearby. Suitable for a holiday home or small development. About 15 minutes to Hua Hin beach and night market.",
    specifications: {
      Title: "Chanote",
      Zoning: "Residential",
      Access: "Public road",
    },
  },
  {
    slug: "silom-office-commercial-sale",
    title: "Ground-Floor Commercial Unit on Silom Road",
    propertyType: "commercial",
    listingType: "sale",
    bedrooms: null,
    bathrooms: 2,
    areaSqm: 95,
    landAreaSqm: null,
    floor: 1,
    yearBuilt: 2012,
    province: "Bangkok",
    district: "Bang Rak",
    neighborhood: "Silom",
    priceAmount: 18_750_000,
    sellerKind: "dealer",
    furnished: "unfurnished",
    heroImageUrl:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80",
    imageUrls: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1600&q=80",
    ],
    description:
      "High-footfall commercial space ideal for F&B, clinic, or showroom. Glass frontage, rear storage, and two restrooms. Minutes from BTS Sala Daeng and MRT Silom.",
    specifications: {
      Frontage: "Street-facing",
      Ceiling: "3.2 m",
      "Transfer fee": "Split 50/50",
    },
  },
];
