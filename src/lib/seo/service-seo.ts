import type { ServiceSlug } from "@/config/services";
import { serviceDisplayNames } from "@/config/services";

export type LocalizedCopy = { en: string; th: string };

export type ServiceFaq = {
  question: LocalizedCopy;
  answer: LocalizedCopy;
};

export type ServiceSeo = {
  slug: ServiceSlug;
  /** Title without `| SiamEZ` (layout template appends it). */
  title: LocalizedCopy;
  description: LocalizedCopy;
  /** Visible H1 if different from the service name. */
  h1?: LocalizedCopy;
  audience: LocalizedCopy;
  areaServed: LocalizedCopy;
  relatedSlugs: ServiceSlug[];
  /** Extra public paths (e.g. /sales) linked from this service. */
  relatedPaths?: Array<{ href: string; label: LocalizedCopy }>;
  faqs: ServiceFaq[];
};

function pick(copy: LocalizedCopy, locale: string): string {
  return locale === "th" ? copy.th : copy.en;
}

export const serviceSeoBySlug: Record<ServiceSlug, ServiceSeo> = {
  "driver-license": {
    slug: "driver-license",
    title: {
      en: "Thai Driver's License Service in Thailand",
      th: "บริการใบขับขี่ไทยในประเทศไทย",
    },
    description: {
      en: "Get a Thai driver's license with SiamEZ: conversion, renewal, new car or motorcycle licenses, and IDP support. Bilingual coordinators in Bangkok for foreigners and expats.",
      th: "ทำใบขับขี่ไทยกับ SiamEZ: แปลงใบต่างประเทศ ต่ออายุ ใบใหม่รถยนต์/มอเตอร์ไซค์ และ IDP ผู้ประสานงานสองภาษาในกรุงเทพสำหรับชาวต่างชาติ",
    },
    audience: {
      en: "Foreigners, expats, and residents in Thailand who need a Thai driver's license — including first-time applicants, conversions of a foreign license, renewals, and International Driving Permits.",
      th: "ชาวต่างชาติ ชาวต่างถิ่น และผู้พักอาศัยในไทยที่ต้องการใบขับขี่ไทย รวมถึงผู้สมัครครั้งแรก แปลงใบต่างประเทศ ต่ออายุ และ IDP",
    },
    areaServed: {
      en: "Coordinated in Bangkok with bilingual support. Customers across Thailand can start online and complete DLT steps with our team.",
      th: "ประสานงานในกรุงเทพฯ พร้อมบริการสองภาษา ลูกค้าทั่วไทยเริ่มจองออนไลน์และดำเนินการที่ DLT กับทีมเราได้",
    },
    relatedSlugs: ["vehicle-registration", "car-motorbike-finder-selling-service"],
    faqs: [
      {
        question: {
          en: "Can foreigners get a Thai driver's license?",
          th: "ชาวต่างชาติทำใบขับขี่ไทยได้หรือไม่?",
        },
        answer: {
          en: "Yes. SiamEZ helps foreigners convert a valid foreign license, apply for a new car or motorcycle license, renew, or obtain an IDP under current DLT rules. You will need a passport, visa evidence, a medical certificate, and proof of address.",
          th: "ได้ SiamEZ ช่วยชาวต่างชาติแปลงใบขับขี่ต่างประเทศ สมัครใหม่ ต่ออายุ หรือขอ IDP ตามกฎ DLT โดยต้องมีพาสปอร์ต หลักฐานวีซ่า ใบรับรองแพทย์ และหลักฐานที่อยู่",
        },
      },
      {
        question: {
          en: "How long does a Thai driver's license take with SiamEZ?",
          th: "ใช้เวลานานแค่ไหนในการทำใบขับขี่ไทยกับ SiamEZ?",
        },
        answer: {
          en: "Most cases take 1–3 business days depending on the service (conversion, new license, or renewal) and DLT appointment availability. Fast-track options are available where the office allows.",
          th: "ส่วนใหญ่ใช้เวลา 1–3 วันทำการ ขึ้นกับประเภทบริการและคิว DLT มีตัวเลือกเร่งด่วนตามที่สำนักงานอนุญาต",
        },
      },
      {
        question: {
          en: "Where is the driver's license service provided?",
          th: "บริการใบขับขี่ให้ที่ไหน?",
        },
        answer: {
          en: "SiamEZ coordinates driver's license work in Bangkok. You can book online from anywhere in Thailand and we guide you through documents, medical checks, and the DLT visit.",
          th: "SiamEZ ประสานงานใบขับขี่ในกรุงเทพฯ จองออนไลน์จากที่ไหนในไทยก็ได้ แล้วเราจะพาเตรียมเอกสาร ตรวจสุขภาพ และเข้า DLT",
        },
      },
    ],
  },
  "vehicle-registration": {
    slug: "vehicle-registration",
    title: {
      en: "Vehicle Registration Service in Thailand",
      th: "บริการจดทะเบียนรถในประเทศไทย",
    },
    description: {
      en: "Car and motorcycle registration in Bangkok with SiamEZ — we pick up at your home and go to the DLT on your behalf. Transfers, renewals, and same-day BKK plates where eligible.",
      th: "จดทะเบียนรถยนต์และมอเตอร์ไซค์ในกรุงเทพกับ SiamEZ — รับรถถึงบ้านและไป DLT แทนคุณ โอน ต่อภาษี และป้าย กทม. วันเดียวตามสิทธิ์",
    },
    audience: {
      en: "Anyone buying, selling, or transferring a car or motorcycle in Thailand who wants DLT registration, plates, or tax renewal handled without the queue.",
      th: "ผู้ที่ซื้อ ขาย หรือโอนรถยนต์/มอเตอร์ไซค์ในไทย และต้องการให้ช่วยจดทะเบียน ป้าย หรือต่อภาษีโดยไม่ต้องต่อคิวเอง",
    },
    areaServed: {
      en: "Bangkok DLT offices for BKK plates, with document support for customers elsewhere in Thailand.",
      th: "สำนักงาน DLT กรุงเทพสำหรับป้าย กทม. พร้อมช่วยเอกสารสำหรับลูกค้าในจังหวัดอื่น",
    },
    relatedSlugs: ["driver-license", "car-motorbike-finder-selling-service"],
    faqs: [
      {
        question: {
          en: "Can SiamEZ register a car or motorcycle in Bangkok in one day?",
          th: "SiamEZ จดทะเบียนรถในกรุงเทพวันเดียวได้หรือไม่?",
        },
        answer: {
          en: "Bangkok (BKK) plates can often be completed the same day when documents are complete. Transfers, renewals, and out-of-province plates may take longer. We confirm the timeline after reviewing your vehicle book and ID.",
          th: "ป้าย กทม. มักทำวันเดียวได้ถ้าเอกสารครบ การโอน ต่อภาษี หรือป้ายต่างจังหวัดอาจนานกว่า เราจะยืนยันระยะเวลาหลังตรวจเล่มรถและบัตร/พาสปอร์ต",
        },
      },
      {
        question: {
          en: "What documents are needed for vehicle registration in Thailand?",
          th: "จดทะเบียนรถในไทยต้องใช้เอกสารอะไร?",
        },
        answer: {
          en: "Typically the vehicle book, your ID or passport, and the sale contract or transfer documents. We give you a checklist when you book.",
          th: "โดยทั่วไปใช้เล่มทะเบียนรถ บัตรประชาชนหรือพาสปอร์ต และสัญญาซื้อขายหรือเอกสารโอน เราจะส่งเช็กลิสต์เมื่อคุณจอง",
        },
      },
      {
        question: {
          en: "Do I have to go to the DLT myself?",
          th: "ต้องไปกรมการขนส่งทางบกด้วยตัวเองหรือไม่?",
        },
        answer: {
          en: "No. We pick up your car or motorcycle at your home, go to the DLT on your behalf, and return the vehicle when registration is complete.",
          th: "ไม่ต้อง เรารับรถยนต์หรือมอเตอร์ไซค์ถึงบ้าน ไปดำเนินการที่ DLT แทนคุณ และนำรถกลับเมื่อจดทะเบียนเสร็จ",
        },
      },
    ],
  },
  "visa-services": {
    slug: "visa-services",
    title: {
      en: "Visa Services in Thailand",
      th: "บริการวีซ่าในประเทศไทย",
    },
    description: {
      en: "Visa applications, extensions, and immigration guidance in Thailand. SiamEZ helps foreigners and expats prepare documents and stay compliant.",
      th: "ยื่นวีซ่า ต่ออายุ และคำแนะนำด้านตรวจคนเข้าเมืองในไทย SiamEZ ช่วยชาวต่างชาติเตรียมเอกสารและปฏิบัติให้ถูกต้อง",
    },
    audience: {
      en: "Foreigners living in or moving to Thailand who need visa applications, extensions, or immigration paperwork support.",
      th: "ชาวต่างชาติที่อาศัยหรือย้ายมาไทยและต้องการยื่นวีซ่า ต่ออายุ หรือเอกสารตรวจคนเข้าเมือง",
    },
    areaServed: {
      en: "Available to customers across Thailand. Work is coordinated from our Bangkok office.",
      th: "ให้บริการลูกค้าทั่วไทย ประสานงานจากสำนักงานกรุงเทพฯ",
    },
    relatedSlugs: ["police-clearance", "translation-services"],
    faqs: [
      {
        question: {
          en: "What visa help does SiamEZ provide?",
          th: "SiamEZ ช่วยเรื่องวีซ่าอะไรบ้าง?",
        },
        answer: {
          en: "We guide visa applications, extensions, and related immigration documents. The exact path depends on your passport, current stamp, and purpose of stay. Book a service or ask the AI Concierge to start.",
          th: "เราให้คำแนะนำการยื่นวีซ่า ต่ออายุ และเอกสารตรวจคนเข้าเมือง เส้นทางขึ้นกับพาสปอร์ต ตราประทับปัจจุบัน และวัตถุประสงค์การอยู่ เริ่มได้ด้วยการจองหรือถาม AI Concierge",
        },
      },
      {
        question: {
          en: "How long do visa services take?",
          th: "บริการวีซ่าใช้เวลานานแค่ไหน?",
        },
        answer: {
          en: "Typical cases take 3–10 business days depending on the visa type and government processing. We confirm a timeline after reviewing your documents.",
          th: "โดยทั่วไป 3–10 วันทำการ ขึ้นกับประเภทวีซ่าและระยะเวลาของหน่วยงาน เรายืนยันระยะเวลาหลังตรวจเอกสาร",
        },
      },
    ],
  },
  "translation-services": {
    slug: "translation-services",
    title: {
      en: "Certified Translation & Legalization in Thailand",
      th: "แปลเอกสารรับรองและรับรองเอกสารในประเทศไทย",
    },
    description: {
      en: "Certified translations for visas, marriage, police clearance, and government filings in Thailand. MFA legalization coordination available.",
      th: "แปลเอกสารรับรองสำหรับวีซ่า สมรส หนังสือรับรองความประพฤติ และยื่นราชการในไทย พร้อมประสานงานรับรอง MFA",
    },
    audience: {
      en: "Expats, couples, and businesses who need certified Thai/English translations accepted by Thai government offices, embassies, or the MFA.",
      th: "ชาวต่างชาติ คู่สมรส และธุรกิจที่ต้องการคำแปลรับรองไทย/อังกฤษที่หน่วยงานไทย สถานทูต หรือ MFA ยอมรับ",
    },
    areaServed: {
      en: "Nationwide. Documents can be submitted online; certified copies can be arranged in Bangkok.",
      th: "ทั่วประเทศ ส่งเอกสารออนไลน์ได้ และจัดสำเนารับรองในกรุงเทพฯ ได้",
    },
    relatedSlugs: ["marriage-registration", "police-clearance", "basic-translation"],
    faqs: [
      {
        question: {
          en: "Are SiamEZ translations accepted by Thai government offices?",
          th: "คำแปลของ SiamEZ ใช้กับหน่วยงานราชการไทยได้หรือไม่?",
        },
        answer: {
          en: "We provide certified translations prepared for official use in Thailand, including visa, legal, and government submissions. MFA legalization can be coordinated when the receiving office requires it.",
          th: "เราจัดคำแปลรับรองสำหรับใช้งานราชการในไทย รวมถึงวีซ่า กฎหมาย และยื่นหน่วยงาน สามารถประสานงานรับรอง MFA ได้เมื่อหน่วยงานปลายทางต้องการ",
        },
      },
      {
        question: {
          en: "How fast is certified translation in Thailand?",
          th: "แปลเอกสารรับรองในไทยใช้เวลานานแค่ไหน?",
        },
        answer: {
          en: "Standard certified translation is typically 1–3 business days. Express options are available for urgent filings. Simple per-page work can also be booked as Basic Translation.",
          th: "แปลรับรองมาตรฐานโดยทั่วไป 1–3 วันทำการ มีบริการด่วน และงานต่อหน้าแบบเรียบง่ายจองเป็นแปลพื้นฐานได้",
        },
      },
    ],
  },
  "police-clearance": {
    slug: "police-clearance",
    title: {
      en: "Police Clearance Certificate in Thailand",
      th: "หนังสือรับรองความประพฤติในประเทศไทย",
    },
    description: {
      en: "Police clearance and background-check assistance in Thailand for visas, work, and immigration. SiamEZ handles forms, translations, and follow-up.",
      th: "ช่วยขอหนังสือรับรองความประพฤติและตรวจประวัติในไทยสำหรับวีซ่า งาน และตรวจคนเข้าเมือง SiamEZ ดูแลแบบฟอร์ม คำแปล และการติดตาม",
    },
    audience: {
      en: "Foreigners who need a Thai police clearance certificate for a visa, work permit, residency, or overseas immigration.",
      th: "ชาวต่างชาติที่ต้องการหนังสือรับรองความประพฤติไทยสำหรับวีซ่า ใบอนุญาตทำงาน การพำนัก หรือตรวจคนเข้าเมืองต่างประเทศ",
    },
    areaServed: {
      en: "Serving customers across Thailand. Applications are coordinated with the relevant Thai authorities.",
      th: "ให้บริการทั่วไทย ประสานงานยื่นกับหน่วยงานที่เกี่ยวข้อง",
    },
    relatedSlugs: ["translation-services", "visa-services"],
    faqs: [
      {
        question: {
          en: "What is a police clearance certificate in Thailand used for?",
          th: "หนังสือรับรองความประพฤติในไทยใช้ทำอะไร?",
        },
        answer: {
          en: "It is commonly required for visas, work applications, and immigration processes. SiamEZ helps you prepare the application, supporting documents, and any certified translations.",
          th: "มักใช้สำหรับวีซ่า สมัครงาน และตรวจคนเข้าเมือง SiamEZ ช่วยเตรียมคำขอ เอกสารประกอบ และคำแปลรับรองหากจำเป็น",
        },
      },
      {
        question: {
          en: "How long does Thai police clearance take?",
          th: "หนังสือรับรองความประพฤติใช้เวลานานแค่ไหน?",
        },
        answer: {
          en: "Typical processing is 3–7 business days after a complete application. We confirm the timeline when we review your passport and visa page.",
          th: "โดยทั่วไป 3–7 วันทำการหลังยื่นครบ เรายืนยันระยะเวลาเมื่อตรวจพาสปอร์ตและหน้าวีซ่า",
        },
      },
    ],
  },
  "marriage-registration": {
    slug: "marriage-registration",
    title: {
      en: "Marriage Registration Service in Thailand",
      th: "บริการจดทะเบียนสมรสในประเทศไทย",
    },
    description: {
      en: "Thai marriage registration for foreigners: document prep, Embassy affirmation, MFA legalization, and Amphur registration support with SiamEZ.",
      th: "จดทะเบียนสมรสในไทยสำหรับชาวต่างชาติ: เตรียมเอกสาร คำรับรองสถานทูต รับรอง MFA และอำเภอ กับ SiamEZ",
    },
    audience: {
      en: "Couples where one or both partners are foreign nationals who want a legally registered marriage in Thailand that can be recognized abroad.",
      th: "คู่รักที่ฝ่ายหนึ่งหรือทั้งสองเป็นชาวต่างชาติและต้องการจดทะเบียนสมรสในไทยให้ถูกต้องและใช้ต่างประเทศได้",
    },
    areaServed: {
      en: "Available across Thailand. Embassy, MFA, and district-office (Amphur) steps are coordinated from Bangkok with nationwide document support.",
      th: "ให้บริการทั่วไทย ประสานงานสถานทูต MFA และอำเภอจากกรุงเทพฯ พร้อมช่วยเอกสารทั่วประเทศ",
    },
    relatedSlugs: ["translation-services", "visa-services"],
    faqs: [
      {
        question: {
          en: "What is MFA legalization, and why do I need it for marriage registration?",
          th: "การรับรอง MFA คืออะไร และทำไมต้องใช้ตอนจดทะเบียนสมรส?",
        },
        answer: {
          en: "MFA legalization authenticates documents at the Thai Ministry of Foreign Affairs so they are accepted for official use. Your Embassy-issued Affirmation of Freedom to Marry must be legalized before Amphur registration.",
          th: "การรับรอง MFA คือการยืนยันเอกสารที่กระทรวงการต่างประเทศให้ใช้ราชการได้ คำรับรองสถานทูตว่ามีอิสระที่จะสมรสต้องได้รับการรับรองก่อนจดที่อำเภอ",
        },
      },
      {
        question: {
          en: "How long does marriage registration in Thailand take?",
          th: "จดทะเบียนสมรสในไทยใช้เวลานานแค่ไหน?",
        },
        answer: {
          en: "MFA legalization typically takes 2–5 business days. The full journey from documents to Amphur registration is often 2–4 weeks, depending on Embassy and MFA timing.",
          th: "รับรอง MFA โดยทั่วไป 2–5 วันทำการ กระบวนการทั้งหมดจากเอกสารถึงอำเภอมัก 2–4 สัปดาห์ ขึ้นกับสถานทูตและ MFA",
        },
      },
      {
        question: {
          en: "Do both partners need to be present at the Amphur?",
          th: "ทั้งสองฝ่ายต้องไปอำเภอด้วยกันหรือไม่?",
        },
        answer: {
          en: "Yes. Thai law requires both parties to appear in person. Two witnesses (typically Thai nationals with valid ID) must also attend. SiamEZ can help arrange witnesses and accompany you.",
          th: "ต้องไปทั้งสองฝ่ายตามกฎหมายไทย และต้องมีพยานสองคน (มักเป็นคนไทยที่มีบัตร) SiamEZ ช่วยจัดพยานและไปด้วยได้",
        },
      },
    ],
  },
  "basic-translation": {
    slug: "basic-translation",
    title: {
      en: "Fixed-Price Document Translation in Thailand",
      th: "แปลเอกสารราคาคงที่ในประเทศไทย",
    },
    description: {
      en: "Simple per-page document translation with fixed pricing. Book online with SiamEZ and pay when you submit your pages.",
      th: "แปลเอกสารต่อหน้าราคาคงที่ จองออนไลน์กับ SiamEZ และชำระเมื่อส่งหน้าเอกสาร",
    },
    audience: {
      en: "Customers who need straightforward page-by-page translation with a clear fixed price, rather than a custom certified legalization package.",
      th: "ลูกค้าที่ต้องการแปลทีละหน้าในราคาคงที่ชัดเจน ไม่ใช่แพ็กเกจรับรองเอกสารแบบกำหนดเอง",
    },
    areaServed: {
      en: "Nationwide via online booking. Upload clear scans or photos of each page.",
      th: "ทั่วประเทศผ่านการจองออนไลน์ อัปโหลดสแกนหรือรูปแต่ละหน้าให้ชัด",
    },
    relatedSlugs: ["translation-services", "police-clearance"],
    faqs: [
      {
        question: {
          en: "When should I book Basic Translation instead of certified translation?",
          th: "เมื่อไหร่ควรจองแปลพื้นฐานแทนแปลรับรอง?",
        },
        answer: {
          en: "Use Basic Translation for simple per-page work with a fixed price. If a government office, embassy, or MFA requires certified or legalized documents, book Translation Services instead.",
          th: "ใช้แปลพื้นฐานสำหรับงานต่อหน้าราคาคงที่ หากหน่วยงาน สถานทูต หรือ MFA ต้องการเอกสารรับรอง ให้จองบริการแปลเอกสารแทน",
        },
      },
      {
        question: {
          en: "How fast is basic translation?",
          th: "แปลพื้นฐานใช้เวลานานแค่ไหน?",
        },
        answer: {
          en: "Same-day turnaround is typical when you upload clear scans. Complex or poor-quality images may take longer.",
          th: "โดยทั่วไปเสร็จวันเดียวหากอัปโหลดสแกนชัด รูปไม่ชัดหรือเอกสารซับซ้อนอาจนานกว่า",
        },
      },
    ],
  },
  "construction-handyman": {
    slug: "construction-handyman",
    title: {
      en: "Construction & Handyman Services in Thailand",
      th: "บริการก่อสร้างและช่างซ่อมในประเทศไทย",
    },
    description: {
      en: "Home repairs, renovations, and construction support in Thailand. SiamEZ coordinates quotes and trusted local trades for houses and condos.",
      th: "ซ่อมแซม ปรับปรุง และก่อสร้างในไทย SiamEZ ประสานใบเสนอราคาและช่างที่ไว้ใจได้สำหรับบ้านและคอนโด",
    },
    audience: {
      en: "Homeowners, landlords, and businesses who need repairs, renovations, or construction help without managing contractors alone.",
      th: "เจ้าของบ้าน ผู้ให้เช่า และธุรกิจที่ต้องการซ่อม ปรับปรุง หรือก่อสร้างโดยไม่ต้องจัดการช่างเอง",
    },
    areaServed: {
      en: "Home-service work is coordinated primarily in Bangkok, with quotes available after you share photos and access details.",
      th: "งานถึงบ้านประสานหลักในกรุงเทพฯ ประเมินราคาได้เมื่อส่งรูปและรายละเอียดการเข้าถึง",
    },
    relatedSlugs: ["real-estate-services"],
    faqs: [
      {
        question: {
          en: "Does SiamEZ do construction and handyman work in Bangkok?",
          th: "SiamEZ รับงานก่อสร้างและช่างซ่อมในกรุงเทพหรือไม่?",
        },
        answer: {
          en: "Yes. We coordinate repairs, renovations, and construction for residential and commercial properties. Send photos and your preferred schedule when you book to receive a quote.",
          th: "รับ ประสานงานซ่อม ปรับปรุง และก่อสร้างสำหรับที่อยู่อาศัยและเชิงพาณิชย์ ส่งรูปและตารางเวลาที่ต้องการตอนจองเพื่อรับใบเสนอราคา",
        },
      },
    ],
  },
  "real-estate-services": {
    slug: "real-estate-services",
    title: {
      en: "Real Estate Services in Thailand",
      th: "บริการอสังหาริมทรัพย์ในประเทศไทย",
    },
    description: {
      en: "Buy, sell, rent, or invest in property in Thailand with SiamEZ. Local support for foreigners looking for condos, houses, and rentals.",
      th: "ซื้อ ขาย เช่า หรือลงทุนอสังหาในไทยกับ SiamEZ ช่วยชาวต่างชาติหาคอนโด บ้าน และเช่า",
    },
    audience: {
      en: "Expats and investors who want to buy, sell, rent, or invest in Thai property with a local team handling viewings, paperwork, and next steps.",
      th: "ชาวต่างชาติและนักลงทุนที่ต้องการซื้อ ขาย เช่า หรือลงทุนอสังหาไทย โดยมีทีมท้องถิ่นช่วยดูห้อง เอกสาร และขั้นตอนถัดไป",
    },
    areaServed: {
      en: "Serving customers across Thailand. Browse live listings and request a property consultation.",
      th: "ให้บริการทั่วไทย ดูรายการประกาศและขอคำปรึกษาอสังหาได้",
    },
    relatedSlugs: ["construction-handyman"],
    relatedPaths: [
      { href: "/real-estate", label: { en: "Browse property listings", th: "ดูประกาศอสังหาริมทรัพย์" } },
    ],
    faqs: [
      {
        question: {
          en: "Can foreigners buy property in Thailand with SiamEZ?",
          th: "ชาวต่างชาติซื้ออสังหาในไทยกับ SiamEZ ได้หรือไม่?",
        },
        answer: {
          en: "SiamEZ helps foreigners buy, sell, rent, or invest. Ownership rules depend on the property type (for example condo vs land). We review your goal, budget, and area, then outline a safe next step.",
          th: "SiamEZ ช่วยชาวต่างชาติซื้อ ขาย เช่า หรือลงทุน กฎการถือครองขึ้นกับประเภททรัพย์ (เช่น คอนโดกับที่ดิน) เราดูเป้าหมาย งบ และพื้นที่ แล้วสรุปขั้นตอนที่ปลอดภัย",
        },
      },
    ],
  },
  "car-motorbike-finder-selling-service": {
    slug: "car-motorbike-finder-selling-service",
    title: {
      en: "Car & Motorcycle Finder in Thailand",
      th: "บริการหารถยนต์และมอเตอร์ไซค์ในประเทศไทย",
    },
    description: {
      en: "Buy or sell a car or motorcycle in Thailand with SiamEZ. We help with search, negotiation, paperwork, and registration.",
      th: "ซื้อหรือขายรถยนต์และมอเตอร์ไซค์ในไทยกับ SiamEZ ช่วยค้นหา ต่อรอง เอกสาร และจดทะเบียน",
    },
    audience: {
      en: "Expats and residents who want to buy or sell a car or motorcycle in Thailand without handling dealers, paperwork, and DLT steps alone.",
      th: "ชาวต่างชาติและผู้พักอาศัยที่ต้องการซื้อหรือขายรถในไทยโดยไม่ต้องจัดการดีลเลอร์ เอกสาร และ DLT เอง",
    },
    areaServed: {
      en: "Nationwide vehicle search and selling support, with registration often completed in Bangkok.",
      th: "ค้นหาและขายรถทั่วประเทศ จดทะเบียนมักดำเนินการในกรุงเทพฯ",
    },
    relatedSlugs: ["vehicle-registration", "driver-license"],
    relatedPaths: [{ href: "/sales", label: { en: "Browse cars and motorcycles for sale", th: "ดูรถยนต์และมอเตอร์ไซค์ขาย" } }],
    faqs: [
      {
        question: {
          en: "Can SiamEZ help me buy a motorcycle or car in Thailand?",
          th: "SiamEZ ช่วยซื้อมอเตอร์ไซค์หรือรถยนต์ในไทยได้หรือไม่?",
        },
        answer: {
          en: "Yes. Tell us your budget and preferred make/model. We search, negotiate, and can continue into vehicle registration and a Thai driver's license if you need those next.",
          th: "ได้ บอกงบและยี่ห้อ/รุ่นที่ต้องการ เราค้นหา ต่อรอง และต่อด้วยจดทะเบียนหรือใบขับขี่ไทยได้หากต้องการ",
        },
      },
      {
        question: {
          en: "Do you also help sell a vehicle?",
          th: "ช่วยขายรถด้วยหรือไม่?",
        },
        answer: {
          en: "Yes. We support selling as well as buying, including paperwork and registration transfer when you are ready.",
          th: "ช่วยทั้งซื้อและขาย รวมเอกสารและโอนทะเบียนเมื่อพร้อม",
        },
      },
      {
        question: {
          en: "How much does the finder and selling service cost?",
          th: "บริการหารถและขายรถมีค่าใช้จ่ายเท่าไหร่?",
        },
        answer: {
          en: "Pricing is quote-based and depends on the vehicle, timeline, and whether you are buying, selling, or both. Vehicle purchase price, DLT fees, and optional extras are separate. Share your brief and we'll send a tailored quote.",
          th: "คิดค่าบริการตามเคส ขึ้นกับประเภทรถ ระยะเวลา และว่าต้องการซื้อ ขาย หรือทั้งสองอย่าง ราคารถ ค่า DLT และบริการเสริมแยกต่างหาก ส่งรายละเอียดมาแล้วเราจะเสนอราคาให้",
        },
      },
    ],
  },
  "transportation-services": {
    slug: "transportation-services",
    title: {
      en: "Airport Transfer & Transportation in Thailand",
      th: "บริการรับส่งสนามบินและการเดินทางในประเทศไทย",
    },
    description: {
      en: "Airport transfers, city trips, and inter-city transportation in Thailand with comfortable vehicles. Book with SiamEZ.",
      th: "รับส่งสนามบิน เดินทางในเมือง และระหว่างจังหวัดด้วยรถที่สะดวกสบาย จองกับ SiamEZ",
    },
    audience: {
      en: "Travelers and residents who need reliable airport pickup, city transport, or inter-city trips rather than arranging ad-hoc taxis.",
      th: "นักเดินทางและผู้พักอาศัยที่ต้องการรับส่งสนามบิน ในเมือง หรือระหว่างจังหวัดอย่างแน่นอน",
    },
    areaServed: {
      en: "Same-day booking is common for Bangkok routes. Inter-city trips can be arranged when you share pickup, drop-off, date, and passenger count.",
      th: "จองวันเดียวได้บ่อยสำหรับเส้นทางกรุงเทพฯ เดินทางต่างจังหวัดจัดให้ได้เมื่อแจ้งจุดรับ-ส่ง วันที่ และจำนวนผู้โดยสาร",
    },
    relatedSlugs: ["private-driver-service"],
    faqs: [
      {
        question: {
          en: "Can I book an airport transfer in Bangkok with SiamEZ?",
          th: "จองรับส่งสนามบินกรุงเทพกับ SiamEZ ได้หรือไม่?",
        },
        answer: {
          en: "Yes. Share your flight details, pickup/drop-off, date, and passenger count. Same-day booking is often available for Bangkok routes.",
          th: "ได้ แจ้งเที่ยวบิน จุดรับ-ส่ง วันที่ และจำนวนผู้โดยสาร การจองวันเดียวมีบ่อยสำหรับเส้นทางกรุงเทพฯ",
        },
      },
    ],
  },
  "private-driver-service": {
    slug: "private-driver-service",
    title: {
      en: "Private Driver Service in Thailand",
      th: "บริการคนขับส่วนตัวในประเทศไทย",
    },
    description: {
      en: "Hire a professional private driver in Thailand for daily use, business trips, or special occasions. Flexible packages with SiamEZ.",
      th: "จ้างคนขับส่วนตัวมืออาชีพในไทยสำหรับใช้ประจำ ธุรกิจ หรือโอกาสพิเศษ แพ็กเกจยืดหยุ่นกับ SiamEZ",
    },
    audience: {
      en: "Residents and visitors who want a dedicated driver for errands, business days, or events instead of driving themselves.",
      th: "ผู้พักอาศัยและผู้มาเยือนที่ต้องการคนขับประจำสำหรับธุระ วันทำงาน หรืออีเวนต์",
    },
    areaServed: {
      en: "Primarily Bangkok, with flexible hourly, daily, or monthly packages. Share your schedule and pickup address when you book.",
      th: "หลักในกรุงเทพฯ แพ็กเกจชั่วโมง รายวัน หรือรายเดือน แจ้งตารางและที่อยู่รับตอนจอง",
    },
    relatedSlugs: ["transportation-services", "driver-license"],
    faqs: [
      {
        question: {
          en: "What private driver packages does SiamEZ offer?",
          th: "SiamEZ มีแพ็กเกจคนขับส่วนตัวแบบใด?",
        },
        answer: {
          en: "Hourly, daily, and monthly options. After a short consultation we assign a driver familiar with your routes and preferred vehicle type.",
          th: "รายชั่วโมง รายวัน และรายเดือน หลังปรึกษาสั้นๆ เราจัดคนขับที่คุ้นเส้นทางและประเภทรถที่คุณต้องการ",
        },
      },
    ],
  },
  "event-planning-venue-services": {
    slug: "event-planning-venue-services",
    title: {
      en: "Event Planning & Venue Hire in Bangkok",
      th: "จัดงานและเช่าสถานที่ในกรุงเทพฯ",
    },
    description: {
      en: "Event planning and venue hire in Bangkok with SiamEZ and The Red Door Bkk — corporate events, private celebrations, and VIP bookings.",
      th: "จัดงานและเช่าสถานที่ในกรุงเทพกับ SiamEZ และ The Red Door Bkk — งานองค์กร งานส่วนตัว และจอง VIP",
    },
    audience: {
      en: "Companies and private hosts planning a Bangkok event who want venue hire and coordination in one place.",
      th: "บริษัทและเจ้าภาพที่วางแผนงานในกรุงเทพและต้องการเช่าสถานที่พร้อมประสานงานในที่เดียว",
    },
    areaServed: {
      en: "Bangkok, in partnership with The Red Door Bkk.",
      th: "กรุงเทพฯ ร่วมกับ The Red Door Bkk",
    },
    relatedSlugs: ["marriage-registration", "private-driver-service"],
    faqs: [
      {
        question: {
          en: "Where are SiamEZ event and venue services based?",
          th: "บริการจัดงานและสถานที่ของ SiamEZ อยู่ที่ไหน?",
        },
        answer: {
          en: "In Bangkok, in partnership with The Red Door Bkk. Share your event date, guest count, and style when you book.",
          th: "ในกรุงเทพฯ ร่วมกับ The Red Door Bkk แจ้งวันงาน จำนวนแขก และสไตล์ตอนจอง",
        },
      },
    ],
  },
};

export function getServiceSeo(slug: string, locale: string): {
  title: string;
  description: string;
  h1?: string;
  audience: string;
  areaServed: string;
  relatedSlugs: ServiceSlug[];
  relatedPaths: Array<{ href: string; label: string }>;
  faqs: Array<{ question: string; answer: string }>;
} | null {
  const entry = serviceSeoBySlug[slug as ServiceSlug];
  if (!entry) return null;
  return {
    title: pick(entry.title, locale),
    description: pick(entry.description, locale),
    h1: entry.h1 ? pick(entry.h1, locale) : undefined,
    audience: pick(entry.audience, locale),
    areaServed: pick(entry.areaServed, locale),
    relatedSlugs: entry.relatedSlugs,
    relatedPaths: (entry.relatedPaths ?? []).map((item) => ({
      href: item.href,
      label: pick(item.label, locale),
    })),
    faqs: entry.faqs.map((faq) => ({
      question: pick(faq.question, locale),
      answer: pick(faq.answer, locale),
    })),
  };
}

export function relatedServiceSlugs(slug: string): ServiceSlug[] {
  return serviceSeoBySlug[slug as ServiceSlug]?.relatedSlugs ?? [];
}

export function serviceSeoTitleFallback(slug: string): string {
  return serviceDisplayNames[slug as ServiceSlug] ?? slug;
}
