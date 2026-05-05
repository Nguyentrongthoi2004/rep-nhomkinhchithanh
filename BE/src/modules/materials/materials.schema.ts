import { z } from "zod";

/**
 * Express / qs có thể gửi cùng tham số dưới dạng mảng (vd madm[]=2 hoặc lặp key).
 */
function coerceSingleQueryValue(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (first === undefined || first === null) return undefined;
    return String(first);
  }
  return String(raw);
}

export const materialsListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(15),
  madm: z.preprocess((v) => {
    const s = coerceSingleQueryValue(v)?.trim();
    if (s === undefined || s === "") return undefined;
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, z.number().int().positive().optional()),
  q: z.preprocess((v) => {
    const s = coerceSingleQueryValue(v)?.trim().slice(0, 120);
    return s?.length ? s : undefined;
  }, z.string().max(120).optional()),
  sortBy: z
    .enum(["mavt", "tenvt", "dongianhap", "madm", "chieudaimacdinh"])
    .default("mavt"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

export type MaterialsListQuery = z.infer<typeof materialsListQuerySchema>;

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
