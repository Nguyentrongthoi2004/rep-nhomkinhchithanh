import { HttpError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";

export type ActivityLogAction =
  | "ORDER_CREATED"
  | "ORDER_BOM_UPDATED"
  | "ORDER_PRICE_APPROVED"
  | "ASSIGNMENT_CREATED"
  | "CUTTING_PLAN_CREATED"
  | "CUTTING_PLAN_COMPLETED"
  | "CUTTING_ISSUE_REPORTED"
  | "CUTTING_PROPOSAL_SUBMITTED"
  | "CUTTING_PROPOSAL_APPROVED"
  | "CUTTING_PROPOSAL_REJECTED"
  | "PAYMENT_RECORDED";

export type ActivityLogTargetType = "donhang" | "phancong" | "sodocat" | "dexuatcat" | "giaodich";

export type ActivityLogDetails = Record<string, unknown>;

type CreateActivityLogInput = {
  userId: number | null;
  action: ActivityLogAction;
  targetType: ActivityLogTargetType;
  targetId: string | number;
  details?: ActivityLogDetails;
};

export type ListActivityLogParams = {
  page: number;
  pageSize: number;
  action?: string;
  targetType?: string;
  userId?: number;
  q?: string;
};

export type ActivityLogRow = {
  id: number;
  user_id: number | null;
  action: string;
  target_type: string;
  target_id: string;
  details: ActivityLogDetails | null;
  created_at: string;
  nguoidung?: { hoten?: string | null; tendangnhap?: string | null } | null;
};

function clampPage(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

function clampPageSize(value: number) {
  if (!Number.isFinite(value)) return 20;
  return Math.min(100, Math.max(5, Math.floor(value)));
}

export const activityLogsService = {
  async record(input: CreateActivityLogInput) {
    const { error } = await supabaseAdmin.from("activity_logs").insert({
      user_id: input.userId,
      action: input.action,
      target_type: input.targetType,
      target_id: String(input.targetId),
      details: input.details ?? {},
    });

    if (error) {
      console.error("[activity_logs] record failed", {
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        message: error.message,
      });
    }
  },

  async list(params: ListActivityLogParams) {
    const page = clampPage(params.page);
    const pageSize = clampPageSize(params.pageSize);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabaseAdmin
      .from("activity_logs")
      .select(
        "id, user_id, action, target_type, target_id, details, created_at, nguoidung:user_id(hoten, tendangnhap)",
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    if (params.action) query = query.eq("action", params.action);
    if (params.targetType) query = query.eq("target_type", params.targetType);
    if (params.userId) query = query.eq("user_id", params.userId);
    if (params.q) {
      const escaped = params.q.replace(/[%_]/g, "\\$&");
      query = query.or(`action.ilike.%${escaped}%,target_type.ilike.%${escaped}%,target_id.ilike.%${escaped}%`);
    }

    const { data, error, count } = await query.range(from, to);
    if (error) throw HttpError.internal(error.message);

    return {
      items: (data ?? []) as ActivityLogRow[],
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
    };
  },
};
