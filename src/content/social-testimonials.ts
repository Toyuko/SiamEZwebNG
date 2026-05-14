/**
 * User-generated reviews from social channels (source URLs documented per item).
 * Quotes are preserved as provided from the respective platforms.
 */

export type SocialTestimonialPlatform = "youtube" | "facebook";

export type SocialTestimonial = {
  id: string;
  platform: SocialTestimonialPlatform;
  /** Short context line shown above the quote (similar to legacy "service" labels). */
  service: string;
  author: string;
  quote: string;
  stars: number;
  /** Present for YouTube Shorts — opens in a new tab. */
  videoLink?: string;
};

export const SOCIAL_TESTIMONIALS: SocialTestimonial[] = [
  {
    id: "youtube-eugene",
    platform: "youtube",
    service: "Driver's license",
    author: "Eugene",
    quote:
      "Allan helped me get a license on the 23rd of April. The process was very, very easily run up there. It was way easier—not like if I was at home where it would take three days. Thank you for the helping.",
    videoLink: "https://youtube.com/shorts/Z9cWYRGDV5Y",
    stars: 5,
  },
  {
    id: "youtube-verified-customer",
    platform: "youtube",
    service: "License & services",
    author: "Verified Customer",
    quote:
      "After a long search of different agencies, I finally found Siam EZ. Just like the name, it was an easy process, easy way, and quite fast. So I can definitely recommend it to everyone to come here for your license or all the other things what they provide.",
    videoLink: "https://youtube.com/shorts/eIPJT16suiY",
    stars: 5,
  },
  {
    id: "youtube-verified-client",
    platform: "youtube",
    service: "General services",
    author: "Verified Client",
    quote:
      "Thank you very much guys. Very quick, everything done correctly, everything done very efficient. Thank you very much.",
    videoLink: "https://youtube.com/shorts/6J8_GtVGTUk",
    stars: 5,
  },
  {
    id: "youtube-car-bike-license",
    platform: "youtube",
    service: "Car & motorbike license",
    author: "Motorbike & Car License Holder",
    quote:
      "I am very happy today that I got my license for both the car and bike. I want to thank the Siam EZ company who helped me a lot throughout the process. They made the whole process very easy for me, and I highly recommend everyone to contact Siam EZ if they need their license.",
    videoLink: "https://youtube.com/shorts/K_O8A8uC5Ew",
    stars: 5,
  },
  {
    id: "youtube-international-driver",
    platform: "youtube",
    service: "International driver",
    author: "International Driver",
    quote: "It was a really easy process. It was very fast and it was very helpful. Siam EZ made it happen.",
    videoLink: "https://www.youtube.com/shorts/utl7V4Av_4M",
    stars: 5,
  },
  {
    id: "youtube-expats-bangkok",
    platform: "youtube",
    service: "Bangkok expat services",
    author: "Expats in Bangkok",
    quote: "Siam EZ helped us out today. Actually, it was really easy and I would 100% recommend them!",
    videoLink: "https://youtube.com/shorts/sC2o5t_HV84",
    stars: 5,
  },
];
