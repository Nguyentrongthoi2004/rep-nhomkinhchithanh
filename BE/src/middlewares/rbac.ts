import type { RequestHandler } from "express";
import { HttpError } from "@/lib/http";
import type { AuthUser } from "@/types/express";

type Role = AuthUser["vaitro"];

/**
 * Allow the request only if the authenticated user's role is in the given list.
 * Must run AFTER authMiddleware.
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
