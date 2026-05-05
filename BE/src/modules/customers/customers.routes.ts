import { Router } from "express";
import { asyncHandler } from "@/lib/asyncHandler";
import { sendCreated, sendNoContent, sendOk } from "@/lib/http";
import { authMiddleware } from "@/middlewares/auth";
import { requireRole } from "@/middlewares/rbac";
import { validate } from "@/middlewares/validate";
import {
  createCustomerSchema,
  customerIdParamSchema,
  updateCustomerSchema,
  type CreateCustomerDto,
  type UpdateCustomerDto,
} from "./customers.schema";
import { customersService } from "./customers.service";

export const customersRouter = Router();
customersRouter.use(authMiddleware, requireRole("ADMIN"));

customersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    sendOk(res, await customersService.list());
  }),
);

customersRouter.get(
  "/:id",
  validate(customerIdParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const id = (req.params as unknown as { id: number }).id;
    sendOk(res, await customersService.getById(id));
  }),
);

customersRouter.post(
  "/",
  validate(createCustomerSchema, "body"),
  asyncHandler(async (req, res) => {
    sendCreated(res, await customersService.create(req.body as CreateCustomerDto));
  }),
);

customersRouter.patch(
  "/:id",
  validate(customerIdParamSchema, "params"),
  validate(updateCustomerSchema, "body"),
  asyncHandler(async (req, res) => {
    const id = (req.params as unknown as { id: number }).id;
    sendOk(res, await customersService.update(id, req.body as UpdateCustomerDto));
  }),
);

customersRouter.delete(
  "/:id",
  validate(customerIdParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const id = (req.params as unknown as { id: number }).id;
    await customersService.remove(id);
    sendNoContent(res);
  }),
);
