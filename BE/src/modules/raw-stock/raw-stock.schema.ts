import { z } from "zod";

export const phoiStatusEnum = z.enum(["MOI", "CON_DU", "BO_DI"]);

export const createBatchSchema = z.object({
  nhacungcap: z.string().trim().max(150).optional().nullable(),
  items: z
    .array(
      z.object({
        mavt: z.number().int().positive(),
        chieudaibandau: z.number().int().positive(),
        quantity: z.number().int().positive().default(1),
      }),
    )
    .min(1, "items must not be empty"),
});

export const updateRawStockSchema = z
  .object({
    chieudaihientai: z.number().int().nonnegative().optional(),
    trangthai: phoiStatusEnum.optional(),
  })
  .refine((d) => d.chieudaihientai !== undefined || d.trangthai !== undefined, {
    message: "Nothing to update",
  });

export const cutActionSchema = z.object({
  action: z.literal("CUT"),
  maphoi: z.number().int().positive(),
  payload: z.object({
    cutLength: z.number().int().positive(),
    ghichu: z.string().trim().max(255).nullable().optional(),
  }),
});

export const rawStockIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateBatchDto = z.infer<typeof createBatchSchema>;
export type UpdateRawStockDto = z.infer<typeof updateRawStockSchema>;
export type CutActionDto = z.infer<typeof cutActionSchema>;
