import { z } from "zod";

export const notificationPreferencesSchema = z.object({
  pushEnabled: z.boolean(),
  emailCaseUpdates: z.boolean(),
  emailInvoiceReminders: z.boolean(),
  emailDocumentAlerts: z.boolean(),
  emailMarketing: z.boolean(),
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
    passportInfo: "",
    address: "",
    bankName: "",
    bankAccountName: "",
    bankAccountNumber: "",
  };
}

export function parseNotificationPreferences(value: unknown): NotificationPreferences {
  const parsed = notificationPreferencesSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  return defaultNotificationPreferences();
}
