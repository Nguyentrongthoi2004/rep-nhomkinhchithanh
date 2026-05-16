import { z } from "zod";

export const customerIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const optionalEmailSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}, z.string().email().max(255).nullable().optional());

export const createCustomerSchema = z.object({
  hoten: z.string().trim().min(1).max(100),
  sdt: z.string().trim().min(1).max(15),
  email: optionalEmailSchema,
  diachi: z.string().trim().max(255).nullable().optional(),
});

export const updateCustomerSchema = z
  .object({
    hoten: z.string().trim().min(1).max(100).optional(),
    sdt: z.string().trim().min(1).max(15).optional(),
    email: optionalEmailSchema,
    diachi: z.string().trim().max(255).nullable().optional(),
  })
  .refine((d) => d.hoten !== undefined || d.sdt !== undefined || d.email !== undefined || d.diachi !== undefined, {
    message: "Nothing to update",
  });

export type CreateCustomerDto = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerDto = z.infer<typeof updateCustomerSchema>;
