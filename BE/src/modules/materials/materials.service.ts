import { HttpError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import type { CreateMaterialDto, UpdateMaterialDto } from "./materials.schema";

const TABLE = "vattu";
const SELECT = `
  mavt,
  madm,
  tenvt,
  donvitinh,
  chieudaimacdinh,
  dongianhap,
  dongiaban,
  danhmuc:madm ( tendm )
`;

export const materialsService = {
  async list() {
    const { data, error } = await supabaseAdmin.from(TABLE).select(SELECT).order("mavt", { ascending: true });
    if (error) throw HttpError.internal(error.message);
    return data ?? [];
  },

  async listOptions() {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("mavt, tenvt, chieudaimacdinh")
      .order("mavt", { ascending: true });
    if (error) throw HttpError.internal(error.message);
    return data ?? [];
  },

  async create(dto: CreateMaterialDto) {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert({
        tenvt: dto.tenvt,
        madm: dto.madm,
        donvitinh: dto.donvitinh,
        chieudaimacdinh: dto.chieudaimacdinh ?? null,
        dongianhap: dto.dongianhap,
        dongiaban: dto.dongiaban ?? null,
      })
      .select(SELECT)
      .single();
    if (error) throw HttpError.internal(error.message);
    return data;
  },

  async update(id: number, dto: UpdateMaterialDto) {
    const payload: Record<string, unknown> = {};
    if (dto.tenvt !== undefined) payload.tenvt = dto.tenvt;
    if (dto.madm !== undefined) payload.madm = dto.madm;
    if (dto.donvitinh !== undefined) payload.donvitinh = dto.donvitinh;
    if (dto.chieudaimacdinh !== undefined) payload.chieudaimacdinh = dto.chieudaimacdinh;
    if (dto.dongianhap !== undefined) payload.dongianhap = dto.dongianhap;
    if (dto.dongiaban !== undefined) payload.dongiaban = dto.dongiaban;

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update(payload)
      .eq("mavt", id)
      .select(SELECT)
      .single();
    if (error) {
      if (error.code === "PGRST116") throw HttpError.notFound(`Material ${id} not found`);
      throw HttpError.internal(error.message);
    }
    return data;
  },

  async remove(id: number) {
    const { error } = await supabaseAdmin.from(TABLE).delete().eq("mavt", id);
    if (error) {
      if (error.code === "23503") throw HttpError.conflict("Material is still referenced by other records");
      throw HttpError.internal(error.message);
    }
  },
};
