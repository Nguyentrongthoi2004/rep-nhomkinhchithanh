import { Router } from "express";
import { asyncHandler } from "@/lib/asyncHandler";
import { HttpError, sendOk } from "@/lib/http";
import { authMiddleware } from "@/middlewares/auth";
import { requireRole } from "@/middlewares/rbac";
import { validate } from "@/middlewares/validate";
import { sendPaymentReceiptEmail, sendQuoteEmail } from "@/lib/mailer";
import {
  sendPaymentReceiptEmailSchema,
  sendQuoteEmailSchema,
  type SendPaymentReceiptEmailDto,
  type SendQuoteEmailDto,
} from "./emails.schema";
import { ordersService } from "@/modules/orders/orders.service";

export const emailsRouter = Router();
emailsRouter.use(authMiddleware, requireRole("ADMIN"));

emailsRouter.post(
  "/send-quote",
  validate(sendQuoteEmailSchema, "body"),
  asyncHandler(async (req, res) => {
    const body = req.body as SendQuoteEmailDto;
    try {
      const result = await sendQuoteEmail(body);
      const quoteTracking =
        body.madh != null ? await ordersService.markQuoteSent(body.madh, body.email) : null;
      sendOk(res, { ...result, quoteTracking });
    } catch (err: unknown) {
      if (err instanceof HttpError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      throw HttpError.internal(msg);
    }
  }),
);

emailsRouter.post(
  "/send-payment-receipt",
  validate(sendPaymentReceiptEmailSchema, "body"),
  asyncHandler(async (req, res) => {
    const body = req.body as SendPaymentReceiptEmailDto;
    try {
      sendOk(res, await sendPaymentReceiptEmail(body));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw HttpError.internal(msg);
    }
  }),
);
