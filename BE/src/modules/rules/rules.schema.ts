import { z } from "zod";

export const ruleCodeParamSchema = z.object({
  code: z.string().trim().min(1).max(50),
});

export const upsertRuleSchema = z.object({
  tenqt: z.string().trim().min(1).max(100),
  giatri: z.number().nonnegative(),
});

export type UpsertRuleDto = z.infer<typeof upsertRuleSchema>;
