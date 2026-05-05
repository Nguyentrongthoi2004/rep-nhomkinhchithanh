"use client";

import { TrendingUp, CreditCard, Users, Boxes, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { apiData } from "@/lib/api";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ElementType } from 'react';

// Reusable Components
interface StatCardProps {
  title: string;
  value: string | number;
  change: string;
  icon: ElementType;
  isIncrease: boolean;
}

const StatCard = ({ title, value, change, icon: Icon, isIncrease }: StatCardProps) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-6 relative overflow-hidden group hover:bg-white/[0.07] transition-all">
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-100">{value}</h3>
      </div>
      <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-gray-300 group-hover:scale-110 group-hover:text-blue-400 transition-transform">
        <Icon size={20} />
      </div>
    </div>
    
    <div className="flex items-center text-sm">
      <span className={`flex items-center font-medium ${isIncrease ? 'text-emerald-400' : 'text-red-400'}`}>
        {isIncrease ? <ArrowUpRight size={16} className="mr-1" /> : <ArrowDownRight size={16} className="mr-1" />}
        {change}
      </span>
      <span className="text-gray-500 ml-2">so với tháng trước</span>
    </div>

    {/* Subtle Glow Effect */}
    <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-500/10 blur-2xl rounded-full group-hover:bg-blue-500/20 transition-all"></div>
  </div>
);

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    weeklyRevenue: 0,
    newOrders: 0,
    activeWorkers: 0,
    totalWorkers: 0,
    materialSkuCount: 0,
  });
  const [materialBars, setMaterialBars] = useState<Array<{ name: string; usage: number }>>([]);

  useEffect(() => {
    setMounted(true);
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [orders, users, materials] = await Promise.all([
          apiData<Array<{ madh: number; ngaytao: string; tonggiatri: number; trangthai: string }>>("/api/admin/orders"),
          apiData<Array<{ mand: number; vaitro: string; trangthai: string }>>("/api/admin/users"),
          apiData<Array<{ mavt: number; danhmuc?: { tendm?: string } | null }>>("/api/admin/materials-options"),
        ]);

        const now = Date.now();
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
        const weeklyRevenue = orders
          .filter((o) => new Date(o.ngaytao).getTime() >= sevenDaysAgo)
          .reduce((sum, o) => sum + Number(o.tonggiatri || 0), 0);

        const newOrders = orders.filter((o) => o.trangthai === "BAO_GIA_NHAP").length;

        const totalWorkers = users.filter((u) => u.vaitro === "WORKER").length;
        const activeWorkers = users.filter((u) => u.vaitro === "WORKER" && u.trangthai === "DANG_LAM").length;

        const materialSkuCount = materials.length;
        const grouped = new Map<string, number>();
        for (const m of materials) {
          const name = String(m.danhmuc?.tendm || "Khác");
          grouped.set(name, (grouped.get(name) || 0) + 1);
        }
        const materialBars = [...grouped.entries()]
          .map(([name, usage]) => ({ name, usage }))
          .sort((a, b) => b.usage - a.usage)
          .slice(0, 6);

        if (!cancelled) {
          setKpis({ weeklyRevenue, newOrders, activeWorkers, totalWorkers, materialSkuCount });
          setMaterialBars(materialBars);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const money = useMemo(
    () => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }),
    [],
  );

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Tổng quan Hệ thống</h1>
        <p className="text-gray-400 text-sm mt-1">Trạng thái nhà xưởng và kinh doanh tính đến hôm nay.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Tổng Doanh Thu Hàng Tuần" 
          value={loading ? "…" : money.format(kpis.weeklyRevenue)} 
          change={loading ? "…" : "7 ngày"} 
          icon={TrendingUp} 
          isIncrease={true} 
        />
        <StatCard 
          title="Đơn Hàng Mới" 
          value={loading ? "…" : kpis.newOrders} 
          change={loading ? "…" : "Báo giá nhập"} 
          icon={CreditCard} 
          isIncrease={true} 
        />
        <StatCard 
          title="Thợ Đang Làm Việc" 
          value={loading ? "…" : `${kpis.activeWorkers} / ${kpis.totalWorkers}`} 
          change={loading ? "…" : "Nhân sự"} 
          icon={Users} 
          isIncrease={false} 
        />
        <StatCard 
          title="Số Mã Vật Tư" 
          value={loading ? "…" : `${kpis.materialSkuCount} mã`} 
          change={loading ? "…" : "Danh mục"} 
          icon={Boxes} 
          isIncrease={true} 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Replace "fake" charts with real material distribution */}
        <div className="lg:col-span-3 bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-medium text-gray-200 mb-2">Phân bổ mã vật tư theo danh mục</h3>
          <p className="text-xs text-gray-500 mb-6">Dữ liệu lấy từ database (không dùng mock).</p>
          <div className="h-[320px] w-full">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={materialBars} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                  <XAxis type="number" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} width={120} />
                  <Tooltip
                    cursor={{ fill: "#ffffff05" }}
                    contentStyle={{ backgroundColor: "#111827", borderColor: "#374151", borderRadius: "8px", color: "#f3f4f6" }}
                    formatter={(value) => [`${value} mã`, "Số lượng"]}
                  />
                  <Bar dataKey="usage" fill="#60a5fa" radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
