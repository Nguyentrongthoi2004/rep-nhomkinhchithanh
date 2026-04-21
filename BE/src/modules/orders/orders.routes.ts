import { Router } from "express";
import { asyncHandler } from "@/lib/asyncHandler";
import { sendCreated, sendNoContent, sendOk } from "@/lib/http";
import { authMiddleware } from "@/middlewares/auth";
import { requireRole } from "@/middlewares/rbac";
import { validate } from "@/middlewares/validate";
import {
  createOrderSchema,
  orderIdParamSchema,
  updateOrderStatusSchema,
  type CreateOrderDto,
  type UpdateOrderStatusDto,
} from "./orders.schema";
import { ordersService } from "./orders.service";

export const ordersRouter = Router();
ordersRouter.use(authMiddleware, requireRole("ADMIN"));

ordersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    sendOk(res, await ordersService.list());
  }),
);

ordersRouter.post(
  "/",
  validate(createOrderSchema, "body"),
  asyncHandler(async (req, res) => {
    sendCreated(res, await ordersService.create(req.body as CreateOrderDto));
  }),
);

ordersRouter.patch(
  "/:id",
  validate(orderIdParamSchema, "params"),
  validate(updateOrderStatusSchema, "body"),
  asyncHandler(async (req, res) => {
    const id = (req.params as unknown as { id: number }).id;
    sendOk(res, await ordersService.updateStatus(id, req.body as UpdateOrderStatusDto));
  }),
);

ordersRouter.delete(
  "/:id",
  validate(orderIdParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const id = (req.params as unknown as { id: number }).id;
    await ordersService.remove(id);
    sendNoContent(res);
  }),
);

export const ordersListRouter = Router();
ordersListRouter.use(authMiddleware, requireRole("ADMIN"));
ordersListRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    sendOk(res, await ordersService.listBrief());
  }),
);
