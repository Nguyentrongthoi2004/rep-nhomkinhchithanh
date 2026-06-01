import { HttpError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import type { DashboardRange } from "./dashboard.schema";

type OrderRow = { madh: number; makh: number; ngaytao: string; tonggiatri: number; trangthai?: string };
type PaymentRow = { madh: number; sotien: number; ngaygd: string; loaigd?: string };
type AssignmentRow = { mapc: number; madh: number; matho: number; trangthai: string };
type WorkerRow = { mand: number; hoten: string };
type CustomerRow = { makh: number; hoten: string };
type StockRow = { maphoi: number; trangthai: string };
type CutLogRow = { mank: number; mapc: number; matho: number; sukien: string; thoigian: string; trangthaixuly: string | null };
type CuttingPlanRow = { masdc: number; mapc: number; trangthai: string };

const RANGE_CONFIG: Record<DashboardRange, { days?: number; months?: number }> = {
  "7d": { days: 7 },
  "30d": { days: 30 },
  "3m": { months: 3 },
  "6m": { months: 6 },
  "1y": { months: 12 },
};

function usesDailyBuckets(range: DashboardRange) {
  return range === "7d" || range === "30d";
}

function startOfRange(range: DashboardRange) {
  const now = new Date();
  const start = new Date(now);
  const config = RANGE_CONFIG[range];

  if (config.days) {
    start.setDate(now.getDate() - config.days + 1);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  start.setMonth(now.getMonth() - (config.months ?? 1) + 1);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
}

function bucketKey(dateValue: string, range: DashboardRange) {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;
  if (usesDailyBuckets(range)) return d.toISOString().slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function signedAmount(row: { loaigd?: string; sotien: number | string }) {
  const amount = Number(row.sotien || 0);
  return row.loaigd === "HUY_DON" ? -amount : amount;
}

function buildRevenueBuckets(range: DashboardRange) {
  const buckets = new Map<string, { revenue: number; paid: number }>();
  const start = startOfRange(range);
  const now = new Date();

  if (usesDailyBuckets(range)) {
    for (const d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
      buckets.set(d.toISOString().slice(0, 10), { revenue: 0, paid: 0 });
    }
    return buckets;
  }

  for (const d = new Date(start); d <= now; d.setMonth(d.getMonth() + 1)) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, { revenue: 0, paid: 0 });
  }

  return buckets;
}

function buildActivityBuckets(range: DashboardRange) {
  const buckets = new Map<string, { cuts: number; issues: number }>();
  const start = startOfRange(range);
  const now = new Date();

  if (usesDailyBuckets(range)) {
    for (const d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
      buckets.set(d.toISOString().slice(0, 10), { cuts: 0, issues: 0 });
    }
    return buckets;
  }

  for (const d = new Date(start); d <= now; d.setMonth(d.getMonth() + 1)) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, { cuts: 0, issues: 0 });
  }

  return buckets;
}

async function getOrderIdsInRange(range: DashboardRange) {
  const { data, error } = await supabaseAdmin
    .from("donhang")
    .select("madh")
    .gte("ngaytao", startOfRange(range).toISOString())
    .neq("trangthai", "DA_HUY");
  if (error) throw HttpError.internal(error.message);
  return ((data ?? []) as Array<{ madh: number }>).map((row) => row.madh);
}

async function getRevenueByMonth(range: DashboardRange) {
  const since = startOfRange(range).toISOString();

  const [ordersRes, paymentsRes] = await Promise.all([
    supabaseAdmin
      .from("donhang")
      .select("madh, ngaytao, tonggiatri")
      .gte("ngaytao", since)
      .neq("trangthai", "DA_HUY"),
    supabaseAdmin
      .from("giaodich")
      .select("madh, loaigd, sotien, ngaygd")
      .gte("ngaygd", since),
  ]);
  if (ordersRes.error) throw HttpError.internal(ordersRes.error.message);
  if (paymentsRes.error) throw HttpError.internal(paymentsRes.error.message);

  const buckets = buildRevenueBuckets(range);

  for (const order of (ordersRes.data ?? []) as OrderRow[]) {
    const key = bucketKey(order.ngaytao, range);
    if (!key) continue;
    const entry = buckets.get(key);
    if (entry) entry.revenue += Number(order.tonggiatri || 0);
  }

  for (const payment of (paymentsRes.data ?? []) as PaymentRow[]) {
    const key = bucketKey(payment.ngaygd, range);
    if (!key) continue;
    const entry = buckets.get(key);
    if (entry) entry.paid += signedAmount(payment);
  }

  return [...buckets.entries()].map(([month, val]) => ({ month, ...val }));
}

async function getProductionByWorker(range: DashboardRange) {
  const orderIds = await getOrderIdsInRange(range);
  const [assignmentsRes, workersRes] = await Promise.all([
    orderIds.length > 0
      ? supabaseAdmin.from("phancong").select("mapc, madh, matho, trangthai").in("madh", orderIds)
      : Promise.resolve({ data: [], error: null }),
    supabaseAdmin.from("nguoidung").select("mand, hoten").eq("vaitro", "WORKER"),
  ]);
  if (assignmentsRes.error) throw HttpError.internal(assignmentsRes.error.message);
  if (workersRes.error) throw HttpError.internal(workersRes.error.message);

  const workerMap = new Map<number, string>();
  for (const w of (workersRes.data ?? []) as WorkerRow[]) {
    workerMap.set(w.mand, w.hoten);
  }

  const stats = new Map<number, { done: number; active: number; pending: number; rejected: number }>();
  for (const a of (assignmentsRes.data ?? []) as AssignmentRow[]) {
    if (!stats.has(a.matho)) stats.set(a.matho, { done: 0, active: 0, pending: 0, rejected: 0 });
    const s = stats.get(a.matho)!;
    if (a.trangthai === "HOAN_THANH") s.done++;
    else if (a.trangthai === "DANG_THUC_HIEN") s.active++;
    else if (a.trangthai === "CHO_THUC_HIEN") s.pending++;
    else if (a.trangthai === "TU_CHOI") s.rejected++;
  }

  return [...stats.entries()].map(([matho, s]) => ({
    workerId: matho,
    workerName: workerMap.get(matho) || `Thợ #${matho}`,
    ...s,
  }));
}

async function getCuttingEfficiency() {
  const { data, error } = await supabaseAdmin
    .from("khothanhphoi")
    .select("maphoi, trangthai");
  if (error) throw HttpError.internal(error.message);

  const rows = (data ?? []) as StockRow[];
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

async function getTopCustomers(range: DashboardRange) {
  const [ordersRes, customersRes] = await Promise.all([
    supabaseAdmin
      .from("donhang")
      .select("madh, makh, tonggiatri")
      .gte("ngaytao", startOfRange(range).toISOString())
      .neq("trangthai", "DA_HUY"),
    supabaseAdmin.from("khachhang").select("makh, hoten"),
  ]);
  if (ordersRes.error) throw HttpError.internal(ordersRes.error.message);
  if (customersRes.error) throw HttpError.internal(customersRes.error.message);

  const customerMap = new Map<number, string>();
  for (const c of (customersRes.data ?? []) as CustomerRow[]) {
    customerMap.set(c.makh, c.hoten);
  }

  const grouped = new Map<number, { totalOrders: number; totalValue: number }>();
  for (const o of (ordersRes.data ?? []) as OrderRow[]) {
    if (!grouped.has(o.makh)) grouped.set(o.makh, { totalOrders: 0, totalValue: 0 });
    const g = grouped.get(o.makh)!;
    g.totalOrders++;
    g.totalValue += Number(o.tonggiatri || 0);
  }

  return [...grouped.entries()]
    .map(([makh, g]) => ({ customerId: makh, name: customerMap.get(makh) || `KH #${makh}`, ...g }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5);
}

async function getAdminSummary(range: DashboardRange, avgWastePercent: number) {
  const since = startOfRange(range).toISOString();
  const [ordersRes, paymentsRes] = await Promise.all([
    supabaseAdmin
      .from("donhang")
      .select("madh, makh, ngaytao, tonggiatri, trangthai")
      .gte("ngaytao", since)
      .neq("trangthai", "DA_HUY"),
    supabaseAdmin
      .from("giaodich")
      .select("madh, loaigd, sotien, ngaygd")
      .gte("ngaygd", since),
  ]);
  if (ordersRes.error) throw HttpError.internal(ordersRes.error.message);
  if (paymentsRes.error) throw HttpError.internal(paymentsRes.error.message);

  const orders = (ordersRes.data ?? []) as OrderRow[];
  const payments = (paymentsRes.data ?? []) as PaymentRow[];
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.tonggiatri || 0), 0);
  const totalPaid = payments.reduce((sum, payment) => sum + signedAmount(payment), 0);
  const totalOrders = orders.length;
  const processingOrders = orders.filter((order) => order.trangthai === "DANG_GIA_CONG").length;
  const completedOrders = orders.filter((order) => order.trangthai === "HOAN_THANH").length;
  const completionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 1000) / 10 : 0;

  return {
    totalRevenue,
    totalPaid,
    remainingDebt: Math.max(0, totalRevenue - totalPaid),
    totalOrders,
    processingOrders,
    completedOrders,
    completionRate,
    avgWastePercent,
  };
}

async function getWorkerPerformance(matho: number, range: DashboardRange) {
  const since = startOfRange(range).toISOString();
  const orderIds = await getOrderIdsInRange(range);

  const [assignmentsRes, logsRes] = await Promise.all([
    orderIds.length > 0
      ? supabaseAdmin
          .from("phancong")
          .select("mapc, madh, matho, trangthai, donhang:madh(khachhang:makh(hoten))")
          .eq("matho", matho)
          .in("madh", orderIds)
          .order("mapc", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [], error: null }),
    supabaseAdmin
      .from("nhatkygiacong")
      .select("mank, mapc, matho, sukien, thoigian, trangthaixuly")
      .eq("matho", matho)
      .gte("thoigian", since)
      .order("thoigian", { ascending: false }),
  ]);
  if (assignmentsRes.error) throw HttpError.internal(assignmentsRes.error.message);
  if (logsRes.error) throw HttpError.internal(logsRes.error.message);

  const assignmentRows = (assignmentsRes.data ?? []) as Array<{
    mapc: number;
    madh: number;
    trangthai: string;
    donhang?: { khachhang?: { hoten?: string } | null } | null;
  }>;
  const logRows = (logsRes.data ?? []) as CutLogRow[];
  const assignmentMapcs = assignmentRows.map((a) => a.mapc);
  const plansRes = assignmentMapcs.length > 0
    ? await supabaseAdmin.from("sodocat").select("masdc, mapc, trangthai").in("mapc", assignmentMapcs)
    : { data: [], error: null };
  if (plansRes.error) throw HttpError.internal(plansRes.error.message);

  const total = assignmentRows.length;
  const done = assignmentRows.filter((a) => a.trangthai === "HOAN_THANH").length;
  const active = assignmentRows.filter((a) => a.trangthai === "DANG_THUC_HIEN").length;
  const pending = assignmentRows.filter((a) => a.trangthai === "CHO_THUC_HIEN").length;
  const rejected = assignmentRows.filter((a) => a.trangthai === "TU_CHOI").length;
  const issueCount = logRows.filter((l) => l.sukien === "LOI" && l.trangthaixuly === "CHO_XU_LY").length;
  const completionRate = total > 0 ? Math.round((done / total) * 1000) / 10 : 0;
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const weeklyCutsCount = logRows.filter((l) => l.sukien === "CAT" && new Date(l.thoigian) >= weekStart).length;

  const planRows = (plansRes.data ?? []) as CuttingPlanRow[];
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

  const dailyMap = buildActivityBuckets(range);
  for (const log of logRows) {
    const key = bucketKey(log.thoigian, range);
    if (!key) continue;
    const entry = dailyMap.get(key);
    if (!entry) continue;
    if (log.sukien === "CAT") entry.cuts++;
    if (log.sukien === "LOI") entry.issues++;
  }

  const dailyActivity = [...dailyMap.entries()].map(([date, val]) => ({ date, ...val }));

  return {
    totalAssignments: total,
    activeAssignments: active,
    completedAssignments: done,
    rejectedAssignments: rejected,
    issueCount,
    weeklyCutsCount,
    summary: { total, done, active, pending, rejected, issueCount },
    completionRate,
    recentCuts,
    dailyActivity,
  };
}

export const dashboardService = {
  async getAdminStats(range: DashboardRange) {
    const [revenueByMonth, productionByWorker, cuttingEfficiency, topCustomers] =
      await Promise.all([
        getRevenueByMonth(range),
        getProductionByWorker(range),
        getCuttingEfficiency(),
        getTopCustomers(range),
      ]);
    const summary = await getAdminSummary(range, cuttingEfficiency.wastePercent);

    return { ...summary, revenueByMonth, productionByWorker, cuttingEfficiency, topCustomers };
  },

  async getFinanceStats(range: DashboardRange) {
    const since = startOfRange(range).toISOString();

    const [ordersRes, paymentsRes, customersRes] = await Promise.all([
      supabaseAdmin
        .from("donhang")
        .select("madh, makh, ngaytao, tonggiatri, trangthai")
        .gte("ngaytao", since)
        .neq("trangthai", "DA_HUY"),
      supabaseAdmin
        .from("giaodich")
        .select("madh, loaigd, sotien, ngaygd")
        .gte("ngaygd", since),
      supabaseAdmin
        .from("khachhang")
        .select("makh, hoten")
    ]);

    if (ordersRes.error) throw HttpError.internal(ordersRes.error.message);
    if (paymentsRes.error) throw HttpError.internal(paymentsRes.error.message);
    if (customersRes.error) throw HttpError.internal(customersRes.error.message);

    const orders = (ordersRes.data ?? []) as OrderRow[];
    const payments = (paymentsRes.data ?? []) as PaymentRow[];
    const customers = (customersRes.data ?? []) as CustomerRow[];

    const buckets = buildRevenueBuckets(range);
    for (const order of orders) {
      const key = bucketKey(order.ngaytao, range);
      if (key) {
        const entry = buckets.get(key);
        if (entry) entry.revenue += Number(order.tonggiatri || 0);
      }
    }
    for (const payment of payments) {
      const key = bucketKey(payment.ngaygd, range);
      if (key) {
        const entry = buckets.get(key);
        if (entry) entry.paid += signedAmount(payment);
      }
    }
    const revenueByPeriod = [...buckets.entries()].map(([period, val]) => ({ period, revenue: val.revenue }));
    const paidByPeriod = [...buckets.entries()].map(([period, val]) => ({ period, paid: val.paid }));

    let choThanhToanCount = 0;
    let choThanhToanValue = 0;
    let daCocCount = 0;
    let daCocValue = 0;
    let daThanhToanCount = 0;
    let daThanhToanValue = 0;

    for (const order of orders) {
      const val = Number(order.tonggiatri || 0);
      if (["KHAO_SAT", "BAO_GIA_NHAP", "DA_DUYET_GIA"].includes(order.trangthai || "")) {
        choThanhToanCount++;
        choThanhToanValue += val;
      } else if (["DA_COC", "DANG_GIA_CONG", "DANG_LAP_DAT"].includes(order.trangthai || "")) {
        daCocCount++;
        daCocValue += val;
      } else if (["DA_THANH_TOAN", "HOAN_THANH"].includes(order.trangthai || "")) {
        daThanhToanCount++;
        daThanhToanValue += val;
      }
    }

    const statusAllocation = [
      { group: "CHO_THANH_TOAN", label: "Chờ thanh toán / cọc", count: choThanhToanCount, totalValue: choThanhToanValue },
      { group: "DA_COC", label: "Đã đặt cọc", count: daCocCount, totalValue: daCocValue },
      { group: "DA_THANH_TOAN", label: "Đã thanh toán", count: daThanhToanCount, totalValue: daThanhToanValue }
    ];

    const customerMap = new Map<number, string>();
    for (const c of customers) {
      customerMap.set(c.makh, c.hoten);
    }
    const customerOrders = new Map<number, { count: number; total: number }>();
    for (const o of orders) {
      const current = customerOrders.get(o.makh) ?? { count: 0, total: 0 };
      current.count++;
      current.total += Number(o.tonggiatri || 0);
      customerOrders.set(o.makh, current);
    }
    const topCustomers = [...customerOrders.entries()]
      .map(([makh, val]) => ({
        customerId: makh,
        name: customerMap.get(makh) || `KH #${makh}`,
        totalOrders: val.count,
        totalValue: val.total
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5);

    const totalOrdersCount = orders.length;
    const totalOrdersValue = orders.reduce((sum, o) => sum + Number(o.tonggiatri || 0), 0);
    const averageOrderValue = totalOrdersCount > 0 ? Math.round(totalOrdersValue / totalOrdersCount) : 0;

    const totalRevenue = totalOrdersValue;
    const totalPaid = payments.reduce((sum, p) => sum + signedAmount(p), 0);
    const remainingDebt = Math.max(0, totalRevenue - totalPaid);

    return {
      revenueByPeriod,
      paidByPeriod,
      statusAllocation,
      topCustomers,
      averageOrderValue,
      totalRevenue,
      totalPaid,
      remainingDebt
    };
  },

  async getProductionStats(range: DashboardRange) {
    const { data: prodOrders, error: prodOrdersErr } = await supabaseAdmin
      .from("donhang")
      .select("madh, trangthai, ngaytao")
      .in("trangthai", ["DANG_GIA_CONG", "DANG_LAP_DAT"]);
    if (prodOrdersErr) throw HttpError.internal(prodOrdersErr.message);

    const productionOrders = (prodOrders ?? []).length;
    const workerProgress = await getProductionByWorker(range);

    const overloadedWorkersList: Array<{ workerId: number; name: string; activeCount: number }> = [];
    for (const w of workerProgress) {
      if (w.active > 1) {
        overloadedWorkersList.push({
          workerId: w.workerId,
          name: w.workerName,
          activeCount: w.active
        });
      }
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const nowMs = Date.now();
    const delayedOrdersList = (prodOrders ?? [])
      .filter((o) => new Date(o.ngaytao) < sevenDaysAgo)
      .map((o) => {
        const orderTime = new Date(o.ngaytao).getTime();
        const elapsedDays = Math.floor((nowMs - orderTime) / (1000 * 60 * 60 * 24));
        return {
          madh: o.madh,
          trangthai: o.trangthai,
          ngaytao: o.ngaytao,
          elapsedDays
        };
      });

    interface SimpleIssueRow {
      mank: number;
      maphoi: number;
      matho: number;
      mapc: number | null;
      ghichu: string | null;
      thoigian: string;
      trangthaixuly: string | null;
    }

    interface DetailedIssueRow extends SimpleIssueRow {
      nguoidung: { hoten: string } | null;
      phancong: {
        mapc: number;
        madh: number;
        donhang: {
          madh: number;
          khachhang: { hoten: string } | null;
        } | null;
      } | null;
    }

    interface IssueOutput {
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
    }

    let unresolvedIssuesList: IssueOutput[] = [];
    try {
      const { data: issuesData, error: issuesErr } = await supabaseAdmin
        .from("nhatkygiacong")
        .select(`
          mank,
          maphoi,
          matho,
          mapc,
          ghichu,
          thoigian,
          trangthaixuly,
          nguoidung:matho(hoten),
          phancong:mapc(
            mapc,
            madh,
            donhang:madh(
              madh,
              khachhang:makh(hoten)
            )
          )
        `)
        .eq("sukien", "LOI")
        .eq("trangthaixuly", "CHO_XU_LY")
        .order("mank", { ascending: false });

      if (issuesErr) {
        const { data: simpleData, error: simpleErr } = await supabaseAdmin
          .from("nhatkygiacong")
          .select("mank, maphoi, matho, mapc, ghichu, thoigian, trangthaixuly")
          .eq("sukien", "LOI")
          .eq("trangthaixuly", "CHO_XU_LY")
          .order("mank", { ascending: false });
        if (simpleErr) throw HttpError.internal(simpleErr.message);
        unresolvedIssuesList = ((simpleData ?? []) as SimpleIssueRow[]).map(item => ({
          ...item,
          workerName: `Thợ #${item.matho}`,
          customerName: "Khách hàng"
        }));
      } else {
        unresolvedIssuesList = ((issuesData ?? []) as unknown as DetailedIssueRow[]).map((item) => ({
          mank: item.mank,
          maphoi: item.maphoi,
          matho: item.matho,
          mapc: item.mapc,
          ghichu: item.ghichu,
          thoigian: item.thoigian,
          trangthaixuly: item.trangthaixuly,
          workerName: item.nguoidung?.hoten || `Thợ #${item.matho}`,
          customerName: item.phancong?.donhang?.khachhang?.hoten || "Khách hàng",
          madh: item.phancong?.donhang?.madh
        }));
      }
    } catch {
      unresolvedIssuesList = [];
    }

    return {
      productionOrders,
      workerProgress,
      overloadedWorkers: overloadedWorkersList,
      delayedOrders: delayedOrdersList,
      unresolvedIssuesCount: unresolvedIssuesList.length,
      unresolvedIssues: unresolvedIssuesList
    };
  },

  async getInventoryStats(range: DashboardRange) {
    const since = startOfRange(range).toISOString();

    const [profilesRes, vattuRes] = await Promise.all([
      supabaseAdmin
        .from("khothanhphoi")
        .select("maphoi, chieudaibandau, chieudaihientai, trangthai, mavt"),
      supabaseAdmin
        .from("vattu")
        .select("mavt, tenvt, donvitinh")
    ]);

    if (profilesRes.error) throw HttpError.internal(profilesRes.error.message);
    if (vattuRes.error) throw HttpError.internal(vattuRes.error.message);

    const profiles = profilesRes.data ?? [];
    const vattuList = vattuRes.data ?? [];

    const totalAvailable = profiles.filter(p => ["MOI", "CON_DU"].includes(p.trangthai)).length;

    const moiCount = profiles.filter(p => p.trangthai === "MOI").length;
    const conDuCount = profiles.filter(p => p.trangthai === "CON_DU").length;
    const boDiCount = profiles.filter(p => p.trangthai === "BO_DI").length;

    const statusAllocation = [
      { name: "Phôi mới", value: moiCount },
      { name: "Phôi dư", value: conDuCount },
      { name: "Bỏ đi/lỗi", value: boDiCount }
    ];

    const reusableMetersSum = profiles
      .filter(p => p.trangthai === "CON_DU")
      .reduce((sum, p) => sum + (p.chieudaihientai || 0), 0) / 1000;

    const wasteMetersSum = profiles
      .filter(p => p.trangthai === "BO_DI")
      .reduce((sum, p) => sum + (p.chieudaihientai || 0), 0) / 1000;

    const usageAndWasteSummary = {
      reusableMeters: Math.round(reusableMetersSum * 10) / 10,
      wasteMeters: Math.round(wasteMetersSum * 10) / 10,
      totalStockUsed: profiles.length
    };

    const moiCountsByMavt = new Map<number, number>();
    for (const p of profiles) {
      if (p.trangthai === "MOI") {
        moiCountsByMavt.set(p.mavt, (moiCountsByMavt.get(p.mavt) ?? 0) + 1);
      }
    }

    const lowStockWarnings = vattuList
      .map(v => {
        const count = moiCountsByMavt.get(v.mavt) ?? 0;
        return {
          mavt: v.mavt,
          tenvt: v.tenvt,
          donvitinh: v.donvitinh,
          count
        };
      })
      .filter(w => w.count < 10);

    const { data: logs, error: logsErr } = await supabaseAdmin
      .from("nhatkygiacong")
      .select("maphoi, thoigian")
      .eq("sukien", "CAT")
      .gte("thoigian", since);

    let topConsumedMaterials: Array<{ mavt: number; name: string; cutCount: number }> = [];

    if (!logsErr && logs) {
      const profileToMavt = new Map<number, number>();
      for (const p of profiles) {
        profileToMavt.set(p.maphoi, p.mavt);
      }

      const cutCountsByMavt = new Map<number, number>();
      for (const log of logs) {
        const mavt = profileToMavt.get(log.maphoi);
        if (mavt !== undefined) {
          cutCountsByMavt.set(mavt, (cutCountsByMavt.get(mavt) ?? 0) + 1);
        }
      }

      const vattuMap = new Map<number, string>();
      for (const v of vattuList) {
        vattuMap.set(v.mavt, v.tenvt);
      }

      topConsumedMaterials = [...cutCountsByMavt.entries()]
        .map(([mavt, count]) => ({
          mavt,
          name: vattuMap.get(mavt) || `Vật tư #${mavt}`,
          cutCount: count
        }))
        .sort((a, b) => b.cutCount - a.cutCount)
        .slice(0, 5);
    }

    return {
      totalAvailable,
      statusAllocation,
      usageAndWasteSummary,
      lowStockWarnings,
      topConsumedMaterials
    };
  },

  async getWorkerPerformance(matho: number, range: DashboardRange) {
    if (!Number.isFinite(matho)) throw HttpError.badRequest("Invalid matho");
    return getWorkerPerformance(matho, range);
  },

  async getWarningStats() {
    interface OrderWithCustomer {
      madh: number;
      trangthai: string;
      ngaytao: string;
      tonggiatri: number;
      makh: number;
      khachhang: { hoten: string } | null;
    }

    interface PendingProposal {
      madxc: number;
      mapc: number;
      matho: number;
      ngaytao: string;
      trangthai: string;
      nguoidung: { hoten: string } | null;
    }

    interface UnresolvedIssue {
      mank: number;
      maphoi: number;
      matho: number;
      mapc: number | null;
      ghichu: string | null;
      thoigian: string;
      trangthaixuly: string | null;
      nguoidung: { hoten: string } | null;
    }

    const [ordersRes, assignmentsRes, proposalsRes, issuesRes, profilesRes, vattuRes, paymentsRes] = await Promise.all([
      supabaseAdmin
        .from("donhang")
        .select("madh, trangthai, ngaytao, tonggiatri, makh, khachhang:makh(hoten)")
        .in("trangthai", ["DA_DUYET_GIA", "DA_COC"]),
      supabaseAdmin
        .from("phancong")
        .select("madh"),
      supabaseAdmin
        .from("dexuatcat")
        .select("madxc, mapc, matho, ngaytao, trangthai, nguoidung:matho(hoten)")
        .eq("trangthai", "CHO_DUYET")
        .order("ngaytao", { ascending: false }),
      supabaseAdmin
        .from("nhatkygiacong")
        .select("mank, maphoi, matho, mapc, ghichu, thoigian, trangthaixuly, nguoidung:matho(hoten)")
        .eq("sukien", "LOI")
        .eq("trangthaixuly", "CHO_XU_LY")
        .order("thoigian", { ascending: false }),
      supabaseAdmin
        .from("khothanhphoi")
        .select("maphoi, trangthai, mavt")
        .eq("trangthai", "MOI"),
      supabaseAdmin
        .from("vattu")
        .select("mavt, tenvt, donvitinh"),
      supabaseAdmin
        .from("giaodich")
        .select("madh, sotien, loaigd")
    ]);

    if (ordersRes.error) throw HttpError.internal(ordersRes.error.message);
    if (assignmentsRes.error) throw HttpError.internal(assignmentsRes.error.message);
    if (proposalsRes.error) throw HttpError.internal(proposalsRes.error.message);
    if (issuesRes.error) throw HttpError.internal(issuesRes.error.message);
    if (profilesRes.error) throw HttpError.internal(profilesRes.error.message);
    if (vattuRes.error) throw HttpError.internal(vattuRes.error.message);
    if (paymentsRes.error) throw HttpError.internal(paymentsRes.error.message);

    const activeOrders = (ordersRes.data ?? []) as unknown as OrderWithCustomer[];
    const assignedOrderIds = new Set((assignmentsRes.data ?? []).map(a => a.madh));

    // 1. Đơn chưa phân công
    const unassignedOrdersItems = activeOrders
      .filter(o => !assignedOrderIds.has(o.madh))
      .map(o => ({
        id: o.madh,
        label: `Đơn hàng #${o.madh}`,
        status: o.trangthai === "DA_DUYET_GIA" ? "Đã duyệt giá" : "Đã đặt cọc",
        createdAt: o.ngaytao,
        severity: "warning" as const,
        actionHref: "/admin/phan-cong",
        extraInfo: `Giá trị: ${new Intl.NumberFormat("vi-VN").format(o.tonggiatri)}đ - Khách hàng: ${o.khachhang?.hoten || "Không rõ"}`
      }));

    // 2. Đơn chậm tiến độ gia công: đơn DANG_GIA_CONG quá 7 ngày.
    const { data: inProgressOrders, error: ipErr } = await supabaseAdmin
      .from("donhang")
      .select("madh, trangthai, ngaytao, tonggiatri, makh, khachhang:makh(hoten)")
      .eq("trangthai", "DANG_GIA_CONG");
    if (ipErr) throw HttpError.internal(ipErr.message);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const delayedOrdersItems = ((inProgressOrders ?? []) as unknown as OrderWithCustomer[])
      .filter(o => new Date(o.ngaytao) < sevenDaysAgo)
      .map(o => {
        const days = Math.floor((Date.now() - new Date(o.ngaytao).getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: o.madh,
          label: `Đơn hàng #${o.madh}`,
          status: `Đang gia công ${days} ngày`,
          createdAt: o.ngaytao,
          severity: "warning" as const,
          actionHref: "/admin/don-hang",
          extraInfo: `Khách hàng: ${o.khachhang?.hoten || "Không rõ"}`
        };
      });

    // 3. Đề xuất cắt chờ duyệt (Pending Proposals)
    const pendingProposalsItems = ((proposalsRes.data ?? []) as unknown as PendingProposal[]).map(p => ({
      id: p.madxc,
      label: `Đề xuất ĐXC-${p.madxc}`,
      status: "Chờ duyệt",
      createdAt: p.ngaytao,
      severity: "critical" as const,
      actionHref: "/admin/de-xuat-cat",
      extraInfo: `Người đề xuất: ${p.nguoidung?.hoten || "Không rõ"} - Phân công: PC-${p.mapc}`
    }));

    // 4. Sự cố gia công chưa xử lý (Unresolved Issues)
    const unresolvedIssuesItems = ((issuesRes.data ?? []) as unknown as UnresolvedIssue[]).map(i => ({
      id: i.mank,
      label: `Sự cố SC-${i.mank}`,
      status: "Chờ xử lý",
      createdAt: i.thoigian,
      severity: "critical" as const,
      actionHref: "/admin/su-co",
      extraInfo: `Thợ báo: ${i.nguoidung?.hoten || "Không rõ"} - Phôi: UID-${i.maphoi} - Ghi chú: ${i.ghichu || "Không có"}`
    }));

    // 5. Tồn kho thấp (Low Stock)
    const profiles = profilesRes.data ?? [];
    const vattuList = vattuRes.data ?? [];
    const stockMoiCountMap = new Map<number, number>();
    for (const p of profiles) {
      stockMoiCountMap.set(p.mavt, (stockMoiCountMap.get(p.mavt) ?? 0) + 1);
    }

    const lowStockMaterialsItems = vattuList
      .map(v => ({
        mavt: v.mavt,
        tenvt: v.tenvt,
        donvitinh: v.donvitinh,
        count: stockMoiCountMap.get(v.mavt) ?? 0
      }))
      .filter(w => w.count < 10)
      .map(w => ({
        id: w.mavt,
        label: w.tenvt,
        status: `Tồn kho thấp (${w.count} ${w.donvitinh})`,
        createdAt: null,
        severity: "info" as const,
        actionHref: "/admin/kho-phoi",
        extraInfo: `Mã vật tư: VT-${w.mavt} - Ngưỡng cảnh báo: < 10 thanh`
      }));

    // 6. Công nợ hoàn thành chưa thu đủ (Unpaid Completed Orders)
    const { data: completedOrders, error: coErr } = await supabaseAdmin
      .from("donhang")
      .select("madh, ngaytao, tonggiatri, makh, khachhang:makh(hoten)")
      .eq("trangthai", "HOAN_THANH");
    if (coErr) throw HttpError.internal(coErr.message);

    const payments = paymentsRes.data ?? [];
    const orderPaidMap = new Map<number, number>();
    for (const p of payments) {
      if (p.madh) {
        const amount = signedAmount(p);
        orderPaidMap.set(p.madh, (orderPaidMap.get(p.madh) ?? 0) + amount);
      }
    }

    const unpaidCompletedOrdersItems = ((completedOrders ?? []) as unknown as OrderWithCustomer[])
      .map(o => {
        const paid = orderPaidMap.get(o.madh) ?? 0;
        const conno = Math.max(0, o.tonggiatri - paid);
        return {
          id: o.madh,
          label: `Đơn hàng #${o.madh}`,
          status: `Chưa thu đủ`,
          createdAt: o.ngaytao,
          severity: "info" as const,
          actionHref: "/admin/thanh-toan",
          conno,
          extraInfo: `Khách hàng: ${o.khachhang?.hoten || "Không rõ"} - Còn nợ: ${new Intl.NumberFormat("vi-VN").format(conno)}đ / Tổng: ${new Intl.NumberFormat("vi-VN").format(o.tonggiatri)}đ`
        };
      })
      .filter(o => o.conno > 0)
      .map(o => ({
        id: o.id,
        label: o.label,
        status: o.status,
        createdAt: o.createdAt,
        severity: o.severity,
        actionHref: o.actionHref,
        extraInfo: o.extraInfo
      }));

    return {
      unassignedOrders: {
        count: unassignedOrdersItems.length,
        items: unassignedOrdersItems
      },
      delayedOrders: {
        count: delayedOrdersItems.length,
        items: delayedOrdersItems
      },
      pendingProposals: {
        count: pendingProposalsItems.length,
        items: pendingProposalsItems
      },
      unresolvedIssues: {
        count: unresolvedIssuesItems.length,
        items: unresolvedIssuesItems
      },
      lowStockMaterials: {
        count: lowStockMaterialsItems.length,
        items: lowStockMaterialsItems
      },
      unpaidCompletedOrders: {
        count: unpaidCompletedOrdersItems.length,
        items: unpaidCompletedOrdersItems
      }
    };
  },
};
