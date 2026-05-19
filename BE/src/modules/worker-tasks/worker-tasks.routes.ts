import { Router } from "express";
import { authMiddleware } from "@/middlewares/auth";
import { requireRole } from "@/middlewares/rbac";
import { validate } from "@/middlewares/validate";
import { asyncHandler } from "@/lib/asyncHandler";
import { workerTasksController } from "./worker-tasks.controller";
import { rejectTaskSchema, taskIdParamSchema, updateTaskSchema } from "./worker-tasks.schema";

export const workerTasksRouter = Router();
workerTasksRouter.use(authMiddleware, requireRole("WORKER", "ADMIN"));

workerTasksRouter.get("/summary", asyncHandler(workerTasksController.summary));

workerTasksRouter.get("/", asyncHandler(workerTasksController.list));

workerTasksRouter.patch(
  "/:id",
  validate(taskIdParamSchema, "params"),
  validate(updateTaskSchema, "body"),
  asyncHandler(workerTasksController.updateStatus),
);

workerTasksRouter.post(
  "/:id/reject",
  validate(taskIdParamSchema, "params"),
  validate(rejectTaskSchema, "body"),
  asyncHandler(workerTasksController.reject),
);
