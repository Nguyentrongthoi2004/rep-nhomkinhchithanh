"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Boxes, RefreshCw, AlertCircle, Gauge, Ruler } from "lucide-react";
import { DashboardMetricCard } from "./DashboardMetricCard";
import { DashboardEmptyState } from "./DashboardEmptyState";
import Link from "next/link";

type InventoryTabProps = {
  data: {
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
  } | null;
  loading: boolean;
};

const STATUS_COLORS = ["#38bdf8", "#34d399", "#fb7185"];

export function InventoryTab({ data, loading }: InventoryTabProps) {
  const pieData = useMemo(() => {
    return (data?.statusAllocation ?? []).filter((item) => item.value > 0);
  }, [data?.statusAllocation]);

  const totalStock = useMemo(() => {
    return (data?.statusAllocation ?? []).reduce((sum, item) => sum + item.value, 0);
  }, [data?.statusAllocation]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl border border-white/10 bg-[#0a0a0c]" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="h-[360px] rounded-2xl border border-white/10 bg-[#0a0a0c]" />
          <div className="h-[360px] rounded-2xl border border-white/10 bg-[#0a0a0c]" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-12">
        <DashboardEmptyState
          icon={Boxes}
          title="Không có dữ liệu kho"
          description="Không thể tải hoặc tìm thấy thông tin tồn kho phôi."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          title="Phôi khả dụng"
          value={`${data.totalAvailable} thanh`}
          hint="Phôi mới và phôi dư có thể tái sử dụng."
          icon={Boxes}
          tone="sky"
          href="/admin/kho-phoi"
        />
        <DashboardMetricCard
          title="Phôi dư tái dùng"
          value={`${data.usageAndWasteSummary.reusableMeters} m`}
          hint="Tổng chiều dài phôi dư còn có thể cắt."
          icon={RefreshCw}
          tone="emerald"
          href="/admin/kho-phoi?trangthai=CON_DU"
        />
        <DashboardMetricCard
          title="Phôi bỏ đi"
          value={`${data.usageAndWasteSummary.wasteMeters} m`}
          hint="Chiều dài phôi vụn hoặc lỗi đã loại."
          icon={AlertCircle}
          tone="red"
          href="/admin/su-co"
        />
        <DashboardMetricCard
          title="Tổng thanh ghi nhận"
          value={`${data.usageAndWasteSummary.totalStockUsed} thanh`}
          hint="Tổng thanh nhôm vật lý từng ghi nhận."
          icon={Gauge}
          tone="violet"
          href="/admin/kho-phoi"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-100">Sức khỏe kho phôi</h2>
              <p className="mt-1 text-xs text-gray-500">Tỷ trọng phôi mới, phôi dư và phôi bỏ đi.</p>
            </div>
            <Ruler className="h-5 w-5 text-cyan-300" />
          </div>

          {pieData.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-[220px_1fr] md:items-center">
              <div className="relative h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} innerRadius={62} outerRadius={88} paddingAngle={3} dataKey="value">
                      {pieData.map((_, index) => (
                        <Cell key={`inventory-cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#111827", borderColor: "#374151", borderRadius: 12 }}
                      itemStyle={{ color: "#f3f4f6" }}
                      formatter={(value) => `${value} thanh`}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <div className="font-mono text-2xl font-black text-white">{totalStock}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Tổng phôi</div>
                </div>
              </div>

              <div className="space-y-4">
                {pieData.map((item, index) => {
                  const pct = totalStock > 0 ? Math.round((item.value / totalStock) * 100) : 0;
                  return (
                    <div key={item.name}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 font-semibold text-gray-300">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[index % STATUS_COLORS.length] }} />
                          {item.name}
                        </span>
                        <span className="font-mono font-bold text-gray-100">{item.value} thanh</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[index % STATUS_COLORS.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <DashboardEmptyState icon={Boxes} title="Kho phôi trống" description="Chưa có thanh phôi nào trong hệ thống." />
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-100">Vật tư tiêu thụ nhiều</h2>
              <p className="mt-1 text-xs text-gray-500">Top vật tư theo số lần cắt trong kỳ lọc.</p>
            </div>
            <Link href="/admin/kho-phoi" className="text-xs font-bold text-sky-300 hover:text-sky-200">
              Mở kho phôi
            </Link>
          </div>

          {data.topConsumedMaterials.length > 0 ? (
            <div className="space-y-3">
              {data.topConsumedMaterials.map((item, index) => {
                const max = Math.max(...data.topConsumedMaterials.map((row) => row.cutCount), 1);
                const pct = Math.max(8, Math.round((item.cutCount / max) * 100));
                return (
                  <Link
                    key={item.mavt}
                    href={`/admin/kho-phoi?mavt=${item.mavt}`}
                    className="block rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-colors hover:border-cyan-500/25 hover:bg-cyan-500/5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-xs font-black text-cyan-300">
                            {index + 1}
                          </span>
                          <span className="truncate text-sm font-bold text-gray-200">{item.name}</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-cyan-400" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-mono text-lg font-black text-white">{item.cutCount}</div>
                        <div className="text-[10px] text-gray-500">lần cắt</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <DashboardEmptyState
              icon={Boxes}
              title="Chưa có dữ liệu tiêu thụ"
              description="Không ghi nhận hoạt động cắt nhôm nào trong khoảng thời gian này."
            />
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-100">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Cảnh báo tồn thấp
            </h2>
            <p className="mt-1 text-xs text-gray-500">Mã vật tư có số lượng phôi mới dưới 10 thanh.</p>
          </div>
        </div>

        {data.lowStockWarnings.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.lowStockWarnings.map((warning) => {
              const isCritical = warning.count < 5;
              return (
                <Link
                  key={warning.mavt}
                  href={`/admin/kho-phoi?mavt=${warning.mavt}`}
                  className={`rounded-xl border p-4 transition-colors ${
                    isCritical
                      ? "border-red-500/20 bg-red-500/5 hover:bg-red-500/10"
                      : "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-gray-100">{warning.tenvt}</div>
                      <div className="mt-1 text-[11px] text-gray-500">VT-{warning.mavt} · {warning.donvitinh}</div>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${
                      isCritical
                        ? "border-red-500/20 bg-red-500/10 text-red-300"
                        : "border-amber-500/20 bg-amber-500/10 text-amber-300"
                    }`}>
                      {warning.count} thanh
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <DashboardEmptyState
            icon={Boxes}
            title="Tồn kho an toàn"
            description="Tất cả mã vật tư đều có lượng phôi mới trên ngưỡng cảnh báo."
          />
        )}
      </section>
    </div>
  );
}
