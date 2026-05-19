import type { RequestHandler } from "express";
import { asyncHandler } from "@/lib/asyncHandler";
import { HttpError } from "@/lib/http";
import { normalizeLoginFromEmail } from "@/lib/identity";
import { createUserScopedClient, supabaseAdmin } from "@/lib/supabase";
import type { AuthUser } from "@/types/express";

/**
 * Middleware xác thực người dùng:
 * 1. Lấy mã JWT từ header Authorization (Bearer)
 * 2. Gọi Supabase Auth để xác minh mã còn hiệu lực
 * 3. Tra bảng "nguoidung" để lấy hồ sơ nghiệp vụ (mã NV, vai trò ADMIN/WORKER)
 * 4. Gắn thông tin người dùng vào req.user để các đường dẫn phía sau sử dụng
 * Nếu mã không hợp lệ hoặc người dùng bị khóa (NGHI_VIEC) → trả lỗi 401/403
 */
export const authMiddleware: RequestHandler = asyncHandler(async (req, _res, next) => {
  const authHeader = req.header("authorization") || req.header("Authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    throw HttpError.unauthorized("Missing Bearer token");
  }

  const token = authHeader.slice("bearer ".length).trim();
  if (!token) throw HttpError.unauthorized("Empty Bearer token");

  const supabase = createUserScopedClient(token);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) {
    throw HttpError.unauthorized("Invalid or expired token");
  }

  const login = normalizeLoginFromEmail(data.user.email);
  const emailLower = data.user.email.trim().toLowerCase();

  // Tìm hồ sơ nguoidung: ưu tiên theo tendangnhap (worker), nếu không thấy thì thử theo email quản trị viên gốc.
  const byLogin = await supabaseAdmin
    .from("nguoidung")
    .select("mand, tendangnhap, vaitro, trangthai")
    .eq("tendangnhap", login)
    .maybeSingle();

  let profile = byLogin.data;

  if (!profile) {
    const byEmail = await supabaseAdmin
      .from("nguoidung")
      .select("mand, tendangnhap, vaitro, trangthai")
      .eq("tendangnhap", emailLower)
      .maybeSingle();
    profile = byEmail.data;
  }

  if (!profile) {
    throw HttpError.forbidden("User profile not found in nguoidung");
  }
  if (profile.trangthai === "NGHI_VIEC") {
    throw HttpError.forbidden("User account is disabled");
  }

  const user: AuthUser = {
    authId: data.user.id,
    mand: profile.mand as number,
    tendangnhap: profile.tendangnhap as string,
    email: data.user.email,
    vaitro: profile.vaitro as AuthUser["vaitro"],
  };
  req.user = user;

  next();
});
