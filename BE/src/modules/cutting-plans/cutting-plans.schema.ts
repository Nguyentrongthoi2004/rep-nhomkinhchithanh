import { z } from "zod";

export const createCuttingPlanSchema = z.object({
  mapc: z.number().int().positive(),
});

export const cuttingPlanIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const reportIssueSchema = z.object({
  ghichu: z.string().trim().min(1).max(500),
});

export type CreateCuttingPlanDto = z.infer<typeof createCuttingPlanSchema>;
export type ReportIssueDto = z.infer<typeof reportIssueSchema>;
