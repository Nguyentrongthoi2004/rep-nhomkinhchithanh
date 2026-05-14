import { HttpError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { notificationsService } from "@/modules/notifications/notifications.service";
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

function formatVnd(amount: number | string | null | undefined) {
  return `${Number(amount || 0).toLocaleString("vi-VN")} đ`;
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
      .select("madh, trangthai, tonggiatri")
      .eq("madh", dto.madh)
      .maybeSingle();
    if (orderErr) throw HttpError.internal(orderErr.message);
    if (!order) throw HttpError.notFound(`Order ${dto.madh} not found`);
    if (order.trangthai === "DA_HUY") throw HttpError.badRequest("Không thể ghi thanh toán cho đơn đã hủy");
    if (["KHAO_SAT", "BAO_GIA_NHAP"].includes(order.trangthai as string)) {
      throw HttpError.badRequest("Cần duyệt giá đơn hàng trước khi ghi nhận thanh toán");
    }

    let paidBefore = 0;
    let effectiveTransactionType = dto.loaigd;
    if (dto.loaigd !== "HUY_DON") {
      const { data: existingPayments, error: paidErr } = await supabaseAdmin
        .from("giaodich")
        .select("loaigd, sotien")
        .eq("madh", dto.madh);
      if (paidErr) throw HttpError.internal(paidErr.message);
      paidBefore = (existingPayments ?? []).reduce(
        (sum, row) => sum + signedAmount(row as { loaigd: string; sotien: number | string }),
        0,
      );
      const remaining = Math.max(0, Number(order.tonggiatri || 0) - paidBefore);
      if (dto.sotien > remaining) {
        throw HttpError.badRequest("Số tiền ghi nhận lớn hơn số tiền còn nợ", { remaining });
      }
      if (paidBefore + dto.sotien >= Number(order.tonggiatri || 0)) {
        effectiveTransactionType = "HOAN_TAT";
      }
    }

    const { data, error } = await supabaseAdmin
      .from("giaodich")
      .insert({
        madh: dto.madh,
        loaigd: effectiveTransactionType,
        phuongthuc: dto.phuongthuc,
        sotien: dto.sotien,
        ghichu: dto.ghichu ?? null,
      })
      .select(PAYMENT_SELECT)
      .single();
    if (error) throw HttpError.internal(error.message);

    if (dto.loaigd !== "HUY_DON") {
      const paidAfter = paidBefore + dto.sotien;
      const total = Number(order.tonggiatri || 0);
      const nextStatus = paidAfter >= total ? "DA_THANH_TOAN" : "DA_COC";
      await supabaseAdmin
        .from("donhang")
        .update({ trangthai: nextStatus })
        .eq("madh", dto.madh)
        .in("trangthai", ["DA_DUYET_GIA", "DA_COC", "DA_THANH_TOAN"]);
    }
    if (dto.loaigd === "HUY_DON") {
      await supabaseAdmin.from("donhang").update({ trangthai: "DA_HUY" }).eq("madh", dto.madh);
    }

    void notificationsService
      .createForAdmins({
        title: `Đã ghi nhận thanh toán DH-${dto.madh}`,
        body: `${effectiveTransactionType === "HOAN_TAT" ? "Hoàn tất" : "Đặt cọc"} ${formatVnd(dto.sotien)} cho đơn hàng DH-${dto.madh}.`,
        type: "thanh_toan",
        href: `/admin/thanh-toan`,
        data: {
          doi_tuong: "giaodich",
          ma_doi_tuong: (data as { magd?: number }).magd,
          madh: dto.madh,
        },
      })
      .catch(() => null);

    return data;
  },
};
