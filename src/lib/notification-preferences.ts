import { z } from "zod";

export const notificationPreferencesSchema = z.object({
  pushEnabled: z.boolean(),
  emailCaseUpdates: z.boolean(),
  emailInvoiceReminders: z.boolean(),
  emailDocumentAlerts: z.boolean(),
  emailMarketing: z.boolean(),
  /** Generalized follow-up reminder emails (default on). */
  emailFollowUpReminders: z.boolean().default(true),
  /** Driver's license renewal follow-up emails (default on). */
  emailRenewalReminders: z.boolean().default(true),
  passportInfo: z.string(),
  address: z.string(),
  bankName: z.string(),
  bankAccountName: z.string(),
  bankAccountNumber: z.string(),
});

export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export function defaultNotificationPreferences(): NotificationPreferences {
  return {
    pushEnabled: true,
    emailCaseUpdates: true,
    emailInvoiceReminders: true,
    emailDocumentAlerts: true,
    emailMarketing: false,
    emailFollowUpReminders: true,
    emailRenewalReminders: true,
    passportInfo: "",
    address: "",
    bankName: "",
    bankAccountName: "",
    bankAccountNumber: "",
  };
}

export function parseNotificationPreferences(value: unknown): NotificationPreferences {
  const defaults = defaultNotificationPreferences();
  if (!value || typeof value !== "object") return defaults;
  const parsed = notificationPreferencesSchema.safeParse({ ...defaults, ...(value as object) });
  if (parsed.success) return parsed.data;
  return defaults;
}
