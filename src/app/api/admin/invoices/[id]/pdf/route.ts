import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { intakeInvoiceTokenMatches } from "@/lib/jobs/invoice-access";
import { renderInvoicePdf } from "@/lib/invoices/render-pdf";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const token = new URL(request.url).searchParams.get("token");
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  const linkAccess = Boolean(token && secret && intakeInvoiceTokenMatches(id, token, secret));
  if (!linkAccess) {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as { role?: string }).role;
    if (role === "customer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
  const rendered = await renderInvoicePdf(id);
  if (!rendered || (linkAccess && !rendered.intake)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(rendered.content), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${rendered.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
