import { z } from "zod";

export const userIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const roleEnum = z.enum(["ADMIN", "WORKER"]);
export const userStatusEnum = z.enum(["DANG_LAM", "NGHI_VIEC"]);

export const createUserSchema = z.object({
  tenDangNhap: z.string().trim().min(1).max(50),
  matKhau: z.string().min(6),
  hoTen: z.string().trim().min(1).max(100),
  sdt: z.string().trim().max(15).optional().default(""),
  vaiTro: roleEnum.default("WORKER"),
});

export const updateUserActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("CHANGE_STATUS"),
    payload: z.object({
      trangthai: userStatusEnum,
    }),
  }),
  z.object({
    action: z.literal("CHANGE_PASSWORD"),
    payload: z.object({
      newPassword: z.string().min(6),
    }),
  }),
]);

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserActionDto = z.infer<typeof updateUserActionSchema>;
