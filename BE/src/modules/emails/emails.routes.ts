import { Router } from "express";
import { asyncHandler } from "@/lib/asyncHandler";
import { HttpError, sendOk } from "@/lib/http";
import { authMiddleware } from "@/middlewares/auth";
import { requireRole } from "@/middlewares/rbac";
import { validate } from "@/middlewares/validate";
import { sendQuoteEmail } from "@/lib/mailer";
import { sendQuoteEmailSchema, type SendQuoteEmailDto } from "./emails.schema";

export const emailsRouter = Router();
emailsRouter.use(authMiddleware, requireRole("ADMIN"));

emailsRouter.post(
  "/send-quote",
  validate(sendQuoteEmailSchema, "body"),
  asyncHandler(async (req, res) => {
    const body = req.body as SendQuoteEmailDto;
    try {
      sendOk(res, await sendQuoteEmail(body));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw HttpError.internal(msg);
    }
  }),
);

