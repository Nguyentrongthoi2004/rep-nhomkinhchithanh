import { Router } from "express";
import { asyncHandler } from "@/lib/asyncHandler";
import { sendCreated, sendOk } from "@/lib/http";
import { authMiddleware } from "@/middlewares/auth";
import { requireRole } from "@/middlewares/rbac";
import { validate } from "@/middlewares/validate";
import {
  createUserSchema,
  updateUserActionSchema,
  userIdParamSchema,
  type CreateUserDto,
  type UpdateUserActionDto,
} from "./users.schema";
import { usersService } from "./users.service";

export const usersRouter = Router();
usersRouter.use(authMiddleware, requireRole("ADMIN"));

usersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    sendOk(res, await usersService.list());
  }),
);

usersRouter.post(
  "/",
  validate(createUserSchema, "body"),
  asyncHandler(async (req, res) => {
    sendCreated(res, await usersService.create(req.body as CreateUserDto));
  }),
);

usersRouter.patch(
  "/:id",
  validate(userIdParamSchema, "params"),
  validate(updateUserActionSchema, "body"),
  asyncHandler(async (req, res) => {
    const id = (req.params as unknown as { id: number }).id;
    sendOk(res, await usersService.update(id, req.body as UpdateUserActionDto));
  }),
);
