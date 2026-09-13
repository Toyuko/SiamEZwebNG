/**
 * Generalized Client Follow-Up System — public exports.
 */
export * from "@/lib/follow-ups/dates";
export * from "@/lib/follow-ups/constants";
export {
  createFollowUp,
  updateFollowUp,
  completeFollowUp,
  cancelFollowUp,
  snoozeFollowUp,
  assignFollowUp,
  addFollowUpNote,
  sendFollowUpReminder,
  processDueFollowUpReminders,
  computeDueFromRelative,
} from "@/lib/follow-ups/service";
export {
  listFollowUps,
  getFollowUpById,
  getFollowUpStats,
  getFollowUpsForCalendar,
  getClientFollowUpGroups,
  syncOverdueStatuses,
} from "@/lib/follow-ups/queries";
export {
  createFollowUpTemplate,
  updateFollowUpTemplate,
  deleteFollowUpTemplate,
  applyFollowUpTemplate,
  autoApplyTemplatesForTrigger,
  previewTemplateDates,
} from "@/lib/follow-ups/templates";
