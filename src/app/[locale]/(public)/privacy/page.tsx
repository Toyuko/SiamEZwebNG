import { setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/sections/PageHero";

export async function generateMetadata() {
  return {
    title: "Privacy Policy",
    description: "Privacy policy for SiamEZ website and contact submissions.",
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const isThai = locale === "th";

  return (
    <>
      <PageHero
        title={isThai ? "นโยบายความเป็นส่วนตัว" : "Privacy Policy"}
        description={
          isThai
            ? "วิธีการที่ SiamEZ เก็บ ใช้งาน และปกป้องข้อมูลส่วนบุคคลของคุณ"
            : "How SiamEZ collects, uses, and protects your personal information."
        }
      />
      <section className="container mx-auto max-w-4xl space-y-6 px-4 py-12 text-sm leading-7 text-foreground sm:py-16">
        <p>
          {isThai
            ? "เราเก็บข้อมูลที่คุณกรอกผ่านแบบฟอร์มเพื่อใช้ตอบกลับและให้บริการตามคำขอของคุณเท่านั้น"
            : "We collect information submitted through forms to respond to your inquiry and provide requested services."}
        </p>
        <p>
          {isThai
            ? "เราไม่จำหน่ายข้อมูลส่วนบุคคลของคุณให้บุคคลที่สาม และจำกัดการเข้าถึงเฉพาะทีมที่จำเป็นต้องใช้งาน"
            : "We do not sell your personal data. Access is limited to team members who need it to provide service."}
        </p>
        <p>
          {isThai
            ? "หากคุณต้องการแก้ไขหรือลบข้อมูล โปรดติดต่อเราทางอีเมลที่ระบุในหน้า Contact"
            : "If you need data correction or deletion, please contact us using the email listed on the Contact page."}
        </p>
      </section>
    </>
  );
}
