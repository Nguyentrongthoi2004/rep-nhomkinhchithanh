import { z } from "zod";

export const orderImagesParamSchema = z.object({
  madh: z.coerce.number().int().positive(),
});

export const imageIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createOrderImageSchema = z.object({
  madh: z.number().int().positive(),
  duongdan: z.string().trim().url("Đường dẫn ảnh không hợp lệ").max(500),
  mota: z.string().trim().max(255).optional().nullable(),
});

export type CreateOrderImageDto = z.infer<typeof createOrderImageSchema>;
