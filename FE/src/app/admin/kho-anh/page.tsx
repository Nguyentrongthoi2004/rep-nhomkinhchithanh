"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowUpDown, CalendarDays, Eye, Images, Loader2, RefreshCw, Search } from "lucide-react";
import { apiData } from "@/lib/api";
import { formatOrderStatus } from "@/lib/order-status";

type Order = {
  madh: number;
  ngaytao: string;
  trangthai: string;
  tonggiatri: number;
  khachhang: { hoten: string | null; sdt?: string | null; email?: string | null; diachi?: string | null } | null;
  chitietdh?: { mactdh: number }[];
};

type StatusFilter = "ALL" | "HOAN_THANH" | "DANG_GIA_CONG" | "DA_THANH_TOAN" | "DA_DUYET_GIA" | "KHAC";
type SortMode = "NEWEST" | "OLDEST" | "COMPLETED_FIRST";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "HOAN_THANH", label: "Hoàn thành" },
  { value: "DANG_GIA_CONG", label: "Đang gia công" },
  { value: "DA_THANH_TOAN", label: "Đã thanh toán" },
  { value: "DA_DUYET_GIA", label: "Đã duyệt giá" },
  { value: "KHAC", label: "Trạng thái khác" },
];

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "NEWEST", label: "Mới nhất" },
  { value: "OLDEST", label: "Cũ nhất" },
  { value: "COMPLETED_FIRST", label: "Ưu tiên hoàn thành" },
];

function statusClass(status?: string | null) {
  const normalized = (status || "").toUpperCase();
  if (normalized === "HOAN_THANH") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (normalized === "DANG_GIA_CONG") return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  if (normalized === "DA_THANH_TOAN") return "border-cyan-500/30 bg-cyan-500/10 text-cyan-300";
  if (normalized === "DA_DUYET_GIA") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  if (normalized === "DA_HUY") return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  return "border-zinc-700 bg-zinc-900 text-zinc-300";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("vi-VN");
}

function matchesStatus(order: Order, filter: StatusFilter) {
  const status = (order.trangthai || "").toUpperCase();
  if (filter === "ALL") return true;
  if (filter === "KHAC") return !["HOAN_THANH", "DANG_GIA_CONG", "DA_THANH_TOAN", "DA_DUYET_GIA"].includes(status);
  return status === filter;
}

function searchText(order: Order) {
  return [
    `DH-${order.madh}`,
    order.khachhang?.hoten || "",
    order.khachhang?.sdt || "",
    order.khachhang?.email || "",
    order.khachhang?.diachi || "",
    formatOrderStatus(order.trangthai),
  ]
    .join(" ")
    .toLowerCase();
}

export default function AdminImageArchiveListPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("NEWEST");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setOrders(await apiData<Order[]>("/api/admin/orders"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được danh sách đơn hàng.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, sortMode, pageSize]);

  const filteredOrders = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return orders
      .filter((order) => !keyword || searchText(order).includes(keyword))
      .filter((order) => matchesStatus(order, statusFilter))
      .sort((a, b) => {
        if (sortMode === "COMPLETED_FIRST") {
          const priorityA = a.trangthai === "HOAN_THANH" ? 0 : 1;
          const priorityB = b.trangthai === "HOAN_THANH" ? 0 : 1;
          if (priorityA !== priorityB) return priorityA - priorityB;
        }

        const timeA = new Date(a.ngaytao).getTime() || a.madh;
        const timeB = new Date(b.ngaytao).getTime() || b.madh;
        return sortMode === "OLDEST" ? timeA - timeB : timeB - timeA;
      });
  }, [orders, query, sortMode, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredOrders.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-cyan-500/10 p-3 text-cyan-300">
              <Images className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Kho ảnh</h1>
              <p className="mt-1 max-w-3xl text-sm text-zinc-400">
                Quản lý ảnh theo đơn hàng. Chọn một đơn để xem ảnh hoàn thành công trình và ảnh xác nhận cắt phôi.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500"
          >
            <RefreshCw className="h-4 w-4" />
            Tải lại
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_190px_130px]">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase text-zinc-500">Tìm kiếm</span>
            <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-black/40 px-3 py-2.5">
              <Search className="h-4 w-4 text-zinc-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="DH-23, khách hàng, SĐT..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase text-zinc-500">Trạng thái</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="h-[42px] w-full rounded-xl border border-zinc-800 bg-black/40 px-3 text-sm font-semibold text-white outline-none"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase text-zinc-500">Sắp xếp</span>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="h-[42px] w-full rounded-xl border border-zinc-800 bg-black/40 px-3 text-sm font-semibold text-white outline-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase text-zinc-500">Hiển thị</span>
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="h-[42px] w-full rounded-xl border border-zinc-800 bg-black/40 px-3 text-sm font-semibold text-white outline-none"
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size} / trang
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-3 text-sm text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5">
            <Images className="h-4 w-4 text-cyan-300" />
            <span>
              {filteredOrders.length} đơn hàng · Trang {safePage}/{totalPages}
            </span>
          </div>
          <div className="inline-flex items-center gap-2 text-xs text-zinc-500">
            <ArrowUpDown className="h-3.5 w-3.5" />
            Ảnh chỉ tải khi mở chi tiết đơn hàng.
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/60">
        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            Đang tải danh sách đơn hàng...
          </div>
        ) : error ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 text-center">
            <AlertCircle className="h-8 w-8 text-rose-300" />
            <p className="text-sm font-semibold text-rose-200">{error}</p>
            <button type="button" onClick={() => void load()} className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-white">
              Thử lại
            </button>
          </div>
        ) : pageRows.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 text-center">
            <Images className="h-9 w-9 text-zinc-600" />
            <p className="font-semibold text-white">Không có đơn hàng phù hợp.</p>
            <p className="text-sm text-zinc-500">Thử đổi từ khóa hoặc bộ lọc trạng thái.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-zinc-800">
                <thead className="bg-zinc-900/70 text-left text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-5 py-4">Đơn hàng</th>
                    <th className="px-5 py-4">Khách hàng</th>
                    <th className="px-5 py-4">Ngày tạo</th>
                    <th className="px-5 py-4">Hạng mục</th>
                    <th className="px-5 py-4">Trạng thái</th>
                    <th className="px-5 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {pageRows.map((order) => (
                    <tr key={order.madh} className="transition hover:bg-zinc-900/50">
                      <td className="px-5 py-4">
                        <div className="font-mono font-bold text-cyan-200">DH-{order.madh}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-white">{order.khachhang?.hoten || "Chưa có khách hàng"}</div>
                        <div className="mt-1 text-sm text-zinc-500">{order.khachhang?.sdt || order.khachhang?.email || "Chưa có liên hệ"}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-zinc-400">
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-zinc-600" />
                          {formatDate(order.ngaytao)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-zinc-300">{order.chitietdh?.length || 0} hạng mục</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClass(order.trangthai)}`}>
                          {formatOrderStatus(order.trangthai)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/admin/kho-anh/${order.madh}`}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500/15 px-3 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/25"
                        >
                          <Eye className="h-4 w-4" />
                          Xem chi tiết
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-4 md:hidden">
              {pageRows.map((order) => (
                <article key={order.madh} className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-lg font-bold text-cyan-200">DH-{order.madh}</p>
                      <p className="mt-1 text-sm font-semibold text-white">{order.khachhang?.hoten || "Chưa có khách hàng"}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(order.trangthai)}`}>
                      {formatOrderStatus(order.trangthai)}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                      <p className="text-xs uppercase text-zinc-500">Ngày tạo</p>
                      <p className="mt-1 font-semibold text-white">{formatDate(order.ngaytao)}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                      <p className="text-xs uppercase text-zinc-500">Hạng mục</p>
                      <p className="mt-1 font-semibold text-white">{order.chitietdh?.length || 0}</p>
                    </div>
                  </div>
                  <Link href={`/admin/kho-anh/${order.madh}`} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-white">
                    <Eye className="h-4 w-4" />
                    Xem chi tiết
                  </Link>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {!loading && !error && filteredOrders.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-xl border border-zinc-800 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Trang trước
          </button>
          <div className="text-center text-sm text-zinc-500">
            Trang {safePage}/{totalPages}
          </div>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            className="rounded-xl border border-zinc-800 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Trang sau
          </button>
        </div>
      )}
    </div>
  );
}
