import { Router } from "express";
import type { Request, Response } from "express";
import { authMiddleware } from "@/middlewares/auth";
import { requireRole } from "@/middlewares/rbac";
import { validate } from "@/middlewares/validate";
import { asyncHandler } from "@/lib/asyncHandler";
import { sendOk, HttpError } from "@/lib/http";
import { dashboardService } from "./dashboard.service";
import { dashboardRangeQuerySchema, type DashboardRangeQuery } from "./dashboard.schema";

// Admin dashboard stats
export const adminDashboardRouter = Router();
adminDashboardRouter.use(authMiddleware, requireRole("ADMIN"));

adminDashboardRouter.get(
  "/finance",
  validate(dashboardRangeQuerySchema, "query"),
  asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as DashboardRangeQuery;
    const data = await dashboardService.getFinanceStats(query.range);
    sendOk(res, data);
  }),
);

adminDashboardRouter.get(
  "/production",
  validate(dashboardRangeQuerySchema, "query"),
  asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as DashboardRangeQuery;
    const data = await dashboardService.getProductionStats(query.range);
    sendOk(res, data);
  }),
);

adminDashboardRouter.get(
  "/inventory",
  validate(dashboardRangeQuerySchema, "query"),
  asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as DashboardRangeQuery;
    const data = await dashboardService.getInventoryStats(query.range);
    sendOk(res, data);
  }),
);

adminDashboardRouter.get(
  "/warnings",
  validate(dashboardRangeQuerySchema, "query"),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await dashboardService.getWarningStats();
    sendOk(res, data);
  }),
);

adminDashboardRouter.get(
  "/",
  validate(dashboardRangeQuerySchema, "query"),
  asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as DashboardRangeQuery;
    const data = await dashboardService.getAdminStats(query.range);
    sendOk(res, data);
  }),
);

// Worker performance
export const workerDashboardRouter = Router();
workerDashboardRouter.use(authMiddleware, requireRole("WORKER", "ADMIN"));

workerDashboardRouter.get(
  "/",
  validate(dashboardRangeQuerySchema, "query"),
  asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw HttpError.unauthorized();
    const query = req.query as unknown as DashboardRangeQuery;
    const data = await dashboardService.getWorkerPerformance(user.mand, query.range);
    sendOk(res, data);
  }),
);
