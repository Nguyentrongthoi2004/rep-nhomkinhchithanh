import { Router } from "express";
import { authMiddleware } from "@/middlewares/auth";
import { requireRole } from "@/middlewares/rbac";
import { validate } from "@/middlewares/validate";
import { asyncHandler } from "@/lib/asyncHandler";
import { rawStockController } from "./raw-stock.controller";
import {
  createBatchSchema,
  cutActionSchema,
  rawStockGroupedByDayQuerySchema,
  rawStockIdParamSchema,
  rawStockListQuerySchema,
  updateRawStockSchema,
} from "./raw-stock.schema";

/** Admin-scoped routes: /api/admin/raw-stock */
export const adminRawStockRouter = Router();
adminRawStockRouter.use(authMiddleware, requireRole("ADMIN"));

adminRawStockRouter.get(
  "/",
  validate(rawStockListQuerySchema, "query"),
  asyncHandler(rawStockController.listAdmin),
);
adminRawStockRouter.get(
  "/grouped-by-import-day",
  validate(rawStockGroupedByDayQuerySchema, "query"),
  asyncHandler(rawStockController.groupedByImportDay),
);
/** Chỉ số — tránh `grouped-by-import-day` bị bắt nhầm thành :id khi BE cũ / thứ tự route lệch. */
adminRawStockRouter.get(
  "/:id(\\d+)",
  validate(rawStockIdParamSchema, "params"),
  asyncHandler(rawStockController.getById),
);
adminRawStockRouter.post(
  "/",
  validate(createBatchSchema, "body"),
  asyncHandler(rawStockController.createBatch),
);
adminRawStockRouter.patch(
  "/:id(\\d+)",
  validate(rawStockIdParamSchema, "params"),
  validate(updateRawStockSchema, "body"),
  asyncHandler(rawStockController.update),
);
adminRawStockRouter.delete(
  "/:id(\\d+)",
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
