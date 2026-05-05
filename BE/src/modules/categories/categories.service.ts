import { supabaseAdmin } from "@/lib/supabase";
import { HttpError } from "@/lib/http";
import type { CategoriesListPagedQuery, CreateCategoryDto, UpdateCategoryDto } from "./categories.schema";

const TABLE = "danhmuc";

function sanitizeIlikeTerm(raw: string) {
  return raw.replace(/[%_\\]/g, "").trim().slice(0, 120);
}

export const categoriesService = {
  async list() {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("madm, tendm, mota, trangthai, ngaytao")
      .order("madm", { ascending: false });

    if (error) throw HttpError.internal(error.message);
    return data ?? [];
  },

  async listPaged(query: CategoriesListPagedQuery) {
    const { page, pageSize } = query;
    const qSafe = sanitizeIlikeTerm(query.q ?? "");

    let qb = supabaseAdmin.from(TABLE).select("madm, tendm, mota, trangthai, ngaytao", { count: "exact" }).order("madm", { ascending: false });
    if (qSafe) {
      qb = qb.or(`tendm.ilike.%${qSafe}%,mota.ilike.%${qSafe}%`);
    }

    const fromIdx = (page - 1) * pageSize;
    const toIdx = fromIdx + pageSize - 1;
    const { data, error, count } = await qb.range(fromIdx, toIdx);
    if (error) throw HttpError.internal(error.message);

    return {
      items: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
    };
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
