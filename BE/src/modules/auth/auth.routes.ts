import { Router } from "express";
import { asyncHandler } from "@/lib/asyncHandler";
import { normalizeLoginFromEmail } from "@/lib/identity";
import { HttpError, sendOk } from "@/lib/http";
import { createUserScopedClient, supabaseAdmin } from "@/lib/supabase";
import { authMiddleware } from "@/middlewares/auth";

export const authRouter = Router();

authRouter.post(
  "/ensure-profile",
  asyncHandler(async (req, res) => {
    const authHeader = req.header("authorization") || req.header("Authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      throw HttpError.unauthorized("Missing Bearer token");
    }

    const token = authHeader.slice("bearer ".length).trim();
    const supabase = createUserScopedClient(token);
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw HttpError.unauthorized("Invalid or expired token");
    }

    const masterAdminEmail = process.env.MASTER_ADMIN_EMAIL?.trim().toLowerCase();
    if (!masterAdminEmail) {
      return sendOk(res, { skipped: "MASTER_ADMIN_EMAIL not set" });
    }

    const currentEmail = (data.user.email || "").trim().toLowerCase();
    if (currentEmail !== masterAdminEmail) {
      return sendOk(res, { skipped: "not master admin" });
    }

    const { error: upsertError } = await supabaseAdmin
      .from("nguoidung")
      .upsert(
        {
          tendangnhap: masterAdminEmail,
          hoten: "Giám Đốc (Master Admin)",
          vaitro: "ADMIN",
          sdt: null,
          trangthai: "DANG_LAM",
        },
        { onConflict: "tendangnhap" },
      );
    if (upsertError) throw HttpError.internal(upsertError.message);

    sendOk(res, { ensured: true });
  }),
);

authRouter.get(
  "/me",
  authMiddleware,
  asyncHandler(async (req, res) => {
    if (!req.user) throw HttpError.unauthorized();
    const { data, error } = await supabaseAdmin
      .from("nguoidung")
      .select("mand, tendangnhap, hoten, vaitro, sdt, trangthai")
      .eq("mand", req.user.mand)
      .maybeSingle();
    if (error) throw HttpError.internal(error.message);
    if (!data) {
      throw HttpError.notFound("User profile not found");
    }

    sendOk(res, {
      ...data,
      email: req.user.email,
      login: normalizeLoginFromEmail(req.user.email),
    });
  }),
);
