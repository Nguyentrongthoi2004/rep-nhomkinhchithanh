import { Router } from "express";
import { asyncHandler } from "@/lib/asyncHandler";
import { sendCreated, sendOk } from "@/lib/http";
import { authMiddleware } from "@/middlewares/auth";
import { requireRole } from "@/middlewares/rbac";
import { validate } from "@/middlewares/validate";
import {
  createCuttingPlanSchema,
  cuttingPlanIdParamSchema,
  reportIssueSchema,
  type CreateCuttingPlanDto,
  type ReportIssueDto,
} from "./cutting-plans.schema";
import { cuttingPlansService } from "./cutting-plans.service";

export const adminCuttingPlansRouter = Router();
adminCuttingPlansRouter.use(authMiddleware, requireRole("ADMIN"));

adminCuttingPlansRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    sendOk(res, await cuttingPlansService.listAdmin());
  }),
);

adminCuttingPlansRouter.get(
  "/assignment/:id",
  validate(cuttingPlanIdParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const mapc = (req.params as unknown as { id: number }).id;
    sendOk(res, await cuttingPlansService.getForAssignment(mapc));
  }),
);

adminCuttingPlansRouter.post(
  "/",
  validate(createCuttingPlanSchema, "body"),
  asyncHandler(async (req, res) => {
    const body = req.body as CreateCuttingPlanDto;
    sendCreated(res, await cuttingPlansService.createForAssignment(body.mapc));
  }),
);

export const workerCuttingPlansRouter = Router();
workerCuttingPlansRouter.use(authMiddleware, requireRole("WORKER", "ADMIN"));

workerCuttingPlansRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    sendOk(res, await cuttingPlansService.listForWorker(req.user!.mand));
  }),
);

workerCuttingPlansRouter.post(
  "/:id/complete",
  validate(cuttingPlanIdParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const id = (req.params as unknown as { id: number }).id;
    sendOk(res, await cuttingPlansService.completePlan(id, req.user!.mand));
  }),
);

workerCuttingPlansRouter.post(
  "/:id/report",
  validate(cuttingPlanIdParamSchema, "params"),
  validate(reportIssueSchema, "body"),
  asyncHandler(async (req, res) => {
    const id = (req.params as unknown as { id: number }).id;
    const body = req.body as ReportIssueDto;
    sendOk(res, await cuttingPlansService.reportIssue(id, req.user!.mand, body.ghichu));
  }),
);
