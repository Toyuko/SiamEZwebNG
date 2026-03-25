import { notFound } from "next/navigation";
import { getInvoiceById } from "@/actions/admin";
import { InvoiceDetailClient } from "./InvoiceDetailClient";

export default async function AdminInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInvoiceById(id);
  if (!invoice) {
    notFound();
  }
  return <InvoiceDetailClient invoice={invoice} />;
}
