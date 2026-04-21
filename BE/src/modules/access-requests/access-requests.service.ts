import { HttpError } from "@/lib/http";
import { generatePassword, toAuthEmail } from "@/lib/identity";
import { supabaseAdmin } from "@/lib/supabase";
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
    if (error) throw HttpError.internal(error.message);
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
    if (error) throw HttpError.internal(error.message);
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
          decidedat: new Date().toISOString(),
          decidedby: decidedBy,
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
        decidedat: new Date().toISOString(),
        decidedby: decidedBy,
      })
      .eq("mayc", id);
    if (updateErr) throw HttpError.internal(updateErr.message);

    return { success: true, credential: { email, password } };
  },
};
