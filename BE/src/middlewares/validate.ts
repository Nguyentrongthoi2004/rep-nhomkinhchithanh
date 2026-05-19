import type { RequestHandler } from "express";
import { z, ZodTypeAny } from "zod";
import { HttpError } from "@/lib/http";

type Source = "body" | "query" | "params";

/**
 * Kiểm tra một phần của yêu cầu bằng Zod schema.
 * Sau khi parse thành công, ghi lại dữ liệu đã chuẩn hóa để các tầng sau dùng đúng kiểu.
 */
export function validate<S extends ZodTypeAny>(schema: S, source: Source = "body"): RequestHandler {
  return (req, _res, next) => {
    const raw = req[source];
    const result = schema.safeParse(raw);
    if (!result.success) {
      return next(
        HttpError.badRequest(
          `Invalid ${source}`,
          result.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        ),
      );
    }
    // Gán dữ liệu đã validate lại vào req để các tầng sau dùng kiểu dữ liệu hẹp hơn.
    (req as unknown as Record<Source, z.infer<S>>)[source] = result.data;
    next();
  };
}
