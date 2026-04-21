import type { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Wraps async route handlers so that rejected promises reach the error middleware.
 */
export function asyncHandler<Req extends Request = Request>(
  fn: (req: Req, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req as Req, res, next)).catch(next);
  };
}
