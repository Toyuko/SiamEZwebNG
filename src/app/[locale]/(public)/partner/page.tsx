import { setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/sections/PageHero";
import { site } from "@/config/site";

export async function generateMetadata() {
  return {
    title: "Partner Program",
    description: "Partner with SiamEZ for client referrals and collaborations.",
  };
}

export default async function PartnerPage({
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
        title={isThai ? "โปรแกรมพันธมิตร" : "Partner Program"}
        description={
          isThai
            ? "ร่วมงานกับ SiamEZ สำหรับการแนะนำลูกค้าและความร่วมมือทางธุรกิจ"
            : "Collaborate with SiamEZ on referrals and service partnerships."
        }
      />
      <section className="container mx-auto max-w-4xl space-y-6 px-4 py-12 text-sm leading-7 text-foreground sm:py-16">
        <p>
          {isThai
            ? "เรายินดีร่วมงานกับบริษัทและที่ปรึกษาที่ต้องการส่งต่อบริการให้ลูกค้าในประเทศไทย"
            : "We welcome collaboration with businesses and advisors who refer clients needing support in Thailand."}
        </p>
        <p>
          {isThai
            ? "ทีมงานสามารถจัดแพ็กเกจร่วม แผนค่าตอบแทน และขั้นตอนการทำงานที่ชัดเจนตามลักษณะความร่วมมือ"
            : "Our team can define collaboration scope, referral terms, and service workflows for your use case."}
        </p>
        <p>
          {isThai
            ? `ติดต่อเราเพื่อคุยรายละเอียดได้ที่ ${site.email}`
            : `Contact us at ${site.email} to discuss partnership details.`}
        </p>
      </section>
    </>
  );
}
