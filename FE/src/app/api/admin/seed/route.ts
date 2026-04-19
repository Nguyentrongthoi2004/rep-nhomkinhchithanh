import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const bootstrapToken = process.env.BOOTSTRAP_TOKEN;
  if (bootstrapToken) {
    const url = new URL(request.url);
    if (url.searchParams.get("token") !== bootstrapToken) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    // Không khuyến khích dùng endpoint seed trong runtime.
    // Luồng chuẩn: Admin tự đăng ký (Gmail) → login → POST /api/auth/ensure-profile.
    return NextResponse.json(
      { error: "Seed endpoint disabled. Use POST /api/auth/ensure-profile." },
      { status: 403 }
    );
  }

  // Use Service Role Key to bypass RLS and Auth requirements
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // IMPORTANT: Use Service Key

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const masterEmail = process.env.MASTER_ADMIN_EMAIL!;
  const masterPassword = process.env.MASTER_ADMIN_PASSWORD!;

  try {
    if (!masterEmail || !masterPassword) {
      return NextResponse.json(
        { error: "Missing MASTER_ADMIN_EMAIL or MASTER_ADMIN_PASSWORD" },
        { status: 500 }
      );
    }

    // 1. Create Auth User in Supabase Identity
    const { error: authError } = await supabase.auth.admin.createUser({
      email: masterEmail,
      password: masterPassword,
      email_confirm: true, // Auto confirm
    });

    if (authError) {
      if (authError.message.includes("already exists")) {
        return NextResponse.json({ message: "Master Admin đã tồn tại trên hệ thống Auth." });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 2. Insert into 'nguoidung' table
    const { error: dbError } = await supabase
      .from("nguoidung")
      .insert([
        {
          tendangnhap: masterEmail,
          hoten: "Giám Đốc (Master Admin)",
          vaitro: "ADMIN",
          sdt: "0900000000",
          trangthai: "DANG_LAM"
        }
      ]);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Tạo tài khoản Master Admin Thành Công!",
      account: masterEmail
    });

  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
