import type { RequestHandler } from "express";
import { randomUUID } from "node:crypto";

/** Attach a short request id for log correlation. */
export const requestContext: RequestHandler = (req, res, next) => {
  const id = req.header("x-request-id") || randomUUID().split("-")[0];
  req.requestId = id;
  res.setHeader("x-request-id", id);
  next();
};
