import {
  sendJobCompletedEmail,
} from "@/lib/email/messages";

/** Fire-and-forget client notification when a freelancer marks a job complete. */
export async function notifyClientJobCompleted(input: {
  jobId: string;
  jobTitle: string;
  clientEmail: string;
  clientName: string | null;
  freelancerName: string | null;
}): Promise<void> {
  sendJobCompletedEmail(input);
}
