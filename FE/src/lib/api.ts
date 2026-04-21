"use client";

import { createClient } from "@/lib/supabase/client";

type ApiEnvelope<T> = {
  ok?: boolean;
  data?: T;
  error?: string;
  details?: unknown;
  requestId?: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "";

let browserSupabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  browserSupabase ??= createClient();
  return browserSupabase;
}

function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
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

  return fetch(buildApiUrl(path), {
    ...init,
    headers,
    credentials: API_BASE_URL ? "omit" : "same-origin",
  });
}

export async function apiJson<T>(path: string, init: RequestInit = {}) {
  const res = await apiFetch(path, init);
  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!res.ok) {
    throw new Error(json.error || "Request failed");
  }

  return json;
}

export async function apiData<T>(path: string, init: RequestInit = {}) {
  const json = await apiJson<T>(path, init);
  return json.data as T;
}
