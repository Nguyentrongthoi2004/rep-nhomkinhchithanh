"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, WalletCards, CreditCard, ClipboardList, Trophy, Landmark } from "lucide-react";
import { DashboardMetricCard } from "./DashboardMetricCard";
import { DashboardChartContainer } from "./DashboardChartContainer";
import { DashboardEmptyState } from "./DashboardEmptyState";
import Link from "next/link";

type FinanceTabProps = {
  data: {
    revenueByPeriod: Array<{ period: string; revenue: number }>;
    paidByPeriod: Array<{ period: string; paid: number }>;
    statusAllocation: Array<{ group: string; label: string; count: number; totalValue: number }>;
    topCustomers: Array<{ customerId: number; name: string; totalOrders: number; totalValue: number }>;
    averageOrderValue: number;
    totalRevenue: number;
    totalPaid: number;
    remainingDebt: number;
  } | null;
  loading: boolean;
};

const COLORS = ["#0ea5e9", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899"];

function money(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value || 0);
}

function formatPeriod(value: string) {
  const parts = value.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  if (parts.length === 2) return `${parts[1]}/${parts[0]}`;
  return value;
}

export function FinanceTab({ data, loading }: FinanceTabProps) {
  const chartData = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { period: string; revenue: number; paid: number }>();
    for (const item of data.revenueByPeriod || []) {
      map.set(item.period, { period: item.period, revenue: item.revenue, paid: 0 });
    }
    for (const item of data.paidByPeriod || []) {
      const existing = map.get(item.period);
      if (existing) {
        existing.paid = item.paid;
      } else {
        map.set(item.period, { period: item.period, revenue: 0, paid: item.paid });
      }
    }
    return [...map.values()].sort((a, b) => a.period.localeCompare(b.period));
  }, [data]);

  const pieData = useMemo(() => {
    if (!data) return [];
    return (data.statusAllocation || [])
      .map((item) => ({
        name: item.label,
        value: item.totalValue,
        count: item.count,
      }))
      .filter((item) => item.value > 0);
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-[#0a0a0c] border border-white/10 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 h-[380px] bg-[#0a0a0c] border border-white/10 rounded-2xl" />
          <div className="h-[380px] bg-[#0a0a0c] border border-white/10 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-12">
        <DashboardEmptyState
          icon={Landmark}
          title="Không có dữ liệu tài chính"
          description="Không thể tìm thấy hoặc tải thông tin tài chính cho khoảng thời gian này."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          title="Tổng doanh thu"
          value={money(data.totalRevenue)}
          hint="Tổng giá trị đơn hàng phát sinh (không hủy)."
          icon={TrendingUp}
          tone="emerald"
          href="/admin/don-hang"
        />
        <DashboardMetricCard
          title="Đã thực thu"
          value={money(data.totalPaid)}
          hint="Tổng tiền thực tế đã thu qua các giao dịch."
          icon={WalletCards}
          tone="sky"
          href="/admin/thanh-toan"
        />
        <DashboardMetricCard
          title="Công nợ chưa thu"
          value={money(data.remainingDebt)}
          hint="Tổng tiền chênh lệch đơn hàng và giao dịch."
          icon={CreditCard}
          tone="amber"
          href="/admin/thanh-toan"
        />
        <DashboardMetricCard
          title="Giá trị đơn trung bình"
          value={money(data.averageOrderValue)}
          hint="Giá trị đơn hàng trung bình (AOV)."
          icon={ClipboardList}
          tone="violet"
          href="/admin/don-hang"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Doanh thu vs Thực thu Area Chart */}
        <div className="xl:col-span-2 min-w-0">
          <DashboardChartContainer
            title="Doanh số và Thực thu"
            description="So sánh giá trị đơn ký mới vs Tiền thực tế đã thu qua các tháng"
          >
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorFinanceRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorFinancePaid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff12" />
                  <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} tickFormatter={formatPeriod} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={10}
                    tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : String(v))}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#111827", borderColor: "#374151", borderRadius: 12 }}
                    itemStyle={{ color: "#f3f4f6" }}
                    labelStyle={{ color: "#9ca3af", fontWeight: "bold" }}
                    labelFormatter={(label) => formatPeriod(String(label))}
                    formatter={(value) => money(Number(value))}
                  />
                  <Area type="monotone" dataKey="revenue" name="Giá trị đơn" stroke="#10b981" fill="url(#colorFinanceRevenue)" strokeWidth={2} />
                  <Area type="monotone" dataKey="paid" name="Thực thu" stroke="#0ea5e9" fill="url(#colorFinancePaid)" strokeWidth={2} />
                  <Legend iconType="circle" iconSize={8} formatter={(value) => <span className="text-xs text-gray-400">{value}</span>} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <DashboardEmptyState
                icon={TrendingUp}
                title="Chưa có dữ liệu giao dịch"
                description="Không tìm thấy dữ liệu doanh số hoặc thực thu trong khoảng thời gian này."
              />
            )}
          </DashboardChartContainer>
        </div>

        {/* Cơ cấu công nợ Pie Chart */}
        <div className="min-w-0">
          <DashboardChartContainer
            title="Cơ cấu dòng tiền đơn hàng"
            description="Phân bổ tổng giá trị đơn hàng theo trạng thái thanh toán"
          >
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#111827", borderColor: "#374151", borderRadius: 12 }}
                    itemStyle={{ color: "#f3f4f6" }}
                    labelStyle={{ color: "#9ca3af", fontWeight: "bold" }}
                    formatter={(value, name, props) => [`${money(Number(value))} (${props.payload.count} đơn)`, name]}
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
              <DashboardEmptyState
                icon={CreditCard}
                title="Chưa có phân bổ dòng tiền"
                description="Các đơn hàng hiện chưa phát sinh giá trị."
              />
            )}
          </DashboardChartContainer>
        </div>
      </div>

      {/* Top 5 Khách hàng VIP */}
      <section className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400 animate-bounce" />
              Top 5 Khách hàng lớn nhất
            </h2>
            <p className="mt-1 text-xs text-gray-500">Xếp hạng theo tổng giá trị các đơn hàng đã đặt.</p>
          </div>
        </div>

        {data.topCustomers && data.topCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400">
                  <th className="py-3 pl-2 text-left text-xs font-bold uppercase tracking-wider">#</th>
                  <th className="py-3 text-left text-xs font-bold uppercase tracking-wider">Khách hàng</th>
                  <th className="py-3 text-center text-xs font-bold uppercase tracking-wider">Số đơn hàng</th>
                  <th className="py-3 pr-2 text-right text-xs font-bold uppercase tracking-wider">Tổng giá trị đơn</th>
                </tr>
              </thead>
              <tbody>
                {data.topCustomers.map((c, i) => (
                  <tr key={c.customerId} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 pl-2">
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        i === 0 ? "bg-amber-500/20 text-amber-300" : i === 1 ? "bg-gray-400/20 text-gray-300" : i === 2 ? "bg-orange-500/20 text-orange-300" : "bg-white/5 text-gray-500"
                      }`}>{i + 1}</span>
                    </td>
                    <td className="py-3 font-semibold text-gray-200">
                      <Link href={`/admin/don-hang?makh=${c.customerId}`} className="text-gray-200 transition-colors hover:text-orange-300">
                        {c.name}
                      </Link>
                    </td>
                    <td className="py-3 text-center text-gray-400">{c.totalOrders}</td>
                    <td className="py-3 pr-2 text-right font-mono font-bold text-emerald-400">{money(c.totalValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8">
            <DashboardEmptyState
              icon={Trophy}
              title="Chưa xếp hạng được khách hàng"
              description="Chưa có khách hàng nào đặt đơn hàng có giá trị."
            />
          </div>
        )}
      </section>
    </div>
  );
}
