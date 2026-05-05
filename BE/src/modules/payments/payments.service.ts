import { HttpError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import type { CreatePaymentDto } from "./payments.schema";

const PAYMENT_SELECT = `
  magd,
  madh,
  loaigd,
  phuongthuc,
  sotien,
  ngaygd,
  ghichu,
  donhang:madh (
    madh,
    tonggiatri,
    trangthai,
    khachhang:makh ( hoten, sdt )
  )
`;

function signedAmount(row: { loaigd: string; sotien: number | string }) {
  const amount = Number(row.sotien || 0);
  return row.loaigd === "HUY_DON" ? -amount : amount;
}

export const paymentsService = {
  async list() {
    const [{ data: orders, error: ordersErr }, { data: payments, error: paymentsErr }] = await Promise.all([
      supabaseAdmin
        .from("donhang")
        .select("madh, ngaytao, trangthai, tonggiatri, khachhang:makh(hoten, sdt)")
        .order("madh", { ascending: false }),
      supabaseAdmin.from("giaodich").select("magd, madh, loaigd, phuongthuc, sotien, ngaygd, ghichu").order("magd", { ascending: false }),
    ]);
    if (ordersErr) throw HttpError.internal(ordersErr.message);
    if (paymentsErr) throw HttpError.internal(paymentsErr.message);

    const paidByOrder = new Map<number, number>();
    for (const p of payments ?? []) {
      const key = p.madh as number;
      paidByOrder.set(key, (paidByOrder.get(key) ?? 0) + signedAmount(p as { loaigd: string; sotien: number | string }));
    }

    return (orders ?? []).map((order) => {
      const total = Number(order.tonggiatri || 0);
      const paid = paidByOrder.get(order.madh as number) ?? 0;
      return {
        ...order,
        dathanhtoan: paid,
        conno: Math.max(0, total - paid),
        giaodich: (payments ?? []).filter((p) => p.madh === order.madh),
      };
    });
  },

  async create(dto: CreatePaymentDto) {
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("donhang")
      .select("madh, trangthai")
      .eq("madh", dto.madh)
      .maybeSingle();
    if (orderErr) throw HttpError.internal(orderErr.message);
    if (!order) throw HttpError.notFound(`Order ${dto.madh} not found`);
    if (order.trangthai === "DA_HUY") throw HttpError.badRequest("Khong the ghi thanh toan cho don da huy");

    const { data, error } = await supabaseAdmin
      .from("giaodich")
      .insert({
        madh: dto.madh,
        loaigd: dto.loaigd,
        phuongthuc: dto.phuongthuc,
        sotien: dto.sotien,
        ghichu: dto.ghichu ?? null,
      })
      .select(PAYMENT_SELECT)
      .single();
    if (error) throw HttpError.internal(error.message);

    if (dto.loaigd === "DAT_COC") {
      await supabaseAdmin.from("donhang").update({ trangthai: "DA_COC" }).eq("madh", dto.madh).eq("trangthai", "BAO_GIA_NHAP");
    }
    if (dto.loaigd === "HUY_DON") {
      await supabaseAdmin.from("donhang").update({ trangthai: "DA_HUY" }).eq("madh", dto.madh);
    }

    return data;
  },
};
