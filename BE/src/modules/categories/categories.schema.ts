import { z } from "zod";
import { firstQueryString } from "@/lib/zodQuery";

export const categoryStatusEnum = z.enum(["HOAT_DONG", "NGUNG"]);

export const categoriesListPagedQuerySchema = z.object({
  page: z.preprocess((v) => firstQueryString(v), z.coerce.number().int().positive().default(1)),
  pageSize: z.preprocess((v) => firstQueryString(v), z.coerce.number().int().min(1).max(100).default(15)),
  q: z.preprocess((v) => firstQueryString(v), z.string().trim().max(120).optional()),
});

export const createCategorySchema = z.object({
  tendm: z.string().trim().min(1, "tendm is required").max(100),
  mota: z.string().trim().max(255).optional().nullable(),
  trangthai: categoryStatusEnum.optional(),
});

export const updateCategorySchema = z.object({
  tendm: z.string().trim().min(1).max(100).optional(),
  mota: z.string().trim().max(255).nullable().optional(),
  trangthai: categoryStatusEnum.optional(),
});

export const categoryIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateCategoryDto = z.infer<typeof createCategorySchema>;
export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;
export type CategoriesListPagedQuery = z.infer<typeof categoriesListPagedQuerySchema>;
