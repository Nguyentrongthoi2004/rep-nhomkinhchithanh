import { z } from "zod";

export const orderStatusEnum = z.enum([
  "BAO_GIA_NHAP",
  "KHAO_SAT",
  "DA_COC",
  "DANG_GIA_CONG",
  "DANG_LAP_DAT",
  "HOAN_THANH",
  "DA_HUY",
]);

export const orderIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createOrderItemSchema = z.object({
  mavt: z.number().int().positive(),
  name: z.string().trim().min(1),
  length: z.number().nonnegative().optional(),
  w: z.number().nonnegative().optional(),
  h: z.number().nonnegative().optional(),
  qty: z.number().int().positive(),
  unitPrice: z.number().nonnegative().optional(),
}).superRefine((item, ctx) => {
  const hasLinearCut = item.length !== undefined;
  const hasSheetCut = item.w !== undefined && item.h !== undefined;

  if (!hasLinearCut && !hasSheetCut) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Each order item must provide `length` or both `w` and `h`",
    });
  }
});

export const createOrderSchema = z.object({
  customer: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(15),
  address: z.string().trim().max(255).nullable().optional(),
  totalCost: z.number().nonnegative(),
  items: z.array(createOrderItemSchema).default([]),
});

export const updateOrderStatusSchema = z.object({
  trangthai: orderStatusEnum,
});

export type CreateOrderDto = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusDto = z.infer<typeof updateOrderStatusSchema>;
