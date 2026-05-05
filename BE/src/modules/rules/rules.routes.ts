import { Router } from "express";
import { asyncHandler } from "@/lib/asyncHandler";
import { sendOk } from "@/lib/http";
import { authMiddleware } from "@/middlewares/auth";
import { requireRole } from "@/middlewares/rbac";
import { validate } from "@/middlewares/validate";
import { ruleCodeParamSchema, upsertRuleSchema, type UpsertRuleDto } from "./rules.schema";
import { rulesService } from "./rules.service";

export const rulesRouter = Router();
rulesRouter.use(authMiddleware, requireRole("ADMIN"));

rulesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    sendOk(res, await rulesService.list());
  }),
);

rulesRouter.put(
  "/:code",
  validate(ruleCodeParamSchema, "params"),
  validate(upsertRuleSchema, "body"),
  asyncHandler(async (req, res) => {
    const code = (req.params as unknown as { code: string }).code;
    sendOk(res, await rulesService.upsert(code, req.body as UpsertRuleDto));
  }),
);
