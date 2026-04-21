import type { RequestHandler } from "express";
import { asyncHandler } from "@/lib/asyncHandler";
import { HttpError } from "@/lib/http";
import { normalizeLoginFromEmail } from "@/lib/identity";
import { createUserScopedClient, supabaseAdmin } from "@/lib/supabase";
import type { AuthUser } from "@/types/express";

/**
 * Verifies the Supabase JWT in the Authorization header and loads the
 * MiniERP user profile (nguoidung) into req.user.
 *
 * Call this before any route that requires auth.
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

  // Try lookup by login first, then by raw email (master admin)
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
