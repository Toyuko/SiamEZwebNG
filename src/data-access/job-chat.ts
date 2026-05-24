import { prisma } from "@/lib/db";

export type JobChatParticipant = {
  jobId: string;
  jobTitle: string;
  clientId: string;
  freelancerId: string;
  clientName: string | null;
  freelancerName: string | null;
};

export type SerializedMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  attachmentUrl: string | null;
  isRead: boolean;
  createdAt: string;
};

export async function getJobChatParticipant(
  jobId: string,
  userId: string
): Promise<JobChatParticipant | null> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      title: true,
      postedById: true,
      freelancerId: true,
      postedBy: { select: { id: true, name: true } },
      freelancer: { select: { id: true, name: true } },
    },
  });

  if (!job?.freelancerId || !job.freelancer) {
    return null;
  }

  const isClient = job.postedById === userId;
  const isFreelancer = job.freelancerId === userId;
  if (!isClient && !isFreelancer) {
    return null;
  }

  return {
    jobId: job.id,
    jobTitle: job.title,
    clientId: job.postedById,
    freelancerId: job.freelancerId,
    clientName: job.postedBy.name,
    freelancerName: job.freelancer.name,
  };
}

async function getOrCreateConversation(jobId: string) {
  return prisma.conversation.upsert({
    where: { jobId },
    create: { jobId },
    update: {},
    select: { id: true },
  });
}

function serializeMessage(message: {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  attachmentUrl: string | null;
  isRead: boolean;
  createdAt: Date;
}): SerializedMessage {
  return {
    id: message.id,
    senderId: message.senderId,
    receiverId: message.receiverId,
    content: message.content,
    attachmentUrl: message.attachmentUrl,
    isRead: message.isRead,
    createdAt: message.createdAt.toISOString(),
  };
}

export async function getJobMessages(
  jobId: string,
  userId: string
): Promise<{ messages: SerializedMessage[]; participant: JobChatParticipant } | null> {
  const participant = await getJobChatParticipant(jobId, userId);
  if (!participant) return null;

  const conversation = await prisma.conversation.findUnique({
    where: { jobId },
    select: { id: true },
  });

  if (!conversation) {
    return { messages: [], participant };
  }

  await prisma.message.updateMany({
    where: {
      conversationId: conversation.id,
      receiverId: userId,
      isRead: false,
    },
    data: { isRead: true },
  });

  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
  });

  return {
    messages: messages.map(serializeMessage),
    participant,
  };
}

export async function createJobMessage(input: {
  jobId: string;
  senderId: string;
  content: string;
  attachmentUrl?: string | null;
}): Promise<{ message: SerializedMessage; participant: JobChatParticipant } | null> {
  const participant = await getJobChatParticipant(input.jobId, input.senderId);
  if (!participant) return null;

  const receiverId =
    input.senderId === participant.clientId
      ? participant.freelancerId
      : participant.clientId;

  const trimmedContent = input.content.trim();
  if (!trimmedContent && !input.attachmentUrl) {
    throw new Error("Message content or attachment is required");
  }

  const conversation = await getOrCreateConversation(input.jobId);

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: input.senderId,
      receiverId,
      content: trimmedContent || "(attachment)",
      attachmentUrl: input.attachmentUrl ?? null,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  return {
    message: serializeMessage(message),
    participant,
  };
}
