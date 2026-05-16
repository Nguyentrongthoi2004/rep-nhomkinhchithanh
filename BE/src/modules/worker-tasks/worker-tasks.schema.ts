import { z } from "zod";

export const taskStatusEnum = z.enum(["CHO_THUC_HIEN", "DANG_THUC_HIEN", "HOAN_THANH"]);

export const rejectReasonEnum = z.enum([
  "DANG_BAN",
  "KHONG_PHU_HOP_TAY_NGHE",
  "KHONG_THUAN_TIEN_THAO_TAC",
  "THIEU_THONG_TIN_SO_DO_CAT",
  "LY_DO_KHAC",
]);

export const updateTaskSchema = z.object({
  trangthai: taskStatusEnum,
});

export const rejectTaskSchema = z.object({
  lydo: rejectReasonEnum,
  ghichu: z.string().trim().max(500).optional().nullable(),
});

export const taskIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;
export type RejectTaskDto = z.infer<typeof rejectTaskSchema>;
