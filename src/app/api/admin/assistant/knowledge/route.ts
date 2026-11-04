import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ok } from "@/lib/api-response";
import { BackofficeError, backofficeErrorResponse, requireBackofficeActor } from "@/lib/backoffice/auth";
import { canDeleteKnowledge, canEditKnowledge } from "@/lib/backoffice/permissions";
import { toSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

const categories = ["service", "policy", "faq", "procedure", "document", "template", "vehicle", "pricing", "staff"] as const;

const articleSchema = z.object({
  title: z.string().min(3).max(160),
  body: z.string().min(3).max(20000),
  category: z.enum(categories),
  active: z.boolean().optional(),
});

export async function GET() {
  try {
    await requireBackofficeActor();
    const articles = await prisma.backofficeKnowledgeArticle.findMany({
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      take: 100,
    });
    return ok({ articles });
  } catch (error) {
    return backofficeErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireBackofficeActor();
    if (!canEditKnowledge(actor.role)) throw new BackofficeError("You cannot edit the knowledge base.", 403);
    const parsed = articleSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return backofficeErrorResponse(parsed.error);
    const base = toSlug(parsed.data.title) || "article";
    const slug = `${base}-${Date.now().toString(36)}`;
    const article = await prisma.backofficeKnowledgeArticle.create({
      data: {
        slug,
        title: parsed.data.title,
        body: parsed.data.body,
        category: parsed.data.category,
        active: parsed.data.active ?? true,
        updatedById: actor.id,
      },
    });
    return ok({ article });
  } catch (error) {
    return backofficeErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireBackofficeActor();
    if (!canEditKnowledge(actor.role)) throw new BackofficeError("You cannot edit the knowledge base.", 403);
    const parsed = articleSchema.extend({ id: z.string().min(1) }).safeParse(await request.json().catch(() => null));
    if (!parsed.success) return backofficeErrorResponse(parsed.error);
    const article = await prisma.backofficeKnowledgeArticle.update({
      where: { id: parsed.data.id },
      data: {
        title: parsed.data.title,
        body: parsed.data.body,
        category: parsed.data.category,
        active: parsed.data.active ?? true,
        updatedById: actor.id,
      },
    });
    return ok({ article });
  } catch (error) {
    return backofficeErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const actor = await requireBackofficeActor();
    if (!canDeleteKnowledge(actor.role)) throw new BackofficeError("Only an administrator can delete knowledge.", 403);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) throw new BackofficeError("Missing article id.", 400);
    await prisma.backofficeKnowledgeArticle.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (error) {
    return backofficeErrorResponse(error);
  }
}
