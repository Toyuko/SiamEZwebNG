import { setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/sections/PageHero";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { site } from "@/config/site";
import { getAccountDeletionProcessingDays } from "@/config/account-deletion";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return buildPageMetadata({
    locale,
    path: "/privacy",
    title: "Privacy Policy",
    description:
      "How SiamEZ collects, uses, shares, and protects personal information on our website and mobile apps.",
  });
}

type Section = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

function PrivacySections({ sections }: { sections: Section[] }) {
  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section key={section.heading} className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 48)}>{paragraph}</p>
          ))}
          {section.bullets && section.bullets.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5">
              {section.bullets.map((item) => (
                <li key={item.slice(0, 48)}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isThai = locale === "th";
  const deletionDays = getAccountDeletionProcessingDays();
  const lastUpdated = isThai ? "15 กันยายน 2026" : "September 15, 2026";

  const sectionsEn: Section[] = [
    {
      heading: "1. Who we are",
      paragraphs: [
        `This Privacy Policy explains how ${site.legal.companyName} (“SiamEZ”, “we”, “us”) collects, uses, shares, and protects personal information when you use our website, customer portal, and mobile applications (together, the “Services”).`,
        `Our registered office is at ${site.address.full}. Contact: ${site.email} · ${site.phone}.`,
      ],
    },
    {
      heading: "2. Information we collect",
      paragraphs: [
        "Depending on how you use the Services, we may collect:",
      ],
      bullets: [
        "Account and identity details: name, email address, phone number, password or authentication credentials, nationality, and profile information you provide.",
        "Service and booking details: requested services, case notes, appointment preferences, documents you upload (for example passport scans or forms), vehicle or property enquiry details, and related communications.",
        "Payment information: billing details and payment status. Card payments are processed by our payment provider (for example Stripe); we do not store full card numbers on our servers.",
        "Device and usage data: IP address, browser or app type, device identifiers, operating system, language, approximate location derived from IP, pages or screens viewed, and diagnostic logs.",
        "Mobile app data: push notification tokens, app version, and crash or performance diagnostics needed to deliver and improve the app.",
        "Location data: only when you (or an assigned provider) enable location features for a job or delivery update, and only for that purpose.",
        "Communications: messages you send via contact forms, chat, email, LINE, phone, or in-app support.",
      ],
    },
    {
      heading: "3. How we use information",
      paragraphs: ["We use personal information to:"],
      bullets: [
        "Provide, manage, and improve our professional services and marketplace features.",
        "Create and administer accounts, authenticate users, and secure the Services.",
        "Process bookings, quotes, invoices, and payments.",
        "Communicate about your cases, appointments, account, and support requests.",
        "Send service-related notifications (including optional push notifications on mobile).",
        "Detect, prevent, and investigate fraud, abuse, or security incidents.",
        "Comply with legal, tax, accounting, and regulatory obligations.",
        "Analyze aggregated usage to improve reliability and user experience.",
      ],
    },
    {
      heading: "4. Legal bases",
      paragraphs: [
        "Where applicable law requires a legal basis, we process personal data to perform a contract with you, to pursue legitimate interests in operating and securing the Services, to comply with legal obligations, and—where required—based on your consent (for example certain marketing or optional device permissions).",
      ],
    },
    {
      heading: "5. How we share information",
      paragraphs: [
        "We do not sell your personal information. We may share information with:",
      ],
      bullets: [
        "Staff, freelancers, and partner companies who need it to deliver a service you requested.",
        "Service providers that help us operate the platform (hosting, databases, email delivery, file storage, payments, analytics, realtime messaging, and push notifications).",
        "Government or regulatory bodies when required by law or to complete official procedures you asked us to handle.",
        "Professional advisers (legal, accounting) under confidentiality obligations when reasonably necessary.",
      ],
    },
    {
      heading: "6. Cookies and similar technologies",
      paragraphs: [
        "Our website and apps may use cookies, local storage, and similar technologies for authentication, preferences, security, and basic analytics. You can control cookies through your browser settings; disabling some cookies may limit certain features.",
      ],
    },
    {
      heading: "7. Mobile permissions",
      paragraphs: [
        "Our mobile apps may request permissions such as notifications, camera or photo library (for uploading documents or images), and location (only for features that need it, such as live job updates). You can revoke permissions in your device settings. Denying a permission may limit the related feature but will not block unrelated parts of the app.",
      ],
    },
    {
      heading: "8. Data retention",
      paragraphs: [
        "We keep personal information only as long as needed for the purposes described above, including to provide services, resolve disputes, enforce agreements, and meet legal retention requirements. When information is no longer needed, we delete or anonymize it where practicable.",
      ],
    },
    {
      heading: "9. Your rights and account deletion",
      paragraphs: [
        "Subject to applicable law, you may request access, correction, or deletion of your personal information, or object to certain processing.",
        `To delete your SiamEZ account and associated personal data, use our account deletion page. Requests are normally processed within ${deletionDays} days. Some records may be retained where required by law or for legitimate legal, accounting, security, fraud-prevention, or dispute-resolution purposes.`,
      ],
    },
    {
      heading: "10. Security",
      paragraphs: [
        "We use administrative, technical, and organizational measures designed to protect personal information. No method of transmission or storage is completely secure; please use a strong unique password and contact us promptly if you suspect unauthorized access.",
      ],
    },
    {
      heading: "11. International transfers",
      paragraphs: [
        "SiamEZ is based in Thailand. Your information may be processed in Thailand and in other countries where our service providers operate. Where required, we take steps intended to protect information transferred internationally.",
      ],
    },
    {
      heading: "12. Children’s privacy",
      paragraphs: [
        "The Services are intended for adults. We do not knowingly collect personal information from children under 13 (or the minimum age required in your jurisdiction). If you believe a child has provided us personal information, contact us and we will take appropriate steps to delete it.",
      ],
    },
    {
      heading: "13. Changes to this policy",
      paragraphs: [
        "We may update this Privacy Policy from time to time. The “Last updated” date at the top will change when we do. Continued use of the Services after an update means you acknowledge the revised policy.",
      ],
    },
    {
      heading: "14. Contact us",
      paragraphs: [
        `Questions about this Privacy Policy or your personal data: ${site.email}`,
        `Postal: ${site.legal.companyName}, ${site.address.full}`,
      ],
    },
  ];

  const sectionsTh: Section[] = [
    {
      heading: "1. เราคือใคร",
      paragraphs: [
        `นโยบายความเป็นส่วนตัวนี้อธิบายว่า ${site.legal.companyName} (“SiamEZ”, “เรา”) เก็บ ใช้ เปิดเผย และปกป้องข้อมูลส่วนบุคคลอย่างไร เมื่อคุณใช้เว็บไซต์ พอร์ทัลลูกค้า และแอปมือถือของเรา (รวมเรียกว่า “บริการ”)`,
        `สำนักงานจดทะเบียน: ${site.address.full} ติดต่อ: ${site.email} · ${site.phone}`,
      ],
    },
    {
      heading: "2. ข้อมูลที่เราเก็บรวบรวม",
      paragraphs: ["ขึ้นอยู่กับการใช้งานบริการของคุณ เราอาจเก็บข้อมูลดังต่อไปนี้:"],
      bullets: [
        "ข้อมูลบัญชีและตัวตน: ชื่อ อีเมล เบอร์โทร รหัสผ่านหรือข้อมูลยืนยันตัวตน สัญชาติ และข้อมูลโปรไฟล์ที่คุณให้",
        "รายละเอียดบริการและการจอง: บริการที่ขอ บันทึกเคส ความต้องการนัดหมาย เอกสารที่อัปโหลด (เช่น สแกนพาสปอร์ต) รายละเอียดสอบถามรถหรืออสังหาริมทรัพย์ และการสื่อสารที่เกี่ยวข้อง",
        "ข้อมูลการชำระเงิน: รายละเอียดการเรียกเก็บเงินและสถานะการชำระเงิน การชำระด้วยบัตรดำเนินการผ่านผู้ให้บริการชำระเงิน (เช่น Stripe) เราไม่เก็บเลขบัตรเต็มบนเซิร์ฟเวอร์ของเรา",
        "ข้อมูลอุปกรณ์และการใช้งาน: ที่อยู่ IP ประเภทเบราว์เซอร์หรือแอป ตัวระบุอุปกรณ์ ระบบปฏิบัติการ ภาษา ตำแหน่งโดยประมาณจาก IP หน้าที่เข้าชม และบันทึกวินิจฉัย",
        "ข้อมูลแอปมือถือ: โทเคนแจ้งเตือนแบบพุช เวอร์ชันแอป และข้อมูลวินิจฉัยเพื่อส่งมอบและปรับปรุงแอป",
        "ข้อมูลตำแหน่ง: เฉพาะเมื่อคุณ (หรือผู้ให้บริการที่ได้รับมอบหมาย) เปิดใช้ฟีเจอร์ตำแหน่งสำหรับงานหรืออัปเดตการส่งมอบ และใช้เพื่อวัตถุประสงค์นั้นเท่านั้น",
        "การสื่อสาร: ข้อความที่คุณส่งผ่านแบบฟอร์มติดต่อ แชท อีเมล LINE โทรศัพท์ หรือการสนับสนุนในแอป",
      ],
    },
    {
      heading: "3. วิธีที่เราใช้ข้อมูล",
      paragraphs: ["เราใช้ข้อมูลส่วนบุคคลเพื่อ:"],
      bullets: [
        "ให้บริการ จัดการ และปรับปรุงบริการมืออาชีพและฟีเจอร์มาร์เก็ตเพลส",
        "สร้างและดูแลบัญชี ยืนยันตัวตนผู้ใช้ และรักษาความปลอดภัยของบริการ",
        "ดำเนินการจอง ใบเสนอราคา ใบแจ้งหนี้ และการชำระเงิน",
        "สื่อสารเกี่ยวกับเคส นัดหมาย บัญชี และคำขอสนับสนุนของคุณ",
        "ส่งการแจ้งเตือนที่เกี่ยวข้องกับบริการ (รวมถึงพุชแจ้งเตือนบนมือถือหากเปิดใช้)",
        "ตรวจจับ ป้องกัน และสอบสวนการฉ้อโกง การใช้ในทางที่ผิด หรือเหตุการณ์ด้านความปลอดภัย",
        "ปฏิบัติตามภาระทางกฎหมาย ภาษี การบัญชี และข้อบังคับ",
        "วิเคราะห์การใช้งานแบบรวมเพื่อปรับปรุงความเสถียรและประสบการณ์ผู้ใช้",
      ],
    },
    {
      heading: "4. ฐานทางกฎหมาย",
      paragraphs: [
        "ในกรณีที่กฎหมายกำหนดให้มีฐานทางกฎหมาย เราประมวลผลข้อมูลส่วนบุคคลเพื่อปฏิบัติตามสัญญา ใช้ประโยชน์อันชอบธรรมในการดำเนินและรักษาความปลอดภัยของบริการ ปฏิบัติตามภาระทางกฎหมาย และ—เมื่อจำเป็น—ตามความยินยอมของคุณ (เช่น การตลาดบางประเภทหรือสิทธิ์อุปกรณ์ที่เป็นทางเลือก)",
      ],
    },
    {
      heading: "5. การเปิดเผยข้อมูล",
      paragraphs: [
        "เราไม่ขายข้อมูลส่วนบุคคลของคุณ เราอาจเปิดเผยข้อมูลแก่:",
      ],
      bullets: [
        "พนักงาน ฟรีแลนซ์ และพันธมิตรที่จำเป็นต้องใช้ข้อมูลเพื่อให้บริการตามที่คุณขอ",
        "ผู้ให้บริการที่ช่วยดำเนินงานแพลตฟอร์ม (โฮสติ้ง ฐานข้อมูล อีเมล พื้นที่เก็บไฟล์ การชำระเงิน การวิเคราะห์ การส่งข้อความแบบเรียลไทม์ และการแจ้งเตือนแบบพุช)",
        "หน่วยงานราชการเมื่อกฎหมายกำหนด หรือเพื่อดำเนินกระบวนการราชการที่คุณขอให้เราช่วย",
        "ที่ปรึกษามืออาชีพ (กฎหมาย การบัญชี) ภายใต้ภาระรักษาความลับเมื่อจำเป็นอย่างสมเหตุสมผล",
      ],
    },
    {
      heading: "6. คุกกี้และเทคโนโลยีที่คล้ายกัน",
      paragraphs: [
        "เว็บไซต์และแอปของเราอาจใช้คุกกี้ ที่เก็บในเครื่อง และเทคโนโลยีที่คล้ายกันเพื่อการยืนยันตัวตน การตั้งค่า ความปลอดภัย และการวิเคราะห์พื้นฐาน คุณสามารถควบคุมคุกกี้ผ่านการตั้งค่าเบราว์เซอร์ การปิดบางคุกกี้อาจจำกัดบางฟีเจอร์",
      ],
    },
    {
      heading: "7. สิทธิ์บนมือถือ",
      paragraphs: [
        "แอปมือถือของเราอาจขอสิทธิ์ เช่น การแจ้งเตือน กล้องหรือคลังรูปภาพ (สำหรับอัปโหลดเอกสารหรือรูป) และตำแหน่ง (เฉพาะฟีเจอร์ที่จำเป็น เช่น อัปเดตงานแบบสด) คุณสามารถเพิกถอนสิทธิ์ได้ในการตั้งค่าอุปกรณ์ การปฏิเสธสิทธิ์อาจจำกัดฟีเจอร์ที่เกี่ยวข้อง แต่จะไม่บล็อกส่วนอื่นที่ไม่เกี่ยวข้อง",
      ],
    },
    {
      heading: "8. การเก็บรักษาข้อมูล",
      paragraphs: [
        "เราเก็บข้อมูลส่วนบุคคลเท่าที่จำเป็นสำหรับวัตถุประสงค์ที่กล่าวข้างต้น รวมถึงการให้บริการ การระงับข้อพิพาท การบังคับใช้ข้อตกลง และการปฏิบัติตามข้อกำหนดการเก็บรักษาตามกฎหมาย เมื่อไม่จำเป็นแล้ว เราจะลบหรือทำให้เป็นนิรนามตามที่ทำได้",
      ],
    },
    {
      heading: "9. สิทธิ์ของคุณและการลบบัญชี",
      paragraphs: [
        "ภายใต้กฎหมายที่ใช้บังคับ คุณอาจขอเข้าถึง แก้ไข หรือลบข้อมูลส่วนบุคคล หรือคัดค้านการประมวลผลบางประเภท",
        `หากต้องการลบบัญชี SiamEZ และข้อมูลส่วนบุคคลที่เกี่ยวข้อง ให้ใช้หน้าลบบัญชีของเรา โดยปกติจะดำเนินการภายใน ${deletionDays} วัน บันทึกบางรายการอาจถูกเก็บไว้ตามที่กฎหมายกำหนด หรือเพื่อวัตถุประสงค์ทางกฎหมาย การบัญชี ความปลอดภัย การป้องกันการฉ้อโกง หรือการระงับข้อพิพาท`,
      ],
    },
    {
      heading: "10. ความปลอดภัย",
      paragraphs: [
        "เราใช้มาตรการด้านการบริหาร เทคนิค และองค์กรที่ออกแบบมาเพื่อปกป้องข้อมูลส่วนบุคคล ไม่มีวิธีการส่งหรือเก็บข้อมูลใดที่ปลอดภัยสมบูรณ์ โปรดใช้รหัสผ่านที่แข็งแรงและไม่ซ้ำ และติดต่อเราทันทีหากสงสัยว่ามีการเข้าถึงโดยไม่ได้รับอนุญาต",
      ],
    },
    {
      heading: "11. การโอนข้อมูลระหว่างประเทศ",
      paragraphs: [
        "SiamEZ มีฐานอยู่ในประเทศไทย ข้อมูลของคุณอาจถูกประมวลผลในประเทศไทยและประเทศอื่นที่ผู้ให้บริการของเราดำเนินงาน ในกรณีที่กฎหมายกำหนด เราจะดำเนินขั้นตอนที่เหมาะสมเพื่อปกป้องข้อมูลที่โอนระหว่างประเทศ",
      ],
    },
    {
      heading: "12. ความเป็นส่วนตัวของเด็ก",
      paragraphs: [
        "บริการนี้มีไว้สำหรับผู้ใหญ่ เราไม่เจตนาเก็บข้อมูลส่วนบุคคลจากเด็กอายุต่ำกว่า 13 ปี (หรืออายุขั้นต่ำตามกฎหมายในเขตอำนาจของคุณ) หากคุณเชื่อว่าเด็กได้ให้ข้อมูลส่วนบุคคลแก่เรา โปรดติดต่อเรา เราจะดำเนินการลบตามความเหมาะสม",
      ],
    },
    {
      heading: "13. การเปลี่ยนแปลงนโยบาย",
      paragraphs: [
        "เราอาจปรับปรุงนโยบายความเป็นส่วนตัวนี้เป็นครั้งคราว วันที่ “อัปเดตล่าสุด” ด้านบนจะเปลี่ยนเมื่อมีการอัปเดต การใช้งานบริการต่อไปหลังการอัปเดตถือว่าคุณรับทราบนโยบายฉบับปรับปรุง",
      ],
    },
    {
      heading: "14. ติดต่อเรา",
      paragraphs: [
        `คำถามเกี่ยวกับนโยบายความเป็นส่วนตัวหรือข้อมูลส่วนบุคคลของคุณ: ${site.email}`,
        `ไปรษณีย์: ${site.legal.companyName}, ${site.address.full}`,
      ],
    },
  ];

  return (
    <>
      <PageHero
        title={isThai ? "นโยบายความเป็นส่วนตัว" : "Privacy Policy"}
        description={
          isThai
            ? "วิธีการที่ SiamEZ เก็บ ใช้งาน และปกป้องข้อมูลส่วนบุคคลของคุณบนเว็บไซต์และแอปมือถือ"
            : "How SiamEZ collects, uses, and protects your personal information on our website and mobile apps."
        }
      />
      <section className="container mx-auto max-w-4xl space-y-6 px-4 py-12 text-sm leading-7 text-foreground sm:py-16">
        <p className="text-muted-foreground">
          {isThai ? `อัปเดตล่าสุด: ${lastUpdated}` : `Last updated: ${lastUpdated}`}
        </p>

        <PrivacySections sections={isThai ? sectionsTh : sectionsEn} />

        <p>
          <a
            href={`/${locale}/delete-account`}
            className="font-medium text-siam-blue hover:underline"
          >
            {isThai ? "ลบบัญชี SiamEZ" : "Delete your SiamEZ account"}
          </a>
          {" · "}
          <a
            href={`/${locale}/contact`}
            className="font-medium text-siam-blue hover:underline"
          >
            {isThai ? "ติดต่อเรา" : "Contact us"}
          </a>
        </p>
      </section>
    </>
  );
}
