import type { VerificationStatus } from "@/lib/directory/constants";

export type StarterCategory = {
  slug: string;
  nameEn: string;
  nameTh: string;
  descriptionEn: string;
  descriptionTh: string;
  sortOrder: number;
};

export type StarterService = {
  slug: string;
  nameEn: string;
  nameTh: string;
  sortOrder: number;
};

export type StarterOffice = {
  slug: string;
  nameEn: string;
  nameTh: string;
  categorySlug: string;
  provinceCode: string;
  parentOrganizationEn?: string;
  parentOrganizationTh?: string;
  branchNameEn?: string;
  branchNameTh?: string;
  keywords?: string[];
  website?: string;
  sourceUrl?: string;
  sourceNotes: string;
  contactNotes?: string;
  verificationStatus: VerificationStatus;
};

const UNVERIFIED_NOTE =
  "Starter record only. Telephone, street address, opening hours, and coordinates were left blank on purpose. Do not treat this record as verified. Confirm the details with the agency before sending a client.";

export const STARTER_CATEGORIES: StarterCategory[] = [
  {
    slug: "dlt",
    nameEn: "Department of Land Transport",
    nameTh: "กรมการขนส่งทางบก",
    descriptionEn: "Driving licences, vehicle registration, ownership transfer, and related transport offices.",
    descriptionTh: "ใบขับขี่ ทะเบียนรถ การโอนกรรมสิทธิ์ และสำนักงานขนส่งที่เกี่ยวข้อง",
    sortOrder: 1,
  },
  {
    slug: "immigration",
    nameEn: "Immigration Bureau",
    nameTh: "สำนักงานตรวจคนเข้าเมือง",
    descriptionEn: "Immigration offices and residence-document services.",
    descriptionTh: "สำนักงานตรวจคนเข้าเมืองและงานเอกสารเกี่ยวกับการพำนัก",
    sortOrder: 2,
  },
  {
    slug: "consular",
    nameEn: "Consular Affairs and Ministry of Foreign Affairs",
    nameTh: "กรมการกงสุลและกระทรวงการต่างประเทศ",
    descriptionEn: "Document legalization, authentication, and consular enquiries.",
    descriptionTh: "การรับรองเอกสาร การรับรองคำแปล และงานกงสุล",
    sortOrder: 3,
  },
  {
    slug: "police",
    nameEn: "Royal Thai Police",
    nameTh: "สำนักงานตำรวจแห่งชาติ",
    descriptionEn: "Police clearance and criminal-record enquiries.",
    descriptionTh: "การขอหนังสือรับรองประวัติและการตรวจประวัติอาชญากรรม",
    sortOrder: 4,
  },
  {
    slug: "district",
    nameEn: "District Offices and Civil Registration",
    nameTh: "ที่ว่าการอำเภอและงานทะเบียนราษฎร",
    descriptionEn: "District and Bangkok district offices for civil registration and marriage registration.",
    descriptionTh: "ที่ว่าการอำเภอและสำนักงานเขตสำหรับทะเบียนราษฎรและการจดทะเบียนสมรส",
    sortOrder: 5,
  },
  {
    slug: "other",
    nameEn: "Other Government Offices",
    nameTh: "หน่วยงานราชการอื่น",
    descriptionEn: "Provincial, municipal, revenue, and other authorities used by SiamEZ.",
    descriptionTh: "หน่วยงานจังหวัด เทศบาล กรมสรรพากร และหน่วยงานอื่นที่ทีม SiamEZ ใช้",
    sortOrder: 6,
  },
];

export const STARTER_SERVICES: StarterService[] = [
  { slug: "thai-driving-licence", nameEn: "Thai driving licence", nameTh: "ใบขับขี่ไทย", sortOrder: 1 },
  { slug: "foreign-licence-conversion", nameEn: "Foreign driving licence conversion", nameTh: "การเปลี่ยนใบขับขี่ต่างประเทศ", sortOrder: 2 },
  { slug: "licence-renewal", nameEn: "Driving licence renewal", nameTh: "การต่ออายุใบขับขี่", sortOrder: 3 },
  { slug: "international-driving-permit", nameEn: "International driving permit", nameTh: "ใบอนุญาตขับรถระหว่างประเทศ", sortOrder: 4 },
  { slug: "vehicle-ownership-transfer", nameEn: "Vehicle ownership transfer", nameTh: "การโอนกรรมสิทธิ์รถ", sortOrder: 5 },
  { slug: "blue-book-green-book", nameEn: "Blue book and green book", nameTh: "เล่มทะเบียนรถ", sortOrder: 6 },
  { slug: "vehicle-registration", nameEn: "Vehicle registration", nameTh: "การจดทะเบียนรถ", sortOrder: 7 },
  { slug: "vehicle-tax", nameEn: "Vehicle tax", nameTh: "ภาษีรถ", sortOrder: 8 },
  { slug: "residence-certificate", nameEn: "Residence certificate", nameTh: "ใบรับรองถิ่นที่อยู่", sortOrder: 9 },
  { slug: "address-reporting", nameEn: "Address reporting", nameTh: "การแจ้งที่อยู่", sortOrder: 10 },
  { slug: "immigration-appointment", nameEn: "Immigration appointment", nameTh: "การนัดหมายตรวจคนเข้าเมือง", sortOrder: 11 },
  { slug: "document-legalization", nameEn: "Document legalization", nameTh: "การรับรองเอกสาร", sortOrder: 12 },
  { slug: "translation-legalization", nameEn: "Translation legalization", nameTh: "การรับรองคำแปล", sortOrder: 13 },
  { slug: "authentication", nameEn: "Document authentication", nameTh: "การนิติกรณ์เอกสาร", sortOrder: 14 },
  { slug: "consular-services", nameEn: "Consular services", nameTh: "งานกงสุล", sortOrder: 15 },
  { slug: "police-clearance", nameEn: "Police clearance", nameTh: "หนังสือรับรองประวัติ", sortOrder: 16 },
  { slug: "criminal-record-check", nameEn: "Criminal record check", nameTh: "การตรวจประวัติอาชญากรรม", sortOrder: 17 },
  { slug: "marriage-registration", nameEn: "Marriage registration", nameTh: "การจดทะเบียนสมรส", sortOrder: 18 },
  { slug: "civil-registration", nameEn: "Civil registration", nameTh: "ทะเบียนราษฎร", sortOrder: 19 },
  { slug: "certified-civil-copies", nameEn: "Certified civil-record copies", nameTh: "สำเนาทะเบียนราษฎร", sortOrder: 20 },
];

export const STARTER_OFFICES: StarterOffice[] = [
  {
    slug: "dlt-headquarters",
    nameEn: "Department of Land Transport",
    nameTh: "กรมการขนส่งทางบก",
    categorySlug: "dlt",
    provinceCode: "10",
    branchNameEn: "Headquarters",
    branchNameTh: "สำนักงานใหญ่",
    keywords: ["DLT", "Land Transport"],
    website: "https://www.dlt.go.th",
    sourceUrl: "https://www.dlt.go.th",
    sourceNotes: `${UNVERIFIED_NOTE} Website is the department homepage.`,
    contactNotes: "Branch address and telephone are not recorded yet.",
    verificationStatus: "unverified",
  },
  {
    slug: "dlt-chiang-mai",
    nameEn: "Chiang Mai Provincial Land Transport Office",
    nameTh: "สำนักงานขนส่งจังหวัดเชียงใหม่",
    categorySlug: "dlt",
    provinceCode: "50",
    keywords: ["DLT", "Land Transport"],
    website: "https://www.dlt.go.th",
    sourceUrl: "https://www.dlt.go.th",
    sourceNotes: `${UNVERIFIED_NOTE} The website is the department homepage, not a confirmed branch page.`,
    contactNotes: "Branch address and telephone are not recorded yet.",
    verificationStatus: "unverified",
  },
  {
    slug: "dlt-chon-buri",
    nameEn: "Chon Buri Provincial Land Transport Office",
    nameTh: "สำนักงานขนส่งจังหวัดชลบุรี",
    categorySlug: "dlt",
    provinceCode: "20",
    keywords: ["DLT", "Land Transport", "Pattaya", "Bang Lamung"],
    website: "https://www.dlt.go.th",
    sourceUrl: "https://www.dlt.go.th",
    sourceNotes: `${UNVERIFIED_NOTE} Pattaya is a locality in Chon Buri. This keyword does not confirm which branch serves Pattaya.`,
    contactNotes: "Branch address and telephone are not recorded yet.",
    verificationStatus: "unverified",
  },
  {
    slug: "dlt-phuket",
    nameEn: "Phuket Provincial Land Transport Office",
    nameTh: "สำนักงานขนส่งจังหวัดภูเก็ต",
    categorySlug: "dlt",
    provinceCode: "83",
    keywords: ["DLT", "Land Transport"],
    website: "https://www.dlt.go.th",
    sourceUrl: "https://www.dlt.go.th",
    sourceNotes: UNVERIFIED_NOTE,
    contactNotes: "Branch address and telephone are not recorded yet.",
    verificationStatus: "unverified",
  },
  {
    slug: "immigration-bureau",
    nameEn: "Immigration Bureau",
    nameTh: "สำนักงานตรวจคนเข้าเมือง",
    categorySlug: "immigration",
    provinceCode: "10",
    branchNameEn: "Headquarters",
    branchNameTh: "สำนักงานใหญ่",
    keywords: ["Immigration"],
    website: "https://www.immigration.go.th",
    sourceUrl: "https://www.immigration.go.th",
    sourceNotes: `${UNVERIFIED_NOTE} Website is the bureau homepage.`,
    contactNotes: "Office address and telephone are not recorded yet.",
    verificationStatus: "unverified",
  },
  {
    slug: "immigration-chiang-mai",
    nameEn: "Chiang Mai Immigration Office",
    nameTh: "สำนักงานตรวจคนเข้าเมืองจังหวัดเชียงใหม่",
    categorySlug: "immigration",
    provinceCode: "50",
    keywords: ["Immigration"],
    website: "https://www.immigration.go.th",
    sourceUrl: "https://www.immigration.go.th",
    sourceNotes: UNVERIFIED_NOTE,
    contactNotes: "Office address and telephone are not recorded yet.",
    verificationStatus: "unverified",
  },
  {
    slug: "immigration-phuket",
    nameEn: "Phuket Immigration Office",
    nameTh: "สำนักงานตรวจคนเข้าเมืองจังหวัดภูเก็ต",
    categorySlug: "immigration",
    provinceCode: "83",
    keywords: ["Immigration"],
    website: "https://www.immigration.go.th",
    sourceUrl: "https://www.immigration.go.th",
    sourceNotes: UNVERIFIED_NOTE,
    contactNotes: "Office address and telephone are not recorded yet.",
    verificationStatus: "unverified",
  },
  {
    slug: "immigration-chon-buri",
    nameEn: "Chon Buri Immigration Office",
    nameTh: "สำนักงานตรวจคนเข้าเมืองจังหวัดชลบุรี",
    categorySlug: "immigration",
    provinceCode: "20",
    keywords: ["Immigration", "Pattaya", "Bang Lamung"],
    website: "https://www.immigration.go.th",
    sourceUrl: "https://www.immigration.go.th",
    sourceNotes: `${UNVERIFIED_NOTE} Pattaya is a locality in Chon Buri. Confirm which office handles the visit.`,
    contactNotes: "Office address and telephone are not recorded yet.",
    verificationStatus: "unverified",
  },
  {
    slug: "mfa-consular-affairs",
    nameEn: "Department of Consular Affairs",
    nameTh: "กรมการกงสุล",
    categorySlug: "consular",
    provinceCode: "10",
    parentOrganizationEn: "Ministry of Foreign Affairs",
    parentOrganizationTh: "กระทรวงการต่างประเทศ",
    keywords: ["MFA", "Consular Affairs"],
    website: "https://consular.mfa.go.th",
    sourceUrl: "https://consular.mfa.go.th",
    sourceNotes: `${UNVERIFIED_NOTE} Website is the department homepage.`,
    contactNotes: "Office address and telephone are not recorded yet.",
    verificationStatus: "unverified",
  },
  {
    slug: "royal-thai-police",
    nameEn: "Royal Thai Police",
    nameTh: "สำนักงานตำรวจแห่งชาติ",
    categorySlug: "police",
    provinceCode: "10",
    keywords: ["Royal Thai Police"],
    sourceNotes: `${UNVERIFIED_NOTE} No official website, telephone, or address has been stored for this record.`,
    contactNotes: "Contact details are not recorded yet.",
    verificationStatus: "unverified",
  },
  {
    slug: "bang-rak-district-office",
    nameEn: "Bang Rak District Office",
    nameTh: "สำนักงานเขตบางรัก",
    categorySlug: "district",
    provinceCode: "10",
    parentOrganizationEn: "Bangkok Metropolitan Administration",
    parentOrganizationTh: "กรุงเทพมหานคร",
    keywords: ["district office", "khet"],
    sourceNotes: `${UNVERIFIED_NOTE} This identifies the Bangkok district. It does not confirm which counters or services are available.`,
    contactNotes: "Address and telephone are not recorded yet.",
    verificationStatus: "unverified",
  },
  {
    slug: "mueang-chiang-mai-district-office",
    nameEn: "Mueang Chiang Mai District Office",
    nameTh: "ที่ว่าการอำเภอเมืองเชียงใหม่",
    categorySlug: "district",
    provinceCode: "50",
    keywords: ["amphur", "district office"],
    sourceNotes: UNVERIFIED_NOTE,
    contactNotes: "Address and telephone are not recorded yet.",
    verificationStatus: "unverified",
  },
  {
    slug: "mueang-phuket-district-office",
    nameEn: "Mueang Phuket District Office",
    nameTh: "ที่ว่าการอำเภอเมืองภูเก็ต",
    categorySlug: "district",
    provinceCode: "83",
    keywords: ["amphur", "district office"],
    sourceNotes: UNVERIFIED_NOTE,
    contactNotes: "Address and telephone are not recorded yet.",
    verificationStatus: "unverified",
  },
  {
    slug: "revenue-department",
    nameEn: "Revenue Department",
    nameTh: "กรมสรรพากร",
    categorySlug: "other",
    provinceCode: "10",
    keywords: ["Revenue Department", "tax"],
    website: "https://www.rd.go.th",
    sourceUrl: "https://www.rd.go.th",
    sourceNotes: `${UNVERIFIED_NOTE} Website is the department homepage, not a specific area office.`,
    contactNotes: "Area-office address and telephone are not recorded yet.",
    verificationStatus: "unverified",
  },
];
