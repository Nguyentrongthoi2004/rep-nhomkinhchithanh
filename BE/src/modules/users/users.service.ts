import { HttpError } from "@/lib/http";
import { toAuthEmail } from "@/lib/identity";
import { supabaseAdmin } from "@/lib/supabase";
import type { CreateUserDto, UpdateUserActionDto } from "./users.schema";

function buildUserMetadata(input: { hoTen: string; vaiTro: string; sdt?: string | null }) {
  return {
    hoten: input.hoTen,
    hoTen: input.hoTen,
    vaitro: input.vaiTro,
    vaiTro: input.vaiTro,
    sdt: input.sdt ?? null,
  };
}

async function findAuthUserByEmail(email: string) {
  const { data: authUsersList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) throw HttpError.internal("Khong the doc danh sach auth users");

  const authUser = authUsersList.users.find((user) => user.email === email);
  if (!authUser) throw HttpError.notFound("Khong tim thay auth user");

  return authUser;
}

export const usersService = {
  async list() {
    const { data, error } = await supabaseAdmin
      .from("nguoidung")
      .select("*")
      .order("mand", { ascending: true });
    if (error) throw HttpError.internal(error.message);
    return data ?? [];
  },

  async create(dto: CreateUserDto) {
    const login = dto.tenDangNhap.trim().toLowerCase();
    const employeeEmail = toAuthEmail(login);

    const { data: authUserData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: employeeEmail,
      password: dto.matKhau,
      email_confirm: true,
      user_metadata: buildUserMetadata({
        hoTen: dto.hoTen,
        vaiTro: dto.vaiTro,
        sdt: dto.sdt || null,
      }),
    });

    if (authError) {
      if (authError.message.includes("already exists")) {
        throw HttpError.conflict("Ten dang nhap nay da ton tai");
      }
      throw HttpError.badRequest(authError.message);
    }

    const { error: dbError } = await supabaseAdmin.from("nguoidung").insert({
      tendangnhap: login,
      hoten: dto.hoTen,
      vaitro: dto.vaiTro,
      sdt: dto.sdt || null,
      trangthai: "DANG_LAM",
    });

    if (dbError) {
      if (authUserData.user?.id) {
        await supabaseAdmin.auth.admin.deleteUser(authUserData.user.id);
      }
      throw HttpError.internal(`Loi luu DB: ${dbError.message}`);
    }

    return { message: `Tao tai khoan ${dto.hoTen} thanh cong` };
  },

  async update(id: number, dto: UpdateUserActionDto) {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("nguoidung")
      .select("*")
      .eq("mand", id)
      .single();
    if (profileError || !profile) {
      throw HttpError.notFound("Khong tim thay nguoi dung");
    }

    const masterAdminEmail = process.env.MASTER_ADMIN_EMAIL?.trim().toLowerCase();
    if (masterAdminEmail && profile.tendangnhap === masterAdminEmail) {
      throw HttpError.forbidden("Khong the can thiep vao tai khoan Master Admin");
    }

    if (dto.action === "CHANGE_STATUS") {
      const employeeEmail = toAuthEmail(profile.tendangnhap);
      const authUser = await findAuthUserByEmail(employeeEmail);

      const { error } = await supabaseAdmin
        .from("nguoidung")
        .update({ trangthai: dto.payload.trangthai })
        .eq("mand", id);
      if (error) throw HttpError.internal("Loi cap nhat CSDL");

      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        ban_duration: dto.payload.trangthai === "NGHI_VIEC" ? "876000h" : "none",
      });
      if (updateAuthError) throw HttpError.internal(updateAuthError.message);

      return { message: `Da doi trang thai thanh ${dto.payload.trangthai}` };
    }

    const employeeEmail = toAuthEmail(profile.tendangnhap);
    const authUser = await findAuthUserByEmail(employeeEmail);

    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
      password: dto.payload.newPassword,
    });
    if (updateAuthError) throw HttpError.internal(updateAuthError.message);

    return { message: "Cap nhat mat khau thanh cong" };
  },
};
