import { HttpError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";

const TABLE = "thongbao";

type NotificationRow = {
  matb: number;
  mand: number;
  tieude: string | null;
  noidung: string;
  daxem: boolean;
  ngaytao: string;
  dulieu: Record<string, unknown> | null;
};

function normalize(row: NotificationRow) {
  // FE dùng cấu trúc dữ liệu thân thiện hơn, còn DB giữ tên cột tiếng Việt.
  // Trạng thái đọc hiện lưu ở thongbao.daxem; bảng legacy thongbaodadoc không còn dùng.
  const data = row.dulieu ?? {};
  return {
    matb: row.matb,
    title: row.tieude || "Thông báo",
    body: row.noidung,
    type: typeof data.loai === "string" ? data.loai : typeof data.type === "string" ? data.type : "he_thong",
    href: typeof data.href === "string" ? data.href : null,
    relatedType: typeof data.doi_tuong === "string" ? data.doi_tuong : typeof data.relatedType === "string" ? data.relatedType : null,
    relatedId: typeof data.ma_doi_tuong === "number" ? data.ma_doi_tuong : typeof data.relatedId === "number" ? data.relatedId : null,
    isRead: Boolean(row.daxem),
    createdAt: row.ngaytao,
    data,
  };
}

export const notificationsService = {
  // Đếm riêng số thông báo chưa đọc để header không cần tải toàn bộ danh sách thông báo.
  async summary(mand: number) {
    const { count, error } = await supabaseAdmin
      .from(TABLE)
      .select("matb", { count: "exact", head: true })
      .eq("mand", mand)
      .eq("daxem", false);
    if (error) throw HttpError.internal(error.message);
    return { unreadCount: count ?? 0 };
  },

  // Danh sách thông báo mới nhất của 1 user, giới hạn tối đa 50 để tránh header nặng.
  async list(mand: number, limit = 20) {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("matb, mand, tieude, noidung, daxem, ngaytao, dulieu")
      .eq("mand", mand)
      .order("ngaytao", { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 50));
    if (error) throw HttpError.internal(error.message);
    const items = ((data ?? []) as NotificationRow[]).map(normalize);
    const summary = await this.summary(mand);
    return {
      items,
      unreadCount: summary.unreadCount,
    };
  },

  // Đánh dấu đã đọc từng thông báo, ràng buộc theo mand để user không sửa thông báo người khác.
  async markRead(mand: number, matb: number) {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update({ daxem: true })
      .eq("mand", mand)
      .eq("matb", matb)
      .select("matb, mand, tieude, noidung, daxem, ngaytao, dulieu")
      .maybeSingle();
    if (error) throw HttpError.internal(error.message);
    if (!data) throw HttpError.notFound("Không tìm thấy thông báo");
    return normalize(data as NotificationRow);
  },

  // Dùng cho nút "Đánh dấu tất cả đã đọc" trong header.
  async markAllRead(mand: number) {
    const { error } = await supabaseAdmin.from(TABLE).update({ daxem: true }).eq("mand", mand).eq("daxem", false);
    if (error) throw HttpError.internal(error.message);
    return this.list(mand);
  },

  // Xóa một thông báo cụ thể của user hiện tại.
  async remove(mand: number, matb: number) {
    const { error, count } = await supabaseAdmin.from(TABLE).delete({ count: "exact" }).eq("mand", mand).eq("matb", matb);
    if (error) throw HttpError.internal(error.message);
    if (!count) throw HttpError.notFound("Không tìm thấy thông báo");
    return { deleted: count };
  },

  // Xóa hàng loạt các thông báo đã đọc, giữ lại thông báo chưa xử lý để quản trị viên/thợ còn thấy.
  async removeRead(mand: number) {
    const { error, count } = await supabaseAdmin.from(TABLE).delete({ count: "exact" }).eq("mand", mand).eq("daxem", true);
    if (error) throw HttpError.internal(error.message);
    return { deleted: count ?? 0 };
  },

  // Tạo thông báo cho 1 người dùng cụ thể
  async create(input: {
    mand: number;
    title: string;
    body: string;
    type?: string;
    href?: string | null;
    data?: Record<string, unknown>;
  }) {
    const dataType = typeof input.data?.loai === "string" ? input.data.loai : "he_thong";
    const dataHref = typeof input.data?.href === "string" ? input.data.href : null;
    const payload = {
      mand: input.mand,
      tieude: input.title,
      noidung: input.body,
      dulieu: {
        ...(input.data ?? {}),
        loai: input.type ?? dataType,
        href: input.href ?? dataHref,
      },
    };
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert(payload)
      .select("matb, mand, tieude, noidung, daxem, ngaytao, dulieu")
      .single();
    if (error) throw HttpError.internal(error.message);
    return normalize(data as NotificationRow);
  },

  // Tạo thông báo cho tất cả quản trị viên: dùng khi có sự kiện quan trọng (tạo đơn, thanh toán, sự cố...).
  async createForAdmins(input: {
    title: string;
    body: string;
    type?: string;
    href?: string | null;
    data?: Record<string, unknown>;
  }) {
    const { data: admins, error: adminError } = await supabaseAdmin
      .from("nguoidung")
      .select("mand")
      .eq("vaitro", "ADMIN");
    if (adminError) throw HttpError.internal(adminError.message);

    const rows = (admins ?? [])
      .map((admin) => Number((admin as { mand?: number }).mand))
      .filter((mand) => Number.isFinite(mand))
      .map((mand) => ({
        mand,
        tieude: input.title,
        noidung: input.body,
        dulieu: {
          ...(input.data ?? {}),
          loai: input.type ?? "he_thong",
          href: input.href ?? null,
        },
      }));

    if (rows.length === 0) return { inserted: 0 };

    const { error } = await supabaseAdmin.from(TABLE).insert(rows);
    if (error) throw HttpError.internal(error.message);
    return { inserted: rows.length };
  },
};
