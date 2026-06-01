import { supabaseAdmin } from "@/lib/supabase";
import { HttpError } from "@/lib/http";

// ====================================================================
// Admin Dashboard Stats — Readonly queries, không mutate DB
// ====================================================================

type OrderRow = { madh: number; makh: number; ngaytao: string; tonggiatri: number; trangthai: string };
type PaymentRow = { madh: number; sotien: number; ngaythanhtoan: string };
type AssignmentRow = { mapc: number; matho: number; trangthai: string };
type WorkerRow = { mand: number; hoten: string };
type CustomerRow = { makh: number; hoten: string };
type StockRow = { maphoi: number; trangthai: string };

/** Doanh thu + đã thu theo tháng (6 tháng gần nhất) */
async function getRevenueByMonth() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  const since = sixMonthsAgo.toISOString();

  const [{ data: orders }, { data: payments }] = await Promise.all([
    supabaseAdmin
      .from("donhang")
      .select("madh, ngaytao, tonggiatri")
      .gte("ngaytao", since)
      .neq("trangthai", "DA_HUY"),
    supabaseAdmin
      .from("giaodich")
      .select("madh, sotien, ngaythanhtoan")
      .gte("ngaythanhtoan", since),
  ]);

  const monthMap = new Map<string, { revenue: number; paid: number }>();

  // Tạo sẵn 6 tháng để luôn có data
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, { revenue: 0, paid: 0 });
  }

  for (const order of (orders ?? []) as OrderRow[]) {
    const d = new Date(order.ngaytao);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = monthMap.get(key);
    if (entry) entry.revenue += Number(order.tonggiatri || 0);
  }

  for (const payment of (payments ?? []) as PaymentRow[]) {
    const d = new Date(payment.ngaythanhtoan);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = monthMap.get(key);
    if (entry) entry.paid += Number(payment.sotien || 0);
  }

  return [...monthMap.entries()].map(([month, val]) => ({ month, ...val }));
}

/** Tiến độ sản xuất theo từng thợ */
async function getProductionByWorker() {
  const [{ data: assignments }, { data: workers }] = await Promise.all([
    supabaseAdmin.from("phancong").select("mapc, matho, trangthai"),
    supabaseAdmin.from("nguoidung").select("mand, hoten").eq("vaitro", "WORKER"),
  ]);

  const workerMap = new Map<number, string>();
  for (const w of (workers ?? []) as WorkerRow[]) {
    workerMap.set(w.mand, w.hoten);
  }

  const stats = new Map<number, { done: number; active: number; pending: number; rejected: number }>();
  for (const a of (assignments ?? []) as AssignmentRow[]) {
    if (!stats.has(a.matho)) stats.set(a.matho, { done: 0, active: 0, pending: 0, rejected: 0 });
    const s = stats.get(a.matho)!;
    if (a.trangthai === "HOAN_THANH") s.done++;
    else if (a.trangthai === "DANG_THUC_HIEN") s.active++;
    else if (a.trangthai === "CHO_THUC_HIEN") s.pending++;
    else if (a.trangthai === "TU_CHOI") s.rejected++;
  }

  return [...stats.entries()].map(([matho, s]) => ({
    workerName: workerMap.get(matho) || `Thợ #${matho}`,
    ...s,
  }));
}

/** Tỷ lệ hao phí cắt — dựa trên kho phôi */
async function getCuttingEfficiency() {
  const { data: stocks } = await supabaseAdmin
    .from("khothanhphoi")
    .select("maphoi, trangthai");

  const rows = (stocks ?? []) as StockRow[];
  const total = rows.length;
  const waste = rows.filter((r) => r.trangthai === "BO_DI").length;
  const reusable = rows.filter((r) => r.trangthai === "CON_DU").length;

  return {
    totalStockUsed: total,
    totalWaste: waste,
    totalReusable: reusable,
    wastePercent: total > 0 ? Math.round((waste / total) * 1000) / 10 : 0,
    reusablePercent: total > 0 ? Math.round((reusable / total) * 1000) / 10 : 0,
  };
}

/** Top 5 khách hàng theo tổng giá trị đơn hàng */
async function getTopCustomers() {
  const [{ data: orders }, { data: customers }] = await Promise.all([
    supabaseAdmin
      .from("donhang")
      .select("madh, makh, tonggiatri")
      .neq("trangthai", "DA_HUY"),
    supabaseAdmin.from("khachhang").select("makh, hoten"),
  ]);

  const customerMap = new Map<number, string>();
  for (const c of (customers ?? []) as CustomerRow[]) {
    customerMap.set(c.makh, c.hoten);
  }

  const grouped = new Map<number, { totalOrders: number; totalValue: number }>();
  for (const o of (orders ?? []) as OrderRow[]) {
    if (!grouped.has(o.makh)) grouped.set(o.makh, { totalOrders: 0, totalValue: 0 });
    const g = grouped.get(o.makh)!;
    g.totalOrders++;
    g.totalValue += Number(o.tonggiatri || 0);
  }

  return [...grouped.entries()]
    .map(([makh, g]) => ({ name: customerMap.get(makh) || `KH #${makh}`, ...g }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5);
}

// ====================================================================
// Worker Performance — Readonly queries
// ====================================================================

type CutLogRow = { mank: number; mapc: number; matho: number; sukien: string; thoigian: string; trangthaixuly: string | null };
type CuttingPlanRow = { masdc: number; mapc: number; trangthai: string };

async function getWorkerPerformance(matho: number) {
  const [
    { data: assignments },
    { data: logs },
    { data: plans },
  ] = await Promise.all([
    supabaseAdmin
      .from("phancong")
      .select("mapc, madh, matho, trangthai, donhang:madh(khachhang:makh(hoten))")
      .eq("matho", matho)
      .order("mapc", { ascending: false })
      .limit(20),
    supabaseAdmin
      .from("nhatkygiacong")
      .select("mank, mapc, matho, sukien, thoigian, trangthaixuly")
      .eq("matho", matho)
      .order("thoigian", { ascending: false }),
    supabaseAdmin
      .from("sodocat")
      .select("masdc, mapc, trangthai"),
  ]);

  const assignmentRows = (assignments ?? []) as Array<{
    mapc: number;
    madh: number;
    trangthai: string;
    donhang?: { khachhang?: { hoten?: string } | null } | null;
  }>;
  const logRows = (logs ?? []) as CutLogRow[];

  // Summary
  const total = assignmentRows.length;
  const done = assignmentRows.filter((a) => a.trangthai === "HOAN_THANH").length;
  const active = assignmentRows.filter((a) => a.trangthai === "DANG_THUC_HIEN").length;
  const pending = assignmentRows.filter((a) => a.trangthai === "CHO_THUC_HIEN").length;
  const rejected = assignmentRows.filter((a) => a.trangthai === "TU_CHOI").length;
  const issueCount = logRows.filter((l) => l.sukien === "LOI" && l.trangthaixuly === "CHO_XU_LY").length;
  const completionRate = total > 0 ? Math.round((done / total) * 1000) / 10 : 0;

  // Recent cuts (top 5 assignments with cutting progress)
  const planRows = (plans ?? []) as CuttingPlanRow[];
  const plansByMapc = new Map<number, { total: number; completed: number }>();
  for (const p of planRows) {
    if (!plansByMapc.has(p.mapc)) plansByMapc.set(p.mapc, { total: 0, completed: 0 });
    const entry = plansByMapc.get(p.mapc)!;
    entry.total++;
    if (p.trangthai === "HOAN_THANH") entry.completed++;
  }

  const recentCuts = assignmentRows.slice(0, 5).map((a) => {
    const progress = plansByMapc.get(a.mapc) ?? { total: 0, completed: 0 };
    return {
      mapc: a.mapc,
      madh: a.madh,
      customerName: a.donhang?.khachhang?.hoten || "Khách hàng",
      status: a.trangthai,
      cuttingCount: progress.total,
      completedCount: progress.completed,
    };
  });

  // Daily activity (7 ngày gần nhất)
  const dailyMap = new Map<string, { cuts: number; issues: number }>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, { cuts: 0, issues: 0 });
  }

  for (const log of logRows) {
    const key = new Date(log.thoigian).toISOString().slice(0, 10);
    const entry = dailyMap.get(key);
    if (!entry) continue;
    if (log.sukien === "CAT") entry.cuts++;
    if (log.sukien === "LOI") entry.issues++;
  }

  const dailyActivity = [...dailyMap.entries()].map(([date, val]) => ({ date, ...val }));

  return {
    summary: { total, done, active, pending, rejected, issueCount },
    completionRate,
    recentCuts,
    dailyActivity,
  };
}

// ====================================================================
// Exported service
// ====================================================================

export const dashboardService = {
  async getAdminStats() {
    const [revenueByMonth, productionByWorker, cuttingEfficiency, topCustomers] =
      await Promise.all([
        getRevenueByMonth(),
        getProductionByWorker(),
        getCuttingEfficiency(),
        getTopCustomers(),
      ]);

    return { revenueByMonth, productionByWorker, cuttingEfficiency, topCustomers };
  },

  async getWorkerPerformance(matho: number) {
    if (!Number.isFinite(matho)) throw HttpError.badRequest("Invalid matho");
    return getWorkerPerformance(matho);
  },
};
