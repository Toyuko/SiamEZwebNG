/** Gallery category keys – must match i18n gallery.categories */
export const GALLERY_CATEGORIES = [
  "all",
  "marriageRegistration",
  "driversLicense",
  "vehicleRegistration",
  "translation",
  "officeServices",
  "happyClients",
] as const;

export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

export interface GalleryItem {
  id: string;
  src: string;
  alt?: string;
  category: Exclude<GalleryCategory, "all">;
}

/** Placeholder gallery items – replace with real images in public/images/gallery/ */
export const GALLERY_ITEMS: GalleryItem[] = [
  { id: "1", src: "https://picsum.photos/seed/siamez1/800/600", category: "marriageRegistration" },
  { id: "2", src: "https://picsum.photos/seed/siamez2/800/600", category: "marriageRegistration" },
  { id: "3", src: "https://picsum.photos/seed/siamez3/800/600", category: "driversLicense" },
  { id: "4", src: "https://picsum.photos/seed/siamez4/800/600", category: "driversLicense" },
  { id: "5", src: "https://picsum.photos/seed/siamez5/800/600", category: "vehicleRegistration" },
  { id: "6", src: "https://picsum.photos/seed/siamez6/800/600", category: "vehicleRegistration" },
  { id: "7", src: "https://picsum.photos/seed/siamez7/800/600", category: "translation" },
  { id: "8", src: "https://picsum.photos/seed/siamez8/800/600", category: "translation" },
  { id: "9", src: "https://picsum.photos/seed/siamez9/800/600", category: "officeServices" },
  { id: "10", src: "https://picsum.photos/seed/siamez10/800/600", category: "officeServices" },
  { id: "11", src: "https://picsum.photos/seed/siamez11/800/600", category: "happyClients" },
  { id: "12", src: "https://picsum.photos/seed/siamez12/800/600", category: "happyClients" },
];
