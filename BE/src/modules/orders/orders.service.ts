import { HttpError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import type { CreateOrderDto, UpdateOrderStatusDto } from "./orders.schema";

type CreateOrderItem = CreateOrderDto["items"][number];

const ORDER_SELECT = `
  madh,
  ngaytao,
  trangthai,
  tonggiatri,
  khachhang:makh ( hoten ),
  chitietdh ( mactdh )
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

export const ordersService = {
  async list() {
    const { data, error } = await supabaseAdmin.from("donhang").select(ORDER_SELECT).order("madh", { ascending: false });
    if (error) throw HttpError.internal(error.message);
    return data ?? [];
  },

  async listBrief() {
    const { data, error } = await supabaseAdmin.from("donhang").select(BRIEF_SELECT).order("madh", { ascending: false });
    if (error) throw HttpError.internal(error.message);
    return data ?? [];
  },

  async create(dto: CreateOrderDto) {
    const customerId = await this.getOrCreateCustomer(dto.customer, dto.phone);

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
      const detailPayload = dto.items.map((item) => ({
        madh: order.madh,
        mavt: item.mavt ?? null,
        mota: buildOrderItemDescription(item),
        chieudaicat: getStoredCutLength(item),
        soluong: item.qty,
        dongiadongbang: 0,
        thanhtien: 0,
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

  async remove(id: number) {
    const { error } = await supabaseAdmin.from("donhang").delete().eq("madh", id);
    if (error) throw HttpError.internal(error.message);
  },

  async getOrCreateCustomer(customerName: string, phone: string) {
    const { data: existing, error: findErr } = await supabaseAdmin
      .from("khachhang")
      .select("makh")
      .eq("sdt", phone)
      .maybeSingle();
    if (findErr) throw HttpError.internal(findErr.message);
    if (existing) return existing.makh as number;

    const { data, error } = await supabaseAdmin
      .from("khachhang")
      .insert({ hoten: customerName, sdt: phone })
      .select("makh")
      .single();
    if (error) throw HttpError.internal(error.message);
    return data.makh as number;
  },
};
