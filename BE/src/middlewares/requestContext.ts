import type { RequestHandler } from "express";
import { randomUUID } from "node:crypto";

/** Gắn ID yêu cầu ngắn để đối chiếu log giữa các tầng xử lý/dịch vụ. */
export const requestContext: RequestHandler = (req, res, next) => {
  const id = req.header("x-request-id") || randomUUID().split("-")[0];
  req.requestId = id;
  res.setHeader("x-request-id", id);
  next();
};
