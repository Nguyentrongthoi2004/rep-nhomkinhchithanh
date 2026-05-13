import { HttpError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import type { CreateOrderDto, UpdateOrderDto, UpdateOrderStatusDto } from "./orders.schema";

type CreateOrderItem = CreateOrderDto["items"][number];

const ORDER_SELECT = `
  madh,
  ngaytao,
  trangthai,
  tonggiatri,
  khachhang:makh ( makh, hoten, sdt, diachi ),
  chitietdh (
    mactdh,
    mavt,
    mota,
    chieudaicat,
    soluong,
    dongiadongbang,
    thanhtien,
    vattu:mavt ( tenvt, donvitinh )
  )
`;

const BRIEF_SELECT = `
  madh,
  trangthai,
  ngaytao,
  khachhang:makh ( hoten )
`;

function toWholeMillimeters(value: number) {
  return Math.trunc(value);
}

function buildOrderItemDescription(item: CreateOrderItem) {
  if (item.w !== undefined && item.h !== undefined) {
    return `${item.name} (${toWholeMillimeters(item.w)} x ${toWholeMillimeters(item.h)} mm)`;
  }

  return item.name;
}

function getStoredCutLength(item: CreateOrderItem) {
  if (item.length !== undefined) {
    return toWholeMillimeters(item.length);
  }

  return null;
}

/** Trùng công thức trên FE (create order): đơn giá theo mét dài hoặc theo m² kính. */
function unitPriceFromMaterialMaster(
  item: CreateOrderItem,
  vt: { dongianhap: number; dongiaban: number | null; chieudaimacdinh: number | null },
): number {
  const base = Number(vt.dongiaban ?? vt.dongianhap ?? 0);
  if (!Number.isFinite(base) || base <= 0) return 0;

  if (item.length !== undefined) {
    const len = toWholeMillimeters(item.length);
    const ref = vt.chieudaimacdinh && vt.chieudaimacdinh > 0 ? vt.chieudaimacdinh : len;
    if (!ref) return 0;
    return Math.round((base * len) / ref);
  }

  if (item.w !== undefined && item.h !== undefined) {
    const w = toWholeMillimeters(item.w);
    const h = toWholeMillimeters(item.h);
    return Math.round((base * w * h) / 1_000_000);
  }

  return 0;
}

async function resolveLineUnitPrices(items: CreateOrderItem[]): Promise<number[]> {
  if (items.length === 0) return [];
  const mavts = [...new Set(items.map((i) => i.mavt))];
  const { data: rows, error } = await supabaseAdmin
    .from("vattu")
    .select("mavt,dongianhap,dongiaban,chieudaimacdinh")
    .in("mavt", mavts);
  if (error) throw HttpError.internal(error.message);
  const map = new Map((rows ?? []).map((r) => [r.mavt as number, r]));

  return items.map((item) => {
    const fromClient = item.unitPrice ?? 0;
    if (fromClient > 0) return fromClient;
    const vt = map.get(item.mavt);
    if (!vt) return 0;
    return unitPriceFromMaterialMaster(item, vt);
  });
}

export const ordersService = {
  async list() {
    const { data, error } = await supabaseAdmin.from("donhang").select(ORDER_SELECT).order("madh", { ascending: false });
    if (error) throw HttpError.internal(error.message);
    return data ?? [];
  },

  async getById(id: number) {
    const { data, error } = await supabaseAdmin.from("donhang").select(ORDER_SELECT).eq("madh", id).maybeSingle();
    if (error) throw HttpError.internal(error.message);
    if (!data) throw HttpError.notFound(`Order ${id} not found`);
    return data;
  },

  async listBrief() {
    const { data, error } = await supabaseAdmin.from("donhang").select(BRIEF_SELECT).order("madh", { ascending: false });
    if (error) throw HttpError.internal(error.message);
    return data ?? [];
  },

  async create(dto: CreateOrderDto) {
    const customerId = await this.getOrCreateCustomer(dto.customer, dto.phone, dto.address ?? null);

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("donhang")
      .insert({
        makh: customerId,
        trangthai: "BAO_GIA_NHAP",
        tonggiatri: dto.totalCost,
      })
      .select("madh")
      .single();
    if (orderErr) throw HttpError.internal(orderErr.message);

    if (dto.items.length > 0) {
      const lineUnitPrices = await resolveLineUnitPrices(dto.items);
      const detailPayload = dto.items.map((item, i) => ({
        madh: order.madh,
        mavt: item.mavt ?? null,
        mota: buildOrderItemDescription(item),
        chieudaicat: getStoredCutLength(item),
        soluong: item.qty,
        dongiadongbang: lineUnitPrices[i] ?? 0,
        thanhtien: (lineUnitPrices[i] ?? 0) * item.qty,
      }));

      const { error: detailErr } = await supabaseAdmin.from("chitietdh").insert(detailPayload);
      if (detailErr) throw HttpError.internal(detailErr.message);
    }

    return {
      madh: order.madh,
      message: `Lưu thành công Đơn hàng #${order.madh}`,
    };
  },

  async updateStatus(id: number, dto: UpdateOrderStatusDto) {
    const { data, error } = await supabaseAdmin
      .from("donhang")
      .update({ trangthai: dto.trangthai })
      .eq("madh", id)
      .select(BRIEF_SELECT)
      .single();
    if (error) {
      if (error.code === "PGRST116") throw HttpError.notFound(`Order ${id} not found`);
      throw HttpError.internal(error.message);
    }
    return data;
  },

  async updateDetails(id: number, dto: UpdateOrderDto) {
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("donhang")
      .select("madh, trangthai")
      .eq("madh", id)
      .maybeSingle();
    if (exErr) throw HttpError.internal(exErr.message);
    if (!existing) throw HttpError.notFound(`Order ${id} not found`);
    if (existing.trangthai !== "BAO_GIA_NHAP") {
      throw HttpError.badRequest("Chỉ cho phép chỉnh sửa khi đơn đang ở trạng thái BÁO_GIÁ_NHẬP");
    }

    const customerId = await this.getOrCreateCustomer(dto.customer, dto.phone, dto.address ?? null);

    const lineUnitPrices = await resolveLineUnitPrices(dto.items);
    const detailPayload = dto.items.map((item, i) => ({
      madh: id,
      mavt: item.mavt ?? null,
      mota: buildOrderItemDescription(item),
      chieudaicat: getStoredCutLength(item),
      soluong: item.qty,
      dongiadongbang: lineUnitPrices[i] ?? 0,
      thanhtien: (lineUnitPrices[i] ?? 0) * item.qty,
    }));

    // Replace full BOM for simplicity (MiniERP scope)
    const { error: delErr } = await supabaseAdmin.from("chitietdh").delete().eq("madh", id);
    if (delErr) throw HttpError.internal(delErr.message);

    if (detailPayload.length > 0) {
      const { error: insErr } = await supabaseAdmin.from("chitietdh").insert(detailPayload);
      if (insErr) throw HttpError.internal(insErr.message);
    }

    const { data: updated, error: upErr } = await supabaseAdmin
      .from("donhang")
      .update({ makh: customerId, tonggiatri: dto.totalCost })
      .eq("madh", id)
      .select(ORDER_SELECT)
      .single();
    if (upErr) throw HttpError.internal(upErr.message);

    return updated;
  },

  async remove(id: number) {
    const { error } = await supabaseAdmin.from("donhang").delete().eq("madh", id);
    if (error) throw HttpError.internal(error.message);
  },

  async getOrCreateCustomer(customerName: string, phone: string, address: string | null) {
    const { data: existing, error: findErr } = await supabaseAdmin
      .from("khachhang")
      .select("makh")
      .eq("sdt", phone)
      .maybeSingle();
    if (findErr) throw HttpError.internal(findErr.message);
    if (existing) {
      await supabaseAdmin.from("khachhang").update({ hoten: customerName, diachi: address }).eq("makh", existing.makh);
      return existing.makh as number;
    }

    const { data, error } = await supabaseAdmin
      .from("khachhang")
      .insert({ hoten: customerName, sdt: phone, diachi: address })
      .select("makh")
      .single();
    if (error) throw HttpError.internal(error.message);
    return data.makh as number;
  },
};
