import { setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/sections/PageHero";

export async function generateMetadata() {
  return {
    title: "Refund Policy",
    description: "Refund policy for SiamEZ professional services.",
  };
}

export default async function RefundPage({
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
        title={isThai ? "นโยบายการคืนเงิน" : "Refund Policy"}
        description={
          isThai
            ? "แนวทางการคืนเงินสำหรับบริการของ SiamEZ"
            : "Guidelines for refunds on SiamEZ services."
        }
      />
      <section className="container mx-auto max-w-4xl space-y-6 px-4 py-12 text-sm leading-7 text-foreground sm:py-16">
        <p>
          {isThai
            ? "ค่าบริการที่ได้เริ่มดำเนินการแล้วอาจไม่สามารถคืนเงินเต็มจำนวนได้ โดยจะพิจารณาตามขอบเขตงานที่ดำเนินการไปแล้ว"
            : "Fees for work already started may not be fully refundable and are reviewed based on completed scope."}
        </p>
        <p>
          {isThai
            ? "หากเกิดการยกเลิกจากฝั่งลูกค้า กรุณาแจ้งทีมงานโดยเร็วที่สุดเพื่อประเมินยอดที่สามารถคืนได้"
            : "For client-initiated cancellations, please contact our team as early as possible to assess refundable amounts."}
        </p>
        <p>
          {isThai
            ? "ค่าธรรมเนียมหน่วยงานรัฐและค่าบุคคลที่สามที่ชำระแล้วโดยทั่วไปไม่สามารถคืนได้"
            : "Government fees and third-party costs already paid are generally non-refundable."}
        </p>
      </section>
    </>
  );
}
