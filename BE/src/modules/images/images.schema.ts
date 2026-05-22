import { z } from "zod";

const imageTypeSchema = z.enum(["CAT_PHOI", "HOAN_THANH_CONG_TRINH", "BAO_CAO_SU_CO", "KHAC"]);
const optionalPositiveIntFromForm = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}, z.number().int().positive().optional());

export const orderImagesParamSchema = z.object({
  madh: z.coerce.number().int().positive(),
});

export const stockImagesParamSchema = z.object({
  maphoi: z.coerce.number().int().positive(),
});

export const imageIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createOrderImageSchema = z.object({
  madh: z.number().int().positive(),
  duongdan: z.string().trim().url("Duong dan anh khong hop le").max(500),
  mota: z.string().trim().max(255).optional().nullable(),
  loaianh: imageTypeSchema.optional(),
  mapc: z.number().int().positive().optional().nullable(),
  masdc: z.number().int().positive().optional().nullable(),
  maphoi: z.number().int().positive().optional().nullable(),
});

export const uploadOrderImageSchema = z.object({
  madh: z.number().int().positive().optional().nullable(),
  mapc: z.number().int().positive().optional().nullable(),
  masdc: z.number().int().positive().optional().nullable(),
  maphoi: z.number().int().positive().optional().nullable(),
  loaianh: imageTypeSchema,
  dataUrl: z.string().trim().startsWith("data:image/", "Du lieu anh khong hop le"),
  mota: z.string().trim().max(255).optional().nullable(),
});

export const uploadOrderImageFileSchema = z.object({
  madh: optionalPositiveIntFromForm,
  mapc: optionalPositiveIntFromForm,
  masdc: optionalPositiveIntFromForm,
  maphoi: optionalPositiveIntFromForm,
  loaianh: imageTypeSchema,
  mota: z.string().trim().max(255).optional().nullable(),
});

export type CreateOrderImageDto = z.infer<typeof createOrderImageSchema>;
export type UploadOrderImageDto = z.infer<typeof uploadOrderImageSchema>;
export type UploadOrderImageFileDto = z.infer<typeof uploadOrderImageFileSchema>;
