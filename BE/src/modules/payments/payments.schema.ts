import { z } from "zod";

export const transactionTypeEnum = z.enum(["DAT_COC", "TAM_UNG", "HOAN_TAT", "HUY_DON"]);
export const paymentMethodEnum = z.enum(["TIEN_MAT", "CHUYEN_KHOAN"]);

export const paymentIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createPaymentSchema = z.object({
  madh: z.number().int().positive(),
  loaigd: transactionTypeEnum,
  phuongthuc: paymentMethodEnum,
  sotien: z.number().positive(),
  ghichu: z.string().trim().max(500).nullable().optional(),
});

export type CreatePaymentDto = z.infer<typeof createPaymentSchema>;
