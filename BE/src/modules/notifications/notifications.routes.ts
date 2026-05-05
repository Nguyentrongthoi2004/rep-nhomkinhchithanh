import { Router } from "express";
import { asyncHandler } from "@/lib/asyncHandler";
import { sendOk } from "@/lib/http";
import { authMiddleware } from "@/middlewares/auth";
import { requireRole } from "@/middlewares/rbac";
import { notificationsService } from "./notifications.service";

export const notificationsRouter = Router();
notificationsRouter.use(authMiddleware, requireRole("ADMIN"));

notificationsRouter.get(
  "/read-state",
  asyncHandler(async (req, res) => {
    const mand = req.user!.mand;
    sendOk(res, await notificationsService.getReadState(mand));
  }),
);

notificationsRouter.post(
  "/mark-read",
  asyncHandler(async (req, res) => {
    const mand = req.user!.mand;
    sendOk(res, await notificationsService.markReadNow(mand));
  }),
);

