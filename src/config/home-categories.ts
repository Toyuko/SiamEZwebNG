/**
 * Homepage service category tiles — maps to real catalog slugs only.
 * Colors match the premium SiamEZ mobile/desktop concept.
 *
 * NOTE: Use hex `color` (applied via inline style), not dynamic Tailwind
 * `bg-[#…]` class strings — those can be purged and leave white/blank tiles.
 */

export type HomeCategoryTile = {
  id: string;
  /** i18n key under home.categories.* */
  labelKey: string;
  /** Lucide icon name */
  icon: string;
  /** Solid tile background */
  color: string;
  /** Link target: service detail, book flow, or directory */
  href: string;
  /** Optional service slug for analytics */
  slug?: string;
};

export const homeCategoryTiles: HomeCategoryTile[] = [
  {
    id: "driver-license",
    labelKey: "driverLicense",
    icon: "Car",
    color: "#F97316",
    href: "/services/driver-license",
    slug: "driver-license",
  },
  {
    id: "vehicle-registration",
    labelKey: "vehicleServices",
    icon: "ClipboardList",
    color: "#EC4899",
    href: "/services/vehicle-registration",
    slug: "vehicle-registration",
  },
  {
    id: "marriage-registration",
    labelKey: "marriage",
    icon: "Heart",
    color: "#EF4444",
    href: "/services/marriage-registration",
    slug: "marriage-registration",
  },
  {
    id: "translation-services",
    labelKey: "translation",
    icon: "Languages",
    color: "#8B5CF6",
    href: "/services/translation-services",
    slug: "translation-services",
  },
  {
    id: "police-clearance",
    labelKey: "policeClearance",
    icon: "Shield",
    color: "#16A34A",
    href: "/services/police-clearance",
    slug: "police-clearance",
  },
  {
    id: "visa-services",
    labelKey: "visa",
    icon: "Plane",
    color: "#0754E8",
    href: "/services/visa-services",
    slug: "visa-services",
  },
  {
    id: "real-estate-services",
    labelKey: "realEstate",
    icon: "Building2",
    color: "#06B6D4",
    href: "/services/real-estate-services",
    slug: "real-estate-services",
  },
  {
    id: "construction-handyman",
    labelKey: "construction",
    icon: "Wrench",
    color: "#F59E0B",
    href: "/services/construction-handyman",
    slug: "construction-handyman",
  },
  {
    id: "car-motorbike-finder",
    labelKey: "vehicleFinder",
    icon: "Search",
    color: "#6366F1",
    href: "/services/car-motorbike-finder-selling-service",
    slug: "car-motorbike-finder-selling-service",
  },
  {
    id: "more",
    labelKey: "more",
    icon: "LayoutGrid",
    color: "#1676FF",
    href: "/services",
  },
];
