import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  // Role check via Service Role (bypass RLS) but session is verified above
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("nguoidung")
    .select("vaitro")
    .eq("tendangnhap", user.email.toLowerCase())
    .maybeSingle();

  if (profileError || profile?.vaitro !== "ADMIN") {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true as const, supabaseAdmin };
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { tenDangNhap, matKhau, hoTen, sdt, vaiTro } = await request.json();

    const supabaseAdmin = auth.supabaseAdmin;

    // 1. Tạo Email chuẩn hóa cho nhân viên (để nhét vào Supabase Auth)
    const employeeEmail = `${tenDangNhap.trim().toLowerCase()}@minierp.local`;

    // 2. Register account immediately, bypass email confirmation
    const { error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: employeeEmail,
      password: matKhau,
      email_confirm: true,
      user_metadata: { hoTen, vaiTro }
    });

    if (authError) {
      if (authError.message.includes("already exists")) {
        return NextResponse.json({ error: "Tên đăng nhập (ID) này đã có người sử dụng!" }, { status: 400 });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 3. Insert record into public bussiness table `nguoidung`
    const { error: dbError } = await supabaseAdmin
      .from("nguoidung")
      .insert([
        {
          tendangnhap: tenDangNhap.trim().toLowerCase(),
          hoten: hoTen,
          vaitro: vaiTro,
          sdt: sdt || null,
          trangthai: "DANG_LAM"
        }
      ]);

    if (dbError) {
      // In a robust system we should rollback the auth user creation here, but we keep it simple
      return NextResponse.json({ error: `Lỗi lưu DB: ${dbError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Tạo tài khoản ${hoTen} thành công!` });

  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  // Trả về danh sách nhân viên cho trang Quản Lý Nhân Sự
  const supabaseAdmin = auth.supabaseAdmin;

  const { data, error } = await supabaseAdmin
    .from("nguoidung")
    .select("*")
    .order("mand", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
