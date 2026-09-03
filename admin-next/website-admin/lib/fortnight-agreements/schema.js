import { z } from 'zod';

const phoneSchema = z.string().trim().min(7).max(40);
const requiredTextSchema = z.string().trim().min(1).max(200);
const optionalNotesSchema = z.string().trim().max(5000).optional().or(z.literal(''));

export const fortnightAgreementInputSchema = z.object({
  clientName: requiredTextSchema,
  clientEmail: z.string().trim().email(),
  clientPhone: phoneSchema,
  providerName: requiredTextSchema,
  providerEmail: z.string().trim().email(),
  providerPhone: phoneSchema,
  providerSignatureName: requiredTextSchema,
  providerAbn: z.string().trim().min(5).max(30).optional().or(z.literal('')),
  agreementDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  servicePrice: z.string().trim().min(1).max(50), // Upfront Service Fee
  initialTerm: requiredTextSchema, // Service Period
  renewalEnabled: z.boolean().optional().default(false),
  renewalTerm: requiredTextSchema.optional().or(z.literal('')),
  renewalFee: z.string().trim().max(50).optional().or(z.literal('')),
  notes: optionalNotesSchema,
}).superRefine((data, ctx) => {
  if (!data.renewalEnabled) {
    return;
  }

  if (!String(data.renewalTerm || '').trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['renewalTerm'],
      message: 'Renewal month is required.',
    });
  }

  if (!String(data.renewalFee || '').trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['renewalFee'],
      message: 'Renewal fee is required.',
    });
  }
});

export const fortnightAgreementIdParamSchema = z.object({
  id: z.string().trim().min(1),
});
