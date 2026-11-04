import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { BackofficeError } from "@/lib/backoffice/auth";
import { ensureBackofficeCatalogue } from "@/lib/backoffice/catalogue";
import { classifyBackofficeIntent, isWriteIntent, type BackofficeIntent } from "@/lib/backoffice/intent";
import { classifyWithModel } from "@/lib/backoffice/llm";
import { shouldBlockUntrustedWrite } from "@/lib/backoffice/permissions";
import { answerIntent } from "@/lib/backoffice/records";
import { sanitizeStaffInstruction } from "@/lib/backoffice/sanitize";
import { readContext, renderFact, type AssistantLink, type BackofficeActor, type PendingProposal } from "@/lib/backoffice/types";

const PENDING_MS = 30 * 60 * 1000;

export type TurnResult = {
  conversationId: string;
  reply: string;
  links: AssistantLink[];
  pending: { id: string; summary: string } | null;
  llm: boolean;
};

export async function runBackofficeTurn(input: {
  actor: BackofficeActor;
  message: string;
  conversationId?: string | null;
}): Promise<TurnResult> {
  const sanitized = sanitizeStaffInstruction(input.message);
  if (!sanitized.text) throw new BackofficeError("Type a request first.", 400);
  await ensureBackofficeCatalogue();

  const conversation = await loadConversation(input.actor, input.conversationId);
  await prisma.backofficeMessage.create({
    data: { conversationId: conversation.id, role: "user", content: sanitized.text },
  });

  let intent: BackofficeIntent = classifyBackofficeIntent(sanitized.text);
  let source: "staff" | "model" = "staff";
  let usedModel = false;
  if (intent.kind === "unknown") {
    const guessed = await classifyWithModel(sanitized.text);
    if (guessed && guessed.kind !== "unknown") {
      intent = guessed;
      source = "model";
      usedModel = true;
    }
  }

  const context = readContext(conversation.context);
  const blocked = isWriteIntent(intent) && shouldBlockUntrustedWrite(sanitized.flags, source);
  const answer = blocked
    ? {
        title: "I did not prepare that action.",
        lines: [
          "The message tried to override the assistant's safeguards, so I ignored the write request.",
          "Ask again in your own words if you still want a task, quotation, customer, or reminder.",
        ],
        links: [],
      }
    : await answerIntent(intent, context, input.actor.role);

  const pending = blocked ? null : await storePending(conversation.id, input.actor, answer.pending);
  const reply = renderFact(answer);
  await prisma.backofficeMessage.create({
    data: { conversationId: conversation.id, role: "assistant", content: reply },
  });
  await prisma.backofficeConversation.update({
    where: { id: conversation.id },
    data: {
      title: conversation.title ?? sanitized.text.slice(0, 80),
      context: { ...context, ...(answer.context ?? {}) } as Prisma.InputJsonValue,
    },
  });
  await prisma.backofficeAuditLog.create({
    data: {
      conversationId: conversation.id,
      staffId: input.actor.id,
      actorEmail: input.actor.email,
      actorRole: input.actor.role,
      action: blocked ? "blocked" : intent.kind,
      status: pending ? "pending" : "success",
      summary: reply.slice(0, 500),
    },
  });

  return {
    conversationId: conversation.id,
    reply,
    links: answer.links,
    pending: pending ? { id: pending.id, summary: pending.summary } : null,
    llm: usedModel,
  };
}

async function loadConversation(actor: BackofficeActor, conversationId?: string | null) {
  if (conversationId) {
    const existing = await prisma.backofficeConversation.findUnique({ where: { id: conversationId } });
    if (!existing) throw new BackofficeError("That conversation was not found.", 404);
    if (existing.staffId && actor.id && existing.staffId !== actor.id && actor.role !== "admin") {
      throw new BackofficeError("That conversation belongs to another staff member.", 403);
    }
    return existing;
  }
  return prisma.backofficeConversation.create({
    data: { staffId: actor.id },
  });
}

async function storePending(
  conversationId: string,
  actor: BackofficeActor,
  pending: PendingProposal | undefined
) {
  if (!pending) return null;
  return prisma.backofficePendingAction.create({
    data: {
      conversationId,
      staffId: actor.id,
      toolName: pending.toolName,
      summary: pending.summary,
      payload: pending.payload as Prisma.InputJsonValue,
      expiresAt: new Date(Date.now() + PENDING_MS),
    },
  });
}
