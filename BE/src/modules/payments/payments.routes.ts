import { Router } from "express";
import { asyncHandler } from "@/lib/asyncHandler";
import { sendCreated, sendOk } from "@/lib/http";
import { authMiddleware } from "@/middlewares/auth";
import { requireRole } from "@/middlewares/rbac";
import { validate } from "@/middlewares/validate";
import { createPaymentSchema, type CreatePaymentDto } from "./payments.schema";
import { paymentsService } from "./payments.service";

export const paymentsRouter = Router();
paymentsRouter.use(authMiddleware, requireRole("ADMIN"));

paymentsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    sendOk(res, await paymentsService.list());
  }),
);

paymentsRouter.post(
  "/",
  validate(createPaymentSchema, "body"),
  asyncHandler(async (req, res) => {
    sendCreated(res, await paymentsService.create(req.body as CreatePaymentDto, req.user!.mand));
  }),
);
