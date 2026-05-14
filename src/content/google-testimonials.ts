/**
 * Reviews scraped from the public Google Business Profile for SiamEZ.
 * Wording preserved from the listings where possible; a few truncated UI strings were completed for readability.
 */

export type GoogleTestimonial = {
  id: string;
  /** Short topic line (similar to other testimonial cards). */
  service: string;
  author: string;
  quote: string;
  stars: number;
};

export const GOOGLE_BUSINESS_REVIEWS: GoogleTestimonial[] = [
  {
    id: "google-touy-smith",
    service: "Multiple services",
    author: "Touy Smith",
    quote:
      "I had an excellent experience with SiamEZ. Their team made complicated Thai administrative processes simple and stress-free. From marriage registration and translations to driver's license and visa services, everything was handled professionally.",
    stars: 5,
  },
  {
    id: "google-armando-gonsalez",
    service: "Vehicle name change",
    author: "Armando Gonsalez",
    quote:
      "Guys are working really great. Solved my car name change problem within a couple of hours. Sunday I sent the documents via WhatsApp, everything was prepared, and Monday everything was done.",
    stars: 5,
  },
  {
    id: "google-bangkok-bike-finder",
    service: "General",
    author: "Bangkok Bike Finder BBF",
    quote: "Very reliable and fast",
    stars: 5,
  },
  {
    id: "google-sohail-george",
    service: "General",
    author: "Sohail George",
    quote: "Excellent Services 😊",
    stars: 5,
  },
  {
    id: "google-sid-shy-elo",
    service: "General",
    author: "sid shy elo",
    quote: "Excellent Services 👍",
    stars: 5,
  },
  {
    id: "google-sana",
    service: "General",
    author: "Sana",
    quote: "Very friendly and great service",
    stars: 5,
  },
  {
    id: "google-alpha-richie-renia",
    service: "Driver's license",
    author: "Alpha Richie Renia",
    quote:
      "Greatest experience in this company—they can assist you well. Easy to get a driver's license; it just takes two hours. The people who assist you are very kind and polite. If you need a trusted and easy way to get help with your license, I highly recommend SiamEZ.",
    stars: 5,
  },
  {
    id: "google-kamran-george",
    service: "General",
    author: "Kamran George",
    quote: "Amazing team. No language barrier. Assisted me well in whole process. Thank you guys",
    stars: 5,
  },
  {
    id: "google-sarah-james",
    service: "Driver's license",
    author: "Sarah James",
    quote:
      "I have taken driver's license services. They made it super easy for me. Really fast. I am so happy. I recommend them for your driving licenses.",
    stars: 5,
  },
  {
    id: "google-jany-roman",
    service: "General",
    author: "Jany Roman",
    quote: "Very friendly and trustworthy",
    stars: 4,
  },
];
