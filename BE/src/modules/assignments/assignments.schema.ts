import { z } from "zod";

export const assignmentStatusEnum = z.enum(["CHO_THUC_HIEN", "DANG_THUC_HIEN", "HOAN_THANH"]);

export const assignmentIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createAssignmentSchema = z.object({
  madh: z.number().int().positive(),
  matho: z.number().int().positive(),
});

export const updateAssignmentSchema = z.object({
  trangthai: assignmentStatusEnum,
});

export type CreateAssignmentDto = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentDto = z.infer<typeof updateAssignmentSchema>;
