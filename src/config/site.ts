export const site = {
  name: "SiamEZ",
  tagline: "Making life in Thailand EZ",
  description: "Professional help for your life in Thailand. From visas to relocations, our team handles the complexities so you can focus on enjoying the Land of Smiles.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://siam-e-zweb-ng.vercel.app",
  email: "inquiries@siam-ez.com",
  phone: "+66 64 343 8768",
  line: "@siamez",
  lineUrl: "https://lin.ee/AHqaAXi",
  social: {
    facebook: "https://www.facebook.com/siamezth",
    instagram: "https://www.instagram.com/siam_ez/",
    linkedin: "https://www.linkedin.com/company/siam-ez/",
    youtube: "https://www.youtube.com/@siamezofficial/",
    tiktok: "https://www.tiktok.com/@siam_ez",
  },
  legal: {
    companyName: "SiamEZ Professional Services Co., Ltd.",
    termsUrl: "/terms",
    privacyUrl: "/privacy",
    refundUrl: "/refund",
    partnerUrl: "/partner",
  },
  stats: {
    happyClients: "1000+",
    yearsExperience: "10+",
    successRate: "100%",
  },
} as const;

export type PublicNavLink = {
  labelKey: string;
  href: string;
  match?: "exact" | "prefix";
};

export type PublicNavEntry =
  | ({ type: "link" } & PublicNavLink)
  | {
      type: "group";
      id: string;
      labelKey: string;
      items: PublicNavLink[];
    };

export const publicNav: PublicNavEntry[] = [
  { type: "link", labelKey: "home", href: "/", match: "exact" },
  {
    type: "group",
    id: "services",
    labelKey: "services",
    items: [
      { labelKey: "allServices", href: "/services", match: "exact" },
      { labelKey: "sales", href: "/sales", match: "exact" },
      { labelKey: "freelancers", href: "/freelancers", match: "prefix" },
    ],
  },
  {
    type: "group",
    id: "company",
    labelKey: "company",
    items: [
      { labelKey: "about", href: "/about", match: "exact" },
      { labelKey: "gallery", href: "/gallery", match: "exact" },
      { labelKey: "testimonials", href: "/testimonials", match: "exact" },
    ],
  },
  { type: "link", labelKey: "contact", href: "/contact", match: "exact" },
];

export const footerQuickLinks = [
  { label: "Services", href: "/services" },
  { label: "About Us", href: "/about" },
  { label: "Gallery", href: "/gallery" },
  { label: "Testimonials", href: "/testimonials" },
  { label: "Contact", href: "/contact" },
] as const;

export const footerLegal = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Refund Policy", href: "/refund" },
  { label: "Partner Program", href: "/partner" },
] as const;
