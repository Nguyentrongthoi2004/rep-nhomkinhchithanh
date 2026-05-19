import type { RequestHandler } from "express";
import { HttpError } from "@/lib/http";
import type { AuthUser } from "@/types/express";

type Role = AuthUser["vaitro"];

/**
 * Kiểm tra quyền truy cập theo vai trò (ADMIN / WORKER).
 * Phải chạy SAU authMiddleware. Nếu vai trò không nằm trong danh sách cho phép → trả lỗi 403.
 */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    const user = req.user;
    if (!user) return next(HttpError.unauthorized("Auth required"));
    if (!roles.includes(user.vaitro)) {
      return next(HttpError.forbidden(`Role ${user.vaitro} is not allowed`));
    }
    next();
  };
}
