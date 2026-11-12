import { z } from "zod";

export const aiDocumentSchema = z.object({
  documentId: z.string().min(1),
  detectedType: z.string().nullable().optional(),
  holderName: z.string().nullable().optional(),
  documentNumber: z.string().nullable().optional(),
  issueDate: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
  categories: z.array(z.string()).optional().default([]),
  issuingCountry: z.string().nullable().optional(),
  readable: z.boolean(),
  complete: z.boolean(),
  possibleAlteration: z.boolean(),
  translationLikelyNeeded: z.boolean(),
  notes: z.string().optional().default(""),
  confidence: z.number().min(0).max(1),
});

export const aiAssessmentSchema = z.object({
  documents: z.array(aiDocumentSchema),
  inconsistencies: z
    .array(
      z.object({
        code: z.string().min(1),
        message: z.string().min(1),
        documentIds: z.array(z.string()).optional().default([]),
      })
    )
    .optional()
    .default([]),
  confidence: z.number().min(0).max(1),
  needsHumanReview: z.boolean(),
  summary: z.string().min(1),
});

export type AiAssessmentPayload = z.infer<typeof aiAssessmentSchema>;

export function parseAiAssessment(raw: unknown): AiAssessmentPayload {
  return aiAssessmentSchema.parse(raw);
}
