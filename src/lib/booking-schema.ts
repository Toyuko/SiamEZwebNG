import { z } from "zod";

/** Client details form validation */
export const clientDetailsSchema = z.object({
  name: z.string().min(1, "Full name is required").max(200, "Name is too long"),
  email: z.string().min(1, "Email is required").email("Please enter a valid email"),
  phone: z.string().max(30).optional().or(z.literal("")),
});

/** Document metadata (before storage - UI only for now) */
export const documentMetadataSchema = z.object({
  name: z.string(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
  documentType: z.string().optional(),
});

export type ClientDetails = z.infer<typeof clientDetailsSchema>;
export type DocumentMetadata = z.infer<typeof documentMetadataSchema>;
