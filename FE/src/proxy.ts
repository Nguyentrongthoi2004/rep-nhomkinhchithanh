import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set({
              name,
              value,
              ...options,
            });
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set({
              name,
              value,
              ...options,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
            });
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Chưa đăng nhập -> chuyển về login
  if (!user && !pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Chặn quyền theo vai trò: ADMIN không được vào /worker và WORKER không được vào /admin.
  const isAdminRoute = pathname.startsWith("/admin");
  const isWorkerRoute = pathname.startsWith("/worker");

  if (user && (isAdminRoute || isWorkerRoute)) {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;

    let role: string | null =
      (user.user_metadata?.vaiTro as string | undefined) ||
      (user.user_metadata?.vaitro as string | undefined) ||
      null;

    // Dự phòng: đọc vai trò từ BE (nguoidung) để hỗ trợ master admin chưa có metadata.
    if ((!role || role === "UNKNOWN") && accessToken) {
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
        const meUrl = base?.length
          ? `${base}/api/auth/me`
          : new URL("/api/auth/me", request.nextUrl.origin).toString();
        const r = await fetch(meUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (r.ok) {
          const json = (await r.json()) as { ok?: boolean; data?: { vaitro?: string } };
          role = json?.data?.vaitro ?? role;
        }
      } catch {
        // Bỏ qua lỗi dự phòng để tầng xử lý tiếp tục chạy theo cookie hiện có.
      }
    }

    if (isAdminRoute && role !== "ADMIN") {
      const url = request.nextUrl.clone();
      url.pathname = "/worker";
      return NextResponse.redirect(url);
    }

    if (isWorkerRoute && role !== "WORKER") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/vat-tu";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
