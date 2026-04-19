"use client";

import { 
  TrendingUp, 
  CreditCard, 
  Users, 
  PackageMinus,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";

// Mock Data
const revenueData = [
  { name: "T2", total: 12500000 },
  { name: "T3", total: 8500000 },
  { name: "T4", total: 15200000 },
  { name: "T5", total: 24000000 },
  { name: "T6", total: 18500000 },
  { name: "T7", total: 29800000 },
  { name: "CN", total: 32500000 },
];

const materialData = [
  { name: "Nhôm Xingfa", usage: 145 },
  { name: "Kính Cường Lực", usage: 220 },
  { name: "Phụ kiện Kinlong", usage: 85 },
  { name: "Keo Silicone", usage: 32 },
];

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
          value="141.000.000 ₫" 
          change="+12.5%" 
          icon={TrendingUp} 
          isIncrease={true} 
        />
        <StatCard 
          title="Đơn Hàng Mới" 
          value="24" 
          change="+4.2%" 
          icon={CreditCard} 
          isIncrease={true} 
        />
        <StatCard 
          title="Thợ Đang Làm Việc" 
          value="12 / 15" 
          change="-2" 
          icon={Users} 
          isIncrease={false} 
        />
        <StatCard 
          title="Cảnh Báo Tồn Kho" 
          value="3 Mã" 
          change="+1 Mã" 
          icon={PackageMinus} 
          isIncrease={false} 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Line Chart */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-200">Biểu Đồ Doanh Thu Lắp Đặt (7 Ngày)</h3>
            <select className="bg-[#0a0a0c] border border-white/10 text-gray-300 text-sm rounded-lg px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500 outline-none">
              <option>Tuần này</option>
              <option>Tháng này</option>
            </select>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#6b7280" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#6b7280" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `${value / 1000000}Tr`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', color: '#f3f4f6' }}
                  itemStyle={{ color: '#60a5fa' }}
                  formatter={(value) => [`${Number(value || 0).toLocaleString('vi-VN')} ₫`, "Doanh thu"]}
                />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  dot={{ r: 4, strokeWidth: 2, fill: '#0a0a0c', stroke: '#3b82f6' }} 
                  activeDot={{ r: 6, fill: '#3b82f6', stroke: '#60a5fa', strokeWidth: 2 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secondary Bar Chart */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-medium text-gray-200 mb-6">Lượng Hao Hụt Vật Tư</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={materialData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                <XAxis type="number" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} width={100} />
                <Tooltip 
                  cursor={{ fill: '#ffffff05' }}
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px', color: '#f3f4f6' }}
                  formatter={(value) => [`${value} Đơn vị`, "Sử dụng"]}
                />
                <Bar dataKey="usage" fill="#60a5fa" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
