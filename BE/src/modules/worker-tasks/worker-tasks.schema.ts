import { z } from "zod";

export const taskStatusEnum = z.enum(["CHO_THUC_HIEN", "DANG_THUC_HIEN", "HOAN_THANH"]);

export const updateTaskSchema = z.object({
  trangthai: taskStatusEnum,
});

export const taskIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;
