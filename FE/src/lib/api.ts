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
  browserSupabase ??= createClient();
  return browserSupabase;
}

/**
 * Trên localhost luôn gọi Same-Origin `/api/...` để Next rewrite tới BE (xem `next.config.ts`).
 * Tránh nhầm khi `.env` còn URL production → DB trống dù Supabase local đã có dữ liệu.
 */
function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  // Browser: always prefer same-origin `/api/*` so it works on LAN/phone.
  // If API_BASE_URL points to localhost, calling it from a phone would fail.
  if (typeof window !== "undefined") return normalizedPath;
  return `${API_BASE_URL}${normalizedPath}`;
}

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
