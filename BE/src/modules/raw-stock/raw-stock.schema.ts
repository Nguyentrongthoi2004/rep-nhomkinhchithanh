import { z } from "zod";
import { firstQueryString } from "@/lib/zodQuery";

export const phoiStatusEnum = z.enum(["MOI", "CON_DU", "BO_DI"]);

function optionalPositiveIntFromQuery(v: unknown) {
  const s = firstQueryString(v)?.trim();
  if (s === undefined || s === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

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

export const rawStockListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(15),
  mavt: z.preprocess(optionalPositiveIntFromQuery, z.number().int().positive().optional()),
  malonhap: z.preprocess(optionalPositiveIntFromQuery, z.number().int().positive().optional()),
  minLength: z.preprocess(optionalPositiveIntFromQuery, z.number().int().positive().optional()),
  lengthMode: z.enum(["min", "exact"]).default("min"),
  trangthai: z.preprocess((v) => {
    if (v === undefined || v === null || v === "") return undefined;
    return v;
  }, phoiStatusEnum.optional()),
  q: z.preprocess((v) => {
    const s = firstQueryString(v)?.trim().slice(0, 120);
    return s?.length ? s : undefined;
  }, z.string().max(120).optional()),
  sortBy: z
    .enum(["maphoi", "chieudaihientai", "chieudaibandau", "mavt", "trangthai", "malonhap"])
    .default("maphoi"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type RawStockListQuery = z.infer<typeof rawStockListQuerySchema>;

/** Gom nhóm hiển thị theo ngày nhập kho (theo timezone VN). */
export const rawStockGroupedByDayQuerySchema = z.object({
  mavt: z.preprocess(optionalPositiveIntFromQuery, z.number().int().positive().optional()),
  /** Lọc theo năm calendar VN */
  nam: z.preprocess(optionalPositiveIntFromQuery, z.number().int().min(1970).max(2100).optional()),
  /** 1–12 */
  thang: z.preprocess((v) => {
    const n = optionalPositiveIntFromQuery(v);
    return n !== undefined && n >= 1 && n <= 12 ? n : undefined;
  }, z.number().int().min(1).max(12).optional()),
});

export type RawStockGroupedByDayQuery = z.infer<typeof rawStockGroupedByDayQuerySchema>;

export type CreateBatchDto = z.infer<typeof createBatchSchema>;
export type UpdateRawStockDto = z.infer<typeof updateRawStockSchema>;
export type CutActionDto = z.infer<typeof cutActionSchema>;
