import type { ErrorRequestHandler, RequestHandler } from "express";
import { HttpError } from "@/lib/http";
import { logger } from "@/lib/logger";

/** Trả 404 cho route không khớp handler nào. */
export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({
    ok: false,
    error: "Route not found",
    path: req.originalUrl,
    requestId: req.requestId,
  });
};

/** Middleware xử lý lỗi tập trung, phải đặt cuối cùng trong app. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  void _next;

  if (err instanceof HttpError) {
    if (err.status >= 500) {
      logger.error(err.message, { status: err.status, requestId: req.requestId, details: err.details });
    } else {
      logger.warn(err.message, { status: err.status, requestId: req.requestId });
    }
    return res.status(err.status).json({
      ok: false,
      error: err.message,
      details: err.details,
      requestId: req.requestId,
    });
  }

  const message = err instanceof Error ? err.message : String(err);
  logger.error("Unhandled error", { message, requestId: req.requestId, stack: err instanceof Error ? err.stack : undefined });
  res.status(500).json({
    ok: false,
    error: "Internal Server Error",
    requestId: req.requestId,
  });
};
