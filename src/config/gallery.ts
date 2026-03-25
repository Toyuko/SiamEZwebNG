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

/**
 * Real photos in `public/images/gallery/`. To refresh from a source folder (dedupe by MD5, renumber files):
 * `node scripts/sync-gallery.mjs --from "/path/to/SiamEZ Gallery"`
 *
 * Categories are assigned from each file’s content MD5 so filters get an even mix without manual tagging.
 */
export const GALLERY_ITEMS: GalleryItem[] = [
  { id: "g-9fc0682e96", src: "/images/gallery/siamez-001.jpg", category: "marriageRegistration" },
  { id: "g-0e82ff562e", src: "/images/gallery/siamez-002.jpg", category: "vehicleRegistration" },
  { id: "g-da06017e1b", src: "/images/gallery/siamez-003.jpg", category: "marriageRegistration" },
  { id: "g-1f7e3b0812", src: "/images/gallery/siamez-004.jpg", category: "vehicleRegistration" },
  { id: "g-c47540ca1b", src: "/images/gallery/siamez-005.jpg", category: "marriageRegistration" },
  { id: "g-3cae85f197", src: "/images/gallery/siamez-006.jpg", category: "happyClients" },
  { id: "g-11e689ff67", src: "/images/gallery/siamez-007.jpg", category: "translation" },
  { id: "g-d367ad2f17", src: "/images/gallery/siamez-008.jpg", category: "translation" },
  { id: "g-a6d6fa7e03", src: "/images/gallery/siamez-009.jpg", category: "marriageRegistration" },
  { id: "g-d7277e396e", src: "/images/gallery/siamez-010.jpg", category: "happyClients" },
  { id: "g-260ffcd650", src: "/images/gallery/siamez-011.jpg", category: "marriageRegistration" },
  { id: "g-449bec0314", src: "/images/gallery/siamez-012.jpg", category: "translation" },
  { id: "g-c178293423", src: "/images/gallery/siamez-013.jpg", category: "officeServices" },
  { id: "g-c953b41a69", src: "/images/gallery/siamez-014.jpg", category: "officeServices" },
  { id: "g-623ab31447", src: "/images/gallery/siamez-015.jpg", category: "officeServices" },
  { id: "g-86a81ba824", src: "/images/gallery/siamez-016.jpg", category: "vehicleRegistration" },
  { id: "g-c68ddcca0d", src: "/images/gallery/siamez-017.jpg", category: "vehicleRegistration" },
  { id: "g-aeefa789be", src: "/images/gallery/siamez-018.jpg", category: "translation" },
  { id: "g-efaf3a3fd2", src: "/images/gallery/siamez-019.jpg", category: "driversLicense" },
  { id: "g-6a90c77b73", src: "/images/gallery/siamez-020.jpg", category: "happyClients" },
  { id: "g-20eadce140", src: "/images/gallery/siamez-021.jpg", category: "translation" },
  { id: "g-2d9bf6367c", src: "/images/gallery/siamez-022.jpg", category: "vehicleRegistration" },
  { id: "g-7458d44153", src: "/images/gallery/siamez-023.jpg", category: "driversLicense" },
  { id: "g-4b26343140", src: "/images/gallery/siamez-024.jpg", category: "driversLicense" },
  { id: "g-c3a827fe52", src: "/images/gallery/siamez-025.jpg", category: "vehicleRegistration" },
  { id: "g-5f7637216d", src: "/images/gallery/siamez-026.jpg", category: "driversLicense" },
  { id: "g-d8ee545287", src: "/images/gallery/siamez-027.jpg", category: "vehicleRegistration" },
  { id: "g-6fb6bb6539", src: "/images/gallery/siamez-028.jpg", category: "happyClients" },
  { id: "g-48e62a12b9", src: "/images/gallery/siamez-029.jpg", category: "vehicleRegistration" },
  { id: "g-a11078d2f6", src: "/images/gallery/siamez-030.jpg", category: "marriageRegistration" },
  { id: "g-f7ac3927a3", src: "/images/gallery/siamez-031.jpg", category: "happyClients" },
  { id: "g-e1dd9cff1a", src: "/images/gallery/siamez-032.jpg", category: "happyClients" },
  { id: "g-6dddd40435", src: "/images/gallery/siamez-033.jpg", category: "marriageRegistration" },
  { id: "g-ab0d62aff4", src: "/images/gallery/siamez-034.jpg", category: "driversLicense" },
  { id: "g-aa25112fa6", src: "/images/gallery/siamez-035.jpg", category: "driversLicense" },
  { id: "g-1c23590bf1", src: "/images/gallery/siamez-036.jpg", category: "driversLicense" },
  { id: "g-4a937fccce", src: "/images/gallery/siamez-037.jpg", category: "marriageRegistration" },
  { id: "g-9a302e527f", src: "/images/gallery/siamez-038.jpg", category: "marriageRegistration" },
  { id: "g-f1d4f2569f", src: "/images/gallery/siamez-039.jpg", category: "officeServices" },
  { id: "g-606945efed", src: "/images/gallery/siamez-040.jpg", category: "happyClients" },
  { id: "g-e35a240e62", src: "/images/gallery/siamez-041.jpg", category: "officeServices" },
  { id: "g-1ef12177ff", src: "/images/gallery/siamez-042.jpg", category: "translation" },
  { id: "g-b79eb68863", src: "/images/gallery/siamez-043.jpg", category: "vehicleRegistration" },
  { id: "g-a511e8532f", src: "/images/gallery/siamez-044.jpg", category: "happyClients" },
  { id: "g-324275ab93", src: "/images/gallery/siamez-045.jpg", category: "happyClients" },
  { id: "g-b8d2af50ad", src: "/images/gallery/siamez-046.jpg", category: "officeServices" },
  { id: "g-f84c708f62", src: "/images/gallery/siamez-047.jpg", category: "translation" },
  { id: "g-a38c5eefc9", src: "/images/gallery/siamez-048.jpg", category: "translation" },
  { id: "g-6dd727f65f", src: "/images/gallery/siamez-049.jpg", category: "marriageRegistration" },
  { id: "g-65dcb053a5", src: "/images/gallery/siamez-050.jpg", category: "driversLicense" },
  { id: "g-0258560235", src: "/images/gallery/siamez-051.jpg", category: "officeServices" },
  { id: "g-217911b92f", src: "/images/gallery/siamez-052.jpg", category: "happyClients" },
  { id: "g-35fbef068b", src: "/images/gallery/siamez-053.jpg", category: "marriageRegistration" },
  { id: "g-c48e822c8d", src: "/images/gallery/siamez-054.jpg", category: "vehicleRegistration" },
  { id: "g-8a840b1f42", src: "/images/gallery/siamez-055.jpg", category: "translation" },
  { id: "g-00546f06b2", src: "/images/gallery/siamez-056.jpg", category: "marriageRegistration" },
  { id: "g-6c28c230a8", src: "/images/gallery/siamez-057.jpg", category: "marriageRegistration" },
  { id: "g-1bcbf21a8c", src: "/images/gallery/siamez-058.jpg", category: "marriageRegistration" },
  { id: "g-79df59b1d7", src: "/images/gallery/siamez-059.jpg", category: "driversLicense" },
  { id: "g-787d87c66c", src: "/images/gallery/siamez-060.jpg", category: "vehicleRegistration" },
  { id: "g-ebf788337d", src: "/images/gallery/siamez-061.jpg", category: "translation" },
  { id: "g-4d30ecfcd9", src: "/images/gallery/siamez-062.jpg", category: "officeServices" },
  { id: "g-e2f7454211", src: "/images/gallery/siamez-063.jpg", category: "vehicleRegistration" },
  { id: "g-e1169ee499", src: "/images/gallery/siamez-064.jpg", category: "marriageRegistration" },
  { id: "g-2e83aad7e3", src: "/images/gallery/siamez-065.jpg", category: "driversLicense" },
  { id: "g-f6acbafa77", src: "/images/gallery/siamez-066.jpg", category: "vehicleRegistration" },
  { id: "g-9f8a5edc21", src: "/images/gallery/siamez-067.jpg", category: "vehicleRegistration" },
  { id: "g-e1bc2d9ffe", src: "/images/gallery/siamez-068.jpg", category: "happyClients" },
  { id: "g-7bcbdd08dd", src: "/images/gallery/siamez-069.jpg", category: "marriageRegistration" },
  { id: "g-b649f7e46d", src: "/images/gallery/siamez-070.jpg", category: "officeServices" },
  { id: "g-b4db9f2519", src: "/images/gallery/siamez-071.jpg", category: "driversLicense" },
  { id: "g-40a68637b7", src: "/images/gallery/siamez-072.jpg", category: "happyClients" },
  { id: "g-655f09a4ec", src: "/images/gallery/siamez-073.jpg", category: "marriageRegistration" },
  { id: "g-2b34f0cced", src: "/images/gallery/siamez-074.jpg", category: "vehicleRegistration" },
  { id: "g-acca7af0d6", src: "/images/gallery/siamez-075.jpg", category: "officeServices" },
  { id: "g-8800aad124", src: "/images/gallery/siamez-076.jpg", category: "happyClients" },
  { id: "g-ae9dbaacd7", src: "/images/gallery/siamez-077.jpg", category: "vehicleRegistration" },
  { id: "g-6f4e61e808", src: "/images/gallery/siamez-078.jpg", category: "vehicleRegistration" },
  { id: "g-1c5b10f21e", src: "/images/gallery/siamez-079.jpg", category: "vehicleRegistration" },
  { id: "g-64d7c6ae0a", src: "/images/gallery/siamez-080.jpg", category: "marriageRegistration" },
  { id: "g-4b3fc7184c", src: "/images/gallery/siamez-081.jpg", category: "officeServices" },
];
