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

export const simulateSchema = z.object({
  mapc: z.number().int().positive(),
});
export type SimulateDto = z.infer<typeof simulateSchema>;

export const submitProposalSchema = z.object({
  mapc: z.number().int().positive(),
  lydodexuat: z.string().trim().max(500).optional(),
  simulatedBars: z.array(z.object({
    maphoi: z.number().int().positive(),
    cuts: z.array(z.object({
      mactdh: z.number().int().positive(),
      chieudaicat: z.number().int().positive(),
      thutucat: z.number().int().positive(),
    })).min(1, "Moi phoi de xuat phai co it nhat mot nhat cat"),
  })).min(1, "De xuat cat phai co it nhat mot phoi"),
});
export type SubmitProposalDto = z.infer<typeof submitProposalSchema>;

export const proposalIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const rejectProposalSchema = z.object({
  ghichu: z.string().trim().max(500).optional(),
});
export const approveProposalSchema = z.object({
  ghichu: z.string().trim().max(500).optional(),
});
export type ApproveProposalDto = z.infer<typeof approveProposalSchema>;
export type RejectProposalDto = z.infer<typeof rejectProposalSchema>;
