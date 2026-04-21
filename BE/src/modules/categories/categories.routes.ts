import { Router } from "express";
import { authMiddleware } from "@/middlewares/auth";
import { requireRole } from "@/middlewares/rbac";
import { validate } from "@/middlewares/validate";
import { asyncHandler } from "@/lib/asyncHandler";
import { categoriesController } from "./categories.controller";
import {
  categoryIdParamSchema,
  createCategorySchema,
  updateCategorySchema,
} from "./categories.schema";

export const categoriesRouter = Router();

// All endpoints here require an authenticated ADMIN
categoriesRouter.use(authMiddleware, requireRole("ADMIN"));

categoriesRouter.get("/", asyncHandler(categoriesController.list));

categoriesRouter.get(
  "/:id",
  validate(categoryIdParamSchema, "params"),
  asyncHandler(categoriesController.getById),
);

categoriesRouter.post(
  "/",
  validate(createCategorySchema, "body"),
  asyncHandler(categoriesController.create),
);

categoriesRouter.patch(
  "/:id",
  validate(categoryIdParamSchema, "params"),
  validate(updateCategorySchema, "body"),
  asyncHandler(categoriesController.update),
);

categoriesRouter.delete(
  "/:id",
  validate(categoryIdParamSchema, "params"),
  asyncHandler(categoriesController.remove),
);
