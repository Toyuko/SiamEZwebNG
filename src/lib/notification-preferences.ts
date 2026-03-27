import { z } from "zod";

export const notificationPreferencesSchema = z.object({
  emailCaseUpdates: z.boolean(),
  emailInvoiceReminders: z.boolean(),
  emailDocumentAlerts: z.boolean(),
  emailMarketing: z.boolean(),
});

export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export function defaultNotificationPreferences(): NotificationPreferences {
  return {
    emailCaseUpdates: true,
    emailInvoiceReminders: true,
    emailDocumentAlerts: true,
    emailMarketing: false,
  };
}

export function parseNotificationPreferences(value: unknown): NotificationPreferences {
  const parsed = notificationPreferencesSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  return defaultNotificationPreferences();
}
