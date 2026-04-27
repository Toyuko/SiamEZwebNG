import { setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/sections/PageHero";

export async function generateMetadata() {
  return {
    title: "Terms of Service",
    description: "Terms of service for SiamEZ website and service requests.",
  };
}

export default async function TermsPage({
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
        title={isThai ? "ข้อกำหนดการให้บริการ" : "Terms of Service"}
        description={
          isThai
            ? "ข้อกำหนดทั่วไปสำหรับการใช้งานเว็บไซต์ SiamEZ และการส่งคำขอบริการ"
            : "General terms for using the SiamEZ website and submitting service requests."
        }
      />
      <section className="container mx-auto max-w-4xl space-y-6 px-4 py-12 text-sm leading-7 text-foreground sm:py-16">
        <p>
          {isThai
            ? "การใช้งานเว็บไซต์นี้ถือว่าคุณยอมรับข้อกำหนดเหล่านี้ หากคุณไม่เห็นด้วย โปรดหยุดใช้งานเว็บไซต์"
            : "By using this website, you agree to these terms. If you disagree, please stop using the website."}
        </p>
        <p>
          {isThai
            ? "ข้อมูลบนเว็บไซต์มีวัตถุประสงค์เพื่อให้ข้อมูลทั่วไปเท่านั้น บริการและราคาอาจมีการเปลี่ยนแปลงโดยไม่ต้องแจ้งล่วงหน้า"
            : "Content on this site is for general information. Services and pricing may change without prior notice."}
        </p>
        <p>
          {isThai
            ? "SiamEZ ให้บริการในฐานะบริษัทเอกชนอิสระ และไม่มีความเกี่ยวข้องหรือได้รับการรับรองจากหน่วยงานรัฐบาลไทย"
            : "SiamEZ operates as an independent private company and is not affiliated with or endorsed by Thai government agencies."}
        </p>
      </section>
    </>
  );
}
