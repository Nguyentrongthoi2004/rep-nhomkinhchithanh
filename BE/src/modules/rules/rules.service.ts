import { HttpError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import type { UpsertRuleDto } from "./rules.schema";

const DEFAULT_RULES = [
  { maqt: "BLADE_KERF", tenqt: "Do ho luoi cua", giatri: 4 },
  { maqt: "SAFE_MARGIN", tenqt: "Le an toan bien", giatri: 20 },
  { maqt: "MIN_OFFCUT", tenqt: "Do dai de-xe toi thieu", giatri: 200 },
];

export const rulesService = {
  async list() {
    const { data, error } = await supabaseAdmin.from("quytac").select("maqt, tenqt, giatri").order("maqt");
    if (error) throw HttpError.internal(error.message);
    if (data && data.length > 0) return data;

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("quytac")
      .upsert(DEFAULT_RULES, { onConflict: "maqt" })
      .select("maqt, tenqt, giatri")
      .order("maqt");
    if (insertErr) throw HttpError.internal(insertErr.message);
    return inserted ?? [];
  },

  async upsert(code: string, dto: UpsertRuleDto) {
    const { data, error } = await supabaseAdmin
      .from("quytac")
      .upsert({ maqt: code, tenqt: dto.tenqt, giatri: dto.giatri }, { onConflict: "maqt" })
      .select("maqt, tenqt, giatri")
      .single();
    if (error) throw HttpError.internal(error.message);
    return data;
  },
};
