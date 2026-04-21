import { supabaseAdmin } from "@/lib/supabase";
import { HttpError } from "@/lib/http";
import type { CreateCategoryDto, UpdateCategoryDto } from "./categories.schema";

const TABLE = "danhmuc";

export const categoriesService = {
  async list() {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("madm, tendm, mota, trangthai, ngaytao")
      .order("madm", { ascending: false });

    if (error) throw HttpError.internal(error.message);
    return data ?? [];
  },

  async getById(id: number) {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("madm, tendm, mota, trangthai, ngaytao")
      .eq("madm", id)
      .maybeSingle();

    if (error) throw HttpError.internal(error.message);
    if (!data) throw HttpError.notFound(`Category ${id} not found`);
    return data;
  },

  async create(dto: CreateCategoryDto) {
    const payload = {
      tendm: dto.tendm,
      mota: dto.mota ?? null,
      trangthai: dto.trangthai ?? "HOAT_DONG",
    };
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert(payload)
      .select("madm, tendm, mota, trangthai, ngaytao")
      .single();

    if (error) {
      if (error.code === "23505") throw HttpError.conflict("Category name already exists");
      throw HttpError.internal(error.message);
    }
    return data;
  },

  async update(id: number, dto: UpdateCategoryDto) {
    const payload: Record<string, unknown> = {};
    if (dto.tendm !== undefined) payload.tendm = dto.tendm;
    if (dto.mota !== undefined) payload.mota = dto.mota;
    if (dto.trangthai !== undefined) payload.trangthai = dto.trangthai;
    if (Object.keys(payload).length === 0) {
      throw HttpError.badRequest("Nothing to update");
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update(payload)
      .eq("madm", id)
      .select("madm, tendm, mota, trangthai, ngaytao")
      .single();

    if (error) {
      if (error.code === "23505") throw HttpError.conflict("Category name already exists");
      if (error.code === "PGRST116") throw HttpError.notFound(`Category ${id} not found`);
      throw HttpError.internal(error.message);
    }
    return data;
  },

  async remove(id: number) {
    const { error } = await supabaseAdmin.from(TABLE).delete().eq("madm", id);
    if (error) {
      if (error.code === "23503") {
        throw HttpError.conflict("Category is still referenced by other records");
      }
      throw HttpError.internal(error.message);
    }
  },
};
