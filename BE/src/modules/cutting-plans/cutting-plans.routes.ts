import { Router } from "express";
import { asyncHandler } from "@/lib/asyncHandler";
import { sendCreated, sendOk } from "@/lib/http";
import { authMiddleware } from "@/middlewares/auth";
import { requireRole } from "@/middlewares/rbac";
import { validate } from "@/middlewares/validate";
import {
  createCuttingPlanSchema,
  cuttingPlanIdParamSchema,
  issueIdParamSchema,
  reportIssueSchema,
  trimIssueSchema,
  type CreateCuttingPlanDto,
  type ReportIssueDto,
  type TrimIssueDto,
} from "./cutting-plans.schema";
import { cuttingPlansService } from "./cutting-plans.service";

export const adminCuttingPlansRouter = Router();
adminCuttingPlansRouter.use(authMiddleware, requireRole("ADMIN"));

export const adminCuttingPlanIssuesRouter = Router();
adminCuttingPlanIssuesRouter.use(authMiddleware, requireRole("ADMIN"));

function registerIssueRoutes(router: Router) {
  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      sendOk(res, await cuttingPlansService.listIssueReports());
    }),
  );

  router.post(
    "/:id/scrap",
    validate(issueIdParamSchema, "params"),
    asyncHandler(async (req, res) => {
      const id = (req.params as unknown as { id: number }).id;
      sendOk(res, await cuttingPlansService.scrapIssue(id, req.user!.mand));
    }),
  );

  router.post(
    "/:id/trim",
    validate(issueIdParamSchema, "params"),
    validate(trimIssueSchema, "body"),
    asyncHandler(async (req, res) => {
      const id = (req.params as unknown as { id: number }).id;
      sendOk(res, await cuttingPlansService.trimIssue(id, req.user!.mand, req.body as TrimIssueDto));
    }),
  );
}

registerIssueRoutes(adminCuttingPlanIssuesRouter);

adminCuttingPlansRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    sendOk(res, await cuttingPlansService.listAdmin());
  }),
);

adminCuttingPlansRouter.use("/issues", adminCuttingPlanIssuesRouter);

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
    sendOk(res, await cuttingPlansService.reportIssue(id, req.user!.mand, body));
  }),
);
