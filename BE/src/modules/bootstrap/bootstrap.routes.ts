import { Router } from "express";
import { asyncHandler } from "@/lib/asyncHandler";
import { HttpError, sendOk } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";

export const adminSeedRouter = Router();
adminSeedRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const bootstrapToken = process.env.BOOTSTRAP_TOKEN;
    if (bootstrapToken) {
      if (String(req.query.token || "") !== bootstrapToken) {
        throw HttpError.forbidden("Forbidden");
      }
    } else {
      throw HttpError.forbidden("Seed endpoint disabled. Use POST /api/auth/ensure-profile.");
    }

    const masterEmail = process.env.MASTER_ADMIN_EMAIL;
    const masterPassword = process.env.MASTER_ADMIN_PASSWORD;
    if (!masterEmail || !masterPassword) {
      throw HttpError.internal("Missing MASTER_ADMIN_EMAIL or MASTER_ADMIN_PASSWORD");
    }

    const { error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: masterEmail,
      password: masterPassword,
      email_confirm: true,
    });

    if (authError && !authError.message.includes("already exists")) {
      throw HttpError.badRequest(authError.message);
    }

    const { error: dbError } = await supabaseAdmin.from("nguoidung").upsert(
      {
        tendangnhap: masterEmail,
        hoten: "Giám Đốc (Master Admin)",
        vaitro: "ADMIN",
        sdt: "0900000000",
        trangthai: "DANG_LAM",
      },
      { onConflict: "tendangnhap" },
    );
    if (dbError) throw HttpError.internal(dbError.message);

    sendOk(res, {
      success: true,
      message: authError?.message?.includes("already exists")
        ? "Master Admin đã tồn tại trên hệ thống Auth."
        : "Tạo tài khoản Master Admin Thành Công!",
      account: masterEmail,
    });
  }),
);

export const deprecatedSeedRouter = Router();
deprecatedSeedRouter.get("/", (_req, res) => {
  res.status(410).json({ ok: false, error: "Deprecated. Use POST /api/auth/ensure-profile and /api/admin/users." });
});
