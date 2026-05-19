"use client";

import { createClient } from "@/lib/supabase/client";

type ApiEnvelope<T> = {
  ok?: boolean;
  data?: T;
  error?: string;
  details?: unknown;
  requestId?: string;
};

export class ApiError extends Error {
  details?: unknown;
  requestId?: string;
  status: number;

  constructor(message: string, options: { details?: unknown; requestId?: string; status: number }) {
    super(message);
    this.name = "ApiError";
    this.details = options.details;
    this.requestId = options.requestId;
    this.status = options.status;
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "";

let browserSupabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  // Giữ một đối tượng Supabase duy nhất trên trình duyệt để tránh tạo bộ lắng nghe phiên lặp lại.
  // mỗi lần gọi apiFetch.
  browserSupabase ??= createClient();
  return browserSupabase;
}

// Xây dựng URL cho API call:
// Trên trình duyệt: luôn dùng cùng nguồn /api/* để Next.js rewrite tới BE (hỗ trợ cả mobile qua LAN)
// Trên máy chủ: dùng API_BASE_URL từ .env
function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  // Trên trình duyệt luôn ưu tiên cùng nguồn `/api/*` để chạy được cả khi test bằng điện thoại qua LAN.
  // Nếu gọi thẳng API_BASE_URL=localhost từ điện thoại thì yêu cầu sẽ trỏ vào chính điện thoại và lỗi.
  if (typeof window !== "undefined") return normalizedPath;
  return `${API_BASE_URL}${normalizedPath}`;
}

// Hàm fetch chính: tự động gắn JWT token từ Supabase session vào header Authorization
export async function apiFetch(path: string, init: RequestInit = {}) {
  const { data } = await getSupabaseClient().auth.getSession();
  const headers = new Headers(init.headers);

  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (data.session?.access_token) {
    headers.set("Authorization", `Bearer ${data.session.access_token}`);
  }

  const url = buildApiUrl(path);
  const crossOrigin =
    /^https?:\/\//i.test(url) &&
    typeof window !== "undefined" &&
    !url.startsWith(`${window.location.protocol}//${window.location.host}`);
  return fetch(url, {
    ...init,
    headers,
    credentials: crossOrigin ? "omit" : "same-origin",
  });
}

export async function apiJson<T>(path: string, init: RequestInit = {}) {
  const res = await apiFetch(path, init);
  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!res.ok) {
    throw new ApiError(json.error || "Request failed", {
      details: json.details,
      requestId: json.requestId,
      status: res.status,
    });
  }

  return json;
}

export async function apiData<T>(path: string, init: RequestInit = {}) {
  const json = await apiJson<T>(path, init);
  return json.data as T;
}
