import { z } from "zod";

export const orderStatusEnum = z.enum([
  "BAO_GIA_NHAP",
  "DA_DUYET_GIA",
  "KHAO_SAT",
  "DA_COC",
  "DA_THANH_TOAN",
  "DANG_GIA_CONG",
  "DANG_LAP_DAT",
  "HOAN_THANH",
  "DA_HUY",
]);

export const orderIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const optionalEmailSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}, z.string().email().max(255).nullable().optional());

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
  const hasManualUnitPrice = item.unitPrice !== undefined && item.unitPrice > 0;

  if (!hasLinearCut && !hasSheetCut && !hasManualUnitPrice) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Each order item must provide `length`, both `w` and `h`, or a manual unit price",
    });
  }
});

export const createOrderSchema = z.object({
  customer: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(15),
  email: optionalEmailSchema,
  address: z.string().trim().max(255).nullable().optional(),
  totalCost: z.number().nonnegative(),
  items: z.array(createOrderItemSchema).default([]),
});

export const updateOrderSchema = z.object({
  customer: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(15),
  email: optionalEmailSchema,
  address: z.string().trim().max(255).nullable().optional(),
  totalCost: z.number().nonnegative(),
  items: z.array(createOrderItemSchema).default([]),
});

export const updateOrderCustomerSchema = z.object({
  customer: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(15),
  email: optionalEmailSchema,
  address: z.string().trim().max(255).nullable().optional(),
});

export const updateOrderStatusSchema = z.object({
  trangthai: orderStatusEnum,
});

export type CreateOrderDto = z.infer<typeof createOrderSchema>;
export type UpdateOrderDto = z.infer<typeof updateOrderSchema>;
export type UpdateOrderCustomerDto = z.infer<typeof updateOrderCustomerSchema>;
export type UpdateOrderStatusDto = z.infer<typeof updateOrderStatusSchema>;
