import { HttpError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import type {
  CreateMaterialDto,
  MaterialsListQuery,
  UpdateMaterialDto,
} from "./materials.schema";

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

function sanitizeIlikeTerm(raw: string) {
  return raw.replace(/[%_\\]/g, "").trim().slice(0, 120);
}

export type MaterialsPageResult = {
  items: unknown[];
  total: number;
  page: number;
  pageSize: number;
};

export const materialsService = {
  async listPaged(query: MaterialsListQuery): Promise<MaterialsPageResult> {
    const { page, pageSize, madm, sortBy, order } = query;
    const ascending = order === "asc";

    let qb = supabaseAdmin.from(TABLE).select(SELECT, { count: "exact" });

    const qSafe = query.q !== undefined ? sanitizeIlikeTerm(query.q) : "";
    if (qSafe) {
      const fromVtCode = /^vt-?\s*(\d+)$/i.exec(qSafe)?.[1];
      const mavtParsed = fromVtCode
        ? parseInt(fromVtCode, 10)
        : /^\d+$/.test(qSafe)
          ? parseInt(qSafe, 10)
          : null;
      if (mavtParsed !== null && Number.isFinite(mavtParsed)) {
        qb = qb.or(`tenvt.ilike.%${qSafe}%,mavt.eq.${mavtParsed}`);
      } else {
        qb = qb.ilike("tenvt", `%${qSafe}%`);
      }
    }

    if (madm !== undefined) {
      qb = qb.eq("madm", madm);
    }

    const fromIdx = (page - 1) * pageSize;
    const toIdx = fromIdx + pageSize - 1;

    const { data, error, count } = await qb
      .order(sortBy, { ascending, nullsFirst: false })
      .range(fromIdx, toIdx);

    if (error) throw HttpError.internal(error.message);
    return {
      items: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
    };
  },

  async listOptions() {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("mavt, tenvt, donvitinh, chieudaimacdinh, dongianhap, dongiaban, danhmuc:madm(tendm)")
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
