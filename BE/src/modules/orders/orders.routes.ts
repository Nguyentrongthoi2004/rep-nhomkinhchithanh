import { Router } from "express";
import { asyncHandler } from "@/lib/asyncHandler";
import { sendCreated, sendNoContent, sendOk } from "@/lib/http";
import { authMiddleware } from "@/middlewares/auth";
import { requireRole } from "@/middlewares/rbac";
import { validate } from "@/middlewares/validate";
import {
  createOrderSchema,
  orderIdParamSchema,
  updateOrderCustomerSchema,
  updateOrderSchema,
  updateOrderStatusSchema,
  type CreateOrderDto,
  type UpdateOrderCustomerDto,
  type UpdateOrderDto,
  type UpdateOrderStatusDto,
} from "./orders.schema";
import { ordersService } from "./orders.service";

export const ordersRouter = Router();
ordersRouter.use(authMiddleware, requireRole("ADMIN", "WORKER"));

ordersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    sendOk(res, await ordersService.list());
  }),
);

ordersRouter.get(
  "/:id",
  validate(orderIdParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const id = (req.params as unknown as { id: number }).id;
    sendOk(res, await ordersService.getById(id));
  }),
);

ordersRouter.post(
  "/",
  validate(createOrderSchema, "body"),
  asyncHandler(async (req, res) => {
    sendCreated(res, await ordersService.create(req.body as CreateOrderDto));
  }),
);

ordersRouter.post(
  "/:id/approve-price",
  validate(orderIdParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const id = (req.params as unknown as { id: number }).id;
    sendOk(res, await ordersService.approvePrice(id));
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

ordersRouter.patch(
  "/:id/edit",
  validate(orderIdParamSchema, "params"),
  validate(updateOrderSchema, "body"),
  asyncHandler(async (req, res) => {
    const id = (req.params as unknown as { id: number }).id;
    sendOk(res, await ordersService.updateDetails(id, req.body as UpdateOrderDto));
  }),
);

ordersRouter.patch(
  "/:id/customer",
  validate(orderIdParamSchema, "params"),
  validate(updateOrderCustomerSchema, "body"),
  asyncHandler(async (req, res) => {
    const id = (req.params as unknown as { id: number }).id;
    sendOk(res, await ordersService.updateCustomer(id, req.body as UpdateOrderCustomerDto));
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
ordersListRouter.use(authMiddleware, requireRole("ADMIN", "WORKER"));
ordersListRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    sendOk(res, await ordersService.listBrief());
  }),
);
