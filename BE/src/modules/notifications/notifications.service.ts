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
  async list(mand: number) {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("matb, mand, tieude, noidung, daxem, ngaytao, dulieu")
      .eq("mand", mand)
      .order("ngaytao", { ascending: false })
      .limit(50);
    if (error) throw HttpError.internal(error.message);
    const items = ((data ?? []) as NotificationRow[]).map(normalize);
    return {
      items,
      unreadCount: items.filter((item) => !item.isRead).length,
    };
  },

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

  async markAllRead(mand: number) {
    const { error } = await supabaseAdmin.from(TABLE).update({ daxem: true }).eq("mand", mand).eq("daxem", false);
    if (error) throw HttpError.internal(error.message);
    return this.list(mand);
  },

  async remove(mand: number, matb: number) {
    const { error, count } = await supabaseAdmin.from(TABLE).delete({ count: "exact" }).eq("mand", mand).eq("matb", matb);
    if (error) throw HttpError.internal(error.message);
    if (!count) throw HttpError.notFound("Không tìm thấy thông báo");
    return { deleted: count };
  },

  async removeRead(mand: number) {
    const { error, count } = await supabaseAdmin.from(TABLE).delete({ count: "exact" }).eq("mand", mand).eq("daxem", true);
    if (error) throw HttpError.internal(error.message);
    return { deleted: count ?? 0 };
  },

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
