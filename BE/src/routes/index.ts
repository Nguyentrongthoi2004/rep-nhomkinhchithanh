import { Router } from "express";
import {
  adminAccessRequestsRouter,
  publicAccessRequestsRouter,
} from "@/modules/access-requests/access-requests.routes";
import { assignmentsRouter } from "@/modules/assignments/assignments.routes";
import { authRouter } from "@/modules/auth/auth.routes";
import {
  adminSeedRouter,
  deprecatedSeedRouter,
} from "@/modules/bootstrap/bootstrap.routes";
import { healthRouter } from "@/modules/health/health.routes";
import {
  materialsOptionsRouter,
  materialsRouter,
} from "@/modules/materials/materials.routes";
import {
  ordersListRouter,
  ordersRouter,
} from "@/modules/orders/orders.routes";
import { categoriesRouter } from "@/modules/categories/categories.routes";
import {
  adminRawStockRouter,
  workerRawStockRouter,
} from "@/modules/raw-stock/raw-stock.routes";
import { usersRouter } from "@/modules/users/users.routes";
import { workerTasksRouter } from "@/modules/worker-tasks/worker-tasks.routes";

export const apiRouter = Router();

// Health / liveness
apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/auth", publicAccessRequestsRouter);
apiRouter.use("/seed", deprecatedSeedRouter);

// Admin
apiRouter.use("/admin/access-requests", adminAccessRequestsRouter);
apiRouter.use("/admin/assignments", assignmentsRouter);
apiRouter.use("/admin/categories", categoriesRouter);
apiRouter.use("/admin/materials", materialsRouter);
apiRouter.use("/admin/materials-options", materialsOptionsRouter);
apiRouter.use("/admin/orders", ordersRouter);
apiRouter.use("/admin/orders-list", ordersListRouter);
apiRouter.use("/admin/raw-stock", adminRawStockRouter);
apiRouter.use("/admin/seed", adminSeedRouter);
apiRouter.use("/admin/users", usersRouter);

// Worker
apiRouter.use("/worker/raw-stock", workerRawStockRouter);
apiRouter.use("/worker/tasks", workerTasksRouter);
