/** Staff quick price guide — single source of truth for display and booking calculations (THB). */
export const DRIVER_LICENSE_PRICES = {
  newLicense: { car: 15_000, bike: 10_000, both: 20_000 },
  conversion: { car: 4_500, bike: 4_500, both: 4_500 },
  idp: 4_500,
  renewal: { car: 4_500, bike: 4_500, both: 4_500 },
  addons: {
    residentialCertificate: 2_500,
    translationLetter: 1_500,
    bookingOnly: 1_500,
    lostLicenseAddressUpdate: 1_500,
  },
} as const;

export type DriverLicensePriceGuideRow = { label: string; price: string };

export type DriverLicensePriceGuideSection = {
  title: string;
  rows: DriverLicensePriceGuideRow[];
};

export function formatDriverLicensePriceThb(amount: number, locale = "en"): string {
  const formatted = new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted} THB`;
}

/** English copy for the staff quick price guide (mirrored in messages for i18n). */
export function buildDriverLicensePriceGuideSections(
  locale = "en"
): { sections: DriverLicensePriceGuideSection[]; additionalTitle: string; additionalRows: DriverLicensePriceGuideRow[] } {
  const fmt = (n: number) => formatDriverLicensePriceThb(n, locale);
  const { newLicense, conversion, idp, renewal, addons } = DRIVER_LICENSE_PRICES;

  return {
    sections: [
      {
        title: "New license",
        rows: [
          { label: "Car", price: fmt(newLicense.car) },
          { label: "Bike", price: fmt(newLicense.bike) },
          { label: "Both", price: fmt(newLicense.both) },
        ],
      },
      {
        title: "Conversion",
        rows: [
          { label: "Car", price: fmt(conversion.car) },
          { label: "Bike", price: fmt(conversion.bike) },
          { label: "Both", price: fmt(conversion.both) },
        ],
      },
      {
        title: "International license",
        rows: [{ label: "IDP", price: fmt(idp) }],
      },
      {
        title: "Renewal",
        rows: [
          { label: "Car", price: fmt(renewal.car) },
          { label: "Bike", price: fmt(renewal.bike) },
          { label: "Both", price: fmt(renewal.both) },
        ],
      },
    ],
    additionalTitle: "Additional",
    additionalRows: [
      { label: "Residential certificate", price: fmt(addons.residentialCertificate) },
      { label: "Translation letter", price: fmt(addons.translationLetter) },
      { label: "Booking only", price: fmt(addons.bookingOnly) },
      { label: "Lost license / address update", price: fmt(addons.lostLicenseAddressUpdate) },
    ],
  };
}
