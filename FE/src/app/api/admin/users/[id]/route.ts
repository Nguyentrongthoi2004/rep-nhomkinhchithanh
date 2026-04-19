import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

async function requireAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const mand = parseInt(id, 10);
    const body = await request.json();
    const { action, payload } = body;

    const supabaseAdmin = auth.supabaseAdmin;

    // 1. Get user profile from public db to find email
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("nguoidung")
      .select("*")
      .eq("mand", mand)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Không tìm thấy người dùng trong CSDL" }, { status: 404 });
    }

    const isMasterAdmin = profile.tendangnhap === "nhomkinhchithanh2026@gmail.com";
    if (isMasterAdmin) {
      return NextResponse.json({ error: "Không thể can thiệp vào tài khoản Master Admin" }, { status: 403 });
    }

    if (action === "CHANGE_STATUS") {
      const { trangthai } = payload;
      if (trangthai !== "DANG_LAM" && trangthai !== "NGHI_VIEC") {
        return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
      }

      const { error: updateError } = await supabaseAdmin
        .from("nguoidung")
        .update({ trangthai })
        .eq("mand", mand);

      if (updateError) {
        return NextResponse.json({ error: "Lỗi cập nhật CSDL" }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: `Đã đổi trạng thái thành ${trangthai}` });
    } 
    
    if (action === "CHANGE_PASSWORD") {
      const { newPassword } = payload;
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: "Mật khẩu phải từ 6 ký tự trở lên" }, { status: 400 });
      }

       // Find Auth User ID via email
       const employeeEmail = profile.tendangnhap.includes("@") 
         ? profile.tendangnhap 
         : `${profile.tendangnhap}@minierp.local`;

       const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
       
       if (listError) {
          return NextResponse.json({ error: "Lọc Auth list thất bại" }, { status: 500 });
       }

       const authUser = usersData.users.find(u => u.email === employeeEmail);
       
       if (!authUser) {
          return NextResponse.json({ error: "Không tìm thấy Auth Identity cho user này" }, { status: 404 });
       }

       // Update user password
       const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
         authUser.id,
         { password: newPassword }
       );

       if (updateAuthError) {
          return NextResponse.json({ error: updateAuthError.message }, { status: 500 });
       }

       return NextResponse.json({ success: true, message: "Cập nhật mật khẩu thành công!" });
    }

    return NextResponse.json({ error: "Action không hợp lệ" }, { status: 400 });

  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
