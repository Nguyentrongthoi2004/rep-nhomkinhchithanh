"use client";

import {
  AlertTriangle,
  Boxes,
  ClipboardList,
  CreditCard,
  Download,
  Loader2,
  PackageCheck,
  Printer,
  Scissors,
  TrendingUp,
  WalletCards,
  Settings,
  Activity,
  Play,
  Layers,
  Target,
  RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import type { ElementType } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, LabelList } from "recharts";
import { apiData } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

// Import new dashboard subcomponents
import { DashboardTabs } from "./_components/dashboard/DashboardTabs";
import { FinanceTab } from "./_components/dashboard/FinanceTab";
import { ProductionTab } from "./_components/dashboard/ProductionTab";
import { InventoryTab } from "./_components/dashboard/InventoryTab";
import { WarningCenter, type WarningDashboardData } from "./_components/dashboard/WarningCenter";

const DASHBOARD_RANGES = [
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
  { value: "3m", label: "3 tháng" },
  { value: "6m", label: "6 tháng" },
  { value: "1y", label: "1 năm" },
] as const;
type DashboardRange = (typeof DASHBOARD_RANGES)[number]["value"];

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
  makh?: number;
  ngaytao: string;
  tonggiatri: number;
  trangthai: string;
  khachhang?: { makh?: number; hoten?: string } | null;
  chitietdh?: Array<unknown>;
};

type PaymentRow = {
  madh: number;
  dathanhtoan: number;
  conno: number;
};

type UserRow = {
  mand: number;
  hoten?: string;
  vaitro: string;
  trangthai: string;
};

type MaterialOption = {
  mavt: number;
  danhmuc?: { tendm?: string } | null;
};

type IssueRow = {
  maphoi?: number;
  solanbao?: number;
};

type AssignmentRow = {
  mapc: number;
  madh?: number;
  matho?: number;
  trangthai: string;
  donhang?: {
    madh?: number;
    ngaytao?: string;
    trangthai?: string;
    khachhang?: { hoten?: string } | null;
  } | null;
  nguoidung?: { mand?: number; hoten?: string } | null;
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

type RevenueMonth = { month: string; revenue: number; paid: number };
type ProductionWorker = { workerId: number; workerName: string; done: number; active: number; pending: number; rejected: number };
type CuttingEfficiency = { totalStockUsed: number; totalWaste: number; totalReusable: number; wastePercent: number; reusablePercent: number };
type TopCustomer = { customerId: number; name: string; totalOrders: number; totalValue: number };
type CsvCell = string | number | null | undefined;
type DashboardExtended = {
  totalRevenue: number;
  totalPaid: number;
  remainingDebt: number;
  totalOrders: number;
  processingOrders: number;
  completedOrders: number;
  completionRate: number;
  avgWastePercent: number;
  revenueByMonth: RevenueMonth[];
  productionByWorker: ProductionWorker[];
  cuttingEfficiency: CuttingEfficiency;
  topCustomers: TopCustomer[];
};

type FinanceDashboardData = {
  revenueByPeriod: Array<{ period: string; revenue: number }>;
  paidByPeriod: Array<{ period: string; paid: number }>;
  statusAllocation: Array<{ group: string; label: string; count: number; totalValue: number }>;
  topCustomers: Array<{ customerId: number; name: string; totalOrders: number; totalValue: number }>;
  averageOrderValue: number;
  totalRevenue: number;
  totalPaid: number;
  remainingDebt: number;
};

type ProductionDashboardData = {
  productionOrders: number;
  workerProgress: Array<{
    workerId: number;
    workerName: string;
    done: number;
    active: number;
    pending: number;
    rejected: number;
  }>;
  overloadedWorkers: Array<{ workerId: number; name: string; activeCount: number }>;
  delayedOrders: Array<{ madh: number; trangthai: string; ngaytao: string; elapsedDays: number }>;
  unresolvedIssuesCount: number;
  unresolvedIssues: Array<{
    mank: number;
    maphoi: number;
    matho: number;
    mapc: number | null;
    ghichu: string | null;
    thoigian: string;
    trangthaixuly: string | null;
    workerName: string;
    customerName: string;
    madh?: number;
  }>;
};

type InventoryDashboardData = {
  totalAvailable: number;
  statusAllocation: Array<{ name: string; value: number }>;
  usageAndWasteSummary: {
    reusableMeters: number;
    wasteMeters: number;
    totalStockUsed: number;
  };
  lowStockWarnings: Array<{
    mavt: number;
    tenvt: string;
    donvitinh: string;
    count: number;
  }>;
  topConsumedMaterials: Array<{
    mavt: number;
    name: string;
    cutCount: number;
  }>;
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


function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toFiniteNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function normalizeDashboardExtended(value: unknown): DashboardExtended {
  const record: Record<string, unknown> = isRecord(value) ? value : {};
  const cuttingRecord: Record<string, unknown> = isRecord(record.cuttingEfficiency) ? record.cuttingEfficiency : {};

  const revenueByMonth: RevenueMonth[] = Array.isArray(record.revenueByMonth)
    ? record.revenueByMonth
        .filter(isRecord)
        .map((item) => ({
          month: String(item.month ?? ""),
          revenue: toFiniteNumber(item.revenue),
          paid: toFiniteNumber(item.paid),
        }))
        .filter((item) => item.month.length > 0)
    : [];

  const productionByWorker: ProductionWorker[] = Array.isArray(record.productionByWorker)
    ? record.productionByWorker
        .filter(isRecord)
        .map((item) => ({
          workerId: toFiniteNumber(item.workerId),
          workerName: String(item.workerName ?? ""),
          done: toFiniteNumber(item.done),
          active: toFiniteNumber(item.active),
          pending: toFiniteNumber(item.pending),
          rejected: toFiniteNumber(item.rejected),
        }))
        .filter((item) => item.workerId > 0)
    : [];

  const topCustomers: TopCustomer[] = Array.isArray(record.topCustomers)
    ? record.topCustomers
        .filter(isRecord)
        .map((item) => ({
          customerId: toFiniteNumber(item.customerId),
          name: String(item.name ?? ""),
          totalOrders: toFiniteNumber(item.totalOrders),
          totalValue: toFiniteNumber(item.totalValue),
        }))
        .filter((item) => item.customerId > 0)
    : [];

  const cuttingEfficiency: CuttingEfficiency = {
    totalStockUsed: toFiniteNumber(cuttingRecord.totalStockUsed),
    totalWaste: toFiniteNumber(cuttingRecord.totalWaste),
    totalReusable: toFiniteNumber(cuttingRecord.totalReusable),
    wastePercent: toFiniteNumber(cuttingRecord.wastePercent),
    reusablePercent: toFiniteNumber(cuttingRecord.reusablePercent),
  };

  return {
    totalRevenue: toFiniteNumber(record.totalRevenue),
    totalPaid: toFiniteNumber(record.totalPaid),
    remainingDebt: toFiniteNumber(record.remainingDebt),
    totalOrders: toFiniteNumber(record.totalOrders),
    processingOrders: toFiniteNumber(record.processingOrders),
    completedOrders: toFiniteNumber(record.completedOrders),
    completionRate: toFiniteNumber(record.completionRate),
    avgWastePercent: toFiniteNumber(record.avgWastePercent),
    revenueByMonth,
    productionByWorker,
    cuttingEfficiency,
    topCustomers,
  };
}

function money(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value || 0);
}

function percent(value: number) {
  return `${Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
}

function csvCell(value: CsvCell) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvSection(title: string, headers: string[], rows: CsvCell[][]) {
  return [
    [title],
    headers,
    ...rows,
  ].map((row) => row.map(csvCell).join(","));
}

function buildDashboardCsv(
  range: DashboardRange,
  overviewData: DashboardState,
  extendedData: DashboardExtended | null,
  summary: {
    totalRevenue: number;
    totalPaid: number;
    remainingDebt: number;
    totalOrders: number;
    processingOrders: number;
    completedOrders: number;
    completionRate: number;
    avgWastePercent: number;
  },
) {
  const reportTime = new Date().toLocaleString("vi-VN", { hour12: false });
  const sections = [
    csvSection("Tổng quan", ["Chỉ số", "Giá trị"], [
      ["Kỳ báo cáo", dashboardRangeLabel(range)],
      ["Thời điểm xuất", reportTime],
      ["Tổng doanh thu", summary.totalRevenue],
      ["Đã thu", summary.totalPaid],
      ["Còn nợ", summary.remainingDebt],
      ["Tổng đơn", summary.totalOrders],
      ["Đang gia công", summary.processingOrders],
      ["Hoàn thành", summary.completedOrders],
      ["Tỷ lệ hoàn thành", percent(summary.completionRate)],
      ["Hao phí trung bình", percent(summary.avgWastePercent)],
      ["Sự cố phôi", overviewData.openIssues],
      ["Tổng phôi", overviewData.rawTotal],
      ["Phôi dư tái sử dụng", overviewData.rawReusable],
      ["Phôi bỏ đi", overviewData.rawScrapped],
    ]),
    csvSection("Doanh thu theo tháng", ["Tháng", "Doanh thu", "Đã thu"], (extendedData?.revenueByMonth ?? []).map((item) => [
      item.month,
      item.revenue,
      item.paid,
    ])),
    csvSection("Top khách hàng", ["Mã KH", "Tên khách hàng", "Số đơn", "Tổng giá trị"], (extendedData?.topCustomers ?? []).map((item) => [
      item.customerId,
      item.name,
      item.totalOrders,
      item.totalValue,
    ])),
    csvSection("Năng suất thợ", ["Mã thợ", "Tên thợ", "Hoàn thành", "Đang làm", "Chờ làm", "Từ chối"], (extendedData?.productionByWorker ?? []).map((item) => [
      item.workerId,
      item.workerName,
      item.done,
      item.active,
      item.pending,
      item.rejected,
    ])),
    csvSection("Trạng thái đơn hàng", ["Trạng thái", "Số đơn"], overviewData.statusBars.map((item) => [item.name, item.value])),
  ];

  return `\ufeff${sections.flatMap((section, index) => (index === 0 ? section : ["", ...section])).join("\r\n")}`;
}

function dashboardRangeLabel(range: DashboardRange) {
  return DASHBOARD_RANGES.find((item) => item.value === range)?.label ?? "30 ngày";
}

function dashboardRangeStart(range: DashboardRange) {
  const now = new Date();
  const start = new Date(now);

  if (range === "7d" || range === "30d") {
    start.setDate(now.getDate() - (range === "7d" ? 7 : 30) + 1);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  const months = range === "3m" ? 3 : range === "6m" ? 6 : 12;
  start.setMonth(now.getMonth() - months + 1);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
}

function isDateInDashboardRange(dateValue: string | undefined, range: DashboardRange) {
  if (!dateValue) return false;
  const d = new Date(dateValue);
  return Number.isFinite(d.getTime()) && d >= dashboardRangeStart(range);
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

function buildTopCustomersFromOrders(orders: OrderRow[], range: DashboardRange): TopCustomer[] {
  const grouped = new Map<number, { name: string; totalOrders: number; totalValue: number }>();

  for (const order of orders) {
    if (order.trangthai === "DA_HUY" || !isDateInDashboardRange(order.ngaytao, range)) continue;
    const customerId = toFiniteNumber(order.khachhang?.makh ?? order.makh);
    if (customerId <= 0) continue;
    const current = grouped.get(customerId) ?? {
      name: order.khachhang?.hoten || `KH #${customerId}`,
      totalOrders: 0,
      totalValue: 0,
    };
    current.totalOrders++;
    current.totalValue += toFiniteNumber(order.tonggiatri);
    grouped.set(customerId, current);
  }

  return [...grouped.entries()]
    .map(([customerId, item]) => ({ customerId, ...item }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5);
}

function buildProductionByWorkerFromAssignments(assignments: AssignmentRow[], range: DashboardRange): ProductionWorker[] {
  const grouped = new Map<number, ProductionWorker>();

  for (const assignment of assignments) {
    const order = assignment.donhang;
    if (order?.trangthai === "DA_HUY" || !isDateInDashboardRange(order?.ngaytao, range)) continue;
    const workerId = toFiniteNumber(assignment.nguoidung?.mand ?? assignment.matho);
    if (workerId <= 0) continue;

    const item = grouped.get(workerId) ?? {
      workerId,
      workerName: assignment.nguoidung?.hoten || `Thợ #${workerId}`,
      done: 0,
      active: 0,
      pending: 0,
      rejected: 0,
    };

    if (assignment.trangthai === "HOAN_THANH") item.done++;
    else if (assignment.trangthai === "DANG_THUC_HIEN") item.active++;
    else if (assignment.trangthai === "CHO_THUC_HIEN") item.pending++;
    else if (assignment.trangthai === "TU_CHOI") item.rejected++;

    grouped.set(workerId, item);
  }

  return [...grouped.values()].sort(
    (a, b) => (b.done + b.active + b.pending + b.rejected) - (a.done + a.active + a.pending + a.rejected),
  );
}

const TABS = [
  { id: "overview", label: "Tổng quan", icon: Activity },
  { id: "warnings", label: "Cảnh báo vận hành", icon: AlertTriangle },
  { id: "finance", label: "Tài chính", icon: WalletCards },
  { id: "production", label: "Sản xuất & Gia công", icon: Scissors },
  { id: "inventory", label: "Kho & Vật tư", icon: Boxes },
] as const;

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  tone,
  href,
}: {
  title: string;
  value: string | number;
  hint: string;
  icon: ElementType;
  tone: "emerald" | "sky" | "amber" | "red" | "violet";
  href?: string;
}) {
  const toneClass = {
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    sky: "border-sky-500/20 bg-sky-500/10 text-sky-300",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    red: "border-red-500/20 bg-red-500/10 text-red-300",
    violet: "border-violet-500/20 bg-violet-500/10 text-violet-300",
  }[tone];

  const body = (
    <div className="h-full rounded-2xl border border-white/10 bg-[#0a0a0c] p-5 transition-colors hover:border-white/20 hover:bg-white/[0.03]">
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

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {body}
      </Link>
    );
  }

  return body;
}

export default function AdminDashboard() {
  const supabase = useMemo(() => createClient(), []);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const [activeTab, setActiveTab] = useState<string>("overview");
  const [range, setRange] = useState<DashboardRange>("30d");

  // Tab 1: Overview States
  const [overviewData, setOverviewData] = useState<DashboardState>(emptyDashboard);
  const [overviewExtData, setOverviewExtData] = useState<DashboardExtended | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [warningsData, setWarningsData] = useState<WarningDashboardData | null>(null);
  const [warningsLoading, setWarningsLoading] = useState(false);

  // Tab 2: Finance States
  const [financeData, setFinanceData] = useState<FinanceDashboardData | null>(null);
  const [financeLoading, setFinanceLoading] = useState(false);

  // Tab 3: Production States
  const [productionData, setProductionData] = useState<ProductionDashboardData | null>(null);
  const [productionLoading, setProductionLoading] = useState(false);

  // Tab 4: Inventory States
  const [inventoryData, setInventoryData] = useState<InventoryDashboardData | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const loadTab = useCallback(async (tabId: string, currentRange: DashboardRange) => {
    setError(false);
    setErrorMessage("");
    try {
      if (tabId === "overview") {
        setOverviewLoading(true);
        setWarningsLoading(true);
        const [rawOrders, rawPayments, rawUsers, rawMaterials, rawStock, rawIssues, rawAssignments, rawWarnings] = await Promise.all([
          apiData<unknown>("/api/admin/orders"),
          apiData<unknown>("/api/admin/payments"),
          apiData<unknown>("/api/admin/users"),
          apiData<unknown>("/api/admin/materials-options"),
          apiData<unknown>("/api/admin/raw-stock?page=1&pageSize=1"),
          apiData<unknown>("/api/admin/issues"),
          apiData<unknown>("/api/admin/assignments"),
          apiData<WarningDashboardData>(`/api/admin/dashboard-stats/warnings?range=${currentRange}`),
        ]);
        const orders = Array.isArray(rawOrders) ? (rawOrders as OrderRow[]) : [];
        const payments = Array.isArray(rawPayments) ? (rawPayments as PaymentRow[]) : [];
        const users = Array.isArray(rawUsers) ? (rawUsers as UserRow[]) : [];
        const materials = Array.isArray(rawMaterials) ? (rawMaterials as MaterialOption[]) : [];
        const issues = Array.isArray(rawIssues) ? (rawIssues as IssueRow[]) : [];
        const assignments = Array.isArray(rawAssignments) ? (rawAssignments as AssignmentRow[]) : [];
        const rawStockSummary: Record<string, unknown> = isRecord(rawStock) && isRecord(rawStock.summary) ? rawStock.summary : {};
        const rangeOrders = orders.filter((order) => isDateInDashboardRange(order.ngaytao, currentRange));
        const rangeAssignments = assignments.filter((assignment) => isDateInDashboardRange(assignment.donhang?.ngaytao, currentRange));

        const revenue = rangeOrders.filter((order) => order.trangthai !== "DA_HUY").reduce((sum, order) => sum + Number(order.tonggiatri || 0), 0);
        const paid = payments.reduce((sum, row) => sum + Number(row.dathanhtoan || 0), 0);
        const debt = payments.reduce((sum, row) => sum + Number(row.conno || 0), 0);
        const pendingQuote = rangeOrders.filter((order) => ["KHAO_SAT", "BAO_GIA_NHAP"].includes(order.trangthai)).length;
        const approvedOrders = rangeOrders.filter((order) => !["KHAO_SAT", "BAO_GIA_NHAP", "DA_HUY"].includes(order.trangthai)).length;
        const totalWorkers = users.filter((u) => u.vaitro === "WORKER").length;
        const activeWorkers = users.filter((u) => u.vaitro === "WORKER" && u.trangthai === "DANG_LAM").length;
        const activeAssignments = rangeAssignments.filter((a) => a.trangthai === "DANG_THUC_HIEN").length;
        const openIssues = issues.reduce((sum, issue) => sum + Number(issue.solanbao || 1), 0);

        const materialGrouped = new Map<string, number>();
        for (const material of materials) {
          const name = material.danhmuc?.tendm || "Khác";
          materialGrouped.set(name, (materialGrouped.get(name) || 0) + 1);
        }

        const statusGrouped = new Map<string, number>();
        for (const order of rangeOrders) {
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
          rawTotal: toFiniteNumber(rawStockSummary.total),
          rawNew: toFiniteNumber(rawStockSummary.moi),
          rawReusable: toFiniteNumber(rawStockSummary.conDu),
          rawScrapped: toFiniteNumber(rawStockSummary.boDi),
          materialBars: [...materialGrouped.entries()].map(([name, value]) => ({ name, value })),
          statusBars: [...statusGrouped.entries()].map(([name, value]) => ({ name, value })),
        };

        setOverviewData(next);

        const ext = await apiData<unknown>(`/api/admin/dashboard-stats?range=${currentRange}`);
        const normalizedExt = normalizeDashboardExtended(ext);
        setOverviewExtData({
          ...normalizedExt,
          productionByWorker: normalizedExt.productionByWorker.length > 0
            ? normalizedExt.productionByWorker
            : buildProductionByWorkerFromAssignments(assignments, currentRange),
          topCustomers: normalizedExt.topCustomers.length > 0
            ? normalizedExt.topCustomers
            : buildTopCustomersFromOrders(orders, currentRange),
        });
        setWarningsData(rawWarnings);
        setWarningsLoading(false);
        setOverviewLoading(false);
      } else if (tabId === "warnings") {
        setWarningsLoading(true);
        const res = await apiData<WarningDashboardData>(`/api/admin/dashboard-stats/warnings?range=${currentRange}`);
        setWarningsData(res);
        setWarningsLoading(false);
      } else if (tabId === "finance") {
        setFinanceLoading(true);
        const res = await apiData<FinanceDashboardData>(`/api/admin/dashboard-stats/finance?range=${currentRange}`);
        setFinanceData(res);
        setFinanceLoading(false);
      } else if (tabId === "production") {
        setProductionLoading(true);
        const res = await apiData<ProductionDashboardData>(`/api/admin/dashboard-stats/production?range=${currentRange}`);
        setProductionData(res);
        setProductionLoading(false);
      } else if (tabId === "inventory") {
        setInventoryLoading(true);
        const res = await apiData<InventoryDashboardData>(`/api/admin/dashboard-stats/inventory?range=${currentRange}`);
        setInventoryData(res);
        setInventoryLoading(false);
      }
      const now = new Date();
      setLastUpdated(now.toLocaleTimeString("vi-VN", { hour12: false }));
    } catch (e) {
      console.error("Lỗi tải dashboard tab:", tabId, e);
      setError(true);
      setErrorMessage(e instanceof Error ? e.message : "Đã xảy ra lỗi kết nối với máy chủ.");
      setOverviewLoading(false);
      setWarningsLoading(false);
      setFinanceLoading(false);
      setProductionLoading(false);
      setInventoryLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadTab(activeTab, range);
    }, 0);
    return () => clearTimeout(timer);
  }, [activeTab, range, loadTab]);

  const load = useCallback(() => {
    void loadTab(activeTab, range);
  }, [activeTab, range, loadTab]);

  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        void loadTab(activeTab, range);
      }, 500);
    };

    const channel = supabase
      .channel(`admin-dashboard-realtime-${activeTab}-${range}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "donhang" }, scheduleRefresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "donhang" }, scheduleRefresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "phancong" }, scheduleRefresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "phancong" }, scheduleRefresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "nhatkygiacong" }, scheduleRefresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "nhatkygiacong" }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [activeTab, loadTab, range, supabase]);

  const loading = overviewLoading || financeLoading || productionLoading || inventoryLoading;
  const isFirstLoad = overviewLoading && !overviewData.revenue && !overviewExtData;

  const stockHealth = useMemo(() => {
    if (!overviewData.rawTotal) return "Chưa có dữ liệu kho";
    return `${overviewData.rawNew} mới · ${overviewData.rawReusable} phôi dư · ${overviewData.rawScrapped} bỏ đi`;
  }, [overviewData.rawNew, overviewData.rawReusable, overviewData.rawScrapped, overviewData.rawTotal]);

  const stockInsight = useMemo(() => {
    if (!overviewData.rawTotal) return "Chưa có dữ liệu kho phôi.";
    const reusablePct = Math.round((overviewData.rawReusable / overviewData.rawTotal) * 100);
    if (overviewData.rawScrapped > 0) {
      return `Tỷ lệ phôi dư đạt ${reusablePct}%. Lưu ý có ${overviewData.rawScrapped} thanh phôi lỗi cần kiểm tra nguyên nhân hao hụt.`;
    }
    return `Tỷ lệ phôi dư đạt ${reusablePct}%. Kho hoạt động hiệu quả, không ghi nhận phôi hỏng/lỗi.`;
  }, [overviewData.rawReusable, overviewData.rawScrapped, overviewData.rawTotal]);

  const orderInsight = useMemo(() => {
    if (!overviewData.statusBars.length) return "Chưa có đơn hàng nào để thống kê.";
    const maxVal = Math.max(...overviewData.statusBars.map(s => s.value));
    if (maxVal === 0) return "Tất cả các nhóm trạng thái đơn hàng hiện đang trống.";
    const tops = overviewData.statusBars.filter(s => s.value === maxVal).map(s => s.name);
    return `Đơn hàng tập trung nhiều nhất ở nhóm: ${tops.join(", ")} (${maxVal} đơn).`;
  }, [overviewData.statusBars]);

  const summary = useMemo(() => ({
    totalRevenue: overviewExtData?.totalRevenue ?? overviewData.revenue,
    totalPaid: overviewExtData?.totalPaid ?? overviewData.paid,
    remainingDebt: overviewExtData?.remainingDebt ?? overviewData.debt,
    totalOrders: overviewExtData?.totalOrders ?? overviewData.statusBars.reduce((sum, item) => sum + item.value, 0),
    processingOrders: overviewExtData?.processingOrders ?? overviewData.activeAssignments,
    completedOrders: overviewExtData?.completedOrders ?? overviewData.statusBars.find((item) => item.name === statusLabel("HOAN_THANH"))?.value ?? 0,
    completionRate: overviewExtData?.completionRate ?? 0,
    avgWastePercent: overviewExtData?.avgWastePercent ?? overviewExtData?.cuttingEfficiency?.wastePercent ?? 0,
  }), [overviewData.activeAssignments, overviewData.debt, overviewData.paid, overviewData.revenue, overviewData.statusBars, overviewExtData]);

  const exportCsv = useCallback(() => {
    const csv = buildDashboardCsv(range, overviewData, overviewExtData, summary);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dashboard-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [overviewData, overviewExtData, range, summary]);

  const printReport = useCallback(() => {
    window.print();
  }, []);

  const dashboardControls = (
    <div className="flex flex-wrap items-center gap-3 print:hidden">
      <select
        value={range}
        onChange={(event) => setRange(event.target.value as DashboardRange)}
        disabled={loading}
        className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-gray-200 outline-none transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Lọc dashboard theo thời gian"
        title="Lọc dashboard theo thời gian"
      >
        {DASHBOARD_RANGES.map((item) => (
          <option key={item.value} value={item.value} className="bg-[#0a0a0c] text-gray-100">
            {item.label}
          </option>
        ))}
      </select>
      {lastUpdated && (
        <span className="text-xs text-slate-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl font-medium">
          Cập nhật lúc: {lastUpdated}
        </span>
      )}
      <button
        onClick={load}
        disabled={loading}
        className="inline-flex items-center justify-center p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
        title="Tải lại dữ liệu"
        aria-label="Tải lại dữ liệu"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      </button>
      <button
        onClick={exportCsv}
        disabled={isFirstLoad || loading}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 text-xs font-bold text-emerald-200 transition-all hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
        title="Xuất báo cáo CSV"
        aria-label="Xuất báo cáo CSV"
      >
        <Download className="h-4 w-4" />
        <span>CSV</span>
      </button>
      <button
        onClick={printReport}
        disabled={isFirstLoad}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 text-xs font-bold text-sky-200 transition-all hover:bg-sky-500/15 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
        title="In báo cáo"
        aria-label="In báo cáo"
      >
        <Printer className="h-4 w-4" />
        <span>In</span>
      </button>
      {loading && !isFirstLoad && (
        <div className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Đang cập nhật...
        </div>
      )}
    </div>
  );

  return (
    <div className="dashboard-print-area space-y-6">
      {/* Title block */}
      <div className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-6 xl:flex xl:items-center xl:justify-between xl:gap-6">
        <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <Activity className="h-6 w-6 text-blue-500 animate-pulse" />
          Bảng điều hành sản xuất
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Theo dõi đơn hàng, doanh thu, kho phôi, phân công và cảnh báo vận hành.
        </p>
        </div>
        <div className="mt-5 flex justify-start xl:mt-0 xl:justify-end">
          {dashboardControls}
        </div>
      </div>

      {/* Sticky Tabs & Filter Bar */}
      <div className="sticky top-0 z-20 rounded-2xl border border-white/10 bg-[#0a0a0c]/85 backdrop-blur-md p-4 shadow-xl print:hidden">
        <DashboardTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="hidden">
          <select
            value={range}
            onChange={(event) => setRange(event.target.value as DashboardRange)}
            disabled={loading}
            className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-gray-200 outline-none transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Lọc dashboard theo thời gian"
            title="Lọc dashboard theo thời gian"
          >
            {DASHBOARD_RANGES.map((item) => (
              <option key={item.value} value={item.value} className="bg-[#0a0a0c] text-gray-100">
                {item.label}
              </option>
            ))}
          </select>
          {lastUpdated && (
            <span className="text-xs text-slate-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl font-medium">
              Cập nhật lúc: {lastUpdated}
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center justify-center p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            title="Tải lại dữ liệu"
            aria-label="Tải lại dữ liệu"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={exportCsv}
            disabled={isFirstLoad || loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 text-xs font-bold text-emerald-200 transition-all hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
            title="Xuất báo cáo CSV"
            aria-label="Xuất báo cáo CSV"
          >
            <Download className="h-4 w-4" />
            <span>CSV</span>
          </button>
          <button
            onClick={printReport}
            disabled={isFirstLoad}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 text-xs font-bold text-sky-200 transition-all hover:bg-sky-500/15 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
            title="In báo cáo"
            aria-label="In báo cáo"
          >
            <Printer className="h-4 w-4" />
            <span>In</span>
          </button>
          {loading && !isFirstLoad && (
            <div className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang cập nhật...
            </div>
          )}
        </div>
      </div>

      {/* Tab content wrapper */}
      {error ? (
        <ErrorState message={errorMessage} onRetry={load} />
      ) : (
        <>
          {activeTab === "overview" && (
            <>
              {isFirstLoad ? (
                <AdminDashboardSkeleton />
              ) : (
                <div className="space-y-6 animate-fadeIn">
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
                        <StatCard title="Tổng doanh thu" value={money(summary.totalRevenue)} hint={`Giá trị đơn trong ${dashboardRangeLabel(range)}.`} icon={TrendingUp} tone="emerald" href="/admin/don-hang" />
                        <StatCard title="Đã thu" value={money(summary.totalPaid)} hint={`Giao dịch thanh toán trong ${dashboardRangeLabel(range)}.`} icon={WalletCards} tone="sky" href="/admin/thanh-toan" />
                        <StatCard title="Còn nợ" value={money(summary.remainingDebt)} hint="Công nợ ước tính từ giá trị đơn trừ đã thu." icon={CreditCard} tone="amber" href="/admin/thanh-toan" />
                        <StatCard title="Tổng đơn" value={summary.totalOrders} hint={`Số đơn không hủy trong ${dashboardRangeLabel(range)}.`} icon={ClipboardList} tone="violet" href="/admin/don-hang" />
                      </div>
                    </div>

                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 pl-1">
                        Sản xuất & Vận hành
                      </h2>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <StatCard title="Sự cố phôi" value={overviewData.openIssues} hint="Số báo cáo sự cố phôi đang cần xử lý." icon={AlertTriangle} tone={overviewData.openIssues ? "red" : "emerald"} href="/admin/su-co" />
                        <StatCard title="Đang gia công" value={summary.processingOrders} hint="Đơn hàng đang ở trạng thái gia công." icon={Scissors} tone="violet" href="/admin/don-hang?trangthai=DANG_GIA_CONG" />
                        <StatCard title="Hoàn thành" value={summary.completedOrders} hint={`Tỷ lệ hoàn thành ${percent(summary.completionRate)}.`} icon={PackageCheck} tone="emerald" href="/admin/don-hang?trangthai=HOAN_THANH" />
                        <StatCard title="Hao phí TB" value={percent(summary.avgWastePercent)} hint="Tỷ lệ phôi bỏ đi trên tổng phôi theo kho phôi." icon={Target} tone={summary.avgWastePercent > 15 ? "red" : "sky"} />
                      </div>
                    </div>
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                    <section className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-6 xl:col-span-2 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="text-lg font-bold text-gray-100">Trạng thái đơn hàng</h2>
                          <p className="mt-1 text-xs text-gray-500">Dùng để phát hiện đơn bị kẹt ở báo giá, thanh toán hoặc gia công.</p>
                          {overviewData.statusBars.length > 0 && (
                            <p className="mt-2 text-xs font-semibold text-blue-400 bg-blue-500/5 border border-blue-500/10 px-2 py-1 rounded inline-block">
                              {orderInsight}
                            </p>
                          )}
                        </div>
                        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-400">{overviewData.statusBars.length} trạng thái</div>
                      </div>
                      <div className="mt-6 h-[320px] min-w-0">
                        {mounted && overviewData.statusBars && overviewData.statusBars.length > 0 ? (
                          <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={overviewData.statusBars} layout="vertical" margin={{ top: 5, right: 40, left: 18, bottom: 5 }}>
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
                                {overviewData.statusBars.map((entry, index) => {
                                  const color = getStatusColor(entry.name);
                                  return <Cell key={`cell-${index}`} fill={color} />;
                                })}
                                <LabelList dataKey="value" position="right" fill="#e2e8f0" fontSize={11} offset={8} />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-xs text-gray-500">Chưa có dữ liệu đơn hàng</div>
                        )}
                      </div>
                    </section>

                    <section className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-6 min-w-0">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h2 className="text-lg font-bold text-gray-100">Kho phôi</h2>
                          <p className="mt-1 text-xs text-gray-500">{stockHealth}</p>
                        </div>
                        <Boxes className="h-6 w-6 text-cyan-300" />
                      </div>

                      {overviewData.rawTotal > 0 && (
                        <p className="mt-3 text-xs text-gray-400 border border-white/5 bg-white/[0.02] p-2.5 rounded-lg leading-relaxed">
                          <span className="font-semibold text-gray-300">Phân tích:</span> {stockInsight}
                        </p>
                      )}

                      <div className="mt-6 space-y-4">
                        <StockLine label="Thanh/phôi mới" value={overviewData.rawNew} total={overviewData.rawTotal} tone="bg-cyan-400" />
                        <StockLine label="Phôi dư tái sử dụng" value={overviewData.rawReusable} total={overviewData.rawTotal} tone="bg-amber-400" />
                        <StockLine label="Bỏ đi/lỗi" value={overviewData.rawScrapped} total={overviewData.rawTotal} tone="bg-red-400" />
                      </div>
                      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-300">
                        <div className="font-bold text-gray-100">{overviewData.materialSkuCount} mã vật tư</div>
                        <div className="mt-1 text-xs text-gray-500 font-medium">Nếu giáo viên hỏi “còn thanh 1m/2m/5m không”, vào Kho phôi và dùng bộ lọc “Tìm phôi đủ chiều dài”.</div>
                      </div>
                    </section>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "warnings" && (
            <div className="animate-fadeIn">
              <WarningCenter data={warningsData} loading={warningsLoading} />
            </div>
          )}

          {activeTab === "finance" && (
            <div className="animate-fadeIn">
              <FinanceTab data={financeData} loading={financeLoading} />
            </div>
          )}

          {activeTab === "production" && (
            <div className="animate-fadeIn">
              <ProductionTab data={productionData} loading={productionLoading} />
            </div>
          )}

          {activeTab === "inventory" && (
            <div className="animate-fadeIn">
              <InventoryTab data={inventoryData} loading={inventoryLoading} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StockLine({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        <span className="font-mono font-bold text-gray-100">{value} thanh</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-5 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3 flex-1">
          <div className="h-3 bg-white/15 rounded w-1/3" />
          <div className="h-7 bg-white/20 rounded w-2/3" />
          <div className="h-3 bg-white/10 rounded w-1/2" />
        </div>
        <div className="rounded-xl bg-white/10 h-11 w-11 shrink-0" />
      </div>
    </div>
  );
}

function ChartSkeleton({ height = "h-[320px]" }: { height?: string }) {
  return (
    <div className={`w-full ${height} bg-[#0a0a0c] rounded-2xl border border-white/10 flex items-center justify-center p-6 animate-pulse`}>
      <div className="w-full h-full flex flex-col justify-between">
        <div className="flex justify-between items-center mb-4">
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-white/15 rounded w-1/4" />
            <div className="h-2.5 bg-white/10 rounded w-1/2" />
          </div>
          <div className="h-6 w-12 bg-white/10 rounded-full" />
        </div>
        <div className="flex-1 flex items-end gap-3 px-4 pb-4 border-b border-l border-white/10">
          <div className="bg-white/10 w-full h-[30%] rounded-t" />
          <div className="bg-white/15 w-full h-[60%] rounded-t" />
          <div className="bg-white/10 w-full h-[45%] rounded-t" />
          <div className="bg-white/15 w-full h-[80%] rounded-t" />
          <div className="bg-white/10 w-full h-[55%] rounded-t" />
        </div>
      </div>
    </div>
  );
}

function AlertSkeleton() {
  return (
    <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex items-start gap-3 animate-pulse">
      <div className="h-5 w-5 bg-white/15 rounded-full shrink-0" />
      <div className="space-y-2 flex-1">
        <div className="h-4 bg-white/15 rounded w-1/4" />
        <div className="h-3 bg-white/10 rounded w-3/4" />
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-red-500/20 rounded-2xl bg-red-500/5 min-h-[300px]">
      <div className="p-3 rounded-2xl bg-red-500/10 text-red-400 mb-3 animate-bounce">
        <AlertTriangle className="h-8 w-8 stroke-[1.5]" />
      </div>
      <h3 className="text-base font-bold text-red-200">Không thể tải dữ liệu</h3>
      <p className="text-xs text-gray-400 mt-2 max-w-md">
        {message || "Có lỗi xảy ra trong quá trình kết nối tới hệ thống. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại."}
      </p>
      <button
        onClick={onRetry}
        className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-500/20 active:scale-95 flex items-center gap-2"
      >
        <RefreshCw className="h-3.5 w-3.5 animate-spin-once" />
        Thử lại
      </button>
    </div>
  );
}

function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-6">
        <div className="h-4 bg-white/15 rounded w-1/4 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AlertSkeleton />
          <AlertSkeleton />
          <AlertSkeleton />
          <AlertSkeleton />
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-6">
        <div className="h-4 bg-white/15 rounded w-1/4 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl border border-white/5 bg-white/[0.02] animate-pulse" />
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <div className="h-4 bg-white/15 rounded w-1/6 mb-3 pl-1" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        </div>
        <div>
          <div className="h-4 bg-white/15 rounded w-1/6 mb-3 pl-1" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartSkeleton height="h-[380px]" />
        </div>
        <div>
          <div className="w-full bg-[#0a0a0c] rounded-2xl border border-white/10 p-6 space-y-6 h-[380px] animate-pulse">
            <div className="flex justify-between items-center">
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-white/15 rounded w-1/3" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
              </div>
              <div className="h-6 w-6 bg-white/15 rounded-full" />
            </div>
            <div className="h-20 bg-white/[0.02] border border-white/5 rounded-xl" />
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <div className="h-3 bg-white/10 rounded w-1/4" />
                <div className="h-2 bg-white/10 rounded w-full" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-white/10 rounded w-1/4" />
                <div className="h-2 bg-white/10 rounded w-full" />
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-white/10 rounded w-1/4" />
                <div className="h-2 bg-white/10 rounded w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
