"use client";

import { useState, useMemo, useEffect } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  ArrowRight,
  Calendar,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  ArrowUpDown,
  Pin,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import Link from "next/link";

export type WarningItem = {
  id: number;
  label: string;
  status: string;
  createdAt: string | null;
  severity: "critical" | "warning" | "info";
  actionHref: string;
  extraInfo?: string;
  category?: string;
};

export type WarningGroup = {
  count: number;
  items: WarningItem[];
};

export type WarningDashboardData = {
  unassignedOrders: WarningGroup;
  delayedOrders: WarningGroup;
  pendingProposals: WarningGroup;
  unresolvedIssues: WarningGroup;
  lowStockMaterials: WarningGroup;
  unpaidCompletedOrders: WarningGroup;
};

type WarningCenterProps = {
  data: WarningDashboardData | null;
  loading: boolean;
};

export function WarningCenter({ data, loading }: WarningCenterProps) {
  const [mounted, setMounted] = useState(false);
  const [layout, setLayout] = useState<"grouped" | "unified">("grouped");
  const [sortBy, setSortBy] = useState<"severity" | "newest" | "oldest">("severity");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [unifiedExpanded, setUnifiedExpanded] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      const saved = localStorage.getItem("minierp_pinned_warnings");
      if (saved) {
        try {
          setPinnedIds(JSON.parse(saved));
        } catch (e) {
          console.error(e);
        }
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const togglePin = (itemKey: string) => {
    setPinnedIds(prev => {
      const next = prev.includes(itemKey)
        ? prev.filter(id => id !== itemKey)
        : [...prev, itemKey];
      localStorage.setItem("minierp_pinned_warnings", JSON.stringify(next));
      return next;
    });
  };

  const {
    unassignedOrders = { count: 0, items: [] },
    delayedOrders = { count: 0, items: [] },
    pendingProposals = { count: 0, items: [] },
    unresolvedIssues = { count: 0, items: [] },
    lowStockMaterials = { count: 0, items: [] },
    unpaidCompletedOrders = { count: 0, items: [] },
  } = data || {};

  const totalCritical = unresolvedIssues.count + pendingProposals.count;
  const totalWarning = unassignedOrders.count + delayedOrders.count;
  const totalInfo = lowStockMaterials.count + unpaidCompletedOrders.count;
  const totalCount = totalCritical + totalWarning + totalInfo;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("vi-VN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const severityConfigs = {
    critical: {
      borderClass: "border-red-500/25 bg-red-500/[0.02] hover:border-red-500/40",
      textClass: "text-red-400",
      bgClass: "bg-red-500/10",
      icon: AlertOctagon,
      title: "Khẩn cấp",
      badgeClass: "bg-red-500/10 text-red-400 border-red-500/20",
    },
    warning: {
      borderClass: "border-orange-500/25 bg-orange-500/[0.02] hover:border-orange-500/40",
      textClass: "text-orange-400",
      bgClass: "bg-orange-500/10",
      icon: AlertTriangle,
      title: "Cảnh báo",
      badgeClass: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    },
    info: {
      borderClass: "border-yellow-500/25 bg-yellow-500/[0.02] hover:border-yellow-500/40",
      textClass: "text-yellow-400",
      bgClass: "bg-yellow-500/10",
      icon: Info,
      title: "Nhắc nhở",
      badgeClass: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    },
  };

  const warningSections = useMemo(() => [
    {
      key: "unresolvedIssues",
      title: "Sự cố gia công chưa xử lý",
      group: unresolvedIssues,
      severity: "critical" as const,
      actionLabel: "Xử lý sự cố",
    },
    {
      key: "pendingProposals",
      title: "Đề xuất cắt chờ duyệt",
      group: pendingProposals,
      severity: "critical" as const,
      actionLabel: "Duyệt đề xuất",
    },
    {
      key: "unassignedOrders",
      title: "Đơn hàng chưa phân công thợ",
      group: unassignedOrders,
      severity: "warning" as const,
      actionLabel: "Phân công ngay",
    },
    {
      key: "delayedOrders",
      title: "Đơn hàng chậm tiến độ",
      group: delayedOrders,
      severity: "warning" as const,
      actionLabel: "Kiểm tra đơn hàng",
    },
    {
      key: "lowStockMaterials",
      title: "Cảnh báo tồn kho phôi thấp",
      group: lowStockMaterials,
      severity: "info" as const,
      actionLabel: "Quản lý phôi",
    },
    {
      key: "unpaidCompletedOrders",
      title: "Công nợ hoàn thành chưa thu đủ",
      group: unpaidCompletedOrders,
      severity: "info" as const,
      actionLabel: "Thu nợ đơn hàng",
    },
  ], [unassignedOrders, delayedOrders, pendingProposals, unresolvedIssues, lowStockMaterials, unpaidCompletedOrders]);

  // Flattened items for unified view and pinning
  const allItems = useMemo(() => {
    const list: WarningItem[] = [];
    unresolvedIssues.items.forEach(i => list.push({ ...i, category: "Sự cố gia công chưa xử lý" }));
    pendingProposals.items.forEach(i => list.push({ ...i, category: "Đề xuất cắt chờ duyệt" }));
    unassignedOrders.items.forEach(i => list.push({ ...i, category: "Đơn hàng chưa phân công thợ" }));
    delayedOrders.items.forEach(i => list.push({ ...i, category: "Đơn hàng chậm tiến độ" }));
    lowStockMaterials.items.forEach(i => list.push({ ...i, category: "Cảnh báo tồn kho phôi thấp" }));
    unpaidCompletedOrders.items.forEach(i => list.push({ ...i, category: "Công nợ hoàn thành chưa thu đủ" }));
    return list;
  }, [unresolvedIssues.items, pendingProposals.items, unassignedOrders.items, delayedOrders.items, lowStockMaterials.items, unpaidCompletedOrders.items]);

  const sortedUnifiedItems = useMemo(() => {
    const items = [...allItems];
    if (sortBy === "severity") {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return items.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    }
    if (sortBy === "newest") {
      return items.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
    }
    if (sortBy === "oldest") {
      return items.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : Infinity;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : Infinity;
        return timeA - timeB;
      });
    }
    return items;
  }, [allItems, sortBy]);

  const visibleUnifiedItems = useMemo(() => {
    return unifiedExpanded ? sortedUnifiedItems : sortedUnifiedItems.slice(0, 9);
  }, [sortedUnifiedItems, unifiedExpanded]);

  // Pinned warnings list
  const pinnedItems = useMemo(() => {
    return allItems.filter(item => pinnedIds.includes(`${item.category}-${item.id}`));
  }, [allItems, pinnedIds]);

  // Chart data
  const pieData = useMemo(() => [
    { name: "Khẩn cấp", value: totalCritical, color: "#ef4444" },
    { name: "Cảnh báo", value: totalWarning, color: "#f97316" },
    { name: "Nhắc nhở", value: totalInfo, color: "#eab308" },
  ].filter(d => d.value > 0), [totalCritical, totalWarning, totalInfo]);

  const barData = useMemo(() => [
    { name: "Sự cố", count: unresolvedIssues.count, color: "#ef4444" },
    { name: "Đề xuất", count: pendingProposals.count, color: "#f87171" },
    { name: "Chưa phân công", count: unassignedOrders.count, color: "#f97316" },
    { name: "Chậm tiến độ", count: delayedOrders.count, color: "#fb923c" },
    { name: "Tồn kho thấp", count: lowStockMaterials.count, color: "#facc15" },
    { name: "Công nợ", count: unpaidCompletedOrders.count, color: "#fef08a" },
  ].filter(d => d.count > 0), [unassignedOrders.count, delayedOrders.count, pendingProposals.count, unresolvedIssues.count, lowStockMaterials.count, unpaidCompletedOrders.count]);

  const isAllCollapsed = useMemo(() => {
    return warningSections.every(sec => collapsedGroups[sec.key]);
  }, [collapsedGroups, warningSections]);

  const toggleAllGroups = () => {
    if (isAllCollapsed) {
      setCollapsedGroups({});
    } else {
      const next: Record<string, boolean> = {};
      warningSections.forEach(sec => {
        next[sec.key] = true;
      });
      setCollapsedGroups(next);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-6 space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-white/5 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 bg-white/5 rounded-xl" />
          <div className="h-32 bg-white/5 rounded-xl" />
          <div className="h-32 bg-white/5 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-white/10 pb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
            Trung tâm cảnh báo vận hành
            {totalCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-400 rounded-full animate-pulse">
                {totalCount} việc cần làm
              </span>
            )}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Tổng hợp các vấn đề phát sinh, tồn kho thấp, chậm tiến độ và công nợ cần xử lý ngay.
          </p>
        </div>
        <div className="flex gap-2">
          {totalCritical > 0 && (
            <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 uppercase tracking-wider">
              {totalCritical} Khẩn cấp
            </span>
          )}
          {totalWarning > 0 && (
            <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 uppercase tracking-wider">
              {totalWarning} Cảnh báo
            </span>
          )}
          {totalInfo > 0 && (
            <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 uppercase tracking-wider">
              {totalInfo} Nhắc nhở
            </span>
          )}
        </div>
      </div>

      {totalCount > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-b border-white/10 pb-6">
          {/* Donut Pie Chart */}
          <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4 flex flex-col items-center">
            <h4 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Phân tích mức độ khẩn cấp</h4>
            <div className="h-[200px] w-full flex items-center justify-center">
              {mounted ? (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#111827", borderColor: "#374151", borderRadius: 8 }}
                      itemStyle={{ color: "#f3f4f6" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full" />
              )}
            </div>
            <div className="flex gap-4 text-xs mt-2 justify-center">
              {pieData.map(d => (
                <span key={d.name} className="flex items-center gap-1.5 font-medium text-gray-300">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.name}: {d.value}
                </span>
              ))}
            </div>
          </div>

          {/* Category Bar Chart */}
          <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4 flex flex-col">
            <h4 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider text-center">Phân bố việc theo nhóm</h4>
            <div className="h-[200px] w-full">
              {mounted ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <XAxis type="number" stroke="#94a3b8" fontSize={10} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={95} />
                    <Tooltip
                      cursor={{ fill: "#ffffff08" }}
                      contentStyle={{ backgroundColor: "#111827", borderColor: "#374151", borderRadius: 8 }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={12}>
                      {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toolbar controls */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-white/[0.02] border border-white/5 p-3 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400">Giao diện:</span>
          <button
            onClick={() => setLayout("grouped")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              layout === "grouped"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/10"
                : "bg-white/5 hover:bg-white/10 text-gray-300"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Theo nhóm
          </button>
          <button
            onClick={() => setLayout("unified")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              layout === "unified"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/10"
                : "bg-white/5 hover:bg-white/10 text-gray-300"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            Danh sách liên tục
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-xs font-bold text-gray-400">Sắp xếp:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "severity" | "newest" | "oldest")}
              className="h-9 rounded-lg border border-white/10 bg-[#0a0a0c] px-3 text-xs font-semibold text-gray-200 outline-none hover:bg-white/5"
            >
              <option value="severity" className="bg-[#0a0a0c] text-gray-100">Độ khẩn cấp (Giảm dần)</option>
              <option value="newest" className="bg-[#0a0a0c] text-gray-100">Thời gian (Mới nhất)</option>
              <option value="oldest" className="bg-[#0a0a0c] text-gray-100">Thời gian (Cũ nhất)</option>
            </select>
          </div>

          {layout === "grouped" && (
            <button
              onClick={toggleAllGroups}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 transition-all active:scale-95"
            >
              {isAllCollapsed ? (
                <>
                  <Maximize2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Mở rộng hết
                </>
              ) : (
                <>
                  <Minimize2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Ẩn bớt hết
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Pinned Warnings Section */}
      {pinnedItems.length > 0 && (
        <div className="border border-blue-500/20 rounded-xl p-4 bg-blue-950/[0.04] space-y-3">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
            <Pin className="h-3.5 w-3.5 fill-current rotate-45" />
            Cảnh báo đã ghim ({pinnedItems.length})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedItems.map((item) => {
              const cfg = severityConfigs[item.severity];
              const IconComp = cfg.icon;
              const key = `${item.category}-${item.id}`;
              return (
                <div
                  key={`pinned-${key}`}
                  className={`flex flex-col justify-between p-4 rounded-xl border relative transition-all duration-300 ${cfg.borderClass} border-blue-500/30 bg-blue-950/[0.08] shadow-md shadow-blue-500/[0.02]`}
                >
                  {/* Unpin button */}
                  <button
                    onClick={() => togglePin(key)}
                    className="absolute top-3 right-3 text-blue-400 hover:text-gray-300 transition-colors"
                    title="Bỏ ghim"
                  >
                    <Pin className="h-4 w-4 fill-current rotate-45" />
                  </button>

                  <div>
                    <div className="flex items-start justify-between gap-2 pr-6">
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded ${cfg.bgClass} ${cfg.textClass}`}>
                          <IconComp className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-bold text-gray-300 truncate max-w-[120px]">
                          {item.label}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${cfg.badgeClass}`}>
                        {item.status}
                      </span>
                    </div>

                    <p className="text-[10px] text-blue-400 font-semibold mt-1">
                      Nhóm: {item.category}
                    </p>

                    {item.extraInfo && (
                      <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                        {item.extraInfo}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                      {item.createdAt && (
                        <>
                          <Calendar className="h-3 w-3" />
                          {formatDate(item.createdAt)}
                        </>
                      )}
                    </span>

                    <Link
                      href={item.actionHref}
                      className={`inline-flex items-center text-xs font-semibold hover:underline gap-1 ${cfg.textClass}`}
                    >
                      Xử lý nhanh
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-emerald-500/20 rounded-xl bg-emerald-500/[0.01]">
          <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400 mb-3">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-emerald-300">Hệ thống an toàn</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm">
            Không ghi nhận bất kỳ sự cố sản xuất, đề xuất chờ duyệt, chậm tiến độ hay tồn kho phôi thấp nào.
          </p>
        </div>
      ) : layout === "grouped" ? (
        <div className="space-y-6 animate-fadeIn">
          {warningSections
            .filter((sec) => sec.group.count > 0)
            .map((sec) => {
              const cfg = severityConfigs[sec.severity];
              const IconComp = cfg.icon;
              const isCollapsed = collapsedGroups[sec.key] || false;
              const isExpanded = expandedCategories[sec.key] || false;
              const visibleItems = isExpanded ? sec.group.items : sec.group.items.slice(0, 4);

              return (
                <div key={sec.key} className="border border-white/5 rounded-xl p-4 bg-[#050507]">
                  {/* Category Header */}
                  <div
                    onClick={() => setCollapsedGroups(prev => ({ ...prev, [sec.key]: !prev[sec.key] }))}
                    className="flex items-center justify-between cursor-pointer group/header pb-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${cfg.bgClass} ${cfg.textClass}`}>
                        <IconComp className="h-4 w-4" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-200 group-hover/header:text-white transition-colors">
                        {sec.title}
                      </h3>
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-white/5 border border-white/10 text-gray-400">
                        {sec.group.count}
                      </span>
                    </div>
                    <div className="text-gray-500 group-hover/header:text-gray-300 transition-colors">
                      {isCollapsed ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronUp className="h-4 w-4" />
                      )}
                    </div>
                  </div>

                  {/* Category Content */}
                  {!isCollapsed && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-slideDown">
                      {visibleItems.map((item) => {
                        const itemKey = `${sec.title}-${item.id}`;
                        const isPinned = pinnedIds.includes(itemKey);
                        return (
                          <div
                            key={item.id}
                            className={`flex flex-col justify-between p-4 rounded-xl border relative transition-all duration-300 ${cfg.borderClass} ${
                              isPinned ? "border-blue-500/30 bg-blue-950/[0.03]" : ""
                            }`}
                          >
                            {/* Pin Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePin(itemKey);
                              }}
                              className={`absolute top-3 right-3 transition-colors ${
                                isPinned ? "text-blue-400 hover:text-blue-300" : "text-gray-600 hover:text-blue-400"
                              }`}
                              title={isPinned ? "Bỏ ghim" : "Ghim lên đầu"}
                            >
                              <Pin className={`h-3.5 w-3.5 ${isPinned ? "fill-current rotate-45" : "rotate-0"}`} />
                            </button>

                            <div className="pr-6">
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-xs font-bold text-gray-300">
                                  {item.label}
                                </span>
                                <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${cfg.badgeClass}`}>
                                  {item.status}
                                </span>
                              </div>

                              {item.extraInfo && (
                                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                                  {item.extraInfo}
                                </p>
                              )}
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                              <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                {item.createdAt && (
                                  <>
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(item.createdAt)}
                                  </>
                                )}
                              </span>

                              <Link
                                href={item.actionHref}
                                className={`inline-flex items-center text-xs font-semibold hover:underline gap-1 ${cfg.textClass}`}
                              >
                                {sec.actionLabel}
                                <ArrowRight className="h-3.5 w-3.5" />
                              </Link>
                            </div>
                          </div>
                        );
                      })}

                      {/* Expand / Collapse items inside category */}
                      {sec.group.items.length > 4 && (
                        <div className="col-span-1 md:col-span-2 flex justify-center pt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedCategories(prev => ({ ...prev, [sec.key]: !prev[sec.key] }));
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold transition-all active:scale-95 ${cfg.textClass}`}
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-3.5 w-3.5" />
                                Thu gọn bớt
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3.5 w-3.5" />
                                Bật rộng ra (Xem thêm {sec.group.items.length - 4} mục)
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ) : (
        /* Unified continuous list view */
        <div className="space-y-4 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleUnifiedItems.map((item) => {
              const cfg = severityConfigs[item.severity];
              const IconComp = cfg.icon;
              const itemKey = `${item.category}-${item.id}`;
              const isPinned = pinnedIds.includes(itemKey);
              return (
                <div
                  key={`${item.severity}-${item.id}`}
                  className={`flex flex-col justify-between p-4 rounded-xl border relative transition-all duration-300 ${cfg.borderClass} ${
                    isPinned ? "border-blue-500/30 bg-blue-950/[0.03]" : ""
                  }`}
                >
                  {/* Pin Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePin(itemKey);
                    }}
                    className={`absolute top-3 right-3 transition-colors ${
                      isPinned ? "text-blue-400 hover:text-blue-300" : "text-gray-600 hover:text-blue-400"
                    }`}
                    title={isPinned ? "Bỏ ghim" : "Ghim lên đầu"}
                  >
                    <Pin className={`h-3.5 w-3.5 ${isPinned ? "fill-current rotate-45" : "rotate-0"}`} />
                  </button>

                  <div className="pr-6">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded ${cfg.bgClass} ${cfg.textClass}`}>
                          <IconComp className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-bold text-gray-300 truncate max-w-[120px]">
                          {item.label}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${cfg.badgeClass}`}>
                        {item.status}
                      </span>
                    </div>

                    <p className="text-[10px] text-blue-400 font-semibold mt-1">
                      Nhóm: {item.category}
                    </p>

                    {item.extraInfo && (
                      <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                        {item.extraInfo}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                      {item.createdAt && (
                        <>
                          <Calendar className="h-3 w-3" />
                          {formatDate(item.createdAt)}
                        </>
                      )}
                    </span>

                    <Link
                      href={item.actionHref}
                      className={`inline-flex items-center text-xs font-semibold hover:underline gap-1 ${cfg.textClass}`}
                    >
                      Xử lý nhanh
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Unified list expand/collapse control */}
          {sortedUnifiedItems.length > 9 && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setUnifiedExpanded(!unifiedExpanded)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 transition-all active:scale-95"
              >
                {unifiedExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Ẩn bớt bớt
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Bật rộng ra (Xem thêm {sortedUnifiedItems.length - 9} việc khác)
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
