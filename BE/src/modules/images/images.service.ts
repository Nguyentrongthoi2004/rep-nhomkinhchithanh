import { HttpError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import type { CreateOrderImageDto } from "./images.schema";

const TABLE = "hinhanh";

const SELECT = `
  maha,
  madh,
  duongdan,
  mota,
  thoigian,
  nguoichup,
  nguoidung:nguoichup ( hoten )
`;

export const imagesService = {
  async listByOrder(madh: number) {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select(SELECT)
      .eq("madh", madh)
      .order("thoigian", { ascending: false });
    if (error) throw HttpError.internal(error.message);
    return data ?? [];
  },

  async create(dto: CreateOrderImageDto, userId?: number) {
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("donhang")
      .select("madh")
      .eq("madh", dto.madh)
      .maybeSingle();
    if (orderErr) throw HttpError.internal(orderErr.message);
    if (!order) throw HttpError.notFound(`Order ${dto.madh} not found`);

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert({
        madh: dto.madh,
        duongdan: dto.duongdan,
        mota: dto.mota?.trim() || null,
        nguoichup: userId ?? null,
      })
      .select(SELECT)
      .single();
    if (error) throw HttpError.internal(error.message);
    return data;
  },

  async remove(id: number) {
    const { error } = await supabaseAdmin.from(TABLE).delete().eq("maha", id);
    if (error) throw HttpError.internal(error.message);
  },
};
