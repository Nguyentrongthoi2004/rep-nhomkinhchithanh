import { z } from "zod";

const bomPhoiNhomItemSchema = z.object({
  code: z.string(),
  name: z.string(),
  length: z.number(),
  qty: z.number(),
});

const bomKinhItemSchema = z.object({
  name: z.string(),
  w: z.number(),
  h: z.number(),
  qty: z.number(),
});

const bomPayloadSchema = z.object({
  sqm: z.number(),
  phoiNhom: z.array(bomPhoiNhomItemSchema),
  kinh: z.array(bomKinhItemSchema),
});

export const sendQuoteEmailSchema = z.object({
  madh: z.number().int().positive().optional(),
  email: z.string().email(),
  customer: z.string().min(1),
  phone: z.string().optional().nullable(),
  doorType: z.string().optional().nullable(),
  width: z.number().optional().nullable(),
  height: z.number().optional().nullable(),
  quotePrice: z.number(),
  laborCost: z.number().optional().nullable(),
  margin: z.number().optional().nullable(),
  bom: bomPayloadSchema.optional().nullable(),
});

export type SendQuoteEmailDto = z.infer<typeof sendQuoteEmailSchema>;

export const sendPaymentReceiptEmailSchema = z.object({
  madh: z.number().int().positive(),
  email: z.string().email(),
  customer: z.string().min(1),
  phone: z.string().optional().nullable(),
  transactionType: z.string().min(1),
  paymentMethod: z.string().min(1),
  amount: z.number().positive(),
  paidTotal: z.number().nonnegative(),
  remainingDebt: z.number().nonnegative(),
  note: z.string().trim().max(500).optional().nullable(),
});

export type SendPaymentReceiptEmailDto = z.infer<typeof sendPaymentReceiptEmailSchema>;
