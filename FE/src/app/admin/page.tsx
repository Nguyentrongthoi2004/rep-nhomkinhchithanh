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
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiData } from "@/lib/api";

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

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Tổng quan xưởng nhôm kính</h1>
            <p className="mt-1 text-sm text-gray-400">
              Theo dõi doanh thu, công nợ, kho phôi, phân công và sự cố đang mở.
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Tổng giá trị đơn" value={money(data.revenue)} hint="Tổng giá trị các đơn hiện có trong hệ thống." icon={TrendingUp} tone="emerald" />
        <StatCard title="Đã thu" value={money(data.paid)} hint="Tổng tiền đã ghi nhận từ giao dịch thanh toán." icon={WalletCards} tone="sky" />
        <StatCard title="Còn nợ" value={money(data.debt)} hint="Công nợ còn lại cần theo dõi theo từng đơn." icon={CreditCard} tone="amber" />
        <StatCard title="Sự cố phôi" value={data.openIssues} hint="Số báo cáo sự cố phôi đang cần xử lý." icon={AlertTriangle} tone={data.openIssues ? "red" : "emerald"} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Chờ báo giá" value={data.pendingQuote} hint="Đơn đang ở bước tiếp nhận/lập BOM/báo giá." icon={ClipboardList} tone="amber" />
        <StatCard title="Đơn đã duyệt" value={data.approvedOrders} hint="Đơn đã qua bước duyệt giá, có thể thanh toán/sản xuất." icon={PackageCheck} tone="emerald" />
        <StatCard title="Đang gia công" value={data.activeAssignments} hint="Phân công đang ở trạng thái thợ đang làm." icon={Scissors} tone="violet" />
        <StatCard title="Nhân sự thợ" value={`${data.activeWorkers}/${data.totalWorkers}`} hint="Thợ đang hoạt động trên tổng số thợ." icon={Users} tone="sky" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-6 xl:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-100">Trạng thái đơn hàng</h2>
              <p className="mt-1 text-xs text-gray-500">Dùng để phát hiện đơn bị kẹt ở báo giá, thanh toán hoặc gia công.</p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-400">{data.statusBars.length} trạng thái</div>
          </div>
          <div className="mt-6 h-[320px]">
            {data.statusBars.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.statusBars} layout="vertical" margin={{ top: 5, right: 24, left: 18, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff12" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={130} />
                  <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={{ backgroundColor: "#111827", borderColor: "#374151", borderRadius: 12 }} />
                  <Bar dataKey="value" fill="#fb923c" radius={[0, 6, 6, 0]} barSize={18} />
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
        <h2 className="text-lg font-bold text-gray-100">Phân bố mã vật tư</h2>
        <p className="mt-1 text-xs text-gray-500">Dữ liệu lấy từ danh mục vật tư, không dùng dữ liệu mẫu.</p>
        <div className="mt-6 h-[260px]">
          {data.materialBars.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.materialBars} margin={{ top: 5, right: 24, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff12" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={{ backgroundColor: "#111827", borderColor: "#374151", borderRadius: 12 }} />
                <Bar dataKey="value" fill="#38bdf8" radius={[6, 6, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-gray-500">Chưa có vật tư.</div>
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
