import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/config/env";

/**
 * Supabase client dùng khóa service-role nên bỏ qua RLS.
 * Chỉ dùng ở server cho tác vụ quản trị/nội bộ, tuyệt đối không đưa khóa/client này ra trình duyệt.
 */
export const supabaseAdmin: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  },
);

/**
 * Tạo client anon theo JWT của người dùng để xác minh phiên đăng nhập.
 * JWT được gắn vào yêu cầu để `supabase.auth.getUser()` hoạt động và RLS (nếu bật) hiểu đúng người dùng.
 */
export function createUserScopedClient(accessToken: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}
