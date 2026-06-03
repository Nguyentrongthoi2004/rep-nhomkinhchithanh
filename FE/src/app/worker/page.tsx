"use client";

import { useState, useEffect, useCallback, useMemo, useContext } from "react";
import {
  User, ChevronRight, Target, CreditCard, Clock,
  Scissors, ClipboardList, Package, AlertTriangle, BarChart3,
  Award, Shield, Flame, RefreshCw
} from "lucide-react";
import Link from "next/link";
import { apiData } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { WorkerViewContext } from "./context";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";

interface WorkerInfo {
  hoten: string;
  sdt: string | null;
  vaitro: string;
}

interface Assignment {
  mapc: number;
  madh: number;
  trangthai: string;
  donhang: { khachhang: { hoten: string } | null } | null;
}

interface DashboardSummary {
  worker: WorkerInfo | null;
  counts: {
    pending: number;
    active: number;
    done: number;
    issues: number;
    unread: number;
  };
  latestTasks: Assignment[];
}

export default function WorkerDashboard() {
  const { viewMode } = useContext(WorkerViewContext);
  const supabase = useMemo(() => createClient(), []);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [greeting, setGreeting] = useState("Xin chào");
  const [todayText, setTodayText] = useState("");
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 18) setGreeting("Chào buổi chiều");
    else if (hour >= 18) setGreeting("Chào buổi tối");
    else setGreeting("Chào buổi sáng");

    setTodayText(new Date().toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));
  }, []);

  interface PerformanceData {
    totalAssignments: number;
    activeAssignments: number;
    completedAssignments: number;
    rejectedAssignments: number;
    issueCount: number;
    weeklyCutsCount: number;
    summary: {
      total: number;
      done: number;
      active: number;
      pending: number;
      rejected: number;
      issueCount: number;
    };
    completionRate: number;
    recentCuts: Array<{
      mapc: number;
      madh: number;
      customerName: string;
      status: string;
      cuttingCount: number;
      completedCount: number;
    }>;
    dailyActivity: Array<{
      date: string;
      cuts: number;
      issues: number;
    }>;
  }

  const [worker, setWorker] = useState<WorkerInfo | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [counts, setCounts] = useState<DashboardSummary["counts"]>({ pending: 0, active: 0, done: 0, issues: 0, unread: 0 });
  const [loading, setLoading] = useState(true);
  const [perfData, setPerfData] = useState<PerformanceData | null>(null);
  const [perfLoading, setPerfLoading] = useState(true);
  const [workerId, setWorkerId] = useState<number | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setPerfLoading(true);
    try {
      const data = await apiData<DashboardSummary>("/api/worker/tasks/summary");
      setWorker(data.worker);
      setCounts(data.counts);
      setAssignments(data.latestTasks || []);
    } catch (e) {
      console.error("Lỗi tải dashboard:", e);
    } finally {
      setLoading(false);
    }

    try {
      const perf = await apiData<PerformanceData>("/api/worker/performance");
      setPerfData(perf);
    } catch (e) {
      console.error("Lỗi tải worker performance:", e);
    } finally {
      setPerfLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const resolveWorkerId = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userEmail = sessionData.session?.user?.email;
      if (!userEmail) {
        setWorkerId(null);
        return;
      }

      const { data: userRow } = await supabase
        .from("nguoidung")
        .select("mand")
        .eq("tendangnhap", userEmail)
        .single();

      const row = userRow as { mand?: number | string | null } | null;
      const nextWorkerId = Number(row?.mand);
      setWorkerId(Number.isFinite(nextWorkerId) && nextWorkerId > 0 ? nextWorkerId : null);
    } catch (e) {
      console.error("Lỗi xác định mã thợ realtime:", e);
      setWorkerId(null);
    }
  }, [supabase]);

  useEffect(() => {
    void resolveWorkerId();
  }, [resolveWorkerId]);

  useEffect(() => {
    if (!workerId) return;

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        void fetchDashboard();
      }, 500);
    };

    const workerFilter = `matho=eq.${workerId}`;
    const channel = supabase
      .channel(`worker-dashboard-realtime-${workerId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "phancong", filter: workerFilter }, scheduleRefresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "phancong", filter: workerFilter }, scheduleRefresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "nhatkygiacong", filter: workerFilter }, scheduleRefresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "nhatkygiacong", filter: workerFilter }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [fetchDashboard, supabase, workerId]);

  const activeTasks = assignments.filter(a => a.trangthai === "DANG_THUC_HIEN");
  const pendingTasks = assignments.filter(a => a.trangthai === "CHO_THUC_HIEN");
  const topTask = activeTasks[0] || pendingTasks[0] || null;

  // Lớp nền chứa dữ liệu vinh danh thợ (Gamification achievements)
  const achievements = useMemo(() => {
    const cuts = perfData?.weeklyCutsCount ?? 0;
    const issues = perfData?.issueCount ?? 0;
    return [
      {
        id: "save",
        title: "Kiện Tướng Tiết Kiệm",
        desc: "Hao phí cắt phôi lý thuyết thấp hơn 5% trong tuần.",
        unlocked: cuts > 5,
        icon: Award,
        color: "text-amber-400 bg-amber-500/10 border-amber-500/20"
      },
      {
        id: "golden",
        title: "Bàn Tay Vàng",
        desc: `Đã cắt thành công ${cuts} thanh nhôm trong 7 ngày qua.`,
        unlocked: cuts > 10,
        icon: Flame,
        color: "text-orange-400 bg-orange-500/10 border-orange-500/20"
      },
      {
        id: "safety",
        title: "Chiến Sĩ An Toàn",
        desc: issues === 0 ? "Không ghi nhận sự cố hỏng phôi nghiêm trọng." : "Báo cáo sự cố đầy đủ đúng quy trình.",
        unlocked: issues < 2,
        icon: Shield,
        color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      }
    ];
  }, [perfData]);

  // Render phần Header & Banner thống kê
  const HeaderAndOverview = () => (
    <div className={`${viewMode === "pc" ? "rounded-2xl border border-slate-800 bg-[#0d1118] p-5 shadow-sm" : "px-5 pt-12 pb-6 bg-linear-to-b from-cyan-950/35 via-[#090c11] to-[#090c11]"}`}>
      <div className={`flex justify-between items-start gap-4 ${viewMode === "pc" ? "mb-4" : "mb-6"}`}>
        <div className="flex items-start space-x-3">
          <div className={`${viewMode === "pc" ? "h-11 w-11 rounded-xl" : "h-12 w-12 rounded-2xl"} bg-cyan-400/10 flex items-center justify-center border border-cyan-400/20 shrink-0`}>
            <User className="w-6 h-6 text-cyan-300" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-cyan-300 font-bold tracking-wider uppercase flex items-center gap-1.5">
              <span>{todayText || "Hôm nay"}</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </p>
            <div className="mt-1 flex items-baseline gap-2 flex-wrap">
              <span className={`${viewMode === "pc" ? "text-base" : "text-lg"} font-black text-slate-400`}>{greeting},</span>
              {loading ? (
                <span className="inline-block h-6 w-36 bg-white/10 rounded animate-pulse" />
              ) : (
                <span className={`${viewMode === "pc" ? "max-w-[420px] text-2xl" : "max-w-[220px] text-xl"} font-extrabold text-white truncate`}>{worker?.hoten || "Nhân viên"}</span>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-[11px]">
              <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-300 font-medium">
                {worker?.vaitro === "WORKER" ? "Thợ Gia Công" : (worker?.vaitro || "Nhân sự")}
              </span>
              <span className="text-gray-600">•</span>
              <span className="text-gray-400 font-mono">{worker?.sdt || "Chưa đăng ký SĐT"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Thẻ thống kê Glassmorphism */}
      <div className={`${viewMode === "pc" ? "rounded-2xl p-4" : "rounded-3xl p-5"} relative overflow-hidden border border-cyan-300/20 bg-linear-to-br from-cyan-700 via-slate-900 to-[#101827] shadow-[0_18px_38px_-26px_rgba(34,211,238,0.55)]`}>
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <p className="text-blue-100/70 text-xs font-bold mb-1 tracking-wider uppercase">Nhiệm Vụ Hiện Tại</p>
            {loading ? (
              <div className="h-8 w-24 bg-white/20 rounded animate-pulse" />
            ) : (
              <p className="text-4xl font-black text-white tracking-tight flex items-baseline gap-1">
                {counts.active}
                <span className="text-lg text-blue-300 font-light">đang làm</span>
                <span className="text-xl text-blue-300/40">/</span>
                <span className="text-2xl font-extrabold text-blue-200">{counts.pending}</span>
                <span className="text-xs text-blue-300 font-normal">chờ</span>
              </p>
            )}
          </div>
          <div className="bg-white/15 p-3 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
            <Target className="w-6 h-6 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]" />
          </div>
        </div>
        <div className="relative z-10 mt-4 grid grid-cols-3 gap-2.5 text-xs">
          <MiniMetric label="Hoàn thành" value={counts.done} tone="text-emerald-300" />
          <MiniMetric label="Sự cố báo" value={counts.issues} tone="text-rose-300" />
          <MiniMetric label="Tin báo" value={counts.unread} tone="text-sky-300" />
        </div>
        <div className="relative z-10 mt-4 grid grid-cols-2 gap-2 text-xs pt-3.5 border-t border-white/10">
          <div className="rounded-xl bg-black/20 border border-white/5 px-3 py-2">
            <div className="text-blue-200/60 text-[10px] uppercase font-bold tracking-wider">Ưu tiên số</div>
            <div className="text-white font-black mt-0.5 truncate">
              {topTask ? `PC-${topTask.mapc} / DH-${topTask.madh}` : "Chưa phân"}
            </div>
          </div>
          <div className="rounded-xl bg-black/20 border border-white/5 px-3 py-2 flex flex-col justify-center">
            <div className="text-blue-200/60 text-[10px] uppercase font-bold tracking-wider">Lệnh cắt nhanh</div>
            {topTask ? (
              <Link href={`/worker/tasks?mapc=${topTask.mapc}`} className="inline-flex items-center font-bold text-amber-300 hover:text-amber-200 transition-colors mt-0.5">
                Mở sơ đồ <ChevronRight className="w-4 h-4 ml-0.5 animate-pulse" />
              </Link>
            ) : (
              <span className="text-gray-400 font-semibold mt-0.5">Đợi lệnh</span>
            )}
          </div>
        </div>
      </div>

      {viewMode === "pc" && (
        <div className="mt-4 grid grid-cols-4 gap-3">
          <Link href="/worker/tasks" className="rounded-2xl border border-orange-400/20 bg-orange-400/5 px-4 py-3 transition-colors hover:bg-orange-400/10">
            <div className="text-[10px] font-black uppercase tracking-widest text-orange-300">Nhận việc</div>
            <div className="mt-1 text-xs font-bold text-slate-300">{counts.pending} việc chờ</div>
          </Link>
          <Link href="/worker/simulator" className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 transition-colors hover:bg-cyan-400/10">
            <div className="text-[10px] font-black uppercase tracking-widest text-cyan-300">Tận dụng phôi</div>
            <div className="mt-1 text-xs font-bold text-slate-300">Tính nhanh kho dư</div>
          </Link>
          <Link href="/worker/kho" className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 transition-colors hover:bg-emerald-400/10">
            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Tra kho</div>
            <div className="mt-1 text-xs font-bold text-slate-300">Phôi còn dùng</div>
          </Link>
          <Link href={topTask ? `/worker/cat?mapc=${topTask.mapc}&report=1` : "/worker/tasks"} className="rounded-2xl border border-rose-400/20 bg-rose-400/5 px-4 py-3 transition-colors hover:bg-rose-400/10">
            <div className="text-[10px] font-black uppercase tracking-widest text-rose-300">Báo sự cố</div>
            <div className="mt-1 text-xs font-bold text-slate-300">{counts.issues} sự cố báo</div>
          </Link>
        </div>
      )}
    </div>
  );

  const CommandCenter = () => (
    <div className="rounded-2xl border border-slate-800 bg-[#0d1118] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">Lệnh thao tác nhanh</p>
          <h2 className="mt-1 text-xl font-black text-white">
            {topTask ? `PC-${topTask.mapc} · Đơn DH-${topTask.madh}` : "Chưa có phân công ưu tiên"}
          </h2>
          <p className="mt-1 truncate text-sm text-slate-400">
            {topTask?.donhang?.khachhang?.hoten ? `Khách: ${topTask.donhang.khachhang.hoten}` : "Các lệnh thao tác sẽ hiện ở đây khi có nhiệm vụ."}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Link
            href={topTask ? `/worker/tasks?mapc=${topTask.mapc}` : "/worker/tasks"}
            className="inline-flex h-12 min-w-28 items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 text-xs font-black text-cyan-100 hover:bg-cyan-400/15"
          >
            <ClipboardList className="h-4 w-4" />
            Nhiệm vụ
          </Link>
          <Link
            href={topTask ? `/worker/cat?mapc=${topTask.mapc}` : "/worker/cat"}
            className="inline-flex h-12 min-w-28 items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 text-xs font-black text-amber-100 hover:bg-amber-400/15"
          >
            <Scissors className="h-4 w-4" />
            Sơ đồ
          </Link>
          <Link
            href={topTask ? `/worker/cat?mapc=${topTask.mapc}&report=1` : "/worker/tasks"}
            className="inline-flex h-12 min-w-28 items-center justify-center gap-2 rounded-xl border border-rose-400/25 bg-rose-400/10 px-4 text-xs font-black text-rose-100 hover:bg-rose-400/15"
          >
            <AlertTriangle className="h-4 w-4" />
            Sự cố
          </Link>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/5 pt-4">
        <MiniMetric label="Đang làm" value={counts.active} tone="text-cyan-300" />
        <MiniMetric label="Chờ nhận" value={counts.pending} tone="text-amber-300" />
        <MiniMetric label="Đã xong" value={counts.done} tone="text-emerald-300" />
      </div>
    </div>
  );

  // Render mạng lưới Dịch vụ truy cập nhanh
  const QuickAccessServices = () => (
    <div className={`border border-slate-800 bg-[#0d1118] p-5 ${viewMode === "pc" ? "rounded-2xl" : "mx-5 mb-6 rounded-3xl"}`}>
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-1 flex items-center justify-between">
        <span>Liên Kết Nhanh</span>
        <span className="h-px bg-white/5 flex-1 ml-4" />
      </h2>
      <div className={`grid gap-3 ${viewMode === "pc" ? "grid-cols-2" : "grid-cols-4"}`}>
        <Link href="/worker/tasks" className="flex flex-col items-center group">
          <div className={`${viewMode === "pc" ? "h-12 w-full" : "h-13 w-13"} bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20 mb-2 group-hover:bg-orange-500/20 group-hover:scale-105 transition-all shadow-[0_4px_12px_rgba(249,115,22,0.05)]`}>
            <ClipboardList className="w-6 h-6 text-orange-400 drop-shadow-[0_0_4px_rgba(249,115,22,0.4)]" />
          </div>
          <span className="text-[10px] text-center font-bold text-gray-400 group-hover:text-gray-200 transition-colors">Nhiệm Vụ</span>
        </Link>

        <Link href="/worker/simulator" className="flex flex-col items-center group">
          <div className={`${viewMode === "pc" ? "h-12 w-full" : "h-13 w-13"} bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20 mb-2 group-hover:bg-cyan-500/20 group-hover:scale-105 transition-all shadow-[0_4px_12px_rgba(6,182,212,0.05)]`}>
            <Scissors className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_4px_rgba(6,182,212,0.4)]" />
          </div>
          <span className="text-[10px] text-center font-bold text-gray-400 group-hover:text-gray-200 transition-colors">Trợ Lý Cắt</span>
        </Link>

        <Link href="/worker/calendar" className="flex flex-col items-center group">
          <div className={`${viewMode === "pc" ? "h-12 w-full" : "h-13 w-13"} bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20 mb-2 group-hover:bg-purple-500/20 group-hover:scale-105 transition-all shadow-[0_4px_12px_rgba(168,85,247,0.05)]`}>
            <Clock className="w-6 h-6 text-purple-400 drop-shadow-[0_0_4px_rgba(168,85,247,0.4)]" />
          </div>
          <span className="text-[10px] text-center font-bold text-gray-400 group-hover:text-gray-200 transition-colors">Lịch biểu</span>
        </Link>

        <Link href="/worker/ca-nhan" className="flex flex-col items-center group">
          <div className={`${viewMode === "pc" ? "h-12 w-full" : "h-13 w-13"} bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 mb-2 group-hover:bg-emerald-500/20 group-hover:scale-105 transition-all shadow-[0_4px_12px_rgba(16,185,129,0.05)]`}>
            <CreditCard className="w-6 h-6 text-emerald-400 drop-shadow-[0_0_4px_rgba(16,185,129,0.4)]" />
          </div>
          <span className="text-[10px] text-center font-bold text-gray-400 group-hover:text-gray-200 transition-colors">Cá Nhân</span>
        </Link>
      </div>
    </div>
  );

  // Render các KPI hoạt động
  const KPIBlock = () => (
    <div className={`border border-slate-800 bg-[#0d1118] p-5 ${viewMode === "pc" ? "rounded-2xl" : "mx-5 mb-6 rounded-3xl"}`}>
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-1 flex items-center justify-between">
        <span>Chỉ Số Hiệu Năng Tuần</span>
        <span className="h-px bg-white/5 flex-1 ml-4" />
      </h2>
      {perfLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-20 rounded-2xl border border-white/5 bg-[#12141a] animate-pulse" />
          ))}
        </div>
      ) : perfData ? (
        <div className="grid grid-cols-2 gap-3">
          <WorkerKpiCard label="Tổng nhiệm vụ" value={perfData.totalAssignments} tone="text-gray-300 bg-white/[0.03] border-white/5" />
          <WorkerKpiCard label="Đang làm" value={perfData.activeAssignments} tone="text-sky-400 bg-sky-500/5 border-sky-500/15" />
          <WorkerKpiCard label="Hoàn thành" value={perfData.completedAssignments} tone="text-emerald-400 bg-emerald-500/5 border-emerald-500/15" />
          <WorkerKpiCard label="Tổng nhát cắt" value={perfData.weeklyCutsCount} tone="text-amber-400 bg-amber-500/5 border-amber-500/15" />
        </div>
      ) : null}
    </div>
  );

  // Render danh sách nhiệm vụ "Đang Thực Hiện"
  const ActiveTasksList = () => (
    <div className={`space-y-4 ${viewMode === "pc" ? "rounded-2xl border border-slate-800 bg-[#0d1118] p-5" : "px-5 pb-6"}`}>
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 flex items-center justify-between">
        <span>Việc Đang Thực Hiện ({assignments.length})</span>
        <span className="h-px bg-white/5 flex-1 ml-4" />
      </h2>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-[#12141a]/60 rounded-2xl p-4 border border-white/5 animate-pulse">
              <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-[#12141a]/40 rounded-3xl p-8 border border-white/5 text-center flex flex-col items-center justify-center min-h-[300px]">
          <Package className="w-10 h-10 text-gray-600 mb-3" />
          <p className="text-sm font-bold text-gray-400">Không có việc được giao</p>
          <p className="text-xs text-gray-500 mt-1 max-w-[200px] leading-relaxed">Hãy liên hệ quản đốc xưởng để nhận các phân công cắt nhôm mới.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map(a => (
            <Link key={a.mapc} href={`/worker/tasks?mapc=${a.mapc}`} className="block">
              <div className="bg-[#111722] border border-slate-800 rounded-xl p-4 flex items-center justify-between hover:bg-white/[0.04] hover:border-cyan-500/20 active:scale-99 transition-all">
                <div className="flex items-center min-w-0">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20 mr-3 shrink-0">
                    <ClipboardList className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-200 truncate">
                      Đơn DH-{a.madh} · {a.donhang?.khachhang?.hoten || "Khách hàng"}
                    </p>
                    <p className={`text-[11px] font-bold mt-1 flex items-center ${
                      a.trangthai === "DANG_THUC_HIEN" ? "text-blue-400" : "text-amber-400"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                        a.trangthai === "DANG_THUC_HIEN" ? "bg-blue-500 animate-pulse" : "bg-amber-500"
                      }`} />
                      {a.trangthai === "DANG_THUC_HIEN" ? "Đang thi công cắt" : "Chờ nhận việc"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-600 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );

  // Render phần Hiệu năng cá nhân (Biểu đồ, tỷ lệ, thành tựu)
  const PerformanceSection = () => (
    <div className={`space-y-5 ${viewMode === "pc" ? "rounded-2xl border border-slate-800 bg-[#0d1118] p-5" : "px-5 pb-8"}`}>
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 flex items-center justify-between">
        <span>Báo Cáo Hiệu Năng & Vinh Danh</span>
        <span className="h-px bg-white/5 flex-1 ml-4" />
      </h2>

      {perfLoading ? (
        <div className="space-y-4">
          <div className="h-40 bg-[#12141a] rounded-3xl border border-white/5 animate-pulse" />
          <div className="h-64 bg-[#12141a] rounded-3xl border border-white/5 animate-pulse" />
        </div>
      ) : !perfData ? (
        <div className="bg-[#12141a]/40 rounded-3xl p-6 border border-white/5 text-center">
          <AlertTriangle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-xs text-gray-500">Không có dữ liệu hiệu năng.</p>
        </div>
      ) : (
        <>
          {/* Tỷ lệ hoàn thành */}
          <div className="bg-[#12141a]/60 rounded-3xl p-5 border border-white/5 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Tỷ lệ hoàn thành công việc</h3>
              <p className="text-3xl font-black text-white">{perfData.completionRate}%</p>
              <p className="text-[10px] text-gray-400">Đạt chỉ tiêu hoàn thiện phôi tuần này.</p>
            </div>
            <div className="shrink-0">
              <RadialRingMini value={perfData.completionRate} color="#10b981" />
            </div>
          </div>

          {/* Gamification Achievements Widget */}
          <div className="bg-[#12141a]/60 border border-white/5 rounded-3xl p-5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" /> Huy Hiệu Ghi Nhận
            </h3>
            <div className="space-y-2.5">
              {achievements.map(ach => {
                const Icon = ach.icon;
                return (
                  <div key={ach.id} className={`p-3 rounded-2xl border flex items-start gap-3 transition-colors ${
                    ach.unlocked ? ach.color : "bg-black/20 border-white/5 opacity-40"
                  }`}>
                    <div className={`p-2 rounded-xl border ${ach.unlocked ? "border-current" : "border-white/5"}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-black text-white">{ach.title}</p>
                        {ach.unlocked && <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1 py-0.5 rounded-sm font-bold uppercase">Đạt</span>}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">{ach.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Biểu đồ 7 ngày gần nhất */}
          <div className="bg-[#12141a]/60 rounded-3xl p-5 border border-white/5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Sản lượng cắt 7 ngày</h3>
                <p className="text-[10px] text-gray-500">Số lượng nhát cắt phôi thực tế.</p>
              </div>
              <BarChart3 className="w-4 h-4 text-purple-400" />
            </div>
            <div className="h-[220px] w-full min-w-0">
              {!mounted ? (
                <div className="w-full h-full" />
              ) : perfData.dailyActivity.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={perfData.dailyActivity} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff04" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickFormatter={(val) => {
                      try {
                        const parts = val.split("-");
                        return `${parts[2]}/${parts[1]}`;
                      } catch {
                        return val;
                      }
                    }} />
                    <YAxis stroke="#64748b" fontSize={9} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: 16, fontSize: 10 }}
                      itemStyle={{ color: "#f8fafc" }}
                      labelStyle={{ color: "#94a3b8", fontWeight: "bold" }}
                    />
                    <Bar dataKey="cuts" barSize={10} radius={[4, 4, 0, 0]}>
                      {perfData.dailyActivity.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.issues > 0 ? "#f43f5e" : "#3b82f6"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-gray-500">Không có dữ liệu.</div>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2 justify-center text-[9px] text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Vận hành ổn định
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Ngày có sự cố báo cáo
              </span>
            </div>
          </div>

          {/* Lịch sử phân công gần đây */}
          <div className="bg-[#12141a]/60 rounded-3xl p-5 border border-white/5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Nhật ký nhiệm vụ gần đây</h3>
                <p className="text-[10px] text-gray-500">Lịch sử hoàn thiện sơ đồ.</p>
              </div>
              <ClipboardList className="w-4 h-4 text-orange-400" />
            </div>

            <div className="space-y-2">
              {perfData.recentCuts.length > 0 ? (
                perfData.recentCuts.map((item) => (
                  <Link key={item.mapc} href={`/worker/tasks?mapc=${item.mapc}`} className="block">
                    <div className="p-3 bg-white/[0.01] border border-white/5 rounded-2xl flex items-center justify-between hover:bg-white/[0.04] transition-colors">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-gray-200">
                          PC-{item.mapc} · DH-{item.madh}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          KH: {item.customerName}
                        </p>
                        <p className="text-[9px] text-gray-500 font-mono">
                          Đã cắt: {item.completedCount}/{item.cuttingCount} phôi sơ đồ
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          item.status === "HOAN_THANH" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          item.status === "DANG_THUC_HIEN" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                          item.status === "TU_CHOI" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}>
                          {item.status === "HOAN_THANH" ? "Hoàn tất" :
                           item.status === "DANG_THUC_HIEN" ? "Đang làm" :
                           item.status === "TU_CHOI" ? "Từ chối" : "Đợi lệnh"}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-gray-500">Chưa ghi nhận lịch sử cắt nhôm.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-full bg-[#030508] text-gray-200">
      {viewMode === "pc" ? (
        <div className="mx-auto w-full max-w-[1120px] px-6 py-7">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">Worker dashboard</p>
              <h1 className="mt-1 text-2xl font-black text-white">Tổng quan vận hành xưởng</h1>
            </div>
            <button
              onClick={fetchDashboard}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs font-bold text-slate-200 hover:bg-slate-800"
            >
              <RefreshCw className={`h-4 w-4 ${loading || perfLoading ? "animate-spin" : ""}`} />
              Làm mới
            </button>
          </div>

          <div className="grid grid-cols-12 gap-5 items-start">
            <div className="col-span-12">
              <HeaderAndOverview />
            </div>
            <div className="col-span-12 xl:col-span-8 space-y-5">
              <CommandCenter />
              <ActiveTasksList />
              <PerformanceSection />
            </div>
            <div className="col-span-12 xl:col-span-4 space-y-5">
              <QuickAccessServices />
              <KPIBlock />
            </div>
          </div>
        </div>
      ) : (
        // GIAO DIỆN MOBILE MODE (1 Cột cuộn quen thuộc nhưng cao cấp hơn)
        <div className="flex flex-col">
          <HeaderAndOverview />
          <QuickAccessServices />
          <KPIBlock />
          <ActiveTasksList />
          <PerformanceSection />
        </div>
      )}
    </div>
  );
}

function MiniMetric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-black/10 px-3 py-2.5 backdrop-blur-md">
      <div className="text-[9px] font-bold uppercase tracking-wider text-blue-200/50">{label}</div>
      <div className={`mt-1 text-lg font-black ${tone}`}>{value}</div>
    </div>
  );
}

function WorkerKpiCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 flex flex-col justify-between ${tone}`}>
      <div className="text-[9px] font-bold uppercase tracking-wider opacity-60">{label}</div>
      <div className="mt-2 font-mono text-3xl font-black tracking-tight">{value}</div>
    </div>
  );
}

function RadialRingMini({ value, color }: { value: number; color: string }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;
  return (
    <div className="flex flex-col items-center">
      <svg width="68" height="68" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="#ffffff08" strokeWidth="4" />
        <circle
          cx="32" cy="32" r={radius} fill="none" stroke={color} strokeWidth="4"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          transform="rotate(-90 32 32)"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
        <text x="32" y="36" textAnchor="middle" className="fill-gray-100 text-xs font-black" fontSize="11">{Math.round(value)}%</text>
      </svg>
    </div>
  );
}
