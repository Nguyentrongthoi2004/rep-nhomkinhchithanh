import type { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Bọc hàm xử lý đường dẫn bất đồng bộ để lỗi được chuyển về middleware xử lý lỗi.
 */
export function asyncHandler<Req extends Request = Request>(
  fn: (req: Req, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req as Req, res, next)).catch(next);
  };
}
