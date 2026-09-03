import { z } from 'zod';

function normalizeDateInput(value) {
  const raw = String(value ?? '').trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, month, day, year] = slashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return raw;
}

function normalizeCurrencyInput(value) {
  return String(value ?? '')
    .trim()
    .replace(/^[A-Za-z]{1,5}\s*/, '')
    .replace(/[$,\s]/g, '');
}

const requiredTextSchema = z.string().trim().min(1).max(200);
const phoneSchema = z.string().trim().min(7).max(40);
const dateSchema = z.preprocess(
  normalizeDateInput,
  z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/)
);
const amountSchema = z.preprocess(
  normalizeCurrencyInput,
  z.string().trim().regex(/^\d+(\.\d{1,2})?$/).max(50)
);

export const invoiceInputSchema = z.object({
  invoiceNumber: requiredTextSchema,
  invoiceDate: dateSchema,
  billedToName: requiredTextSchema,
  billedToEmail: z.string().trim().email(),
  billedToPhone: phoneSchema,
  weekLabel: z.string().trim().min(1).max(20),
  issuedDate: dateSchema,
  validUntil: dateSchema,
  dueDate: dateSchema,
  description: z.string().trim().min(1).max(500),
  duration: z.string().trim().min(1).max(100),
  total: amountSchema,
});
