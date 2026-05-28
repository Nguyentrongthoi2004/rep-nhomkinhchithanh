/* eslint-disable @typescript-eslint/no-explicit-any */
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

const RAW_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";
const API_BASE_URL = RAW_API_BASE_URL.replace(/\/$/, "");
const API_BASE_INCLUDES_API_PREFIX = /\/api$/i.test(API_BASE_URL);

let browserSupabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  // Giữ một đối tượng Supabase duy nhất trên trình duyệt để tránh tạo bộ lắng nghe phiên lặp lại.
  // mỗi lần gọi apiFetch.
  browserSupabase ??= createClient();
  return browserSupabase;
}

// Xây dựng URL cho API call.
// Nếu .env có NEXT_PUBLIC_API_URL/NEXT_PUBLIC_API_BASE_URL thì gọi thẳng backend LAN.
// Nếu chưa cấu hình base URL thì fallback về cùng nguồn /api/* để Next.js proxy xử lý.
function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!API_BASE_URL) return normalizedPath;

  const pathForBase =
    API_BASE_INCLUDES_API_PREFIX && normalizedPath.startsWith("/api/")
      ? normalizedPath.slice(4)
      : normalizedPath;
  return `${API_BASE_URL}${pathForBase}`;
}

export function apiAssetUrl(path: string) {
  if (!path) return path;
  if (/^(https?:|data:|blob:)/i.test(path)) return path;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const assetBaseUrl = API_BASE_INCLUDES_API_PREFIX
    ? API_BASE_URL.replace(/\/api$/i, "")
    : API_BASE_URL;

  return assetBaseUrl ? `${assetBaseUrl}${normalizedPath}` : normalizedPath;
}

export function imageDisplayUrl(image: { url?: string | null; duongdan?: string | null }) {
  const signedOrAbsoluteUrl = image.url?.trim();
  if (signedOrAbsoluteUrl) return signedOrAbsoluteUrl;

  const rawPath = image.duongdan?.trim();
  if (!rawPath) return null;
  if (/^(https?:|data:|blob:)/i.test(rawPath)) return rawPath;
  if (/^\/?uploads\//i.test(rawPath)) return apiAssetUrl(rawPath.startsWith("/") ? rawPath : `/${rawPath}`);
  return null;
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

// --- Cutting Proposals APIs ---
export async function adminListCuttingProposals(params?: Record<string, any>) {
  const query = params ? new URLSearchParams(params as any).toString() : "";
  return apiData<any>(`/admin/cutting-proposals${query ? `?${query}` : ""}`);
}

export async function adminGetCuttingProposalDetail(id: number | string) {
  return apiData<any>(`/admin/cutting-proposals/${id}`);
}

export async function adminApproveCuttingProposal(id: number | string, note?: string) {
  return apiData<any>(`/admin/cutting-proposals/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ ghichu: note || "" }),
  });
}

export async function adminRejectCuttingProposal(id: number | string, note: string) {
  return apiData<any>(`/admin/cutting-proposals/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ ghichu: note }),
  });
}

export async function workerSubmitCuttingProposal(payload: any) {
  return apiData<any>(`/worker/cutting-proposals`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function workerListCuttingProposals(mapc?: number) {
  const query = mapc ? `?mapc=${mapc}` : "";
  return apiData<any>(`/worker/cutting-proposals${query}`);
}

export async function workerSimulateCuttingPlan(mapc: number) {
  return apiData<any>(`/worker/cutting-plans/simulate`, {
    method: "POST",
    body: JSON.stringify({ mapc }),
  });
}
