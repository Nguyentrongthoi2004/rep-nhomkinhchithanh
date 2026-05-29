"use client";

import {
  AlertTriangle,
  Boxes,
  ClipboardList,
  CreditCard,
  Loader2,
  PackageCheck,
  Scissors,
  TrendingUp,
  Users,
  WalletCards,
  ArrowRight,
  Settings,
  Activity,
  Play,
  Layers,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, LabelList, PieChart, Pie, Legend } from "recharts";
import { apiData } from "@/lib/api";
import Link from "next/link";

const COLORS = ["#3b82f6", "#a855f7", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#f43f5e"];

function getStatusColor(name: string) {
  switch (name) {
    case "Tiếp nhận": return "#64748b"; // Slate
    case "Chờ báo giá": return "#f59e0b"; // Amber
    case "Đã duyệt giá": return "#0ea5e9"; // Sky
    case "Đã cọc": return "#06b6d4"; // Cyan
    case "Đã thanh toán": return "#10b981"; // Emerald
    case "Đang gia công": return "#8b5cf6"; // Violet
    case "Hoàn thành": return "#22c55e"; // Green
    case "Đã hủy": return "#ef4444"; // Red
    default: return "#fb923c"; // Orange default
  }
}

type OrderRow = {
  madh: number;
  ngaytao: string;
  tonggiatri: number;
  trangthai: string;
  chitietdh?: Array<unknown>;
};

type PaymentRow = {
  madh: number;
  dathanhtoan: number;
  conno: number;
};

type UserRow = {
  mand: number;
  vaitro: string;
  trangthai: string;
};

type MaterialOption = {
  mavt: number;
  danhmuc?: { tendm?: string } | null;
};

type RawStockPage = {
  summary?: {
    total: number;
    moi: number;
    conDu: number;
    boDi: number;
  };
};

type IssueRow = {
  maphoi?: number;
  solanbao?: number;
};

type AssignmentRow = {
  mapc: number;
  trangthai: string;
};

type DashboardState = {
  revenue: number;
  paid: number;
  debt: number;
  pendingQuote: number;
  approvedOrders: number;
  activeAssignments: number;
  openIssues: number;
  totalWorkers: number;
  activeWorkers: number;
  materialSkuCount: number;
  rawTotal: number;
  rawNew: number;
  rawReusable: number;
  rawScrapped: number;
  materialBars: Array<{ name: string; value: number }>;
  statusBars: Array<{ name: string; value: number }>;
};

const emptyDashboard: DashboardState = {
  revenue: 0,
  paid: 0,
  debt: 0,
  pendingQuote: 0,
  approvedOrders: 0,
  activeAssignments: 0,
  openIssues: 0,
  totalWorkers: 0,
  activeWorkers: 0,
  materialSkuCount: 0,
  rawTotal: 0,
  rawNew: 0,
  rawReusable: 0,
  rawScrapped: 0,
  materialBars: [],
  statusBars: [],
};

function money(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value || 0);
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    KHAO_SAT: "Tiếp nhận",
    BAO_GIA_NHAP: "Chờ báo giá",
    DA_DUYET_GIA: "Đã duyệt giá",
    DA_COC: "Đã cọc",
    DA_THANH_TOAN: "Đã thanh toán",
    DANG_GIA_CONG: "Đang gia công",
    HOAN_THANH: "Hoàn thành",
    DA_HUY: "Đã hủy",
  };
  return map[status] ?? status;
}

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string | number;
  hint: string;
  icon: ElementType;
  tone: "emerald" | "sky" | "amber" | "red" | "violet";
}) {
  const toneClass = {
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    sky: "border-sky-500/20 bg-sky-500/10 text-sky-300",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    red: "border-red-500/20 bg-red-500/10 text-red-300",
    violet: "border-violet-500/20 bg-violet-500/10 text-violet-300",
  }[tone];

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{title}</p>
          <div className="mt-2 text-2xl font-bold text-gray-100">{value}</div>
          <p className="mt-2 text-xs leading-relaxed text-gray-500">{hint}</p>
        </div>
        <div className={`rounded-xl border p-3 ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

async function safeApi<T>(path: string, fallback: T): Promise<T> {
  try {
    return await apiData<T>(path);
  } catch {
    return fallback;
  }
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardState>(emptyDashboard);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const [orders, payments, users, materials, rawStock, issues, assignments] = await Promise.all([
        safeApi<OrderRow[]>("/api/admin/orders", []),
        safeApi<PaymentRow[]>("/api/admin/payments", []),
        safeApi<UserRow[]>("/api/admin/users", []),
        safeApi<MaterialOption[]>("/api/admin/materials-options", []),
        safeApi<RawStockPage>("/api/admin/raw-stock?page=1&pageSize=1", {}),
        safeApi<IssueRow[]>("/api/admin/issues", []),
        safeApi<AssignmentRow[]>("/api/admin/assignments", []),
      ]);

      const revenue = orders.reduce((sum, order) => sum + Number(order.tonggiatri || 0), 0);
      const paid = payments.reduce((sum, row) => sum + Number(row.dathanhtoan || 0), 0);
      const debt = payments.reduce((sum, row) => sum + Number(row.conno || 0), 0);
      const pendingQuote = orders.filter((order) => ["KHAO_SAT", "BAO_GIA_NHAP"].includes(order.trangthai)).length;
      const approvedOrders = orders.filter((order) => !["KHAO_SAT", "BAO_GIA_NHAP", "DA_HUY"].includes(order.trangthai)).length;
      const totalWorkers = users.filter((u) => u.vaitro === "WORKER").length;
      const activeWorkers = users.filter((u) => u.vaitro === "WORKER" && u.trangthai === "DANG_LAM").length;
      const activeAssignments = assignments.filter((a) => a.trangthai === "DANG_THUC_HIEN").length;
      const openIssues = issues.reduce((sum, issue) => sum + Number(issue.solanbao || 1), 0);

      const materialGrouped = new Map<string, number>();
      for (const material of materials) {
        const name = material.danhmuc?.tendm || "Khác";
        materialGrouped.set(name, (materialGrouped.get(name) || 0) + 1);
      }

      const statusGrouped = new Map<string, number>();
      for (const order of orders) {
        const name = statusLabel(order.trangthai);
        statusGrouped.set(name, (statusGrouped.get(name) || 0) + 1);
      }

      const next: DashboardState = {
        revenue,
        paid,
        debt,
        pendingQuote,
        approvedOrders,
        activeAssignments,
        openIssues,
        totalWorkers,
        activeWorkers,
        materialSkuCount: materials.length,
        rawTotal: rawStock.summary?.total ?? 0,
        rawNew: rawStock.summary?.moi ?? 0,
        rawReusable: rawStock.summary?.conDu ?? 0,
        rawScrapped: rawStock.summary?.boDi ?? 0,
        materialBars: [...materialGrouped.entries()].map(([name, value]) => ({ name, value })),
        statusBars: [...statusGrouped.entries()].map(([name, value]) => ({ name, value })),
      };

      if (!cancelled) {
        setData(next);
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const stockHealth = useMemo(() => {
    if (!data.rawTotal) return "Chưa có dữ liệu kho";
    return `${data.rawNew} mới · ${data.rawReusable} phôi dư · ${data.rawScrapped} bỏ đi`;
  }, [data.rawNew, data.rawReusable, data.rawScrapped, data.rawTotal]);

  const stockInsight = useMemo(() => {
    if (!data.rawTotal) return "Chưa có dữ liệu kho phôi.";
    const reusablePct = Math.round((data.rawReusable / data.rawTotal) * 100);
    if (data.rawScrapped > 0) {
      return `Tỷ lệ phôi dư đạt ${reusablePct}%. Lưu ý có ${data.rawScrapped} thanh phôi lỗi cần kiểm tra nguyên nhân hao hụt.`;
    }
    return `Tỷ lệ phôi dư đạt ${reusablePct}%. Kho hoạt động hiệu quả, không ghi nhận phôi hỏng/lỗi.`;
  }, [data.rawReusable, data.rawScrapped, data.rawTotal]);

  const orderInsight = useMemo(() => {
    if (!data.statusBars.length) return "Chưa có đơn hàng nào để thống kê.";
    const maxVal = Math.max(...data.statusBars.map(s => s.value));
    if (maxVal === 0) return "Tất cả các nhóm trạng thái đơn hàng hiện đang trống.";
    const tops = data.statusBars.filter(s => s.value === maxVal).map(s => s.name);
    return `Đơn hàng tập trung nhiều nhất ở nhóm: ${tops.join(", ")} (${maxVal} đơn).`;
  }, [data.statusBars]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
              <Activity className="h-6 w-6 text-blue-500 animate-pulse" />
              Bảng điều hành sản xuất
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              Theo dõi đơn hàng, doanh thu, kho phôi, phân công và cảnh báo vận hành.
            </p>
          </div>
          {loading && (
            <div className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang tải dữ liệu thật
            </div>
          )}
        </div>
      </div>

      {/* Cảnh báo vận hành (Production Alerts Panel) */}
      <div className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
          Cảnh báo vận hành & Việc cần xử lý
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cảnh báo sự cố phôi */}
          {data.openIssues > 0 ? (
            <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex items-start gap-3 hover:border-red-500/40 transition-colors">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5 animate-bounce" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-200">Sự cố phôi cần giải quyết</h3>
                <p className="text-xs text-gray-400 mt-1">Đang có {data.openIssues} báo cáo sự cố phôi đang mở chưa được xử lý tại xưởng.</p>
                <Link href="/admin/su-co" className="inline-flex items-center text-xs text-red-400 hover:text-red-300 font-medium mt-2 gap-1 group">
                  Đến trang sự cố <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-400">Không có sự cố phôi</h3>
                <p className="text-xs text-gray-500 mt-1">Tất cả sự cố phôi đã được giải quyết hoặc chưa ghi nhận sự cố mới.</p>
              </div>
            </div>
          )}

          {/* Đơn chờ báo giá */}
          {data.pendingQuote > 0 ? (
            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-3 hover:border-amber-500/40 transition-colors">
              <ClipboardList className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-amber-200">Đơn hàng chờ xử lý</h3>
                <p className="text-xs text-gray-400 mt-1">Có {data.pendingQuote} đơn hàng mới cần thiết lập BOM hoặc báo giá/duyệt giá.</p>
                <Link href="/admin/don-hang" className="inline-flex items-center text-xs text-amber-400 hover:text-amber-300 font-medium mt-2 gap-1 group">
                  Xem danh sách đơn <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex items-start gap-3">
              <ClipboardList className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-400">Không có đơn chờ duyệt</h3>
                <p className="text-xs text-gray-500 mt-1">Không có đơn hàng mới nào đang ở trạng thái khảo sát/báo giá nháp.</p>
              </div>
            </div>
          )}

          {/* Cảnh báo công nợ */}
          {data.debt > 0 ? (
            <div className="p-4 rounded-xl border border-sky-500/20 bg-sky-500/5 flex items-start gap-3 hover:border-sky-500/40 transition-colors">
              <CreditCard className="h-5 w-5 text-sky-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-sky-200">Công nợ cần thu hồi</h3>
                <p className="text-xs text-gray-400 mt-1">Tổng công nợ chưa thanh toán từ khách hàng: {money(data.debt)}.</p>
                <Link href="/admin/thanh-toan" className="inline-flex items-center text-xs text-sky-400 hover:text-sky-300 font-medium mt-2 gap-1 group">
                  Xem chi tiết thanh toán <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-400">Đã thu hồi hết công nợ</h3>
                <p className="text-xs text-gray-500 mt-1">Không ghi nhận công nợ chưa thanh toán nào trên hệ thống.</p>
              </div>
            </div>
          )}

          {/* Trạng thái nhân sự thợ */}
          {data.totalWorkers - data.activeWorkers > 0 ? (
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-start gap-3 hover:border-emerald-500/40 transition-colors">
              <Users className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-emerald-200">Có nhân sự sẵn sàng nhận việc</h3>
                <p className="text-xs text-gray-400 mt-1">Hiện có {data.totalWorkers - data.activeWorkers} thợ đang nhàn rỗi, có thể phân công gia công đơn mới.</p>
                <Link href="/admin/phan-cong" className="inline-flex items-center text-xs text-emerald-400 hover:text-emerald-300 font-medium mt-2 gap-1 group">
                  Đến trang phân công <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex items-start gap-3">
              <Users className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-400">Tất cả thợ đang làm việc</h3>
                <p className="text-xs text-gray-500 mt-1">Toàn bộ {data.totalWorkers} thợ đều đang bận thực hiện các nhiệm vụ được phân công.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Thao tác nhanh (Quick Actions Grid) */}
      <div className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
          <Settings className="h-4 w-4 text-purple-400" />
          Điều hướng hành động nhanh
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link href="/admin/toi-uu-cat" className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-white/10 text-center transition-all group">
            <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 mb-2 group-hover:scale-110 transition-transform">
              <Scissors className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-gray-200">Tối ưu cắt nhôm</span>
          </Link>

          <Link href="/admin/de-xuat-cat" className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-white/10 text-center transition-all group">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2 group-hover:scale-110 transition-transform">
              <PackageCheck className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-gray-200">Duyệt đề xuất cắt</span>
          </Link>

          <Link href="/admin/su-co" className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-white/10 text-center transition-all group">
            <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 mb-2 group-hover:scale-110 transition-transform">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-gray-200">Báo sự cố phôi</span>
          </Link>

          <Link href="/admin/phan-cong" className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-white/10 text-center transition-all group">
            <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 mb-2 group-hover:scale-110 transition-transform">
              <Play className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-gray-200">Phân công thợ</span>
          </Link>

          <Link href="/admin/don-hang" className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-white/10 text-center transition-all group">
            <div className="h-10 w-10 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 mb-2 group-hover:scale-110 transition-transform">
              <ClipboardList className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-gray-200">Quản lý đơn hàng</span>
          </Link>

          <Link href="/admin/danh-muc" className="flex flex-col items-center justify-center p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-white/10 text-center transition-all group">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 mb-2 group-hover:scale-110 transition-transform">
              <Layers className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-gray-200">Danh mục vật tư</span>
          </Link>
        </div>
      </div>

      {/* Nhóm Stat Cards */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 pl-1">
            Kinh doanh & Tài chính
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Tổng giá trị đơn" value={money(data.revenue)} hint="Tổng giá trị các đơn hiện có trong hệ thống." icon={TrendingUp} tone="emerald" />
            <StatCard title="Đã thu" value={money(data.paid)} hint="Tổng tiền đã ghi nhận từ giao dịch thanh toán." icon={WalletCards} tone="sky" />
            <StatCard title="Còn nợ" value={money(data.debt)} hint="Công nợ còn lại cần theo dõi theo từng đơn." icon={CreditCard} tone="amber" />
            <StatCard title="Chờ báo giá" value={data.pendingQuote} hint="Đơn đang ở bước tiếp nhận/lập BOM/báo giá." icon={ClipboardList} tone="amber" />
          </div>
        </div>

        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 pl-1">
            Sản xuất & Vận hành
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Sự cố phôi" value={data.openIssues} hint="Số báo cáo sự cố phôi đang cần xử lý." icon={AlertTriangle} tone={data.openIssues ? "red" : "emerald"} />
            <StatCard title="Đơn đã duyệt" value={data.approvedOrders} hint="Đơn đã qua bước duyệt giá, có thể thanh toán/sản xuất." icon={PackageCheck} tone="emerald" />
            <StatCard title="Đang gia công" value={data.activeAssignments} hint="Phân công đang ở trạng thái thợ đang làm." icon={Scissors} tone="violet" />
            <StatCard title="Nhân sự thợ" value={`${data.activeWorkers}/${data.totalWorkers}`} hint="Thợ đang hoạt động trên tổng số thợ." icon={Users} tone="sky" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-6 xl:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-100">Trạng thái đơn hàng</h2>
              <p className="mt-1 text-xs text-gray-500">Dùng để phát hiện đơn bị kẹt ở báo giá, thanh toán hoặc gia công.</p>
              {data.statusBars.length > 0 && (
                <p className="mt-2 text-xs font-semibold text-blue-400 bg-blue-500/5 border border-blue-500/10 px-2 py-1 rounded inline-block">
                  {orderInsight}
                </p>
              )}
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-400">{data.statusBars.length} trạng thái</div>
          </div>
          <div className="mt-6 h-[320px]">
            {data.statusBars.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.statusBars} layout="vertical" margin={{ top: 5, right: 40, left: 18, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff12" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={130} />
                  <Tooltip
                    cursor={{ fill: "#ffffff08" }}
                    contentStyle={{ backgroundColor: "#111827", borderColor: "#374151", borderRadius: 12 }}
                    itemStyle={{ color: "#f3f4f6" }}
                    labelStyle={{ color: "#9ca3af", fontWeight: "bold" }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
                    {data.statusBars.map((entry, index) => {
                      const color = getStatusColor(entry.name);
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                    <LabelList dataKey="value" position="right" fill="#e2e8f0" fontSize={11} offset={8} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-gray-500">Chưa có đơn hàng.</div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-100">Kho phôi</h2>
              <p className="mt-1 text-xs text-gray-500">{stockHealth}</p>
            </div>
            <Boxes className="h-6 w-6 text-cyan-300" />
          </div>

          {data.rawTotal > 0 && (
            <p className="mt-3 text-xs text-gray-400 border border-white/5 bg-white/[0.02] p-2.5 rounded-lg leading-relaxed">
              <span className="font-semibold text-gray-300">Phân tích:</span> {stockInsight}
            </p>
          )}

          <div className="mt-6 space-y-4">
            <StockLine label="Thanh/phôi mới" value={data.rawNew} total={data.rawTotal} tone="bg-cyan-400" />
            <StockLine label="Phôi dư tái sử dụng" value={data.rawReusable} total={data.rawTotal} tone="bg-amber-400" />
            <StockLine label="Bỏ đi/lỗi" value={data.rawScrapped} total={data.rawTotal} tone="bg-red-400" />
          </div>
          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-300">
            <div className="font-bold text-gray-100">{data.materialSkuCount} mã vật tư</div>
            <div className="mt-1 text-xs text-gray-500">Nếu giáo viên hỏi “còn thanh 1m/2m/5m không”, vào Kho phôi và dùng bộ lọc “Tìm phôi đủ chiều dài”.</div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-100">Phân bổ mã vật tư</h2>
            <p className="mt-1 text-xs text-gray-500">
              {data.materialSkuCount > 0 
                ? `Tổng cộng ${data.materialSkuCount} SKU được phân nhóm danh mục.`
                : "Dữ liệu lấy từ danh mục vật tư, không dùng dữ liệu mẫu."
              }
            </p>
          </div>
          {data.materialBars.length > 0 && (
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-400">
              {data.materialBars.length} nhóm
            </div>
          )}
        </div>

        <div className="mt-6 h-[280px]">
          {data.materialSkuCount > 0 && data.materialBars.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.materialBars}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.materialBars.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#111827", borderColor: "#374151", borderRadius: 12 }}
                  itemStyle={{ color: "#f3f4f6" }}
                  labelStyle={{ color: "#9ca3af", fontWeight: "bold" }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-xs text-gray-400">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-gray-500">
              Chưa có dữ liệu phân bổ mã vật tư.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StockLine({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        <span className="font-mono font-bold text-gray-100">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
