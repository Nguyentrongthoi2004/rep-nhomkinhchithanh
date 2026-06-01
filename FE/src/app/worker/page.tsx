"use client";

import { useState, useEffect, useCallback } from "react";
import {
  User, Bell, ChevronRight, Zap, Target, CreditCard, Clock,
  Activity, Scissors, ClipboardList, Package, AlertTriangle, BarChart3
} from "lucide-react";
import Link from "next/link";
import { apiData } from "@/lib/api";
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

  const activeTasks = assignments.filter(a => a.trangthai === "DANG_THUC_HIEN");
  const pendingTasks = assignments.filter(a => a.trangthai === "CHO_THUC_HIEN");
  const topTask = activeTasks[0] || pendingTasks[0] || null;

  return (
    <div className="min-h-full bg-[#030508] text-gray-200">

      {/* Đầu trang */}
      <div className="bg-linear-to-b from-blue-900/40 to-[#030508] px-5 pt-12 pb-6">
        <div className="flex justify-between items-start mb-6 gap-4">
          <div className="flex items-start space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/15 flex items-center justify-center border border-blue-500/25 shrink-0">
              <User className="w-5 h-5 text-blue-300" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-blue-100/80 font-semibold tracking-wider uppercase">{todayText || "Hôm nay"}</p>
              <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                <span className="text-base font-extrabold text-gray-100">{greeting},</span>
                {loading ? (
                  <span className="inline-block h-5 w-36 bg-white/10 rounded animate-pulse" />
                ) : (
                  <span className="text-base font-extrabold text-white truncate max-w-[220px]">{worker?.hoten || "Nhân viên"}</span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px]">
                <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-300">
                  {worker?.vaitro === "WORKER" ? "Thợ" : (worker?.vaitro || "Nhân sự")}
                </span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-400">{worker?.sdt || "Chưa có SĐT"}</span>
              </div>
            </div>
          </div>
          <div className="relative p-2 bg-white/5 rounded-2xl border border-white/10 shrink-0" title="Thông báo chưa đọc" aria-label="Thông báo chưa đọc">
            <Bell className="w-5 h-5 text-gray-300" />
            {counts.unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-red-500 px-1 text-[10px] font-bold text-white flex items-center justify-center">
                {counts.unread > 9 ? "9+" : counts.unread}
              </span>
            )}
          </div>
        </div>

        {/* Thẻ thống kê */}
        <div className="bg-linear-to-br from-blue-600 to-blue-900 rounded-3xl p-5 shadow-[0_10px_25px_-5px_rgba(37,99,235,0.4)] relative overflow-hidden border border-white/10">
          <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-white/10 rounded-full blur-2xl" />
          <div className="absolute bottom-[-30%] left-[-15%] w-[55%] h-[55%] bg-emerald-400/10 rounded-full blur-3xl" />
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <p className="text-blue-100/80 text-xs font-semibold mb-1 tracking-wide">Đang làm / Chờ nhận</p>
              {loading ? (
                <div className="h-8 w-20 bg-white/20 rounded animate-pulse" />
              ) : (
                <p className="text-3xl font-bold text-white flex items-center">
                  {counts.active}
                  <span className="text-lg text-blue-200 mx-1">/</span>
                  {counts.pending}
                  <Activity className="w-5 h-5 ml-2 text-green-300" />
                </p>
              )}
            </div>
            <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
              <Target className="w-6 h-6 text-blue-100" />
            </div>
          </div>
          <div className="relative z-10 mt-3 grid grid-cols-3 gap-2 text-xs">
            <MiniMetric label="Đã xong" value={counts.done} tone="text-emerald-100" />
            <MiniMetric label="Sự cố mở" value={counts.issues} tone="text-rose-100" />
            <MiniMetric label="Thông báo" value={counts.unread} tone="text-sky-100" />
          </div>
          <div className="relative z-10 mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-2xl bg-white/10 border border-white/10 px-3 py-2">
              <div className="text-blue-100/80 text-[11px]">Ưu tiên</div>
              <div className="text-white font-bold mt-0.5">
                {topTask ? `PC-${topTask.mapc} / DH-${topTask.madh}` : "Chưa có"}
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/10 px-3 py-2">
              <div className="text-blue-100/80 text-[11px]">Hành động nhanh</div>
              {topTask ? (
                <Link href={`/worker/cat?mapc=${topTask.mapc}`} className="inline-flex items-center font-bold text-amber-200 mt-0.5">
                  Mở máy cắt <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              ) : (
                <span className="text-blue-100/90 font-semibold mt-0.5 inline-block">Chờ phân công</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lưới truy cập nhanh */}
      <div className="px-5 pb-6">
        <h2 className="text-sm font-bold text-gray-100 mb-4 px-1">Dịch Vụ Nhanh</h2>
        <div className="grid grid-cols-4 gap-4">
          <Link href="/worker/tasks" className="flex flex-col items-center group">
            <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20 mb-2 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-orange-400 drop-shadow-[0_0_5px_rgba(249,115,22,0.5)]" />
            </div>
            <span className="text-[10px] text-center font-medium text-gray-400">Việc Hôm Nay</span>
          </Link>

          <Link href="/worker/simulator" className="flex flex-col items-center group">
            <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20 mb-2 group-hover:scale-110 transition-transform">
              <Scissors className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]" />
            </div>
            <span className="text-[10px] text-center font-medium text-gray-400">Mô Phỏng Cắt</span>
          </Link>

          <Link href="/worker/calendar" className="flex flex-col items-center group">
            <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20 mb-2 group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6 text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.5)]" />
            </div>
            <span className="text-[10px] text-center font-medium text-gray-400">Lịch & Ghi Chú</span>
          </Link>

          <Link href="/worker/ca-nhan" className="flex flex-col items-center group">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 mb-2 group-hover:scale-110 transition-transform">
              <CreditCard className="w-6 h-6 text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
            </div>
            <span className="text-[10px] text-center font-medium text-gray-400">Cá Nhân</span>
          </Link>
        </div>
      </div>

      {/* Phân công đang thực hiện */}
      <div className="px-5 space-y-3 pb-8">
        <h2 className="text-sm font-bold text-gray-100 mb-3 px-1">Đang Thực Hiện</h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="bg-[#12141a] rounded-xl p-4 border border-white/5 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : assignments.length === 0 ? (
          <div className="bg-[#12141a] rounded-xl p-6 border border-white/5 text-center">
            <Package className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Chưa có việc nào được giao.</p>
            <p className="text-xs text-gray-600 mt-1">Liên hệ quản đốc để nhận công việc.</p>
          </div>
        ) : (
          assignments.map(a => (
            <Link key={a.mapc} href="/worker/tasks">
              <div className="bg-[#12141a] rounded-xl p-4 border border-white/5 flex items-center justify-between shadow-sm active:scale-95 transition-transform">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20 mr-3">
                    <ClipboardList className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-200">
                      Đơn DH-{a.madh} · {a.donhang?.khachhang?.hoten || "Khách hàng"}
                    </p>
                    <p className={`text-xs font-medium mt-0.5 flex items-center ${
                      a.trangthai === "DANG_THUC_HIEN" ? "text-blue-400" : "text-amber-400"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                        a.trangthai === "DANG_THUC_HIEN" ? "bg-blue-500 animate-pulse" : "bg-amber-500"
                      }`} />
                      {a.trangthai === "DANG_THUC_HIEN" ? "Đang thi công" : "Chờ nhận việc"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </div>
            </Link>
          ))
        )}
      </div>

    {/* ===== PHẦN MỞ RỘNG: HIỆU NĂNG CÁ NHÂN ===== */}
    <div className="px-5 pb-8 space-y-6">
      <h2 className="text-sm font-bold text-gray-100 px-1 flex items-center gap-2">
        <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
        Hiệu Năng Cá Nhân
      </h2>

      {perfLoading ? (
        <div className="space-y-4">
          <div className="h-44 bg-[#12141a] rounded-3xl border border-white/5 animate-pulse" />
          <div className="h-60 bg-[#12141a] rounded-3xl border border-white/5 animate-pulse" />
        </div>
      ) : !perfData ? (
        <div className="bg-[#12141a] rounded-2xl p-6 border border-white/5 text-center">
          <AlertTriangle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Không thể tải dữ liệu hiệu năng.</p>
        </div>
      ) : (
        <>
          {/* 1. Performance Summary Card */}
          <div className="bg-[#12141a] rounded-3xl p-5 border border-white/5 space-y-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Tỷ lệ hoàn thành</h3>
                <p className="text-2xl font-black text-white mt-1">{perfData.completionRate}%</p>
                <p className="text-[11px] text-gray-400 mt-1">Được tính trên tổng số phân công.</p>
              </div>
              <div className="shrink-0">
                <RadialRingMini value={perfData.completionRate} color="#10b981" />
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2 pt-2 border-t border-white/5">
              <MetricMiniBlock label="Tổng" value={perfData.summary.total} tone="text-gray-200 bg-white/5" />
              <MetricMiniBlock label="Xong" value={perfData.summary.done} tone="text-emerald-400 bg-emerald-500/10" />
              <MetricMiniBlock label="Đang làm" value={perfData.summary.active} tone="text-blue-400 bg-blue-500/10" />
              <MetricMiniBlock label="Từ chối" value={perfData.summary.rejected} tone="text-red-400 bg-red-500/10" />
              <MetricMiniBlock label="Sự cố" value={perfData.summary.issueCount} tone="text-amber-400 bg-amber-500/10" />
            </div>
          </div>

          {/* 2. Hoạt động 7 ngày gần nhất */}
          <div className="bg-[#12141a] rounded-3xl p-5 border border-white/5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Lịch sử cắt 7 ngày qua</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Số lần cắt nhôm thực tế tại xưởng.</p>
              </div>
              <BarChart3 className="w-4 h-4 text-purple-400" />
            </div>
            <div className="h-44 w-full">
              {perfData.dailyActivity.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={perfData.dailyActivity} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} tickFormatter={(val) => {
                      try {
                        const parts = val.split("-");
                        return `${parts[2]}/${parts[1]}`;
                      } catch {
                        return val;
                      }
                    }} />
                    <YAxis stroke="#94a3b8" fontSize={9} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#111827", borderColor: "#374151", borderRadius: 12, fontSize: 11 }}
                      itemStyle={{ color: "#f3f4f6" }}
                      labelStyle={{ color: "#9ca3af", fontWeight: "bold" }}
                    />
                    <Bar dataKey="cuts" barSize={12} radius={[4, 4, 0, 0]}>
                      {perfData.dailyActivity.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.issues > 0 ? "#ef4444" : "#3b82f6"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-gray-500">Không có hoạt động.</div>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 justify-center text-[10px] text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                Ngày bình thường
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                Ngày có báo cáo sự cố
              </span>
            </div>
          </div>

          {/* 3. Lịch sử phân công gần đây */}
          <div className="bg-[#12141a] rounded-3xl p-5 border border-white/5 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Phân công gần đây</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Tiến độ cắt phôi của 5 nhiệm vụ gần nhất.</p>
              </div>
              <ClipboardList className="w-4 h-4 text-orange-400" />
            </div>

            <div className="space-y-2">
              {perfData.recentCuts.length > 0 ? (
                perfData.recentCuts.map((item) => (
                  <Link key={item.mapc} href="/worker/tasks" className="block">
                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between hover:bg-white/5 transition-colors">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-gray-200">
                          PC-{item.mapc} · DH-{item.madh}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          KH: {item.customerName}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          Tiến độ: {item.completedCount}/{item.cuttingCount} thanh sơ đồ cắt
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          item.status === "HOAN_THANH" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          item.status === "DANG_THUC_HIEN" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                          item.status === "TU_CHOI" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                          "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}>
                          {item.status === "HOAN_THANH" ? "Xong" :
                           item.status === "DANG_THUC_HIEN" ? "Đang làm" :
                           item.status === "TU_CHOI" ? "Từ chối" : "Chờ làm"}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-gray-500">Chưa có lịch sử phân công.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>

    </div>
  );
}

function MiniMetric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 backdrop-blur-sm">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-100/70">{label}</div>
      <div className={`mt-0.5 text-lg font-extrabold ${tone}`}>{value}</div>
    </div>
  );
}

function RadialRingMini({ value, color }: { value: number; color: string }) {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;
  return (
    <div className="flex flex-col items-center">
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="#ffffff10" strokeWidth="4" />
        <circle
          cx="32" cy="32" r={radius} fill="none" stroke={color} strokeWidth="4"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          transform="rotate(-90 32 32)"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
        <text x="32" y="36" textAnchor="middle" className="fill-gray-100 text-xs font-black" fontSize="12">{Math.round(value)}%</text>
      </svg>
    </div>
  );
}

function MetricMiniBlock({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`p-2 rounded-xl text-center border border-white/5 ${tone}`}>
      <div className="text-[9px] font-bold uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-sm font-black mt-0.5">{value}</div>
    </div>
  );
}
