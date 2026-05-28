"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpDown,
  CalendarDays,
  ClipboardList,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  Scissors,
} from "lucide-react";
import { apiData } from "@/lib/api";

type AssignmentRow = {
  mapc: number;
  trangthai: string | null;
  ngayphancong?: string | null;
  ngaytao?: string | null;
  created_at?: string | null;
  donhang: {
    madh: number;
    trangthai?: string | null;
    ngaytao?: string | null;
    created_at?: string | null;
    khachhang: { hoten: string | null } | null;
  } | null;
  nguoidung: { hoten: string | null } | null;
  sodocat?: { masdc?: number; trangthai?: string | null }[] | null;
};

type StatusFilter =
  | "ALL"
  | "CHUA_CO_SO_DO"
  | "CHO_DUYET"
  | "DANG_CAT"
  | "HOAN_THANH"
  | "TU_CHOI";

type SortMode = "NEWEST" | "OLDEST" | "UNPROCESSED";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "CHUA_CO_SO_DO", label: "Chưa có sơ đồ" },
  { value: "CHO_DUYET", label: "Chờ duyệt" },
  { value: "DANG_CAT", label: "Đang cắt" },
  { value: "HOAN_THANH", label: "Hoàn thành" },
  { value: "TU_CHOI", label: "Từ chối" },
];

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "NEWEST", label: "Mới nhất" },
  { value: "OLDEST", label: "Cũ nhất" },
  { value: "UNPROCESSED", label: "Ưu tiên chưa xử lý" },
];

function assignmentStatusLabel(status?: string | null) {
  switch ((status || "").toUpperCase()) {
    case "CHO_NHAN":
    case "CHO_THUC_HIEN":
      return "Chờ nhận";
    case "DANG_LAM":
    case "DANG_THUC_HIEN":
    case "DANG_CAT":
      return "Đang làm";
    case "HOAN_THANH":
    case "DA_XONG":
      return "Hoàn thành";
    case "TU_CHOI":
      return "Từ chối";
    case "CHO_DUYET":
      return "Chờ duyệt";
    default:
      return status || "Chưa rõ";
  }
}

function statusClass(status?: string | null) {
  const normalized = (status || "").toUpperCase();
  if (["HOAN_THANH", "DA_XONG"].includes(normalized)) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }
  if (["DANG_LAM", "DANG_THUC_HIEN", "DANG_CAT"].includes(normalized)) {
    return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  }
  if (normalized === "TU_CHOI") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  }
  if (normalized === "CHO_DUYET") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }
  return "border-zinc-700 bg-zinc-900 text-zinc-300";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("vi-VN");
}

function getAssignmentDate(row: AssignmentRow) {
  return (
    row.ngayphancong ||
    row.ngaytao ||
    row.created_at ||
    row.donhang?.ngaytao ||
    row.donhang?.created_at ||
    ""
  );
}

function getPlanCount(row: AssignmentRow) {
  return Array.isArray(row.sodocat) ? row.sodocat.length : null;
}

function getPlanStatuses(row: AssignmentRow) {
  return Array.isArray(row.sodocat)
    ? row.sodocat.map((item) => (item.trangthai || "").toUpperCase())
    : [];
}

function isUnprocessed(row: AssignmentRow) {
  const status = (row.trangthai || "").toUpperCase();
  const planCount = getPlanCount(row);
  return (
    planCount === 0 ||
    ["CHO_NHAN", "CHO_THUC_HIEN", "CHO_DUYET"].includes(status)
  );
}

function matchesStatus(row: AssignmentRow, filter: StatusFilter) {
  if (filter === "ALL") return true;

  const assignmentStatus = (row.trangthai || "").toUpperCase();
  const planStatuses = getPlanStatuses(row);
  const planCount = getPlanCount(row);

  if (filter === "CHUA_CO_SO_DO") {
    if (planCount !== null) return planCount === 0;
    return ["CHO_NHAN", "CHO_THUC_HIEN"].includes(assignmentStatus);
  }

  return assignmentStatus === filter || planStatuses.includes(filter);
}

function searchText(row: AssignmentRow) {
  return [
    `PC-${row.mapc}`,
    row.donhang?.madh ? `DH-${row.donhang.madh}` : "",
    row.donhang?.khachhang?.hoten || "",
    row.nguoidung?.hoten || "",
  ]
    .join(" ")
    .toLowerCase();
}

export default function CuttingOptimizationListPage() {
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("UNPROCESSED");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await apiData<AssignmentRow[]>("/api/admin/assignments");
      setAssignments(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được danh sách phân công.");
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

  const filteredAssignments = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return assignments
      .filter((row) => !keyword || searchText(row).includes(keyword))
      .filter((row) => matchesStatus(row, statusFilter))
      .sort((a, b) => {
        if (sortMode === "UNPROCESSED") {
          const priorityA = isUnprocessed(a) ? 0 : 1;
          const priorityB = isUnprocessed(b) ? 0 : 1;
          if (priorityA !== priorityB) return priorityA - priorityB;
          return b.mapc - a.mapc;
        }

        const timeA = new Date(getAssignmentDate(a)).getTime() || a.mapc;
        const timeB = new Date(getAssignmentDate(b)).getTime() || b.mapc;
        return sortMode === "NEWEST" ? timeB - timeA : timeA - timeB;
      });
  }, [assignments, query, sortMode, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredAssignments.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-rose-500/10 p-3 text-rose-300">
              <Scissors className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Tối ưu cắt vật tư</h1>
              <p className="mt-1 max-w-3xl text-sm text-zinc-400">
                Quản lý các phân công cần lập sơ đồ cắt. Chọn một phân công để xem BOM,
                phôi khả dụng và tạo sơ đồ cắt.
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
            <span className="mb-2 block text-xs font-semibold uppercase text-zinc-500">
              Tìm kiếm
            </span>
            <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-black/40 px-3 py-2.5">
              <Search className="h-4 w-4 text-zinc-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="PC-8, DH-15, khách hàng, worker..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase text-zinc-500">
              Trạng thái
            </span>
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
            <span className="mb-2 block text-xs font-semibold uppercase text-zinc-500">
              Sắp xếp
            </span>
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
            <span className="mb-2 block text-xs font-semibold uppercase text-zinc-500">
              Hiển thị
            </span>
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
            <ClipboardList className="h-4 w-4 text-cyan-300" />
            <span>
              {filteredAssignments.length} phân công · Trang {safePage}/{totalPages}
            </span>
          </div>
          <div className="inline-flex items-center gap-2 text-xs text-zinc-500">
            <ArrowUpDown className="h-3.5 w-3.5" />
            Không tải chi tiết sơ đồ ở trang danh sách để giữ trang nhẹ.
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/60">
        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            Đang tải danh sách phân công...
          </div>
        ) : error ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 text-center">
            <AlertCircle className="h-8 w-8 text-rose-300" />
            <p className="text-sm font-semibold text-rose-200">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Thử lại
            </button>
          </div>
        ) : pageRows.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 text-center">
            <ClipboardList className="h-9 w-9 text-zinc-600" />
            <p className="font-semibold text-white">Không có phân công phù hợp.</p>
            <p className="text-sm text-zinc-500">Thử đổi từ khóa hoặc bộ lọc trạng thái.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-zinc-800">
                <thead className="bg-zinc-900/70 text-left text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-5 py-4">Phân công</th>
                    <th className="px-5 py-4">Đơn hàng / khách</th>
                    <th className="px-5 py-4">Worker</th>
                    <th className="px-5 py-4">Sơ đồ</th>
                    <th className="px-5 py-4">Ngày</th>
                    <th className="px-5 py-4">Trạng thái</th>
                    <th className="px-5 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {pageRows.map((row) => {
                    const planCount = getPlanCount(row);
                    return (
                      <tr key={row.mapc} className="transition hover:bg-zinc-900/50">
                        <td className="px-5 py-4">
                          <div className="font-bold text-white">PC-{row.mapc}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-white">
                            {row.donhang?.madh ? `DH-${row.donhang.madh}` : "—"}
                          </div>
                          <div className="mt-1 text-sm text-zinc-500">
                            {row.donhang?.khachhang?.hoten || "Chưa có khách hàng"}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-zinc-300">
                          {row.nguoidung?.hoten || "Chưa có thợ"}
                        </td>
                        <td className="px-5 py-4 text-sm text-zinc-300">
                          {planCount === null ? "Xem trong chi tiết" : `${planCount} sơ đồ`}
                        </td>
                        <td className="px-5 py-4 text-sm text-zinc-400">
                          <span className="inline-flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-zinc-600" />
                            {formatDate(getAssignmentDate(row))}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClass(
                              row.trangthai,
                            )}`}
                          >
                            {assignmentStatusLabel(row.trangthai)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/admin/toi-uu-cat/${row.mapc}`}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500/15 px-3 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/25"
                          >
                            <Eye className="h-4 w-4" />
                            Xem chi tiết
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-4 md:hidden">
              {pageRows.map((row) => {
                const planCount = getPlanCount(row);
                return (
                  <article key={row.mapc} className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-bold text-white">PC-{row.mapc}</p>
                        <p className="mt-1 text-sm text-zinc-400">
                          {row.donhang?.madh ? `DH-${row.donhang.madh}` : "Chưa có đơn hàng"} ·{" "}
                          {row.donhang?.khachhang?.hoten || "Chưa có khách hàng"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(
                          row.trangthai,
                        )}`}
                      >
                        {assignmentStatusLabel(row.trangthai)}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                        <p className="text-xs uppercase text-zinc-500">Worker</p>
                        <p className="mt-1 font-semibold text-white">{row.nguoidung?.hoten || "—"}</p>
                      </div>
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                        <p className="text-xs uppercase text-zinc-500">Sơ đồ</p>
                        <p className="mt-1 font-semibold text-white">
                          {planCount === null ? "Xem chi tiết" : `${planCount} sơ đồ`}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/admin/toi-uu-cat/${row.mapc}`}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-bold text-white"
                    >
                      <Eye className="h-4 w-4" />
                      Xem chi tiết
                    </Link>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      {!loading && !error && filteredAssignments.length > 0 && (
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
