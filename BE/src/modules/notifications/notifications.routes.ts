import { Router } from "express";
import { asyncHandler } from "@/lib/asyncHandler";
import { HttpError, sendOk } from "@/lib/http";
import { authMiddleware } from "@/middlewares/auth";
import { requireRole } from "@/middlewares/rbac";
import { notificationsService } from "./notifications.service";

export const notificationsRouter = Router();
notificationsRouter.use(authMiddleware, requireRole("ADMIN", "WORKER"));

function parseNotificationId(raw: string | undefined) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw HttpError.badRequest("Mã thông báo không hợp lệ");
  return id;
}

notificationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const mand = req.user!.mand;
    const limit = Number(req.query.limit ?? 20);
    sendOk(res, await notificationsService.list(mand, Number.isFinite(limit) ? limit : 20));
  }),
);

notificationsRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    sendOk(res, await notificationsService.summary(req.user!.mand));
  }),
);

notificationsRouter.get(
  "/read-state",
  asyncHandler(async (req, res) => {
    const result = await notificationsService.list(req.user!.mand);
    const newestRead = result.items.find((item) => item.isRead)?.createdAt ?? null;
    sendOk(res, { dadoctoi: newestRead });
  }),
);

notificationsRouter.post(
  "/mark-read",
  asyncHandler(async (req, res) => {
    const mand = req.user!.mand;
    sendOk(res, await notificationsService.markAllRead(mand));
  }),
);

notificationsRouter.post(
  "/mark-all-read",
  asyncHandler(async (req, res) => {
    const mand = req.user!.mand;
    sendOk(res, await notificationsService.markAllRead(mand));
  }),
);

notificationsRouter.post(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const mand = req.user!.mand;
    sendOk(res, await notificationsService.markRead(mand, parseNotificationId(req.params.id)));
  }),
);

notificationsRouter.delete(
  "/read",
  asyncHandler(async (req, res) => {
    const mand = req.user!.mand;
    sendOk(res, await notificationsService.removeRead(mand));
  }),
);

notificationsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const mand = req.user!.mand;
    sendOk(res, await notificationsService.remove(mand, parseNotificationId(req.params.id)));
  }),
);

