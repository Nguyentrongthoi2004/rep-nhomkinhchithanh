import { z } from "zod";

export const materialIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createMaterialSchema = z.object({
  tenvt: z.string().trim().min(1).max(150),
  madm: z.number().int().positive(),
  donvitinh: z.string().trim().min(1).max(20),
  chieudaimacdinh: z.number().int().positive().nullable().optional(),
  dongianhap: z.number().nonnegative(),
  dongiaban: z.number().nonnegative().nullable().optional(),
});

export const updateMaterialSchema = z
  .object({
    tenvt: z.string().trim().min(1).max(150).optional(),
    madm: z.number().int().positive().optional(),
    donvitinh: z.string().trim().min(1).max(20).optional(),
    chieudaimacdinh: z.number().int().positive().nullable().optional(),
    dongianhap: z.number().nonnegative().optional(),
    dongiaban: z.number().nonnegative().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Nothing to update",
  });

export type CreateMaterialDto = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialDto = z.infer<typeof updateMaterialSchema>;
