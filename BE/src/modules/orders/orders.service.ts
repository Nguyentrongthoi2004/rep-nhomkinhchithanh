import { HttpError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { activityLogsService } from "@/modules/activity-logs/activity-logs.service";
import { notificationsService } from "@/modules/notifications/notifications.service";
import type { CreateOrderDto, UpdateOrderCustomerDto, UpdateOrderDto, UpdateOrderStatusDto } from "./orders.schema";

type CreateOrderItem = CreateOrderDto["items"][number];

const ORDER_SELECT = `
  madh,
  ngaytao,
  trangthai,
  tonggiatri,
  khachhang:makh ( makh, hoten, sdt, email, diachi ),
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

const ORDER_LIST_SELECT = `
  madh,
  ngaytao,
  trangthai,
  tonggiatri,
  khachhang:makh ( makh, hoten, sdt, email, diachi ),
  chitietdh ( mactdh )
`;

const ORDER_WITH_QUOTE_SELECT = `
  madh,
  ngaytao,
  trangthai,
  baogia_gui_luc,
  baogia_email,
  tonggiatri,
  khachhang:makh ( makh, hoten, sdt, email, diachi ),
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

function isMissingQuoteTrackingColumn(error: { message?: string; code?: string } | null | undefined) {
  const msg = (error?.message ?? "").toLowerCase();
  return msg.includes("baogia_gui_luc") || msg.includes("baogia_email");
}

const BRIEF_SELECT = `
  madh,
  trangthai,
  ngaytao,
  khachhang:makh ( hoten, email )
`;

// Chuyển đổi kích thước sang milimet nguyên (làm tròn xuống)
function toWholeMillimeters(value: number) {
  return Math.trunc(value);
}

// Tạo mô tả dòng BOM: nếu có W×H thì hiển thị kích thước, nếu không thì chỉ tên vật tư
function buildOrderItemDescription(item: CreateOrderItem) {
  if (item.w !== undefined && item.h !== undefined) {
    return `${item.name} (${toWholeMillimeters(item.w)} x ${toWholeMillimeters(item.h)} mm)`;
  }
  return item.name;
}

function getStoredCutLength(item: CreateOrderItem) {
  if (item.length !== undefined) return toWholeMillimeters(item.length);
  return null;
}

// Tính đơn giá từ master data vật tư: theo tỉ lệ chiều dài hoặc diện tích (W×H)
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

  return Math.round(base);
}

function formatVnd(amount: number | string | null | undefined) {
  return `${Number(amount || 0).toLocaleString("vi-VN")} đ`;
}

// Tính đơn giá cho từng dòng BOM: ưu tiên giá frontend gửi lên, nếu không thì tính từ bảng vattu.
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

export const TERMINAL_ORDER_STATUSES = ["HOAN_THANH", "DA_HUY"];

export function isTerminalOrderState(status: string): boolean {
  return TERMINAL_ORDER_STATUSES.includes(status);
}

export const ordersService = {
  // Lấy danh sách tất cả đơn hàng, sắp xếp mới nhất trước
  async list() {
    const { data, error } = await supabaseAdmin.from("donhang").select(ORDER_LIST_SELECT).order("madh", { ascending: false });
    if (error) throw HttpError.internal(error.message);
    return data ?? [];
  },

  async getById(id: number) {
    const withQuote = await supabaseAdmin.from("donhang").select(ORDER_WITH_QUOTE_SELECT).eq("madh", id).maybeSingle();
    let data: unknown = withQuote.data;
    let error = withQuote.error;
    // Một số DB cũ chưa chạy migration 07 chưa có baogia_*.
    // Cơ chế dự phòng này giúp xem đơn vẫn chạy, còn thao tác báo giá sẽ báo thiếu migration rõ ràng.
    if (isMissingQuoteTrackingColumn(error)) {
      const retry = await supabaseAdmin.from("donhang").select(ORDER_SELECT).eq("madh", id).maybeSingle();
      data = retry.data;
      error = retry.error;
    }
    if (error) throw HttpError.internal(error.message);
    if (!data) throw HttpError.notFound(`Order ${id} not found`);
    return data;
  },

  async listBrief() {
    const { data, error } = await supabaseAdmin.from("donhang").select(BRIEF_SELECT).order("madh", { ascending: false });
    if (error) throw HttpError.internal(error.message);
    return data ?? [];
  },

  // Xử lý tạo đơn hàng mới: tìm/tạo khách hàng theo SĐT → insert đơn → lập BOM → gửi thông báo
  async create(dto: CreateOrderDto, actorId?: number) {
    const customerId = await this.getOrCreateCustomer(dto.customer, dto.phone, dto.address ?? null, dto.email);

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("donhang")
      .insert({
        makh: customerId,
        trangthai: dto.items.length > 0 ? "BAO_GIA_NHAP" : "KHAO_SAT",
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

    void notificationsService
      .createForAdmins({
        title: `Đơn hàng DH-${order.madh} mới`,
        body: `${dto.customer} vừa được tạo ở trạng thái chờ báo giá.`,
        type: "don_hang",
        href: `/admin/don-hang/${order.madh}`,
        data: { doi_tuong: "donhang", ma_doi_tuong: order.madh },
      })
      .catch(() => null);
    void activityLogsService.record({
      userId: actorId ?? null,
      action: "ORDER_CREATED",
      targetType: "donhang",
      targetId: order.madh,
      details: {
        customer: dto.customer,
        phone: dto.phone,
        itemCount: dto.items.length,
        totalCost: dto.totalCost,
      },
    });

    return {
      madh: order.madh,
      message: `Lưu thành công Đơn hàng #${order.madh}`,
    };
  },

  // Cập nhật trạng thái đơn hàng: kiểm tra quy tắc chuyển trạng thái (cần duyệt giá trước khi sản xuất)
  async updateStatus(id: number, dto: UpdateOrderStatusDto) {
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("donhang")
      .select("madh, trangthai")
      .eq("madh", id)
      .maybeSingle();
    if (exErr) throw HttpError.internal(exErr.message);
    if (!existing) throw HttpError.notFound(`Order ${id} not found`);

    if (isTerminalOrderState(existing.trangthai as string)) {
      throw HttpError.badRequest("Đơn hàng đã hoàn thành hoặc đã hủy, không thể thay đổi trạng thái");
    }

    if (
      existing.trangthai === "BAO_GIA_NHAP" &&
      !["BAO_GIA_NHAP", "DA_DUYET_GIA", "DA_HUY"].includes(dto.trangthai)
    ) {
      throw HttpError.badRequest("Cần duyệt giá trước khi chuyển đơn sang bước thanh toán/sản xuất");
    }

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

  // Duyệt giá đơn hàng: kiểm tra đã gửi báo giá (baogia_gui_luc != null) → chuyển trạng thái DA_DUYET_GIA
  async approvePrice(id: number, actorId?: number) {
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("donhang")
      .select("madh, trangthai, baogia_gui_luc")
      .eq("madh", id)
      .maybeSingle();
    if (isMissingQuoteTrackingColumn(exErr)) {
      throw HttpError.badRequest("Chưa chạy migration 07_quote_email_tracking.sql nên chưa thể duyệt giá theo luồng mới.");
    }
    if (exErr) throw HttpError.internal(exErr.message);
    if (!existing) throw HttpError.notFound(`Order ${id} not found`);
    if (isTerminalOrderState(existing.trangthai as string)) {
      throw HttpError.badRequest("Đơn hàng đã hoàn thành hoặc đã hủy, không thể duyệt giá");
    }
    if (existing.trangthai === "DA_HUY") throw HttpError.badRequest("Không thể duyệt giá cho đơn đã hủy");
    if (!["KHAO_SAT", "BAO_GIA_NHAP"].includes(existing.trangthai as string)) {
      throw HttpError.badRequest("Chỉ duyệt giá cho đơn đang chờ duyệt giá");
    }
    if (!existing.baogia_gui_luc) {
      throw HttpError.badRequest("Cần gửi báo giá cho khách trước khi duyệt giá.");
    }

    const { data, error } = await supabaseAdmin
      .from("donhang")
      .update({ trangthai: "DA_DUYET_GIA" })
      .eq("madh", id)
      .select(BRIEF_SELECT)
      .single();
    if (error) throw HttpError.internal(error.message);
    void notificationsService
      .createForAdmins({
        title: `Đã duyệt giá DH-${id}`,
        body: `Đơn hàng DH-${id} đã được khách xác nhận và chuyển sang trạng thái đã duyệt giá.`,
        type: "don_hang",
        href: `/admin/don-hang/${id}`,
        data: { doi_tuong: "donhang", ma_doi_tuong: id },
      })
      .catch(() => null);
    void activityLogsService.record({
      userId: actorId ?? null,
      action: "ORDER_PRICE_APPROVED",
      targetType: "donhang",
      targetId: id,
      details: { previousStatus: existing.trangthai, nextStatus: "DA_DUYET_GIA" },
    });
    return data;
  },

  // Lập/sửa BOM đơn hàng: xóa BOM cũ → tính lại đơn giá → insert BOM mới → reset trạng thái về BAO_GIA_NHAP
  async updateDetails(id: number, dto: UpdateOrderDto, actorId?: number) {
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("donhang")
      .select("madh, trangthai")
      .eq("madh", id)
      .maybeSingle();
    if (exErr) throw HttpError.internal(exErr.message);
    if (!existing) throw HttpError.notFound(`Order ${id} not found`);
    if (isTerminalOrderState(existing.trangthai as string)) {
      throw HttpError.badRequest("Đơn hàng đã hoàn thành hoặc đã hủy, không thể sửa BOM");
    }
    if (!["KHAO_SAT", "BAO_GIA_NHAP"].includes(existing.trangthai as string)) {
      throw HttpError.badRequest("Chỉ cho phép lập/sửa BOM trước khi đơn được duyệt giá.");
    }

    const customerId = await this.getOrCreateCustomer(dto.customer, dto.phone, dto.address ?? null, dto.email);
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

    const { error: delErr } = await supabaseAdmin.from("chitietdh").delete().eq("madh", id);
    if (delErr) throw HttpError.internal(delErr.message);

    if (detailPayload.length > 0) {
      const { error: insErr } = await supabaseAdmin.from("chitietdh").insert(detailPayload);
      if (insErr) throw HttpError.internal(insErr.message);
    }

    let updatePayload: Record<string, unknown> = {
      makh: customerId,
      tonggiatri: dto.totalCost,
      trangthai: "BAO_GIA_NHAP",
      baogia_gui_luc: null,
      baogia_email: null,
    };

    // Khi BOM thay đổi thì báo giá cũ không còn đáng tin, vì vậy reset dấu đã gửi báo giá
    // để buộc quản trị viên gửi lại và chỉ duyệt sau khi khách xác nhận bản mới.
    let { data: updated, error: upErr } = await supabaseAdmin
      .from("donhang")
      .update(updatePayload)
      .eq("madh", id)
      .select(ORDER_SELECT)
      .single();
    if (isMissingQuoteTrackingColumn(upErr)) {
      updatePayload = { makh: customerId, tonggiatri: dto.totalCost, trangthai: "BAO_GIA_NHAP" };
      const retry = await supabaseAdmin.from("donhang").update(updatePayload).eq("madh", id).select(ORDER_SELECT).single();
      updated = retry.data;
      upErr = retry.error;
    }
    if (upErr) throw HttpError.internal(upErr.message);

    void notificationsService
      .createForAdmins({
        title: `Đã lưu BOM DH-${id}`,
        body: `BOM đơn hàng DH-${id} đã được cập nhật, tổng tạm tính ${formatVnd(dto.totalCost)}.`,
        type: "don_hang",
        href: `/admin/don-hang/${id}/bao-gia`,
        data: { doi_tuong: "donhang", ma_doi_tuong: id },
      })
      .catch(() => null);
    void activityLogsService.record({
      userId: actorId ?? null,
      action: "ORDER_BOM_UPDATED",
      targetType: "donhang",
      targetId: id,
      details: {
        customer: dto.customer,
        phone: dto.phone,
        itemCount: dto.items.length,
        totalCost: dto.totalCost,
        previousStatus: existing.trangthai,
      },
    });

    return updated;
  },

  async updateCustomer(id: number, dto: UpdateOrderCustomerDto) {
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("donhang")
      .select("madh, trangthai")
      .eq("madh", id)
      .maybeSingle();
    if (exErr) throw HttpError.internal(exErr.message);
    if (!existing) throw HttpError.notFound(`Order ${id} not found`);
    if (isTerminalOrderState(existing.trangthai as string)) {
      throw HttpError.badRequest("Đơn hàng đã hoàn thành hoặc đã hủy, không thể sửa thông tin khách hàng");
    }
    if (!["KHAO_SAT", "BAO_GIA_NHAP"].includes(existing.trangthai as string)) {
      throw HttpError.badRequest("Chỉ cho phép sửa thông tin khách hàng trước khi đơn được duyệt giá.");
    }

    const customerId = await this.getOrCreateCustomer(dto.customer, dto.phone, dto.address ?? null, dto.email);
    let { data, error } = await supabaseAdmin
      .from("donhang")
      .update({ makh: customerId, baogia_gui_luc: null, baogia_email: null })
      .eq("madh", id)
      .select(ORDER_SELECT)
      .single();
    if (isMissingQuoteTrackingColumn(error)) {
      const retry = await supabaseAdmin.from("donhang").update({ makh: customerId }).eq("madh", id).select(ORDER_SELECT).single();
      data = retry.data;
      error = retry.error;
    }
    if (error) throw HttpError.internal(error.message);
    return data;
  },

  // Ghi nhận đã gửi báo giá: lưu thời điểm gửi và email khách hàng vào đơn hàng
  async markQuoteSent(id: number, email: string) {
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("donhang")
      .select("madh, trangthai")
      .eq("madh", id)
      .maybeSingle();
    if (exErr) throw HttpError.internal(exErr.message);
    if (!existing) throw HttpError.notFound(`Order ${id} not found`);
    if (isTerminalOrderState(existing.trangthai as string)) {
      throw HttpError.badRequest("Đơn hàng đã hoàn thành hoặc đã hủy, không thể gửi báo giá");
    }
    if (!["BAO_GIA_NHAP", "DA_DUYET_GIA"].includes(existing.trangthai as string)) {
      throw HttpError.badRequest("Chỉ ghi nhận gửi báo giá sau khi đơn đã có BOM/báo giá.");
    }

    const { data, error } = await supabaseAdmin
      .from("donhang")
      .update({ baogia_gui_luc: new Date().toISOString(), baogia_email: email })
      .eq("madh", id)
      .select("madh, baogia_gui_luc, baogia_email")
      .single();
    if (isMissingQuoteTrackingColumn(error)) {
      throw HttpError.badRequest("Chưa chạy migration 07_quote_email_tracking.sql nên chưa thể ghi nhận đã gửi báo giá.");
    }
    if (error) throw HttpError.internal(error.message);
    void notificationsService
      .createForAdmins({
        title: `Đã gửi báo giá DH-${id}`,
        body: `Báo giá đơn hàng DH-${id} đã gửi tới ${email}.`,
        type: "don_hang",
        href: `/admin/don-hang/${id}/bao-gia`,
        data: { doi_tuong: "donhang", ma_doi_tuong: id, email },
      })
      .catch(() => null);
    return data;
  },

  async remove(id: number) {
    const { data: existing, error: exErr } = await supabaseAdmin
      .from("donhang")
      .select("madh, trangthai")
      .eq("madh", id)
      .maybeSingle();
    if (exErr) throw HttpError.internal(exErr.message);
    if (!existing) throw HttpError.notFound(`Order ${id} not found`);
    if (!["KHAO_SAT", "BAO_GIA_NHAP"].includes(existing.trangthai as string)) {
      throw HttpError.badRequest(`Không thể xóa đơn hàng ở trạng thái ${existing.trangthai}`);
    }
    const { error } = await supabaseAdmin.from("donhang").delete().eq("madh", id);
    if (error) throw HttpError.internal(error.message);
  },
  // Tìm hoặc tạo khách hàng theo SĐT: nếu đã có thì cập nhật thông tin, nếu chưa thì tạo mới
  async getOrCreateCustomer(customerName: string, phone: string, address: string | null, email?: string | null) {
    const { data: existing, error: findErr } = await supabaseAdmin
      .from("khachhang")
      .select("makh")
      .eq("sdt", phone)
      .maybeSingle();
    if (findErr) throw HttpError.internal(findErr.message);
    if (existing) {
      const updatePayload: Record<string, unknown> = { hoten: customerName, diachi: address };
      // email === undefined nghĩa là luồng cũ không gửi trường email, nên giữ nguyên email hiện có.
      // email null nghĩa là người dùng chủ động xóa email.
      if (email !== undefined) updatePayload.email = email ?? null;
      await supabaseAdmin.from("khachhang").update(updatePayload).eq("makh", existing.makh);
      return existing.makh as number;
    }

    const { data, error } = await supabaseAdmin
      .from("khachhang")
      .insert({ hoten: customerName, sdt: phone, email: email ?? null, diachi: address })
      .select("makh")
      .single();
    if (error) throw HttpError.internal(error.message);
    return data.makh as number;
  },
};
