import { HttpError } from "@/lib/http";
import { generatePassword, toAuthEmail } from "@/lib/identity";
import { sendAccessApprovedEmail } from "@/lib/mailer";
import { supabaseAdmin } from "@/lib/supabase";
import { notificationsService } from "@/modules/notifications/notifications.service";
import type {
  CreateAccessRequestDto,
  UpdateAccessRequestDto,
} from "./access-requests.schema";

function buildUserMetadata(input: { hoTen: string; vaiTro: string; sdt?: string | null }) {
  return {
    hoten: input.hoTen,
    hoTen: input.hoTen,
    vaitro: input.vaiTro,
    vaiTro: input.vaiTro,
    sdt: input.sdt ?? null,
  };
}

export const accessRequestsService = {
  async list() {
    const { data, error } = await supabaseAdmin
      .from("yeucaucapquyen")
      .select("*")
      .order("mayc", { ascending: false });
    if (error) {
      if (String(error.message || "").includes("Could not find the table")) {
        throw HttpError.internal(
          "Thiếu bảng yeucaucapquyen trên Supabase. Hãy chạy script supabase_scripts/04_access_requests.sql rồi thử lại.",
        );
      }
      throw HttpError.internal(error.message);
    }
    return data ?? [];
  },

  async create(dto: CreateAccessRequestDto) {
    const { data, error } = await supabaseAdmin
      .from("yeucaucapquyen")
      .insert({
        hoten: dto.hoten,
        sdt: dto.sdt ?? null,
        tendangnhap: dto.tendangnhap.trim().toLowerCase(),
        vaitro: dto.vaitro,
        ghichu: dto.ghichu ?? null,
        trangthai: "PENDING",
      })
      .select("*")
      .single();
    if (error) {
      if (String(error.message || "").includes("Could not find the table")) {
        throw HttpError.internal(
          "Thiếu bảng yeucaucapquyen trên Supabase. Hãy chạy script supabase_scripts/04_access_requests.sql rồi thử lại.",
        );
      }
      throw HttpError.internal(error.message);
    }
    void notificationsService
      .createForAdmins({
        title: "Yêu cầu cấp quyền mới",
        body: `${dto.hoten} vừa gửi yêu cầu cấp quyền ${dto.vaitro}.`,
        type: "he_thong",
        href: "/admin/yeu-cau-cap-quyen",
        data: {
          doi_tuong: "yeucaucapquyen",
          ma_doi_tuong: data.mayc,
        },
      })
      .catch(() => null);

    return data;
  },

  async update(id: number, dto: UpdateAccessRequestDto, decidedBy: number) {
    const { data: row, error: rowErr } = await supabaseAdmin
      .from("yeucaucapquyen")
      .select("*")
      .eq("mayc", id)
      .single();
    if (rowErr || !row) throw HttpError.notFound("Khong tim thay yeu cau");

    if (dto.action === "REJECT") {
      const { error } = await supabaseAdmin
        .from("yeucaucapquyen")
        .update({
          trangthai: "REJECTED",
          ghichu: dto.payload?.ghichu ?? null,
          ngayduyet: new Date().toISOString(),
          nguoiduyet: decidedBy,
        })
        .eq("mayc", id);
      if (error) throw HttpError.internal(error.message);
      return { success: true };
    }

    const login = String(row.tendangnhap || "").trim().toLowerCase();
    const email = toAuthEmail(login);
    const password = generatePassword(10);

    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: buildUserMetadata({
        hoTen: row.hoten,
        vaiTro: row.vaitro,
        sdt: row.sdt || null,
      }),
    });
    if (authErr) throw HttpError.badRequest(authErr.message);

    const { error: dbErr } = await supabaseAdmin.from("nguoidung").insert({
      tendangnhap: login,
      hoten: row.hoten,
      vaitro: row.vaitro,
      sdt: row.sdt || null,
      trangthai: "DANG_LAM",
    });
    if (dbErr) {
      if (authData.user?.id) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      }
      throw HttpError.internal(dbErr.message);
    }

    const { error: updateErr } = await supabaseAdmin
      .from("yeucaucapquyen")
      .update({
        trangthai: "APPROVED",
        ngayduyet: new Date().toISOString(),
        nguoiduyet: decidedBy,
      })
      .eq("mayc", id);
    if (updateErr) throw HttpError.internal(updateErr.message);

    let mail: { ok: true; messageId: string; previewUrl: string | null } | { ok: false; error: string } = {
      ok: true,
      messageId: "",
      previewUrl: null,
    };
    try {
      const info = await sendAccessApprovedEmail({
        to: email,
        hoTen: String(row.hoten || login),
        vaiTro: String(row.vaitro || "WORKER"),
        login,
        password,
      });
      mail = { ok: true, messageId: info.messageId, previewUrl: info.previewUrl };
    } catch (err: unknown) {
      mail = { ok: false, error: err instanceof Error ? err.message : String(err) };
    }

    return { success: true, credential: { email, password }, mail };
  },
};
