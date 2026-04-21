import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/config/env";

/**
 * Service-role client (bypasses RLS). Only use server-side for admin/internal operations.
 * Do NOT expose the key or derived clients to the browser.
 */
export const supabaseAdmin: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  },
);

/**
 * Build an anon-scoped client for verifying user JWTs.
 * We pass the user's JWT as the access token so `supabase.auth.getUser()` works
 * and RLS policies (if used) honor that user.
 */
export function createUserScopedClient(accessToken: string): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}
