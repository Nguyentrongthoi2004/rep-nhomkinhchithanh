import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const masterAdminEmail = process.env.MASTER_ADMIN_EMAIL?.trim().toLowerCase();
  if (!masterAdminEmail) {
    return NextResponse.json({ ok: true, skipped: "MASTER_ADMIN_EMAIL not set" });
  }

  if ((user.email || "").trim().toLowerCase() !== masterAdminEmail) {
    return NextResponse.json({ ok: true, skipped: "not master admin" });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabaseAdmin = createServiceClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

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
      { onConflict: "tendangnhap" }
    );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

