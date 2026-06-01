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
  simulateSchema,
  submitProposalSchema,
  proposalIdParamSchema,
  approveProposalSchema,
  rejectProposalSchema,
  type SimulateDto,
  type SubmitProposalDto,
  type ApproveProposalDto,
  type RejectProposalDto,
} from "./cutting-plans.schema";
import { cuttingPlansService } from "./cutting-plans.service";

function parseOptionalNumber(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

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
    sendCreated(res, await cuttingPlansService.createForAssignment(body.mapc, req.user!.mand));
  }),
);

adminCuttingPlansRouter.get(
  "/proposals",
  asyncHandler(async (req, res) => {
    const mapc = req.query.mapc ? Number(req.query.mapc) : undefined;
    sendOk(res, await cuttingPlansService.listProposals(mapc));
  }),
);

adminCuttingPlansRouter.get(
  "/proposals/:id",
  validate(proposalIdParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const id = (req.params as unknown as { id: number }).id;
    sendOk(res, await cuttingPlansService.getProposalDetail(id));
  }),
);

adminCuttingPlansRouter.post(
  "/proposals/:id/approve",
  validate(proposalIdParamSchema, "params"),
  validate(approveProposalSchema, "body"),
  asyncHandler(async (req, res) => {
    const id = (req.params as unknown as { id: number }).id;
    const body = req.body as ApproveProposalDto;
    sendOk(res, await cuttingPlansService.approveProposal(id, req.user!.mand, body.ghichu));
  }),
);

adminCuttingPlansRouter.post(
  "/proposals/:id/reject",
  validate(proposalIdParamSchema, "params"),
  validate(rejectProposalSchema, "body"),
  asyncHandler(async (req, res) => {
    const id = (req.params as unknown as { id: number }).id;
    const body = req.body as RejectProposalDto;
    sendOk(res, await cuttingPlansService.rejectProposal(id, req.user!.mand, body.ghichu));
  }),
);

export const workerCuttingPlansRouter = Router();
workerCuttingPlansRouter.use(authMiddleware, requireRole("WORKER"));

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

workerCuttingPlansRouter.post(
  "/simulate",
  requireRole("WORKER"),
  validate(simulateSchema, "body"),
  asyncHandler(async (req, res) => {
    const body = req.body as SimulateDto;
    sendOk(res, await cuttingPlansService.simulateCuts(body.mapc, { workerId: req.user!.mand, returnShortages: true }));
  }),
);

workerCuttingPlansRouter.get(
  "/proposals",
  asyncHandler(async (req, res) => {
    sendOk(res, await cuttingPlansService.listWorkerProposals(req.user!.mand, parseOptionalNumber(req.query.mapc)));
  }),
);

workerCuttingPlansRouter.post(
  "/proposals",
  validate(submitProposalSchema, "body"),
  asyncHandler(async (req, res) => {
    const body = req.body as SubmitProposalDto;
    sendCreated(res, await cuttingPlansService.submitProposal(body.mapc, req.user!.mand, body));
  }),
);

export const adminCuttingProposalsRouter = Router();
adminCuttingProposalsRouter.use(authMiddleware, requireRole("ADMIN"));

adminCuttingProposalsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const mapc = req.query.mapc ? Number(req.query.mapc) : undefined;
    sendOk(res, await cuttingPlansService.listProposals(mapc));
  }),
);

adminCuttingProposalsRouter.get(
  "/:id",
  validate(proposalIdParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const id = (req.params as unknown as { id: number }).id;
    sendOk(res, await cuttingPlansService.getProposalDetail(id));
  }),
);

adminCuttingProposalsRouter.post(
  "/:id/approve",
  validate(proposalIdParamSchema, "params"),
  validate(approveProposalSchema, "body"),
  asyncHandler(async (req, res) => {
    const id = (req.params as unknown as { id: number }).id;
    const body = req.body as ApproveProposalDto;
    sendOk(res, await cuttingPlansService.approveProposal(id, req.user!.mand, body.ghichu));
  }),
);

adminCuttingProposalsRouter.post(
  "/:id/reject",
  validate(proposalIdParamSchema, "params"),
  validate(rejectProposalSchema, "body"),
  asyncHandler(async (req, res) => {
    const id = (req.params as unknown as { id: number }).id;
    const body = req.body as RejectProposalDto;
    sendOk(res, await cuttingPlansService.rejectProposal(id, req.user!.mand, body.ghichu));
  }),
);

export const workerCuttingProposalsRouter = Router();
workerCuttingProposalsRouter.use(authMiddleware, requireRole("WORKER"));

workerCuttingProposalsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    sendOk(res, await cuttingPlansService.listWorkerProposals(req.user!.mand, parseOptionalNumber(req.query.mapc)));
  }),
);

workerCuttingProposalsRouter.post(
  "/",
  validate(submitProposalSchema, "body"),
  asyncHandler(async (req, res) => {
    const body = req.body as SubmitProposalDto;
    sendCreated(res, await cuttingPlansService.submitProposal(body.mapc, req.user!.mand, body));
  }),
);
