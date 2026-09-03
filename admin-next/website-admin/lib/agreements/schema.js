import { z } from 'zod';

const phoneSchema = z.string().trim().min(7).max(40);
const requiredTextSchema = z.string().trim().min(1).max(200);
const optionalNotesSchema = z.string().trim().max(5000).optional().or(z.literal(''));

export const agreementStatusSchema = z.enum([
  'draft',
  'previewed',
  'sent',
  'delivered',
  'viewed',
  'completed',
  'declined',
  'voided',
]);

export const agreementInputSchema = z.object({
  clientName: requiredTextSchema,
  clientEmail: z.string().trim().email(),
  clientPhone: phoneSchema,
  providerName: requiredTextSchema,
  providerEmail: z.string().trim().email(),
  providerPhone: phoneSchema,
  providerSignatureName: requiredTextSchema,
  providerAbn: z.string().trim().min(5).max(30).optional().or(z.literal('')),
  agreementDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  packageName: requiredTextSchema,
  servicePrice: z.string().trim().min(1).max(50),
  weeklyJobTarget: z.string().trim().min(1).max(20),
  initialTerm: requiredTextSchema,
  paymentDay: z.string().trim().min(1).max(20).optional().or(z.literal('')),
  notes: optionalNotesSchema,
});

export const agreementIdParamSchema = z.object({
  id: z.string().trim().min(1),
});
