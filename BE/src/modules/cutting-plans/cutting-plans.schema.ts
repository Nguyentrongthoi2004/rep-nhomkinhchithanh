import { z } from "zod";

export const createCuttingPlanSchema = z.object({
  mapc: z.number().int().positive(),
});

export const cuttingPlanIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const issueTypeEnum = z.enum([
  "CAT_SAI_KICH_THUOC",
  "PHOI_CONG_VENH",
  "GAY_PHOI",
  "THIEU_VAT_TU",
  "LOI_KHAC",
]);

export const reportIssueSchema = z.object({
  loaiSuCo: issueTypeEnum.default("LOI_KHAC"),
  mota: z.string().trim().min(1).max(800).optional(),
  ghichu: z.string().trim().min(1).max(800).optional(),
});

export const issueIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const trimIssueSchema = z.object({
  cutLength: z.number().int().positive().max(6000),
  ghichu: z.string().trim().max(500).optional().nullable(),
});

export type CreateCuttingPlanDto = z.infer<typeof createCuttingPlanSchema>;
export type ReportIssueDto = z.infer<typeof reportIssueSchema>;
export type TrimIssueDto = z.infer<typeof trimIssueSchema>;
