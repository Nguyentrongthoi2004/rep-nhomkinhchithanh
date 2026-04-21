import { Router } from "express";
import { authMiddleware } from "@/middlewares/auth";
import { requireRole } from "@/middlewares/rbac";
import { validate } from "@/middlewares/validate";
import { asyncHandler } from "@/lib/asyncHandler";
import { rawStockController } from "./raw-stock.controller";
import {
  createBatchSchema,
  cutActionSchema,
  rawStockIdParamSchema,
  updateRawStockSchema,
} from "./raw-stock.schema";

/** Admin-scoped routes: /api/admin/raw-stock */
export const adminRawStockRouter = Router();
adminRawStockRouter.use(authMiddleware, requireRole("ADMIN"));

adminRawStockRouter.get("/", asyncHandler(rawStockController.list));
adminRawStockRouter.get(
  "/:id",
  validate(rawStockIdParamSchema, "params"),
  asyncHandler(rawStockController.getById),
);
adminRawStockRouter.post(
  "/",
  validate(createBatchSchema, "body"),
  asyncHandler(rawStockController.createBatch),
);
adminRawStockRouter.patch(
  "/:id",
  validate(rawStockIdParamSchema, "params"),
  validate(updateRawStockSchema, "body"),
  asyncHandler(rawStockController.update),
);
adminRawStockRouter.delete(
  "/:id",
  validate(rawStockIdParamSchema, "params"),
  asyncHandler(rawStockController.remove),
);

/** Worker-scoped routes: /api/worker/raw-stock */
export const workerRawStockRouter = Router();
workerRawStockRouter.use(authMiddleware, requireRole("WORKER", "ADMIN"));

workerRawStockRouter.get("/", asyncHandler(rawStockController.list));
workerRawStockRouter.post(
  "/cut",
  validate(cutActionSchema, "body"),
  asyncHandler(rawStockController.cut),
);
