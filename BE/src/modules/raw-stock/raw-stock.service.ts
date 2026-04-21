import { supabaseAdmin } from "@/lib/supabase";
import { HttpError } from "@/lib/http";
import type {
  CreateBatchDto,
  CutActionDto,
  UpdateRawStockDto,
} from "./raw-stock.schema";

const TABLE = "khothanhphoi";
const BATCH_TABLE = "lonhap";
const LOG_TABLE = "nhatkygiacong";

const SELECT_WITH_VATTU =
  "maphoi, chieudaibandau, chieudaihientai, trangthai, mavt, malonhap, vattu:mavt(tenvt, donvitinh), lonhap:malonhap(ngaynhap, nhacungcap)";

export const rawStockService = {
  async list() {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select(SELECT_WITH_VATTU)
      .order("maphoi", { ascending: false });
    if (error) throw HttpError.internal(error.message);
    return data ?? [];
  },

  async getById(id: number) {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select(SELECT_WITH_VATTU)
      .eq("maphoi", id)
      .maybeSingle();
    if (error) throw HttpError.internal(error.message);
    if (!data) throw HttpError.notFound(`Raw stock ${id} not found`);
    return data;
  },

  /** Admin: create a batch + N raw-stock records */
  async createBatch(dto: CreateBatchDto) {
    const { data: batch, error: batchErr } = await supabaseAdmin
      .from(BATCH_TABLE)
      .insert({ nhacungcap: dto.nhacungcap ?? null })
      .select("malonhap, ngaynhap, nhacungcap")
      .single();
    if (batchErr) throw HttpError.internal(batchErr.message);

    const rows: Array<Record<string, unknown>> = [];
    for (const it of dto.items) {
      for (let i = 0; i < it.quantity; i++) {
        rows.push({
          mavt: it.mavt,
          malonhap: batch.malonhap,
          chieudaibandau: it.chieudaibandau,
          chieudaihientai: it.chieudaibandau,
          trangthai: "MOI",
        });
      }
    }

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from(TABLE)
      .insert(rows)
      .select("maphoi, mavt, malonhap, chieudaibandau, chieudaihientai, trangthai");
    if (insErr) {
      // Attempt to rollback the batch row if we failed
      await supabaseAdmin.from(BATCH_TABLE).delete().eq("malonhap", batch.malonhap);
      throw HttpError.internal(insErr.message);
    }

    return { batch, items: inserted ?? [] };
  },

  /** Admin: patch a single raw-stock record */
  async update(id: number, dto: UpdateRawStockDto) {
    const payload: Record<string, unknown> = {};
    if (dto.chieudaihientai !== undefined) payload.chieudaihientai = dto.chieudaihientai;
    if (dto.trangthai !== undefined) payload.trangthai = dto.trangthai;

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update(payload)
      .eq("maphoi", id)
      .select(SELECT_WITH_VATTU)
      .single();

    if (error) {
      if (error.code === "PGRST116") throw HttpError.notFound(`Raw stock ${id} not found`);
      throw HttpError.internal(error.message);
    }
    return data;
  },

  async remove(id: number) {
    const { error } = await supabaseAdmin.from(TABLE).delete().eq("maphoi", id);
    if (error) {
      if (error.code === "23503") {
        throw HttpError.conflict("Raw stock is still referenced by other records");
      }
      throw HttpError.internal(error.message);
    }
  },

  /**
   * Worker action: record a cut on a raw-stock piece.
   *  - subtract cutLength from chieudaihientai
   *  - toggle status to BO_DI when remainder is 0, else CON_DU
   *  - append a row in nhatkygiacong (loai_su_kien = CAT)
   */
  async recordCut(dto: CutActionDto, workerId: number) {
    // 1. Read current state
    const current = await this.getById(dto.maphoi);
    const before = current.chieudaihientai as number;
    const after = before - dto.payload.cutLength;
    if (after < 0) {
      throw HttpError.badRequest(
        `cutLength ${dto.payload.cutLength} exceeds remaining ${before}`,
      );
    }

    const nextStatus = after === 0 ? "BO_DI" : before === after ? current.trangthai : "CON_DU";

    // 2. Update the raw-stock row
    const { data: updated, error: upErr } = await supabaseAdmin
      .from(TABLE)
      .update({ chieudaihientai: after, trangthai: nextStatus })
      .eq("maphoi", dto.maphoi)
      .select(SELECT_WITH_VATTU)
      .single();
    if (upErr) throw HttpError.internal(upErr.message);

    // 3. Log the event
    const { error: logErr } = await supabaseAdmin.from(LOG_TABLE).insert({
      maphoi: dto.maphoi,
      matho: workerId,
      sukien: "CAT",
      chieudaitruoc: before,
      chieudaisau: after,
      ghichu: dto.payload.ghichu ?? null,
    });
    if (logErr) {
      // Non-fatal for the worker flow, but we surface it so ops can fix RLS/schema
      throw HttpError.internal(`Updated stock but failed to log event: ${logErr.message}`);
    }

    return updated;
  },
};
