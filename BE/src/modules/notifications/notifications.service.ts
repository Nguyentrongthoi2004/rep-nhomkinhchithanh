import { HttpError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";

const TABLE = "thongbaodadoc";

export const notificationsService = {
  async getReadState(mand: number) {
    const { data, error } = await supabaseAdmin.from(TABLE).select("dadoctoi").eq("mand", mand).maybeSingle();
    if (error) throw HttpError.internal(error.message);
    return { dadoctoi: (data?.dadoctoi as string | null) ?? null };
  },

  async markReadNow(mand: number) {
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .upsert({ mand, dadoctoi: now }, { onConflict: "mand" })
      .select("dadoctoi")
      .single();
    if (error) throw HttpError.internal(error.message);
    return { dadoctoi: (data?.dadoctoi as string | null) ?? now };
  },
};

