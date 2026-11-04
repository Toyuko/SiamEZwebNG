/** Fire-and-forget so creating a booking never fails because the workflow did. */
export function enqueueBookingWorkflow(caseId: string): void {
  void import("@/lib/backoffice/workflow")
    .then((mod) => mod.runBookingWorkflow(caseId))
    .catch((error: unknown) => {
      console.error("[backoffice] booking workflow", error);
    });
}
