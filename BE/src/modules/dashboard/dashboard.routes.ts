import { Router } from "express";
import type { Request, Response } from "express";
import { authMiddleware } from "@/middlewares/auth";
import { requireRole } from "@/middlewares/rbac";
import { asyncHandler } from "@/lib/asyncHandler";
import { sendOk, HttpError } from "@/lib/http";
import { dashboardService } from "./dashboard.service";

// Admin dashboard stats
export const adminDashboardRouter = Router();
adminDashboardRouter.use(authMiddleware, requireRole("ADMIN"));

adminDashboardRouter.get(
  "/",
  asyncHandler(async (_req: Request, res: Response) => {
    const data = await dashboardService.getAdminStats();
    sendOk(res, data);
  }),
);

// Worker performance
export const workerDashboardRouter = Router();
workerDashboardRouter.use(authMiddleware, requireRole("WORKER", "ADMIN"));

workerDashboardRouter.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw HttpError.unauthorized();
    const data = await dashboardService.getWorkerPerformance(user.mand);
    sendOk(res, data);
  }),
);
