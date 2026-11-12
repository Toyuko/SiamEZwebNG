import { DOCUMENT_LABELS, type LicenceServiceKind } from "@/lib/licence-verification/types";

export type LicenceLocale = "en" | "th";

const SERVICE_TITLES: Record<LicenceServiceKind, { en: string; th: string }> = {
  NEW_CAR: { en: "New Thai car driving licence", th: "ใบขับขี่รถยนต์ไทยใบใหม่" },
  NEW_MOTORCYCLE: { en: "New Thai motorcycle driving licence", th: "ใบขับขี่รถจักรยานยนต์ไทยใบใหม่" },
  NEW_BOTH: { en: "New Thai car and motorcycle licence", th: "ใบขับขี่รถยนต์และรถจักรยานยนต์ใบใหม่" },
  CONVERSION_CAR: { en: "Foreign licence conversion — car", th: "แปลงใบขับขี่ต่างประเทศ — รถยนต์" },
  CONVERSION_MOTORCYCLE: { en: "Foreign licence conversion — motorcycle", th: "แปลงใบขับขี่ต่างประเทศ — รถจักรยานยนต์" },
  CONVERSION_BOTH: { en: "Foreign licence conversion — both", th: "แปลงใบขับขี่ต่างประเทศ — ทั้งสองประเภท" },
  RENEWAL: { en: "Thai driving licence renewal", th: "ต่ออายุใบขับขี่ไทย" },
  LOST_REPLACEMENT: { en: "Lost driving licence / replacement", th: "ใบขับขี่หาย / ออกใบแทน" },
  IDP: { en: "International driving permit", th: "ใบอนุญาตขับรถระหว่างประเทศ" },
};

export function serviceTitle(kind: LicenceServiceKind, locale: LicenceLocale): string {
  return SERVICE_TITLES[kind][locale];
}

export function licenceCopy(locale: LicenceLocale) {
  const th = locale === "th";
  return {
    title: th ? "ตรวจเอกสารใบขับขี่ก่อนเสนอราคา" : "Check your driving licence documents first",
    lead: th
      ? "อัปโหลดเอกสารแล้วให้ SiamEZ ตรวจเบื้องต้นก่อนออกใบเสนอราคา ไม่ใช่การอนุมัติจากกรมการขนส่งทางบก"
      : "Upload your documents for an initial SiamEZ check before we send a quotation. This is not Department of Land Transport approval.",
    fee: th ? "ค่าบริการตามตารางราคาปัจจุบัน" : "Service fee from the current price guide",
    continue: th ? "ต่อไป" : "Continue",
    back: th ? "ย้อนกลับ" : "Back",
    submit: th ? "ส่งคำขอ" : "Submit application",
    upload: th ? "อัปโหลด" : "Upload",
    replace: th ? "อัปโหลดใหม่" : "Replace",
    check: th ? "ตรวจเอกสารอีกครั้ง" : "Check documents again",
    accept: th ? "ยอมรับใบเสนอราคา" : "Accept quotation",
    name: th ? "ชื่อ-นามสกุลตามเอกสาร" : "Full legal name",
    nationality: th ? "สัญชาติ" : "Nationality",
    dob: th ? "วันเกิด" : "Date of birth",
    passport: th ? "เลขหนังสือเดินทาง" : "Passport number",
    residenceCountry: th ? "ประเทศที่อาศัยอยู่ตอนนี้" : "Current country of residence",
    immigration: th ? "สถานะวีซ่าหรือการเข้าเมือง" : "Visa or immigration status",
    visaExpiry: th ? "วันหมดอายุวีซ่า" : "Visa expiry date",
    address: th ? "ที่อยู่ที่พักในไทย" : "Thai residential address",
    email: th ? "อีเมล" : "Email",
    phone: th ? "โทรศัพท์" : "Phone",
    yes: th ? "ใช่" : "Yes",
    no: th ? "ไม่ใช่" : "No",
    residenceCert: th ? "มีใบรับรองที่อยู่หรือไม่" : "Do you have a residence certificate?",
    workPermit: th ? "มีใบอนุญาตทำงานหรือไม่" : "Do you have a work permit?",
    foreignLicence: th ? "มีใบขับขี่ต่างประเทศหรือไม่" : "Do you have a foreign driving licence?",
    heldThai: th ? "เคยมีใบขับขี่ไทยหรือไม่" : "Have you held a Thai driving licence before?",
    attempted: th ? "เคยลองทำเรื่องนี้แล้วไม่ผ่านหรือไม่" : "Have you tried this process before and not finished it?",
    vehicle: th ? "ประเภทยานพาหนะ" : "Vehicle",
    car: th ? "รถยนต์" : "Car",
    motorcycle: th ? "รถจักรยานยนต์" : "Motorcycle",
    both: th ? "ทั้งสองประเภท" : "Both",
    country: th ? "ประเทศที่ออกใบขับขี่" : "Country that issued the licence",
    categories: th ? "ประเภทในใบขับขี่" : "Licence categories",
    issued: th ? "วันที่ออกใบขับขี่" : "Licence issue date",
    expires: th ? "วันหมดอายุใบขับขี่" : "Licence expiry date",
    format: th ? "ใบขับขี่เป็นบัตรจริงหรือดิจิทัล" : "Is the licence physical or digital?",
    physical: th ? "บัตรจริง" : "Physical card",
    digital: th ? "ดิจิทัล" : "Digital",
    language: th ? "ภาษาในใบขับขี่" : "Licence language",
    english: th ? "ภาษาอังกฤษ" : "English",
    otherLanguage: th ? "ภาษาอื่น อาจต้องแปล" : "Another language — translation may be needed",
    notes: th ? "เล่าสั้น ๆ ว่าเกิดอะไรขึ้น" : "Short note about what happened",
    disclaimer: th
      ? "ผลการตรวจนี้เป็นการคัดกรองเอกสารของ SiamEZ เท่านั้น ไม่ได้รับรองว่ากรมการขนส่งทางบกจะออกใบขับขี่"
      : "This screening is SiamEZ’s document check only. It does not mean the Department of Land Transport will issue a licence.",
  };
}

const DOCUMENT_LABELS_TH: Record<string, string> = {
  passport: "หน้าข้อมูลหนังสือเดินทาง",
  visa_or_entry: "วีซ่าหรือตราประทับเข้าเมือง",
  residence_certificate: "ใบรับรองที่อยู่",
  work_permit: "ใบอนุญาตทำงาน",
  foreign_licence_front: "ใบขับขี่ต่างประเทศด้านหน้า",
  foreign_licence_back: "ใบขับขี่ต่างประเทศด้านหลัง",
  international_driving_permit: "ใบอนุญาตขับรถระหว่างประเทศ",
  medical_certificate: "ใบรับรองแพทย์",
  previous_thai_licence: "ใบขับขี่ไทยใบเดิม",
  other: "เอกสารประกอบอื่น",
};

export function documentLabel(type: string, locale: LicenceLocale): string {
  if (locale === "th") return DOCUMENT_LABELS_TH[type] ?? DOCUMENT_LABELS[type] ?? type;
  return DOCUMENT_LABELS[type] ?? type;
}

export function uploadLinkCopy(locale: LicenceLocale) {
  const th = locale === "th";
  return {
    brand: "SiamEZ",
    eyebrow: th ? "เอกสารใบขับขี่" : "Driving licence",
    title: th ? "ส่งเอกสารใบขับขี่" : "Send your driving licence documents",
    lead: th
      ? "ยืนยันข้อมูลแล้วอัปโหลดเอกสารตามรายการนี้ ไม่ต้องสมัครบัญชี"
      : "Confirm your details and upload the documents on this list. You do not need an account.",
    reference: th ? "เลขอ้างอิง" : "Application reference",
    service: th ? "บริการที่ขอ" : "Requested service",
    checklist: th ? "เอกสารที่ต้องใช้" : "Documents we need",
    received: th ? "ได้รับแล้ว" : "Received",
    stillNeeded: th ? "ยังขาด" : "Still needed",
    details: th ? "ยืนยันข้อมูลส่วนตัว" : "Confirm your details",
    save: th ? "บันทึกและทำต่อภายหลัง" : "Save and continue later",
    saved: th ? "บันทึกแล้ว คุณกลับมาที่ลิงก์นี้ได้ภายหลัง" : "Saved. You can return to this link later.",
    submit: th ? "ส่งเอกสาร" : "Submit documents",
    submitting: th ? "กำลังส่ง" : "Submitting",
    submittedTitle: th ? "ได้รับเอกสารแล้ว" : "We have your documents",
    submittedBody: th
      ? "ทีมงานจะตรวจเอกสารและแจ้งหากต้องใช้อะไรเพิ่ม ก่อนจัดทำใบเสนอราคา"
      : "Our team will review your documents and let you know if anything else is required before preparing your quotation.",
    expired: th ? "ลิงก์นี้หมดอายุแล้ว จึงรับเอกสารไม่ได้" : "This link has expired. It cannot accept documents.",
    revoked: th ? "ลิงก์นี้ถูกยกเลิกแล้ว จึงรับเอกสารไม่ได้" : "This link has been revoked. It cannot accept documents.",
    uploading: th ? "กำลังอัปโหลด" : "Uploading",
    replace: th ? "อัปโหลดแทนที่" : "Replace",
    addFiles: th ? "เพิ่มอีกหลายไฟล์" : "Add more files",
    capture: th ? "ถ่ายรูปหรือเลือกไฟล์" : "Take a photo or choose a file",
    fileTypes: "PDF, JPG, JPEG, PNG",
    chooseType: th ? "เลือกประเภทเอกสาร" : "Document type",
    done: th ? "อัปโหลดแล้ว" : "Uploaded",
    contact: th ? "หากลิงก์ใช้ไม่ได้ ติดต่อ SiamEZ ที่ส่งลิงก์นี้ให้คุณ" : "If this link does not work, contact the SiamEZ person who sent it.",
  };
}
