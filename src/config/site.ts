export const site = {
  name: "SiamEZ",
  tagline: "Making life in Thailand EZ",
  description: "Professional help for your life in Thailand. From visas to relocations, our team handles the complexities so you can focus on enjoying the Land of Smiles.",
  url: "https://siam-ez.com",
  email: "inquiries@siam-ez.com",
  phone: "+66 64 343 8768",
  line: "@siamez",
  lineUrl: "https://lin.ee/AHqaAXi",
  social: {
    facebook: "https://www.facebook.com/siamezofficial",
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

export const publicNav = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
  { label: "Gallery", href: "/gallery" },
  { label: "Testimonials", href: "/testimonials" },
  { label: "Contact", href: "/contact" },
] as const;

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
