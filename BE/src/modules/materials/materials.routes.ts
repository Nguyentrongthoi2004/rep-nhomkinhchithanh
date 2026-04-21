import { Router } from "express";
import { asyncHandler } from "@/lib/asyncHandler";
import { sendCreated, sendNoContent, sendOk } from "@/lib/http";
import { authMiddleware } from "@/middlewares/auth";
import { requireRole } from "@/middlewares/rbac";
import { validate } from "@/middlewares/validate";
import {
  createMaterialSchema,
  materialIdParamSchema,
  updateMaterialSchema,
  type CreateMaterialDto,
  type UpdateMaterialDto,
} from "./materials.schema";
import { materialsService } from "./materials.service";

export const materialsRouter = Router();
materialsRouter.use(authMiddleware, requireRole("ADMIN"));

materialsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    sendOk(res, await materialsService.list());
  }),
);

materialsRouter.post(
  "/",
  validate(createMaterialSchema, "body"),
  asyncHandler(async (req, res) => {
    sendCreated(res, await materialsService.create(req.body as CreateMaterialDto));
  }),
);

materialsRouter.patch(
  "/:id",
  validate(materialIdParamSchema, "params"),
  validate(updateMaterialSchema, "body"),
  asyncHandler(async (req, res) => {
    const id = (req.params as unknown as { id: number }).id;
    sendOk(res, await materialsService.update(id, req.body as UpdateMaterialDto));
  }),
);

materialsRouter.delete(
  "/:id",
  validate(materialIdParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const id = (req.params as unknown as { id: number }).id;
    await materialsService.remove(id);
    sendNoContent(res);
  }),
);

export const materialsOptionsRouter = Router();
materialsOptionsRouter.use(authMiddleware, requireRole("ADMIN"));
materialsOptionsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    sendOk(res, await materialsService.listOptions());
  }),
);
