/* eslint-disable max-len -- VirtualYard photo URLs */
/**
 * Public inventory data mirrored from the seller listing page for seeding.
 * Image URLs are served from the dealer platform (VirtualYard) as embedded on the
 * source page. Re-fresh by running scripts/scrape-sunset-listing-images.mjs and
 * pasting the Benelli result here — the seller occasionally rotates the
 * dealers.virtualyard.com.au/vydata/* CDN paths but the virtualyard.com.au/photos/*
 * URLs returned via og:image have been stable.
 */
export const BENELLI_TRK_502X_IMAGE_URLS: string[] = [
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOE1OiPS9Cq-Q88odm4fr-vmcUOZZ4arxCJpOrD6rBTzijxS4At7CWgiz_1AQodj32M.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOE1mpmUpWDz06LLvrbu4TmG85H_skNjMEWo8Z6FJjfV4m8pmqPd65duClGwDch9yTs.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOE4pTTuYQ1-PveX5V7uvdRzyo8PvwMtJ75rJYkX2SpffjpojTF5_HPgpEf9nsDT4A4.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOE6SPacJ3Thv2SIrKAeDndhQ-RTVx8-BIQ9O7X0cAkGkWpHOoPtP1HQNC27kfh6KXE.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOEDB_jThkLm17UiZUEtLS5rR_SdiG9yrVFdLBRpjI7uJox9VgfGKtgWoJv0KpdMieM.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOEGOxIlew4gaD2ORjdB6h44PbNeFuyAGswd8DBwQwht5ftd10M5Te1Vb7RFmCGAom0.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOEHLJ01KU-eLJP85XRP6LgwMNTQhTZ5F5f8_e4h7TlHIHiBy6fMve9GM8ER6dmei1I.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOEUSCYU74Jnf3X5vyRkMsIUCJyB0Y6LKs3jJ2WdI9Fw7RNPdGPEQ6x0roQhCe_Fxlk.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOEl4faMZx5ps2WbBa-oRo-YHldVGZenaCZ_ng1ABUoPzacREBgP0uqbt8l0ZE4huWo.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOEmsNlKkptD439SlOz2I7duutLcPe_S3SY64cTqz1uEqSpQaVCoW_rszWEoApvTwhY.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOEtPGBFQaWKTbq6Sa537pfmbvlaiczlF2x65CdiAShlMWmYQXy-8fAkx63aZNNBw54.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOEwfPc2vpUaRm8VBDT7fh1sS-e6SzvAz9LaxadeMhMhDbd2-vqgVDPrYH-rw7xMnzQ.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOF3D4zSqPKInVTiU4eqqzRHd2KUP87jAYlNfE0ODX0pVt8K8_Rea97ypGbIbcIAoqg.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOF3Niq5JYJsS3V8CFv3CRWxnW4Ni643TEGEkod2QqYoHcnILsKiJmQxuMxxSFJK5KQ.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOF7RRpnGWqXKWqbiZcBsVDPgk7r171IHQ3HEsFDGWZnZK_iaRBb3V6vsYZlfGs9Yfw.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOFAKuTJQTwHmZJfdEd1n9a3kiWpnmZOLCNIiDcQbvKY2MrBg4ts1-XBABb9odXiEJk.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOFFPS53ikea_MKkqyKiDQxRV6UlG0kC8YrfF03E6k1H34uCjpYH-ACDOkPD7Szfqik.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOFQ3a0FBCgjBsrGGp2l-RVgomQCEV12fxV9AopqhCwobA9x679w6-IDa-byHqGPcAg.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOFQWiDBZUHoaxhoHEIhm_II-kK4bBI6TBZ0t1LBkoXLk_cvw07ijUR3e7z05bBr85c.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOFSdVHrnMSzMfzqq_DfTKVlGlPEWSx4pPqBd8frhCwVU3GMfUg2gv51Cs9wjfGJIhs.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOFhFg8MFR0NDrmu7zTllxCJ7a2VzJ3jpmKlbnDE5cuXXcMqdDAPKQpdtagv2bVfEAQ.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOFpXqLevXx7XXRcNqHDmWn5KPRDF5qJzXxrKkhJiwCOT2VD3Z4ibd-0zmJBC35aHMk.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOFuGFlxzl4D58GwEiQlHg9zbXlFY6tM_fv9NpX551C--LA5WojMb9i8uq-Zm3xZzSA.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOG9NELGO0S5Ty2Z-pL4nczuxPRuOlcnq5Zkxq0mnbXz0tDhIFYA53vnODCoNcS4S3M.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOGAEZhmbPgg_jZeyo8r_yE-JzlmtIpzyFgT4nHtSnKhzUHpyx_8BlSTgSo1-PAaaew.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOGAnTuCLSedtq0DYvBDveOUHVE6idGdDttN1eay2o6I6l0F1QB17QNd5_T5Sdhc_IQ.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOGG-NtLRCWUmTrz0mpklipQcoTrG7nSjEUp445haWbHyPnuB-tqtdwEveiw_2SReug.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOGGPRlxcuQkJybedBYruCjXisMuzevgn59wmsZnWQQjqTqGUu8LwMwMo6EYSO7YoqE.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOGLbz9Zai8RURZQauPynitDlb0i6r_rUiX-vCU15EV4QZPgeWgLSVtFaI1617MYtA0.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOGXb7XGPEd4fq4rG4d_Q2R5whyvpg9ylefgW3Z8zEQdrRbsMKvzF0C1SElmJnaW89A.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOGZ6-lgq6YfxRxwmgxrUiNgL1ss9DMSaBCc_z8yoXHgsWSaSn8meJHQ6pzsIBj5aCU.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOGfvQaU-u-gu1q5MxdPnInzAsZtGaV1VrKR4aiMERgRrjkwucBT5ETpez1BXt0vJFM.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOGlPhVrgyPM63dTWapzRSouIZX0pXmCIxJyG6TvxSiN2QGjeSScq6MGb47ITod22Vk.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOGtbnfCO6wylJPKG908GeHXPqDGnEw8DYBkt3GSUIOkUZrtGoHDgYNhLx1WgutK558.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOH5zDNS4pxZfAnepIBjbXVPDwd7vUVPssFki7zwQSHMfivE1YJSulb70EXbfP-fR7Y.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOHD7iD6eQhzGZCYU-UiTbFnhYk8dyzS8l8hx63voh3vWgZdbs-gtR4LDbHyiTsjCS8.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOHFt1wxE938bNcblQpOKvHAO0M-fXEFe-3PHWppAqXTjKN7euiBqK5ZMT2NXl1A2L0.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOHGoeVeQXExqsIlkqNJ0CsSTy5XLTOaxEj6oLiK8yjHL3aFSbywXrilEJuuu5lXuT0.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOHHpesTCbvzbPAbeTqknEQs-qWaVGcg1Gg3DWhi6hoLUmpXjnpT7EmoI7qnidtGowE.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOHIRewrgzohzsstJbvccGFVGvwu6Fog_D8WBCMJuKYtla8nELU7XZBhaln4r-s4Llc.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOHYG85O_c1rW5hw5fiF-li-5THLZfOh9myItn9Ii7Y36RNMf9gctdg6Yrj3GKNjdAA.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOHYLC-pg-863xQIHELJX-Hsn5P4h0v_YTzKwLyXK0OUF5RIoPu-bo6LYHfSJJR9q7U.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOHoUOMZ5p0wC1YDMSJCD_lC_A1F3LXDn5EigUaTjgQfi_JULyaLEeWmLmCqw0w91ug.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOHuiwWs1Qb-0Ty2Yc3kJHTB75ey6LXyfbXp0E9fLHJ7P3GKh2ma9gFJOMY9AXyxXcI.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOHvOqrLEKFGATOp3lHg4ZC-8cP3DNHOP56Bd0YPFeAEmxhQ75RCca5qgkqKR60aT5s.jpg",
  "https://virtualyard.com.au/photos/LFhb8atg9IkPQQt_qcu6q-Qkw-8LIgc0IZPnkyxKSOHw7Uj1yscDXRAS6vfpLlNgvYySBUS-Gq8uigGVDN21xNk-tJ5zhF9OyleS4zjvYOM.jpg",
];

const SOURCE_LISTING_URL =
  "https://sunsetscootersthailand.shop/buy/2022-benelli-trk-502x-abs-/6fuAYcpaHnnEAvaNhHChPA";

export const BENELLI_TRK_502X_SLUG = "2022-benelli-trk-502x-abs";

export const benelliTrk502xListingDescription = [
  "2022 Benelli TRK 502X ABS — adventure-style twin with ABS, manual gearbox, and unleaded fuel.",
  "Advertised odometer reading on the source listing: 6,898 km. Condition on the source listing: Excellent.",
  "Advertised price on the source listing: THB 149,800 excluding government charges — confirm drive-away cost, registration, and fees with the seller before you commit.",
  "The original seller page also mentions nationwide delivery (they quote a flat delivery fee), trade-ins, and paperwork support; treat these as seller claims to verify at viewing.",
  `Source public listing (for your reference only): ${SOURCE_LISTING_URL}`,
  "SiamEZ can help with inspection, negotiation, transfer, and registration through our Auto & Bike Finder service — contact us if you want this bike checked or purchased with support.",
].join("\n\n");

export const benelliTrk502xSpecifications: Record<string, string> = {
  Make: "Benelli",
  Model: "TRK 502X ABS",
  Variant: "N/A",
  Body: "Motorcycle",
  Transmission: "Manual",
  "Fuel type": "Unleaded",
  Year: "2022",
  "Odometer (advertised)": "6,898 km",
  "Condition (advertised)": "Excellent",
  "Price note": "THB 149,800 excluding government charges (per source listing)",
  "Source listing": SOURCE_LISTING_URL,
};
