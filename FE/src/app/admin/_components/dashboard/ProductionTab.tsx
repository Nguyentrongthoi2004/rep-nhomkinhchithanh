"use client";

import { useMemo } from "react";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList } from "recharts";
import { Scissors, AlertTriangle, Clock, Users, UserMinus } from "lucide-react";
import { DashboardMetricCard } from "./DashboardMetricCard";
import { DashboardChartContainer } from "./DashboardChartContainer";
import { DashboardEmptyState } from "./DashboardEmptyState";
import Link from "next/link";

type ProductionTabProps = {
  data: {
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
  } | null;
  loading: boolean;
};

export function ProductionTab({ data, loading }: ProductionTabProps) {
  const workerRows = useMemo(() => {
    return (data?.workerProgress ?? [])
      .map((worker) => {
        const total = worker.done + worker.active + worker.pending + worker.rejected;
        return {
          ...worker,
          total,
          completionRate: total > 0 ? Math.round((worker.done / total) * 100) : 0,
        };
      })
      .sort((a, b) => b.total - a.total || b.completionRate - a.completionRate);
  }, [data?.workerProgress]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl border border-white/10 bg-[#0a0a0c]" />
          ))}
        </div>
        <div className="h-[420px] rounded-2xl border border-white/10 bg-[#0a0a0c]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-12">
        <DashboardEmptyState
          icon={Scissors}
          title="Không có dữ liệu sản xuất"
          description="Không thể tải hoặc tìm thấy thông tin tiến độ sản xuất."
        />
      </div>
    );
  }

  const overloadedHref = data.overloadedWorkers.length === 1
    ? `/admin/phan-cong?matho=${data.overloadedWorkers[0].workerId}`
    : "/admin/phan-cong";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          title="Đơn đang gia công"
          value={data.productionOrders}
          hint="Số đơn hàng đang sản xuất hoặc lắp đặt."
          icon={Scissors}
          tone="violet"
          href="/admin/don-hang?trangthai=DANG_GIA_CONG"
        />
        <DashboardMetricCard
          title="Thợ quá tải"
          value={data.overloadedWorkers.length}
          hint="Thợ có từ 2 phân công đang làm trở lên."
          icon={UserMinus}
          tone="amber"
          href={overloadedHref}
        />
        <DashboardMetricCard
          title="Đơn chậm tiến độ"
          value={data.delayedOrders.length}
          hint="Đơn đang gia công kéo dài trên 7 ngày."
          icon={Clock}
          tone="red"
          href="/admin/don-hang?trangthai=DANG_GIA_CONG"
        />
        <DashboardMetricCard
          title="Sự cố chưa xử lý"
          value={data.unresolvedIssuesCount}
          hint="Sự cố thợ báo về đang chờ giải quyết."
          icon={AlertTriangle}
          tone={data.unresolvedIssuesCount > 0 ? "red" : "emerald"}
          href="/admin/su-co"
        />
      </div>

      {(data.overloadedWorkers.length > 0 || data.delayedOrders.length > 0) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data.overloadedWorkers.length > 0 && (
            <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Cần cân bằng tải thợ
              </h3>
              <div className="mt-4 space-y-2">
                {data.overloadedWorkers.map((worker) => (
                  <Link
                    key={worker.workerId}
                    href={`/admin/phan-cong?matho=${worker.workerId}`}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-[#0a0a0c]/40 px-3 py-2 transition-colors hover:border-amber-500/30 hover:bg-amber-500/10"
                  >
                    <span className="text-xs font-semibold text-gray-300">{worker.name}</span>
                    <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-300">
                      {worker.activeCount} việc đang làm
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {data.delayedOrders.length > 0 && (
            <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-red-200">
                <Clock className="h-4 w-4 text-red-400" />
                Đơn gia công trễ
              </h3>
              <div className="mt-4 space-y-2">
                {data.delayedOrders.slice(0, 5).map((order) => (
                  <Link
                    key={order.madh}
                    href={`/admin/don-hang?trangthai=${order.trangthai}`}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-[#0a0a0c]/40 px-3 py-2 transition-colors hover:border-red-500/30 hover:bg-red-500/10"
                  >
                    <span className="text-xs font-bold text-gray-300">DH-{order.madh}</span>
                    <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-xs font-bold text-red-300">
                      {order.elapsedDays} ngày
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <DashboardChartContainer
        title="Tiến độ thợ theo phân công"
        description="Bấm vào từng thợ để mở trang phân công đã lọc theo người đó."
        heightClass="min-h-[380px]"
        rightAction={<span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-gray-400">{workerRows.length} thợ</span>}
      >
        {workerRows.length > 0 ? (
          <div className="grid min-h-[360px] gap-6 xl:grid-cols-[0.9fr_1.4fr]">
            <div className="space-y-2 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Xếp hạng tải việc</div>
                <div className="text-[11px] text-gray-500">Xong / Tổng</div>
              </div>
              {workerRows.slice(0, 7).map((worker, index) => (
                <Link
                  key={worker.workerId}
                  href={`/admin/phan-cong?matho=${worker.workerId}`}
                  className="block rounded-xl border border-white/5 bg-[#050507] p-3 transition-colors hover:border-sky-500/30 hover:bg-sky-500/5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 text-[11px] font-black text-gray-400">
                          {index + 1}
                        </span>
                        <span className="truncate text-sm font-bold text-gray-200">{worker.workerName}</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${worker.completionRate}%` }} />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-sm font-black text-white">{worker.done}/{worker.total}</div>
                      <div className="text-[10px] font-semibold text-emerald-300">{worker.completionRate}%</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="min-w-0 rounded-2xl border border-white/5 bg-[#050507] p-4">
              <ResponsiveContainer width="100%" height={330}>
                <BarChart data={workerRows} layout="vertical" margin={{ top: 5, right: 38, left: 8, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <YAxis dataKey="workerName" type="category" stroke="#94a3b8" fontSize={11} width={118} />
                  <Tooltip
                    cursor={{ fill: "#ffffff06" }}
                    contentStyle={{ backgroundColor: "#111827", borderColor: "#374151", borderRadius: 12 }}
                    itemStyle={{ color: "#f3f4f6" }}
                    labelStyle={{ color: "#9ca3af", fontWeight: "bold" }}
                  />
                  <Bar dataKey="done" name="Hoàn thành" stackId="a" fill="#10b981" radius={[5, 0, 0, 5]} barSize={18} />
                  <Bar dataKey="active" name="Đang làm" stackId="a" fill="#38bdf8" />
                  <Bar dataKey="pending" name="Chờ làm" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="rejected" name="Từ chối" stackId="a" fill="#ef4444" radius={[0, 5, 5, 0]}>
                    <LabelList dataKey="total" position="right" fill="#cbd5e1" fontSize={11} offset={8} />
                  </Bar>
                  <Legend iconType="circle" iconSize={8} formatter={(value) => <span className="text-xs text-gray-400">{value}</span>} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <DashboardEmptyState
            icon={Users}
            title="Chưa có thợ được phân công"
            description="Hiện chưa có thợ nào nhận phân công gia công trong hệ thống."
          />
        )}
      </DashboardChartContainer>

      <section className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-100">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Sự cố phôi đang mở
            </h2>
            <p className="mt-1 text-xs text-gray-500">Danh sách lỗi phôi chưa được xử lý tại xưởng.</p>
          </div>
        </div>

        {data.unresolvedIssues.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-gray-400">
                  <th className="py-3 pl-2 text-left text-xs font-bold uppercase tracking-wider">Mã phôi</th>
                  <th className="py-3 text-left text-xs font-bold uppercase tracking-wider">Người báo</th>
                  <th className="py-3 text-left text-xs font-bold uppercase tracking-wider">Khách hàng</th>
                  <th className="py-3 text-left text-xs font-bold uppercase tracking-wider">Ghi chú</th>
                  <th className="py-3 pr-2 text-right text-xs font-bold uppercase tracking-wider">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {data.unresolvedIssues.map((issue) => (
                  <tr key={issue.mank} className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
                    <td className="py-3 pl-2 font-mono font-bold text-red-400">#{issue.maphoi}</td>
                    <td className="py-3 font-semibold text-gray-300">{issue.workerName}</td>
                    <td className="py-3 text-gray-400">{issue.customerName}</td>
                    <td className="max-w-xs truncate py-3 text-gray-400" title={issue.ghichu || ""}>{issue.ghichu || "Không ghi chú"}</td>
                    <td className="py-3 pr-2 text-right">
                      <Link href="/admin/su-co" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400 transition-colors hover:bg-red-500/20">
                        Xử lý
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <DashboardEmptyState
            icon={AlertTriangle}
            title="Không có sự cố cần xử lý"
            description="Không có báo cáo lỗi phôi nào đang mở."
          />
        )}
      </section>
    </div>
  );
}
