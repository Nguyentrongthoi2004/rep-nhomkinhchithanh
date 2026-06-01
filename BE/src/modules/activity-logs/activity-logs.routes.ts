import { Router } from "express";
import { asyncHandler } from "@/lib/asyncHandler";
import { sendOk } from "@/lib/http";
import { authMiddleware } from "@/middlewares/auth";
import { requireRole } from "@/middlewares/rbac";
import { activityLogsService } from "./activity-logs.service";

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}

export const activityLogsRouter = Router();
activityLogsRouter.use(authMiddleware, requireRole("ADMIN"));

activityLogsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    sendOk(
      res,
      await activityLogsService.list({
        page: optionalNumber(req.query.page) ?? 1,
        pageSize: optionalNumber(req.query.pageSize) ?? 20,
        action: optionalString(req.query.action),
        targetType: optionalString(req.query.targetType),
        userId: optionalNumber(req.query.userId),
        q: optionalString(req.query.q),
      }),
    );
  }),
);
