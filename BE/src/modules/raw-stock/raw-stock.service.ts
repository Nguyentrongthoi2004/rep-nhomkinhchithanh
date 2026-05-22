import { supabaseAdmin } from "@/lib/supabase";
import { HttpError } from "@/lib/http";
import type {
  CreateBatchDto,
  CutActionDto,
  RawStockGroupedByDayQuery,
  RawStockListQuery,
  UpdateRawStockDto,
} from "./raw-stock.schema";

const TABLE = "khothanhphoi";
const VATTU_TABLE = "vattu";
const BATCH_TABLE = "lonhap";
const LOG_TABLE = "nhatkygiacong";

const SELECT_WITH_VATTU =
  "maphoi, chieudaibandau, chieudaihientai, trangthai, mavt, malonhap, vattu:mavt(tenvt, donvitinh), lonhap:malonhap(ngaynhap, nhacungcap)";

const VN_TZ = "Asia/Ho_Chi_Minh";
const GROUP_FETCH_PAGE = 1000;

function calendarDayVN(isoLike: string): string | undefined {
  const d = new Date(isoLike);
  if (Number.isNaN(d.getTime())) return undefined;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function currentYearVN(): number {
  const y = new Intl.DateTimeFormat("en-CA", { timeZone: VN_TZ, year: "numeric" }).format(new Date());
  return parseInt(y, 10);
}

function currentMonthVN(): number {
  const m = new Intl.DateTimeFormat("en-CA", { timeZone: VN_TZ, month: "2-digit" }).format(new Date());
  return parseInt(m, 10);
}

function dayMatchesFilter(ngay: string, nam?: number, thang?: number): boolean {
  const [y, m] = ngay.split("-").map((x) => parseInt(x, 10));
  if (nam !== undefined && y !== nam) return false;
  if (thang !== undefined && m !== thang) return false;
  return true;
}

function sanitizeIlikeTerm(raw: string) {
  return raw.replace(/[%_\\]/g, "").trim().slice(0, 120);
}

async function headCountForStatus(status?: string) {
  let qb = supabaseAdmin.from(TABLE).select("*", { count: "exact", head: true });
  if (status) qb = qb.eq("trangthai", status);
  const { count, error } = await qb;
  if (error) throw HttpError.internal(error.message);
  return count ?? 0;
}

export type RawStockPageResult = {
  items: unknown[];
  total: number;
  page: number;
  pageSize: number;
};

export type RawStockSummary = {
  total: number;
  moi: number;
  conDu: number;
  boDi: number;
};

export type RawStockGroupedByDayVattu = {
  mavt: number;
  tenvt: string;
  donvitinh?: string | null;
  soLuongThanh: number;
};

export type RawStockGroupedByDayBatch = {
  malonhap: number;
  nhacungcap: string | null;
  ngaynhap: string;
  soLuongThanh: number;
  vattus: RawStockGroupedByDayVattu[];
};

export type RawStockGroupedByDay = {
  /** YYYY-MM-DD theo calendar Việt Nam */
  ngay: string;
  soLuongThanh: number;
  batches: RawStockGroupedByDayBatch[];
};

export type RawStockGroupedByImportDayResult = {
  days: RawStockGroupedByDay[];
  /** Số thanh khớp bộ lọc (đã nhóm) */
  totalThanhMatched: number;
};

type GroupRow = {
  mavt: number;
  malonhap: number;
  vattu?: { tenvt?: string; donvitinh?: string | null } | null;
  lonhap?: { ngaynhap?: string; nhacungcap?: string | null } | null;
};

export const rawStockService = {
  // Lấy toàn bộ danh sách phôi trong kho
  async list() {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select(SELECT_WITH_VATTU)
      .order("maphoi", { ascending: false });
    if (error) throw HttpError.internal(error.message);
    return data ?? [];
  },

  async getStockSummary(): Promise<RawStockSummary> {
    const [total, moi, conDu, boDi] = await Promise.all([
      headCountForStatus(undefined),
      headCountForStatus("MOI"),
      headCountForStatus("CON_DU"),
      headCountForStatus("BO_DI"),
    ]);
    return { total, moi, conDu, boDi };
  },

  async listPaged(query: RawStockListQuery): Promise<RawStockPageResult> {
    const { page, pageSize, mavt, trangthai, minLength, lengthMode, sortBy, order } = query;
    const ascending = order === "asc";

    let filterByMaphoi: number | undefined;
    let filterByMavtFromSearch: number | undefined;
    let mavtIdsFromName: number[] | undefined;

    const qRaw = query.q?.trim() ?? "";
    const qSafe = sanitizeIlikeTerm(qRaw);

    if (qRaw) {
      const uidM = /^uid-?\s*0*(\d+)$/i.exec(qRaw.trim());
      if (uidM) {
        filterByMaphoi = parseInt(uidM[1], 10);
      } else {
        const vtM = /^vt-?\s*(\d+)$/i.exec(qRaw.trim());
        if (vtM) {
          filterByMavtFromSearch = parseInt(vtM[1], 10);
        } else if (/^\d+$/.test(qRaw.trim())) {
          filterByMaphoi = parseInt(qRaw.trim(), 10);
        } else if (qSafe) {
          const { data: vtRows, error: vtErr } = await supabaseAdmin
            .from(VATTU_TABLE)
            .select("mavt")
            .ilike("tenvt", `%${qSafe}%`)
            .limit(400);
          if (vtErr) throw HttpError.internal(vtErr.message);
          mavtIdsFromName = [...new Set((vtRows ?? []).map((r: { mavt: number }) => r.mavt))];
          if (mavtIdsFromName.length === 0) {
            return { items: [], total: 0, page, pageSize };
          }
        }
      }
    }

    let qb = supabaseAdmin.from(TABLE).select(SELECT_WITH_VATTU, { count: "exact" });

    if (filterByMaphoi !== undefined) {
      qb = qb.eq("maphoi", filterByMaphoi);
    }

    const effectiveMavt = mavt ?? filterByMavtFromSearch;
    if (effectiveMavt !== undefined) {
      qb = qb.eq("mavt", effectiveMavt);
    }

    if (query.malonhap !== undefined) {
      qb = qb.eq("malonhap", query.malonhap);
    }

    if (mavtIdsFromName) {
      qb = qb.in("mavt", mavtIdsFromName);
    }

    if (trangthai) {
      qb = qb.eq("trangthai", trangthai);
    }

    if (minLength !== undefined) {
      qb = lengthMode === "exact" ? qb.eq("chieudaihientai", minLength) : qb.gte("chieudaihientai", minLength);
      if (!trangthai) {
        qb = qb.neq("trangthai", "BO_DI");
      }
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

  /**
   * Gom thanh phôi theo ngày nhập kho (calendar VN) → lô → số lượng theo vật tư.
   * Dùng cho màn hình admin xem nhanh theo ngày/tháng/năm.
   */
  async groupedByImportDay(query: RawStockGroupedByDayQuery): Promise<RawStockGroupedByImportDayResult> {
    const { mavt } = query;
    const effectiveNam = query.nam ?? currentYearVN();
    const effectiveThang = query.thang ?? currentMonthVN();

    const yyyy = String(effectiveNam).padStart(4, "0");
    const mm = String(effectiveThang).padStart(2, "0");
    const start = `${yyyy}-${mm}-01`;
    const nextMonth = effectiveThang === 12 ? { y: effectiveNam + 1, m: 1 } : { y: effectiveNam, m: effectiveThang + 1 };
    const next = `${String(nextMonth.y).padStart(4, "0")}-${String(nextMonth.m).padStart(2, "0")}-01`;

    // Bước 1: lấy danh sách lô nhập thuộc tháng (lọc theo DB, tránh quét full kho)
    const batchIds: number[] = [];
    {
      const { data: batches, error: batchErr } = await supabaseAdmin
        .from(BATCH_TABLE)
        .select("malonhap")
        .gte("ngaynhap", start)
        .lt("ngaynhap", next)
        .order("malonhap", { ascending: false })
        .limit(5000);
      if (batchErr) throw HttpError.internal(batchErr.message);
      for (const b of (batches ?? []) as Array<{ malonhap: number }>) batchIds.push(b.malonhap);
    }

    if (batchIds.length === 0) return { days: [], totalThanhMatched: 0 };

    // Bước 2: lấy kho theo danh sách lô, có thể thêm bộ lọc vật tư.
    const all: GroupRow[] = [];
    let from = 0;
    for (;;) {
      let qb = supabaseAdmin
        .from(TABLE)
        .select(SELECT_WITH_VATTU)
        .in("malonhap", batchIds)
        .order("maphoi", { ascending: false });
      if (mavt !== undefined) qb = qb.eq("mavt", mavt);
      const { data, error } = await qb.range(from, from + GROUP_FETCH_PAGE - 1);
      if (error) throw HttpError.internal(error.message);
      const chunk = (data ?? []) as GroupRow[];
      if (chunk.length === 0) break;
      all.push(...chunk);
      if (chunk.length < GROUP_FETCH_PAGE) break;
      from += GROUP_FETCH_PAGE;
    }

    type VtAgg = { tenvt: string; donvitinh?: string | null; count: number };
    type BatchAgg = { nhacungcap: string | null; ngaynhap: string; vattus: Map<number, VtAgg>; count: number };
    const byDay = new Map<string, Map<number, BatchAgg>>();

    for (const row of all) {
      const nhapIso = row.lonhap?.ngaynhap;
      const ngay = nhapIso ? calendarDayVN(nhapIso) : undefined;
      if (!ngay) continue;
      if (!dayMatchesFilter(ngay, effectiveNam, effectiveThang)) continue;

      let batches = byDay.get(ngay);
      if (!batches) {
        batches = new Map();
        byDay.set(ngay, batches);
      }

      const malonhap = row.malonhap;
      let batchAgg = batches.get(malonhap);
      if (!batchAgg) {
        batchAgg = {
          nhacungcap: row.lonhap?.nhacungcap ?? null,
          ngaynhap: nhapIso ?? "",
          vattus: new Map(),
          count: 0,
        };
        batches.set(malonhap, batchAgg);
      }
      batchAgg.count += 1;

      const tenvt = row.vattu?.tenvt ?? `#${row.mavt}`;
      const donvitinh = row.vattu?.donvitinh ?? null;
      const prevVt = batchAgg.vattus.get(row.mavt);
      if (prevVt) {
        prevVt.count += 1;
      } else {
        batchAgg.vattus.set(row.mavt, { tenvt, donvitinh, count: 1 });
      }
    }

    const days: RawStockGroupedByDay[] = [...byDay.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
      .map(([ngayKey, batchesMap]) => {
        const batches: RawStockGroupedByDayBatch[] = [...batchesMap.entries()]
          .sort((a, b) => b[0] - a[0])
          .map(([mid, agg]) => ({
            malonhap: mid,
            nhacungcap: agg.nhacungcap,
            ngaynhap: agg.ngaynhap,
            soLuongThanh: agg.count,
            vattus: [...agg.vattus.entries()]
              .sort((a, b) => a[0] - b[0])
              .map(([mavtId, v]) => ({
                mavt: mavtId,
                tenvt: v.tenvt,
                donvitinh: v.donvitinh,
                soLuongThanh: v.count,
              })),
          }));
        const soLuongThanh = batches.reduce((s, b) => s + b.soLuongThanh, 0);
        return { ngay: ngayKey, soLuongThanh, batches };
      });

    const totalThanhMatched = days.reduce((s, d) => s + d.soLuongThanh, 0);

    return { days, totalThanhMatched };
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

  // Quản trị viên nhập lô phôi mới vào kho. Tạo 1 lô nhập + N thanh phôi (mỗi thanh = 1 bản ghi Immutable ID).
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
      // Nếu tạo phôi lỗi sau khi đã tạo lô, cố gắng hoàn tác bản ghi lô để tránh dữ liệu mồ côi.
      await supabaseAdmin.from(BATCH_TABLE).delete().eq("malonhap", batch.malonhap);
      throw HttpError.internal(insErr.message);
    }

    return { batch, items: inserted ?? [] };
  },

  // Quản trị viên cập nhật thông tin 1 thanh phôi (chiều dài hiện tại, trạng thái).
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

  // Thợ ghi nhận cắt phôi: trừ chiều dài, cập nhật trạng thái (CON_DU/BO_DI), ghi nhật ký gia công.
  async recordCut(dto: CutActionDto, workerId: number) {
    // 1. Đọc trạng thái hiện tại của phôi.
    const current = await this.getById(dto.maphoi);
    const before = current.chieudaihientai as number;
    const after = before - dto.payload.cutLength;
    if (after < 0) {
      throw HttpError.badRequest(
        `cutLength ${dto.payload.cutLength} exceeds remaining ${before}`,
      );
    }

    const nextStatus = after === 0 ? "BO_DI" : before === after ? current.trangthai : "CON_DU";

    // 2. Cập nhật lại bản ghi phôi.
    const { data: updated, error: upErr } = await supabaseAdmin
      .from(TABLE)
      .update({ chieudaihientai: after, trangthai: nextStatus })
      .eq("maphoi", dto.maphoi)
      .select(SELECT_WITH_VATTU)
      .single();
    if (upErr) throw HttpError.internal(upErr.message);

    // 3. Ghi nhật ký sự kiện cắt phôi.
    const { error: logErr } = await supabaseAdmin.from(LOG_TABLE).insert({
      maphoi: dto.maphoi,
      matho: workerId,
      sukien: "CAT",
      chieudaitruoc: before,
      chieudaisau: after,
      ghichu: dto.payload.ghichu ?? null,
    });
    if (logErr) {
      // Không làm hỏng luồng worker, nhưng vẫn báo lỗi để vận hành kiểm tra RLS/schema.
      throw HttpError.internal(`Updated stock but failed to log event: ${logErr.message}`);
    }

    return updated;
  },
};
