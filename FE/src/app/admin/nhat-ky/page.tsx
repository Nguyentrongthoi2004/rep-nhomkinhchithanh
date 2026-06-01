"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock3, Filter, Loader2, RefreshCw, Search } from "lucide-react";
import { apiData } from "@/lib/api";

type ActivityLog = {
  id: number;
  user_id: number | null;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
  nguoidung?: { hoten?: string | null; tendangnhap?: string | null } | null;
};

type ActivityLogResponse = {
  items: ActivityLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const ACTION_LABELS: Record<string, string> = {
  ORDER_CREATED: "Tạo đơn hàng",
  ORDER_BOM_UPDATED: "Cập nhật BOM",
  ORDER_PRICE_APPROVED: "Duyệt giá",
  ASSIGNMENT_CREATED: "Phân công thợ",
  CUTTING_PLAN_CREATED: "Tạo sơ đồ cắt",
  CUTTING_PLAN_COMPLETED: "Hoàn thành cắt",
  CUTTING_ISSUE_REPORTED: "Báo sự cố cắt",
  CUTTING_PROPOSAL_SUBMITTED: "Gửi đề xuất cắt",
  CUTTING_PROPOSAL_APPROVED: "Duyệt đề xuất cắt",
  CUTTING_PROPOSAL_REJECTED: "Từ chối đề xuất cắt",
  PAYMENT_RECORDED: "Ghi nhận thanh toán",
};

const TARGET_LABELS: Record<string, string> = {
  donhang: "Đơn hàng",
  phancong: "Phân công",
  sodocat: "Sơ đồ cắt",
  dexuatcat: "Đề xuất cắt",
  giaodich: "Giao dịch",
};

const ACTION_OPTIONS = Object.keys(ACTION_LABELS);
const TARGET_OPTIONS = Object.keys(TARGET_LABELS);

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && String(value).trim()) query.set(key, String(value));
  });
  return query.toString();
}

function compactDetails(details: Record<string, unknown> | null) {
  if (!details || Object.keys(details).length === 0) return "Không có chi tiết";
  return Object.entries(details)
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
    .join(" · ");
}

export default function AdminActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLogResponse>({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const query = useMemo(
    () =>
      buildQuery({
        page,
        pageSize: 20,
        action: action || undefined,
        targetType: targetType || undefined,
        q: q || undefined,
      }),
    [action, page, q, targetType],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      setLogs(await apiData<ActivityLogResponse>(`/api/admin/activity-logs?${query}`));
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const applySearch = () => {
    setPage(1);
    setQ(searchDraft.trim());
  };

  const resetFilters = () => {
    setPage(1);
    setAction("");
    setTargetType("");
    setSearchDraft("");
    setQ("");
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="flex items-center text-2xl font-bold text-gray-100">
              <Clock3 className="mr-3 h-6 w-6 text-sky-300" />
              Nhật ký thao tác
            </h1>
            <p className="mt-1 text-sm text-gray-400">Theo dõi thao tác quan trọng của đơn hàng, thanh toán và cắt phôi.</p>
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-gray-200 hover:bg-white/10"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Cập nhật
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_220px_auto_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applySearch();
              }}
              placeholder="Tìm action, đối tượng hoặc mã..."
              className="h-11 w-full rounded-xl border border-white/10 bg-black/30 pl-10 pr-4 text-sm text-gray-100 outline-none focus:border-sky-400"
            />
          </label>
          <select
            value={action}
            onChange={(event) => {
              setPage(1);
              setAction(event.target.value);
            }}
            className="h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-gray-100 outline-none focus:border-sky-400"
          >
            <option value="">Tất cả thao tác</option>
            {ACTION_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {ACTION_LABELS[value]}
              </option>
            ))}
          </select>
          <select
            value={targetType}
            onChange={(event) => {
              setPage(1);
              setTargetType(event.target.value);
            }}
            className="h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-gray-100 outline-none focus:border-sky-400"
          >
            <option value="">Tất cả đối tượng</option>
            {TARGET_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {TARGET_LABELS[value]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={applySearch}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-sky-600 px-4 text-sm font-bold text-white hover:bg-sky-500"
          >
            <Search className="mr-2 h-4 w-4" />
            Tìm
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-gray-200 hover:bg-white/10"
          >
            <Filter className="mr-2 h-4 w-4" />
            Xóa lọc
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/5 bg-[#0a0a0c]">
        {errorMsg ? (
          <div className="m-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{errorMsg}</div>
        ) : loading ? (
          <div className="flex justify-center py-16 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : logs.items.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">Chưa có nhật ký phù hợp.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="p-4 text-left">Thời gian</th>
                  <th className="p-4 text-left">Người thao tác</th>
                  <th className="p-4 text-left">Thao tác</th>
                  <th className="p-4 text-left">Đối tượng</th>
                  <th className="p-4 text-left">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.items.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap p-4 font-mono text-xs text-gray-400">{new Date(log.created_at).toLocaleString("vi-VN")}</td>
                    <td className="p-4 text-gray-200">
                      <div className="font-semibold">{log.nguoidung?.hoten || `User ${log.user_id ?? "-"}`}</div>
                      {log.nguoidung?.tendangnhap ? <div className="mt-0.5 text-xs text-gray-500">{log.nguoidung.tendangnhap}</div> : null}
                    </td>
                    <td className="p-4">
                      <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-3 py-1 text-xs font-bold text-sky-200">
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="p-4 text-gray-300">
                      <div className="font-semibold">{TARGET_LABELS[log.target_type] ?? log.target_type}</div>
                      <div className="mt-0.5 font-mono text-xs text-gray-500">{log.target_id}</div>
                    </td>
                    <td className="max-w-xl p-4 text-xs leading-relaxed text-gray-400">{compactDetails(log.details)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-500">
            {logs.total} dòng · Trang {logs.page}/{logs.totalPages}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-gray-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Trước
            </button>
            <button
              type="button"
              disabled={page >= logs.totalPages || loading}
              onClick={() => setPage((value) => value + 1)}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-gray-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
