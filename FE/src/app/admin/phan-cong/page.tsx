"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BriefcaseBusiness,
  ClipboardList,
  Eye,
  Filter,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { apiJson } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { formatOrderStatus } from "@/lib/order-status";
import { InlineNotice, type NoticeState } from "@/components/admin/Feedback";

type TabId = "orders" | "workers" | "assignments";
type AssignmentStatus = "ALL" | "CHO_THUC_HIEN" | "DANG_THUC_HIEN" | "HOAN_THANH" | "TU_CHOI";
type QueueFilter = "ALL" | "UNASSIGNED" | "ASSIGNED" | "READY";
type WorkerLoadFilter = "ALL" | "AVAILABLE" | "BUSY";

interface Worker {
  mand: number;
  hoten: string;
  sdt: string | null;
  tendangnhap?: string | null;
}

interface OrderItem {
  mactdh: number;
  mota: string | null;
  chieudaicat: number | null;
  soluong: number;
  vattu: { tenvt: string; donvitinh: string } | null;
}

interface Order {
  madh: number;
  ngaytao: string;
  trangthai: string;
  tonggiatri: number;
  khachhang: { hoten: string; sdt: string | null } | null;
  chitietdh: OrderItem[];
}

interface Assignment {
  mapc: number;
  madh: number;
  matho: number;
  trangthai: string;
  lydotuchoi: string | null;
  tuchoiluc: string | null;
  donhang: {
    madh: number;
    ngaytao: string;
    trangthai: string;
    tonggiatri: number;
    khachhang: { hoten: string; sdt?: string | null } | null;
    chitietdh?: OrderItem[];
  } | null;
  nguoidung: { mand?: number; hoten: string; sdt: string | null; tendangnhap?: string | null } | null;
}

const STATUS_META: Record<string, { label: string; chip: string; dot: string }> = {
  CHO_THUC_HIEN: { label: "Chờ nhận", chip: "border-slate-500/25 bg-slate-500/10 text-slate-300", dot: "bg-slate-400" },
  DANG_THUC_HIEN: { label: "Đang làm", chip: "border-sky-500/25 bg-sky-500/10 text-sky-300", dot: "bg-sky-400" },
  HOAN_THANH: { label: "Đã xong", chip: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300", dot: "bg-emerald-400" },
  TU_CHOI: { label: "Từ chối", chip: "border-red-500/25 bg-red-500/10 text-red-300", dot: "bg-red-400" },
};

const TABS: Array<{ id: TabId; label: string; icon: typeof Package }> = [
  { id: "orders", label: "Hàng chờ đơn", icon: Package },
  { id: "workers", label: "Tải thợ", icon: Users },
  { id: "assignments", label: "Phân công", icon: ClipboardList },
];

const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value || 0);

function isOpenAssignment(status: string) {
  return status === "CHO_THUC_HIEN" || status === "DANG_THUC_HIEN";
}

function statusMeta(status: string) {
  return STATUS_META[status] ?? STATUS_META.CHO_THUC_HIEN;
}

function orderSearchText(order: Order) {
  return [
    `DH-${order.madh}`,
    order.khachhang?.hoten ?? "",
    order.khachhang?.sdt ?? "",
    formatOrderStatus(order.trangthai),
    order.chitietdh.map((item) => `${item.mota ?? ""} ${item.vattu?.tenvt ?? ""}`).join(" "),
  ].join(" ").toLowerCase();
}

function assignmentSearchText(assignment: Assignment) {
  return [
    `PC-${assignment.mapc}`,
    `DH-${assignment.madh}`,
    assignment.donhang?.khachhang?.hoten ?? "",
    assignment.donhang?.khachhang?.sdt ?? "",
    assignment.nguoidung?.hoten ?? "",
    assignment.nguoidung?.sdt ?? "",
    statusMeta(assignment.trangthai).label,
    assignment.lydotuchoi ?? "",
  ].join(" ").toLowerCase();
}

export default function AdminPhanCongPage() {
  const supabase = useMemo(() => createClient(), []);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("orders");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState("");
  const [selectedOrder, setSelectedOrder] = useState("");
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AssignmentStatus>("ALL");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("ALL");
  const [workerFilter, setWorkerFilter] = useState("ALL");
  const [workerLoadFilter, setWorkerLoadFilter] = useState<WorkerLoadFilter>("ALL");
  const [showFilters, setShowFilters] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [workersRes, ordersRes, assignmentsRes] = await Promise.all([
        supabase
          .from("nguoidung")
          .select("mand, hoten, sdt, tendangnhap")
          .eq("vaitro", "WORKER")
          .eq("trangthai", "DANG_LAM")
          .order("hoten"),
        supabase
          .from("donhang")
          .select(`
            madh, ngaytao, trangthai, tonggiatri,
            khachhang:makh(hoten, sdt),
            chitietdh(mactdh, mota, chieudaicat, soluong, vattu:mavt(tenvt, donvitinh))
          `)
          .not("trangthai", "in", '("HOAN_THANH","DA_HUY")')
          .order("madh", { ascending: false }),
        supabase
          .from("phancong")
          .select(`
            mapc, madh, matho, trangthai, lydotuchoi, tuchoiluc,
            donhang:madh(
              madh, ngaytao, trangthai, tonggiatri,
              khachhang:makh(hoten, sdt),
              chitietdh(mactdh, mota, chieudaicat, soluong, vattu:mavt(tenvt, donvitinh))
            ),
            nguoidung:matho(mand, hoten, sdt, tendangnhap)
          `)
          .order("mapc", { ascending: false }),
      ]);

      if (workersRes.error) throw workersRes.error;
      if (ordersRes.error) throw ordersRes.error;
      if (assignmentsRes.error) throw assignmentsRes.error;

      setWorkers((workersRes.data ?? []) as Worker[]);
      setOrders(
        ((ordersRes.data ?? []) as unknown as Order[]).filter(
          (order) => !["KHAO_SAT", "BAO_GIA_NHAP"].includes(order.trangthai),
        ),
      );
      setAssignments((assignmentsRes.data ?? []) as unknown as Assignment[]);
    } catch (error: unknown) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const matho = params.get("matho");
    if (matho && Number.isFinite(Number(matho))) {
      setWorkerFilter(matho);
      setActiveTab("assignments");
    }
  }, []);

  const assignmentsByOrder = useMemo(() => {
    const map = new Map<number, Assignment[]>();
    for (const assignment of assignments) {
      const next = map.get(assignment.madh) ?? [];
      next.push(assignment);
      map.set(assignment.madh, next);
    }
    return map;
  }, [assignments]);

  const workerStats = useMemo(
    () =>
      workers.map((worker) => {
        const workerAssignments = assignments.filter((assignment) => assignment.matho === worker.mand);
        const active = workerAssignments.filter((assignment) => isOpenAssignment(assignment.trangthai));
        const done = workerAssignments.filter((assignment) => assignment.trangthai === "HOAN_THANH");
        return { worker, assignments: workerAssignments, active, done, isBusy: active.length > 0 };
      }),
    [assignments, workers],
  );

  const filteredWorkerStats = useMemo(
    () =>
      workerStats.filter((item) => {
        if (workerLoadFilter === "AVAILABLE") return !item.isBusy;
        if (workerLoadFilter === "BUSY") return item.isBusy;
        return true;
      }),
    [workerLoadFilter, workerStats],
  );

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((order) => {
      const openCount = (assignmentsByOrder.get(order.madh) ?? []).filter((assignment) => isOpenAssignment(assignment.trangthai)).length;
      const matchesQueue =
        queueFilter === "ALL" ||
        (queueFilter === "UNASSIGNED" && openCount === 0) ||
        (queueFilter === "ASSIGNED" && openCount > 0) ||
        (queueFilter === "READY" && ["DA_DUYET_GIA", "DA_COC", "DA_THANH_TOAN", "DANG_GIA_CONG"].includes(order.trangthai));
      return matchesQueue && (!q || orderSearchText(order).includes(q));
    });
  }, [assignmentsByOrder, orders, query, queueFilter]);

  const filteredAssignments = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assignments.filter((assignment) => {
      const matchesStatus = statusFilter === "ALL" || assignment.trangthai === statusFilter;
      const matchesWorker = workerFilter === "ALL" || assignment.matho === Number(workerFilter);
      return matchesStatus && matchesWorker && (!q || assignmentSearchText(assignment).includes(q));
    });
  }, [assignments, query, statusFilter, workerFilter]);

  const stats = useMemo(() => {
    const openAssignments = assignments.filter((assignment) => isOpenAssignment(assignment.trangthai));
    return {
      readyOrders: orders.length,
      unassignedOrders: orders.filter((order) => !(assignmentsByOrder.get(order.madh) ?? []).some((assignment) => isOpenAssignment(assignment.trangthai))).length,
      activeAssignments: openAssignments.length,
      availableWorkers: workerStats.filter((item) => !item.isBusy).length,
    };
  }, [assignments, assignmentsByOrder, orders, workerStats]);

  const resetFilters = () => {
    setQuery("");
    setStatusFilter("ALL");
    setQueueFilter("ALL");
    setWorkerFilter("ALL");
    setWorkerLoadFilter("ALL");
  };

  const openNewAssignment = (orderId?: number, workerId?: number) => {
    setSelectedOrder(orderId ? String(orderId) : "");
    setSelectedWorker(workerId ? String(workerId) : "");
    setNotice(null);
    setShowModal(true);
  };

  const handleAssign = async () => {
    if (!selectedOrder || !selectedWorker) {
      setNotice({ tone: "error", text: "Vui lòng chọn cả đơn hàng và thợ." });
      return;
    }

    const duplicate = assignments.some(
      (assignment) =>
        assignment.madh === Number(selectedOrder) &&
        assignment.matho === Number(selectedWorker) &&
        isOpenAssignment(assignment.trangthai),
    );
    if (duplicate) {
      setNotice({ tone: "error", text: "Thợ này đang có phân công mở trên đơn hàng đã chọn." });
      return;
    }

    setSaving(true);
    try {
      await apiJson("/api/admin/assignments", {
        method: "POST",
        body: JSON.stringify({ madh: Number(selectedOrder), matho: Number(selectedWorker) }),
      });
      setShowModal(false);
      setSelectedOrder("");
      setSelectedWorker("");
      setNotice({ tone: "ok", text: "Đã tạo phân công mới." });
      await load();
      setActiveTab("assignments");
    } catch (error: unknown) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : String(error) });
    } finally {
      setSaving(false);
    }
  };

  const startAssignment = async (mapc: number) => {
    try {
      await apiJson(`/api/admin/assignments/${mapc}`, {
        method: "PATCH",
        body: JSON.stringify({ trangthai: "DANG_THUC_HIEN" }),
      });
      setNotice({ tone: "ok", text: `Đã chuyển PC-${mapc} sang đang làm.` });
      await load();
    } catch (error: unknown) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <section className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="flex items-center text-2xl font-bold text-gray-100">
              <ClipboardList className="mr-3 h-6 w-6 text-emerald-400" />
              Điều phối giao việc thợ
            </h1>
            <p className="mt-1 text-sm text-gray-400">Theo dõi đơn cần giao, tải thợ và tiến độ phân công trong xưởng.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-gray-200 hover:bg-white/10"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Cập nhật
            </button>
            <button
              type="button"
              onClick={() => openNewAssignment()}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Giao việc mới
            </button>
          </div>
        </div>
      </section>

      <InlineNotice notice={notice} onClose={() => setNotice(null)} />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard icon={Package} label="Đơn sẵn sàng" value={stats.readyOrders} tone="sky" />
        <KpiCard icon={AlertCircle} label="Chưa phân công" value={stats.unassignedOrders} tone="amber" />
        <KpiCard icon={BriefcaseBusiness} label="Việc đang mở" value={stats.activeAssignments} tone="violet" />
        <KpiCard icon={UserCheck} label="Thợ còn trống" value={stats.availableWorkers} tone="emerald" />
      </section>

      <section className="rounded-2xl border border-white/5 bg-[#0a0a0c]">
        <div className="flex flex-col gap-4 border-b border-white/10 p-4">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex h-12 items-center justify-center rounded-xl border text-sm font-bold transition-colors ${
                    active
                      ? "border-emerald-500/35 bg-emerald-500/15 text-emerald-100"
                      : "border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.06] hover:text-gray-200"
                  }`}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm DH, PC, khách hàng, SĐT, thợ, vật tư..."
                className="h-11 w-full rounded-xl border border-white/10 bg-black/30 pl-10 pr-4 text-sm text-gray-100 outline-none focus:border-emerald-400"
              />
            </label>
            <button
              type="button"
              onClick={() => setShowFilters((value) => !value)}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-gray-200 hover:bg-white/10"
            >
              <Filter className="mr-2 h-4 w-4" />
              Bộ lọc
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-gray-200 hover:bg-white/10"
            >
              <X className="mr-2 h-4 w-4" />
              Xóa lọc
            </button>
          </div>

          {showFilters ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <FilterSelect label="Hàng chờ đơn" value={queueFilter} onChange={(value) => setQueueFilter(value as QueueFilter)}>
                <option value="ALL">Tất cả đơn</option>
                <option value="UNASSIGNED">Chưa có việc mở</option>
                <option value="ASSIGNED">Đang có việc mở</option>
                <option value="READY">Đủ điều kiện giao</option>
              </FilterSelect>
              <FilterSelect label="Trạng thái PC" value={statusFilter} onChange={(value) => setStatusFilter(value as AssignmentStatus)}>
                <option value="ALL">Tất cả phân công</option>
                <option value="CHO_THUC_HIEN">Chờ nhận</option>
                <option value="DANG_THUC_HIEN">Đang làm</option>
                <option value="HOAN_THANH">Đã xong</option>
                <option value="TU_CHOI">Từ chối</option>
              </FilterSelect>
              <FilterSelect label="Thợ" value={workerFilter} onChange={setWorkerFilter}>
                <option value="ALL">Tất cả thợ</option>
                {workers.map((worker) => (
                  <option key={worker.mand} value={worker.mand}>{worker.hoten}</option>
                ))}
              </FilterSelect>
              <FilterSelect label="Tải thợ" value={workerLoadFilter} onChange={(value) => setWorkerLoadFilter(value as WorkerLoadFilter)}>
                <option value="ALL">Tất cả tải</option>
                <option value="AVAILABLE">Còn trống</option>
                <option value="BUSY">Đang bận</option>
              </FilterSelect>
            </div>
          ) : null}
        </div>

        {activeTab === "orders" ? (
          <OrdersTab
            loading={loading}
            orders={filteredOrders}
            assignmentsByOrder={assignmentsByOrder}
            onAssign={(orderId) => openNewAssignment(orderId)}
          />
        ) : null}
        {activeTab === "workers" ? (
          <WorkersTab
            loading={loading}
            workers={filteredWorkerStats}
            onAssign={(workerId) => openNewAssignment(undefined, workerId)}
          />
        ) : null}
        {activeTab === "assignments" ? (
          <AssignmentsTab
            loading={loading}
            assignments={filteredAssignments}
            onStart={startAssignment}
          />
        ) : null}
      </section>

      {showModal ? (
        <AssignmentModal
          workers={workerStats}
          orders={orders}
          assignmentsByOrder={assignmentsByOrder}
          selectedWorker={selectedWorker}
          selectedOrder={selectedOrder}
          saving={saving}
          onWorkerChange={setSelectedWorker}
          onOrderChange={setSelectedOrder}
          onClose={() => setShowModal(false)}
          onSubmit={handleAssign}
        />
      ) : null}
    </div>
  );
}

function OrdersTab({
  loading,
  orders,
  assignmentsByOrder,
  onAssign,
}: {
  loading: boolean;
  orders: Order[];
  assignmentsByOrder: Map<number, Assignment[]>;
  onAssign: (orderId: number) => void;
}) {
  if (loading) return <LoadingBlock />;
  if (orders.length === 0) return <EmptyBlock icon={Package} text="Không có đơn phù hợp bộ lọc." />;

  return (
    <div className="divide-y divide-white/5">
      {orders.map((order) => {
        const orderAssignments = assignmentsByOrder.get(order.madh) ?? [];
        const openAssignments = orderAssignments.filter((assignment) => isOpenAssignment(assignment.trangthai));
        return (
          <div key={order.madh} className="grid grid-cols-1 gap-4 p-5 hover:bg-white/[0.02] xl:grid-cols-[1.1fr_0.9fr_auto] xl:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-bold text-emerald-300">DH-{order.madh}</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-gray-300">
                  {formatOrderStatus(order.trangthai)}
                </span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${openAssignments.length > 0 ? "border-sky-500/25 bg-sky-500/10 text-sky-300" : "border-amber-500/25 bg-amber-500/10 text-amber-300"}`}>
                  {openAssignments.length > 0 ? `${openAssignments.length} việc mở` : "Chưa giao"}
                </span>
              </div>
              <div className="mt-2 truncate text-lg font-bold text-gray-100">{order.khachhang?.hoten || "Khách lẻ"}</div>
              <div className="mt-1 text-sm text-gray-500">{order.khachhang?.sdt || "Chưa có SĐT"} · {new Date(order.ngaytao).toLocaleDateString("vi-VN")}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MiniMetric label="BOM" value={order.chitietdh.length} />
              <MiniMetric label="Giá trị" valueText={money(order.tonggiatri)} />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Link href={`/admin/don-hang/${order.madh}`} className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-gray-200 hover:bg-white/10">
                <Eye className="mr-2 h-4 w-4" />
                Xem đơn
              </Link>
              <button
                type="button"
                onClick={() => onAssign(order.madh)}
                className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Giao việc
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WorkersTab({
  loading,
  workers,
  onAssign,
}: {
  loading: boolean;
  workers: Array<{ worker: Worker; active: Assignment[]; done: Assignment[]; isBusy: boolean }>;
  onAssign: (workerId: number) => void;
}) {
  if (loading) return <LoadingBlock />;
  if (workers.length === 0) return <EmptyBlock icon={Users} text="Không có thợ phù hợp bộ lọc." />;

  return (
    <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-2 xl:grid-cols-3">
      {workers.map(({ worker, active, done, isBusy }) => (
        <div key={worker.mand} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-base font-bold text-gray-100">{worker.hoten}</div>
              <div className="mt-1 text-xs text-gray-500">{worker.sdt || worker.tendangnhap || `NV-${worker.mand}`}</div>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${isBusy ? "border-amber-500/25 bg-amber-500/10 text-amber-300" : "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"}`}>
              {isBusy ? "Đang bận" : "Còn trống"}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <MiniMetric label="Đang mở" value={active.length} />
            <MiniMetric label="Đã xong" value={done.length} />
          </div>
          <button
            type="button"
            onClick={() => onAssign(worker.mand)}
            disabled={isBusy}
            className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="mr-2 h-4 w-4" />
            Giao việc cho thợ này
          </button>
        </div>
      ))}
    </div>
  );
}

function AssignmentsTab({
  loading,
  assignments,
  onStart,
}: {
  loading: boolean;
  assignments: Assignment[];
  onStart: (mapc: number) => void;
}) {
  if (loading) return <LoadingBlock />;
  if (assignments.length === 0) return <EmptyBlock icon={ClipboardList} text="Không có phân công phù hợp." />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-gray-500">
          <tr>
            <th className="p-4 text-left">Phân công</th>
            <th className="p-4 text-left">Đơn hàng</th>
            <th className="p-4 text-left">Thợ</th>
            <th className="p-4 text-left">Trạng thái</th>
            <th className="p-4 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {assignments.map((assignment) => (
            <tr key={assignment.mapc} className="hover:bg-white/[0.02]">
              <td className="p-4 font-mono font-bold text-emerald-300">PC-{assignment.mapc}</td>
              <td className="p-4">
                <div className="font-mono text-sm font-bold text-gray-100">DH-{assignment.madh}</div>
                <div className="mt-1 text-xs text-gray-500">{assignment.donhang?.khachhang?.hoten || "Không rõ khách"}</div>
              </td>
              <td className="p-4">
                <div className="font-semibold text-gray-100">{assignment.nguoidung?.hoten || "Không rõ thợ"}</div>
                <div className="mt-1 text-xs text-gray-500">{assignment.nguoidung?.sdt || assignment.nguoidung?.tendangnhap || ""}</div>
              </td>
              <td className="p-4">
                <StatusChip status={assignment.trangthai} />
                {assignment.lydotuchoi ? <div className="mt-1 max-w-xs text-xs text-red-200/80">Lý do: {assignment.lydotuchoi}</div> : null}
              </td>
              <td className="p-4">
                <div className="flex justify-end gap-2">
                  <Link href={`/admin/phan-cong/${assignment.mapc}`} className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-gray-200 hover:bg-white/10">
                    <Eye className="mr-2 h-4 w-4" />
                    Chi tiết
                  </Link>
                  {assignment.trangthai === "CHO_THUC_HIEN" ? (
                    <button type="button" onClick={() => onStart(assignment.mapc)} className="rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-xs font-bold text-sky-200 hover:bg-sky-500/20">
                      Bắt đầu
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, tone }: { icon: typeof Package; label: string; value: number; tone: "sky" | "amber" | "violet" | "emerald" }) {
  const tones = {
    sky: "border-sky-500/20 bg-sky-500/10 text-sky-300",
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    violet: "border-violet-500/20 bg-violet-500/10 text-violet-300",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  };
  return (
    <div className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-5">
      <div className="flex items-center gap-4">
        <div className={`rounded-xl border p-3 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</div>
          <div className="mt-1 text-2xl font-bold text-gray-100">{value}</div>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-gray-100 outline-none focus:border-emerald-400">
        {children}
      </select>
    </label>
  );
}

function StatusChip({ status }: { status: string }) {
  const meta = statusMeta(status);
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${meta.chip}`}>
      <span className={`mr-2 h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function MiniMetric({ label, value, valueText }: { label: string; value?: number; valueText?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className="mt-0.5 text-sm font-bold text-gray-100">{valueText ?? value}</div>
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="flex justify-center py-16 text-gray-400">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}

function EmptyBlock({ icon: Icon, text }: { icon: typeof Package; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center text-sm text-gray-500">
      <Icon className="mb-3 h-10 w-10 text-gray-700" />
      {text}
    </div>
  );
}

function AssignmentModal({
  workers,
  orders,
  assignmentsByOrder,
  selectedWorker,
  selectedOrder,
  saving,
  onWorkerChange,
  onOrderChange,
  onClose,
  onSubmit,
}: {
  workers: Array<{ worker: Worker; isBusy: boolean; active: Assignment[]; done: Assignment[] }>;
  orders: Order[];
  assignmentsByOrder: Map<number, Assignment[]>;
  selectedWorker: string;
  selectedOrder: string;
  saving: boolean;
  onWorkerChange: (value: string) => void;
  onOrderChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const selectedOrderData = orders.find((order) => order.madh === Number(selectedOrder)) ?? null;
  const selectedWorkerData = workers.find((item) => item.worker.mand === Number(selectedWorker)) ?? null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#121214] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 bg-[#0a0a0c] px-6 py-5">
          <h2 className="flex items-center text-lg font-bold text-gray-100">
            <UserPlus className="mr-2 h-5 w-5 text-emerald-300" />
            Tạo phân công mới
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-white/10 hover:text-white" title="Đóng" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 p-6 lg:grid-cols-2">
          <FilterSelect label="Đơn hàng" value={selectedOrder} onChange={onOrderChange}>
            <option value="">Chọn đơn hàng</option>
            {orders.map((order) => {
              const openCount = (assignmentsByOrder.get(order.madh) ?? []).filter((assignment) => isOpenAssignment(assignment.trangthai)).length;
              return (
                <option key={order.madh} value={order.madh}>
                  DH-{order.madh} · {order.khachhang?.hoten || "Khách lẻ"} · {openCount ? `${openCount} việc mở` : "chưa giao"}
                </option>
              );
            })}
          </FilterSelect>

          <FilterSelect label="Thợ" value={selectedWorker} onChange={onWorkerChange}>
            <option value="">Chọn thợ</option>
            {workers.map(({ worker, isBusy }) => (
              <option key={worker.mand} value={worker.mand} disabled={isBusy}>
                {worker.hoten} · {isBusy ? "đang bận" : "còn trống"}
              </option>
            ))}
          </FilterSelect>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Preview đơn</div>
            {selectedOrderData ? (
              <div className="mt-3 space-y-3">
                <div>
                  <div className="font-mono text-sm font-bold text-emerald-300">DH-{selectedOrderData.madh}</div>
                  <div className="mt-1 text-sm font-bold text-gray-100">{selectedOrderData.khachhang?.hoten || "Khách lẻ"}</div>
                  <div className="mt-1 text-xs text-gray-500">{selectedOrderData.chitietdh.length} BOM · {money(selectedOrderData.tonggiatri)}</div>
                </div>
                <div className="max-h-32 overflow-y-auto rounded-lg border border-white/10">
                  {selectedOrderData.chitietdh.slice(0, 8).map((item) => (
                    <div key={item.mactdh} className="flex justify-between gap-3 border-b border-white/5 px-3 py-2 text-xs last:border-b-0">
                      <span className="truncate text-gray-300">{item.mota || item.vattu?.tenvt || "Hạng mục"}</span>
                      <span className="shrink-0 font-mono text-sky-300">{item.chieudaicat ? `${item.chieudaicat}mm` : "SL"} · x{item.soluong}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-3 text-sm text-gray-500">Chưa chọn đơn.</div>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Preview thợ</div>
            {selectedWorkerData ? (
              <div className="mt-3">
                <div className="text-sm font-bold text-gray-100">{selectedWorkerData.worker.hoten}</div>
                <div className="mt-1 text-xs text-gray-500">{selectedWorkerData.worker.sdt || selectedWorkerData.worker.tendangnhap || `NV-${selectedWorkerData.worker.mand}`}</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <MiniMetric label="Đang mở" value={selectedWorkerData.active.length} />
                  <MiniMetric label="Đã xong" value={selectedWorkerData.done.length} />
                </div>
              </div>
            ) : (
              <div className="mt-3 text-sm text-gray-500">Chưa chọn thợ.</div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-white/10 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-gray-200 hover:bg-white/10">
            Hủy
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving || !selectedOrder || !selectedWorker}
            className="inline-flex items-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            Xác nhận giao việc
          </button>
        </div>
      </div>
    </div>
  );
}
