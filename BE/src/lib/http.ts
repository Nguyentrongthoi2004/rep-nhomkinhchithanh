import type { Response } from "express";

export function sendOk<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ ok: true, data });
}

export function sendCreated<T>(res: Response, data: T) {
  return sendOk(res, data, 201);
}

export function sendNoContent(res: Response) {
  return res.status(204).end();
}

/** Standard application error with HTTP status code + optional details. */
export class HttpError extends Error {
  public readonly status: number;
  public readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
    this.name = "HttpError";
  }

  static badRequest(msg = "Bad Request", details?: unknown) {
    return new HttpError(400, msg, details);
  }
  static unauthorized(msg = "Unauthorized") {
    return new HttpError(401, msg);
  }
  static forbidden(msg = "Forbidden") {
    return new HttpError(403, msg);
  }
  static notFound(msg = "Not Found") {
    return new HttpError(404, msg);
  }
  static conflict(msg = "Conflict", details?: unknown) {
    return new HttpError(409, msg, details);
  }
  static internal(msg = "Internal Server Error", details?: unknown) {
    return new HttpError(500, msg, details);
  }
}
