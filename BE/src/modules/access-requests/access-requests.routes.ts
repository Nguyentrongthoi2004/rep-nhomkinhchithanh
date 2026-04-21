import { Router } from "express";
import { asyncHandler } from "@/lib/asyncHandler";
import { HttpError, sendCreated, sendOk } from "@/lib/http";
import { authMiddleware } from "@/middlewares/auth";
import { requireRole } from "@/middlewares/rbac";
import { validate } from "@/middlewares/validate";
import {
  accessRequestIdParamSchema,
  createAccessRequestSchema,
  updateAccessRequestSchema,
  type CreateAccessRequestDto,
  type UpdateAccessRequestDto,
} from "./access-requests.schema";
import { accessRequestsService } from "./access-requests.service";

export const adminAccessRequestsRouter = Router();
adminAccessRequestsRouter.use(authMiddleware, requireRole("ADMIN"));

adminAccessRequestsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    sendOk(res, await accessRequestsService.list());
  }),
);

adminAccessRequestsRouter.patch(
  "/:id",
  validate(accessRequestIdParamSchema, "params"),
  validate(updateAccessRequestSchema, "body"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw HttpError.unauthorized();
    const id = (req.params as unknown as { id: number }).id;
    sendOk(res, await accessRequestsService.update(id, req.body as UpdateAccessRequestDto, req.user.mand));
  }),
);

export const publicAccessRequestsRouter = Router();
publicAccessRequestsRouter.post(
  "/request-access",
  validate(createAccessRequestSchema, "body"),
  asyncHandler(async (req, res) => {
    sendCreated(res, await accessRequestsService.create(req.body as CreateAccessRequestDto));
  }),
);
