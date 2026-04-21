import { z } from "zod";

export const accessRequestIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const requestStatusEnum = z.enum(["PENDING", "APPROVED", "REJECTED"]);

export const createAccessRequestSchema = z.object({
  hoten: z.string().trim().min(1).max(100),
  sdt: z.string().trim().max(15).nullable().optional(),
  tendangnhap: z.string().trim().min(1).max(50),
  vaitro: z.enum(["ADMIN", "WORKER"]).default("WORKER"),
  ghichu: z.string().trim().max(255).nullable().optional(),
});

export const updateAccessRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("APPROVE"),
  }),
  z.object({
    action: z.literal("REJECT"),
    payload: z.object({
      ghichu: z.string().trim().max(255).nullable().optional(),
    }),
  }),
]);

export type CreateAccessRequestDto = z.infer<typeof createAccessRequestSchema>;
export type UpdateAccessRequestDto = z.infer<typeof updateAccessRequestSchema>;
