"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  User, Bell, ChevronRight, Zap, Target, CreditCard, Clock,
  Activity, Scissors, ClipboardList, Package
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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

export default function WorkerDashboard() {
  const supabase = useMemo(() => createClient(), []);
  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 18) return "Chào buổi chiều";
    if (hour >= 18) return "Chào buổi tối";
    return "Chào buổi sáng";
  });

  const [worker, setWorker] = useState<WorkerInfo | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userEmail = sessionData.session?.user?.email;
      if (!userEmail) { setLoading(false); return; }

      const { data: userRow } = await supabase
        .from("nguoidung")
        .select("mand, hoten, sdt, vaitro")
        .eq("tendangnhap", userEmail)
        .single();

      if (!userRow) { setLoading(false); return; }
      setWorker(userRow as WorkerInfo);

      const { data: aData } = await supabase
        .from("phancong")
        .select(`mapc, madh, trangthai, donhang(khachhang(hoten))`)
        .eq("matho", userRow.mand)
        .not("trangthai", "eq", "HOAN_THANH")
        .order("mapc", { ascending: false })
        .limit(5);

      setAssignments((aData as unknown as Assignment[]) || []);
    } catch (e) {
      console.error("Lỗi tải dashboard:", e);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const activeTasks = assignments.filter(a => a.trangthai === "DANG_THUC_HIEN");
  const pendingTasks = assignments.filter(a => a.trangthai === "CHO_THUC_HIEN");

  return (
    <div className="min-h-full bg-[#030508] text-gray-200">

      {/* Header */}
      <div className="bg-linear-to-b from-blue-900/40 to-[#030508] px-5 pt-12 pb-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
              <User className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">{greeting},</p>
              {loading ? (
                <div className="h-4 w-28 bg-white/10 rounded animate-pulse mt-1" />
              ) : (
                <h1 className="text-sm font-bold text-gray-100">{worker?.hoten || "Nhân viên"}</h1>
              )}
            </div>
          </div>
          <button className="relative p-2 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 transition-colors">
            <Bell className="w-5 h-5 text-gray-300" />
            {(activeTasks.length + pendingTasks.length) > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
        </div>

        {/* Stats Card */}
        <div className="bg-linear-to-br from-blue-600 to-blue-800 rounded-2xl p-5 shadow-[0_10px_25px_-5px_rgba(37,99,235,0.4)] relative overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-white/10 rounded-full blur-2xl" />
          <div className="relative z-10 flex justify-between items-center">
            <div>
              <p className="text-blue-100/80 text-xs font-medium mb-1">Việc đang chạy / Chờ nhận</p>
              {loading ? (
                <div className="h-8 w-20 bg-white/20 rounded animate-pulse" />
              ) : (
                <p className="text-3xl font-bold text-white flex items-center">
                  {activeTasks.length}
                  <span className="text-lg text-blue-200 mx-1">/</span>
                  {pendingTasks.length}
                  <Activity className="w-5 h-5 ml-2 text-green-300" />
                </p>
              )}
            </div>
            <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
              <Target className="w-6 h-6 text-blue-100" />
            </div>
          </div>
          <div className="relative z-10 mt-4 flex items-center text-xs text-blue-100/90">
            <span className="bg-white/20 px-2 py-0.5 rounded mr-2">{worker?.sdt || "Chưa có SĐT"}</span>
            <span>Số điện thoại</span>
          </div>
        </div>
      </div>

      {/* Quick Access Grid */}
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

      {/* Active Assignments */}
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

    </div>
  );
}
