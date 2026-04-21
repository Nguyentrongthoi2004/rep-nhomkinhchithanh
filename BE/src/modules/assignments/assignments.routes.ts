import { Router } from "express";
import { asyncHandler } from "@/lib/asyncHandler";
import { sendCreated, sendNoContent, sendOk } from "@/lib/http";
import { authMiddleware } from "@/middlewares/auth";
import { requireRole } from "@/middlewares/rbac";
import { validate } from "@/middlewares/validate";
import {
  assignmentIdParamSchema,
  createAssignmentSchema,
  updateAssignmentSchema,
  type CreateAssignmentDto,
  type UpdateAssignmentDto,
} from "./assignments.schema";
import { assignmentsService } from "./assignments.service";

export const assignmentsRouter = Router();
assignmentsRouter.use(authMiddleware, requireRole("ADMIN"));

assignmentsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    sendOk(res, await assignmentsService.list());
  }),
);

assignmentsRouter.post(
  "/",
  validate(createAssignmentSchema, "body"),
  asyncHandler(async (req, res) => {
    sendCreated(res, await assignmentsService.create(req.body as CreateAssignmentDto));
  }),
);

assignmentsRouter.patch(
  "/:id",
  validate(assignmentIdParamSchema, "params"),
  validate(updateAssignmentSchema, "body"),
  asyncHandler(async (req, res) => {
    const id = (req.params as unknown as { id: number }).id;
    sendOk(res, await assignmentsService.update(id, req.body as UpdateAssignmentDto));
  }),
);

assignmentsRouter.delete(
  "/:id",
  validate(assignmentIdParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const id = (req.params as unknown as { id: number }).id;
    await assignmentsService.remove(id);
    sendNoContent(res);
  }),
);
