import { Router } from "express";
import { asyncHandler } from "@/lib/asyncHandler";
import { sendCreated, sendNoContent, sendOk } from "@/lib/http";
import { authMiddleware } from "@/middlewares/auth";
import { requireRole } from "@/middlewares/rbac";
import { validate } from "@/middlewares/validate";
import {
  createOrderImageSchema,
  imageIdParamSchema,
  orderImagesParamSchema,
  type CreateOrderImageDto,
} from "./images.schema";
import { imagesService } from "./images.service";

export const imagesRouter = Router();
imagesRouter.use(authMiddleware, requireRole("ADMIN"));

imagesRouter.get(
  "/order/:madh",
  validate(orderImagesParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const { madh } = req.params as unknown as { madh: number };
    sendOk(res, await imagesService.listByOrder(madh));
  }),
);

imagesRouter.post(
  "/",
  validate(createOrderImageSchema, "body"),
  asyncHandler(async (req, res) => {
    sendCreated(res, await imagesService.create(req.body as CreateOrderImageDto, req.user?.mand));
  }),
);

imagesRouter.delete(
  "/:id",
  validate(imageIdParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: number };
    await imagesService.remove(id);
    sendNoContent(res);
  }),
);
