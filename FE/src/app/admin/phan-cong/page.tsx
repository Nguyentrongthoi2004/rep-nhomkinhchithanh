"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  ClipboardList, Users, UserPlus, Loader2, ChevronDown, ChevronRight,
  CheckCircle2, Clock, AlertCircle, X, Package, Ruler
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { apiJson } from "@/lib/api";

// ─── Types (khớp 100% với schema Supabase) ───
interface Worker {
  mand: number;
  hoten: string;
  sdt: string | null;
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
  khachhang: { hoten: string; sdt: string } | null;
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
    khachhang: { hoten: string } | null;
    trangthai: string;
  } | null;
  nguoidung: { hoten: string; sdt: string | null } | null;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  CHO_THUC_HIEN: { label: "Chờ Nhận", color: "bg-gray-500/20 text-gray-400 border-gray-500/20" },
  DANG_THUC_HIEN: { label: "Đang Làm", color: "bg-blue-500/20 text-blue-400 border-blue-500/20" },
  HOAN_THANH: { label: "Đã Xong", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/20" },
  TU_CHOI: { label: "Từ Chối", color: "bg-red-500/20 text-red-300 border-red-500/25" },
};

export default function AdminPhanCongPage() {
  const supabase = useMemo(() => createClient(), []);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ─── Fetch dữ liệu thật từ Supabase ───
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Lấy danh sách thợ (WORKER) đang làm việc
      const { data: wData } = await supabase
        .from("nguoidung")
        .select("mand, hoten, sdt")
        .eq("vaitro", "WORKER")
        .eq("trangthai", "DANG_LAM")
        .order("mand");

      // Lấy đơn hàng chưa hoàn thành kèm BOM chi tiết
      const { data: oData } = await supabase
        .from("donhang")
        .select(`
          madh, ngaytao, trangthai, tonggiatri,
          khachhang(hoten, sdt),
          chitietdh(mactdh, mota, chieudaicat, soluong, vattu(tenvt, donvitinh))
        `)
        .not("trangthai", "in", '("HOAN_THANH","DA_HUY")')
        .order("madh", { ascending: false });

      // Lấy tất cả phân công kèm join
      const { data: aData } = await supabase
        .from("phancong")
        .select(`
          mapc, madh, matho, trangthai, lydotuchoi, tuchoiluc,
          donhang(madh, trangthai, khachhang(hoten)),
          nguoidung(hoten, sdt)
        `)
        .order("mapc", { ascending: false });

      setWorkers((wData as Worker[]) || []);
      setOrders(((oData as unknown as Order[]) || []).filter((o) => !["KHAO_SAT", "BAO_GIA_NHAP"].includes(o.trangthai)));
      setAssignments((aData as unknown as Assignment[]) || []);
    } catch (e) {
      console.error("Lỗi tải dữ liệu phân công:", e);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const assignmentsByOrder = useMemo(() => {
    const map = new Map<number, Assignment[]>();
    for (const a of assignments) {
      const list = map.get(a.madh) ?? [];
      list.push(a);
      map.set(a.madh, list);
    }
    // keep stable ordering: newest mapc first inside each order
    for (const [madh, list] of map.entries()) {
      list.sort((x, y) => y.mapc - x.mapc);
      map.set(madh, list);
    }
    return map;
  }, [assignments]);

  // ─── Giao việc mới ───
  const handleAssign = async () => {
    if (!selectedOrder || !selectedWorker) {
      setError("Vui lòng chọn cả Thợ và Đơn hàng!");
      return;
    }

    // Kiểm tra trùng phân công cùng đơn
    const isDuplicate = assignments.some(
      a => a.madh === Number(selectedOrder) && a.matho === Number(selectedWorker)
        && !["HOAN_THANH", "TU_CHOI"].includes(a.trangthai)
    );
    if (isDuplicate) {
      setError("Thợ này đã được giao đơn hàng này rồi!");
      return;
    }

    // Ràng buộc bận: hiện tại hệ thống không có time-range nên chặn 1 thợ có >1 phân công đang mở
    const isBusy = assignments.some(
      a => a.matho === Number(selectedWorker) && !["HOAN_THANH", "TU_CHOI"].includes(a.trangthai)
    );
    if (isBusy) {
      setError("Thợ này đang bận phân công khác (chưa hoàn thành)!");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await apiJson("/api/admin/assignments", {
        method: "POST",
        body: JSON.stringify({
          madh: Number(selectedOrder),
          matho: Number(selectedWorker),
        }),
      });
      setShowModal(false);
      setSelectedOrder("");
      setSelectedWorker("");
      fetchData();
    } catch (e: unknown) {
      setError("Lỗi lưu phân công: " + (e instanceof Error ? e.message : String(e)));
    }
    setSaving(false);
  };

  // ─── Cập nhật trạng thái phân công ───
  const updateStatus = async (mapc: number, newStatus: string) => {
    try {
      await apiJson(`/api/admin/assignments/${mapc}`, {
        method: "PATCH",
        body: JSON.stringify({ trangthai: newStatus }),
      });
      fetchData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    }
  };

  const openOrder = orders.find(o => o.madh === expandedOrder);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center bg-[#0a0a0c] p-6 rounded-2xl border border-white/5 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center">
            <ClipboardList className="w-6 h-6 mr-3 text-emerald-500" />
            Giao Việc Cho Thợ (Phân Công)
          </h1>
          <p className="text-gray-400 text-sm mt-1 ml-9">
            Chỉ định đơn hàng cho thợ. Thợ sẽ thấy chi tiết BOM để biết cần làm gì.
          </p>
        </div>
        <button
          onClick={() => { setShowModal(true); setError(""); }}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg flex items-center font-bold transition-colors shadow-lg"
        >
          <UserPlus className="w-5 h-5 mr-2" /> Giao Việc Mới
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#0a0a0c] border border-white/5 p-5 rounded-2xl flex items-center">
          <div className="p-3 bg-blue-500/10 rounded-full mr-4 border border-blue-500/20">
            <Users className="text-blue-400 w-5 h-5" />
          </div>
          <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Thợ Đang Làm Việc</p>
            <p className="text-2xl font-bold text-gray-100">{workers.length}</p>
          </div>
        </div>
        <div className="bg-[#0a0a0c] border border-white/5 p-5 rounded-2xl flex items-center">
          <div className="p-3 bg-amber-500/10 rounded-full mr-4 border border-amber-500/20">
            <Clock className="text-amber-400 w-5 h-5" />
          </div>
          <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Việc Đang Chạy</p>
            <p className="text-2xl font-bold text-gray-100">
              {assignments.filter(a => a.trangthai === "DANG_THUC_HIEN").length}
            </p>
          </div>
        </div>
        <div className="bg-[#0a0a0c] border border-white/5 p-5 rounded-2xl flex items-center">
          <div className="p-3 bg-emerald-500/10 rounded-full mr-4 border border-emerald-500/20">
            <CheckCircle2 className="text-emerald-400 w-5 h-5" />
          </div>
          <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Hoàn Thành</p>
            <p className="text-2xl font-bold text-gray-100">
              {assignments.filter(a => a.trangthai === "HOAN_THANH").length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Danh sách Phân Công */}
        <div className="bg-[#0a0a0c] rounded-2xl border border-white/5 overflow-hidden shadow-lg">
          <div className="p-4 border-b border-white/5 bg-white/2">
            <h2 className="font-bold text-gray-200 text-sm">Danh Sách Phân Công Hiện Tại</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : assignments.length === 0 ? (
            <div className="py-16 text-center text-gray-500 text-sm">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
              Chưa có phân công nào. Bấm &quot;Giao Việc Mới&quot; để bắt đầu.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {Array.from(assignmentsByOrder.entries())
                .sort((a, b) => b[0] - a[0]) // newest order id first (matches existing behavior roughly)
                .map(([madh, list]) => {
                  const orderName = list[0]?.donhang?.khachhang?.hoten || "Không rõ KH";
                  const anyDoing = list.some((x) => x.trangthai === "DANG_THUC_HIEN");
                  const allDone = list.length > 0 && list.every((x) => x.trangthai === "HOAN_THANH");
                  const allRejected = list.length > 0 && list.every((x) => x.trangthai === "TU_CHOI");
                  const groupStatus = allDone ? "HOAN_THANH" : allRejected ? "TU_CHOI" : anyDoing ? "DANG_THUC_HIEN" : "CHO_THUC_HIEN";
                  const status = STATUS_MAP[groupStatus] || STATUS_MAP.CHO_THUC_HIEN;

                  return (
                    <div key={madh} className="p-4 hover:bg-white/2 transition-colors">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-200 truncate">
                            DH-{madh} · {orderName}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {list.length} thợ được phân công
                          </p>
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold border ${status.color}`}>
                          {status.label}
                        </span>
                      </div>

                      <div className="mt-3 space-y-2">
                        {list.map((a) => {
                          const rowStatus = STATUS_MAP[a.trangthai] || STATUS_MAP.CHO_THUC_HIEN;
                          return (
                            <div
                              key={a.mapc}
                              className="rounded-xl border border-white/10 bg-white/2 px-3 py-2 flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-mono text-gray-500">PC-{a.mapc}</span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${rowStatus.color}`}>
                                    {rowStatus.label}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-300 mt-1 truncate">
                                  {a.nguoidung?.hoten || "Không rõ thợ"}
                                  {a.nguoidung?.sdt ? ` (${a.nguoidung.sdt})` : ""}
                                </p>
                                {a.trangthai === "TU_CHOI" && a.lydotuchoi && (
                                  <p className="text-xs text-red-200/80 mt-1 line-clamp-2">
                                    Lý do: {a.lydotuchoi}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {a.trangthai === "CHO_THUC_HIEN" && (
                                  <button
                                    onClick={() => updateStatus(a.mapc, "DANG_THUC_HIEN")}
                                    className="text-[11px] px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/20 rounded-lg transition-colors"
                                  >
                                    Đang làm
                                  </button>
                                )}
                                {a.trangthai === "DANG_THUC_HIEN" && (
                                  <button
                                    onClick={() => updateStatus(a.mapc, "HOAN_THANH")}
                                    className="text-[11px] px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/20 rounded-lg transition-colors"
                                  >
                                    Hoàn thành
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex space-x-2 mt-3">
                        <button
                          onClick={() => setExpandedOrder(madh === expandedOrder ? null : madh)}
                          className="text-xs px-3 py-1 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg transition-colors flex items-center"
                        >
                          <Package className="w-3 h-3 mr-1" />
                          Xem BOM
                          {expandedOrder === madh
                            ? <ChevronDown className="w-3 h-3 ml-1" />
                            : <ChevronRight className="w-3 h-3 ml-1" />
                          }
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Chi tiết BOM của Đơn hàng đang xem */}
        <div className="bg-[#0a0a0c] rounded-2xl border border-white/5 overflow-hidden shadow-lg">
          <div className="p-4 border-b border-white/5 bg-white/2">
            <h2 className="font-bold text-gray-200 text-sm">
              {openOrder
                ? `Chi Tiết Yêu Cầu: DH-${openOrder.madh} · ${openOrder.khachhang?.hoten}`
                : "Chi Tiết Công Việc (Bấm Xem BOM)"}
            </h2>
          </div>

          {!openOrder ? (
            <div className="py-16 text-center text-gray-500 text-sm">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              Chọn một phân công và bấm &quot;Xem BOM&quot; để hiển thị<br />chi tiết vật tư & kích thước cần sản xuất.
            </div>
          ) : openOrder.chitietdh.length === 0 ? (
            <div className="py-16 text-center text-gray-500 text-sm">
              Đơn hàng này chưa có BOM chi tiết.
            </div>
          ) : (
            <div>
              {/* Header BOM */}
              <div className="px-4 py-3 bg-emerald-500/5 border-b border-emerald-500/10">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  {openOrder.chitietdh.length} hạng mục cần sản xuất · Trị giá{" "}
                  {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(openOrder.tonggiatri)}
                </p>
              </div>

              <div className="overflow-y-auto max-h-[500px] divide-y divide-white/5">
                {openOrder.chitietdh.map((item, idx) => (
                  <div key={item.mactdh} className="p-4 hover:bg-white/2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <span className="mt-0.5 shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold flex items-center justify-center border border-emerald-500/20">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-gray-200">
                            {item.mota || item.vattu?.tenvt || "Hạng mục"}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {item.vattu?.tenvt}
                          </p>

                          {/* Thông số kỹ thuật */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {item.chieudaicat && (
                              <span className="flex items-center text-[11px] font-mono px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                                <Ruler className="w-3 h-3 mr-1" />
                                {item.chieudaicat.toLocaleString()} mm
                              </span>
                            )}
                            <span className="text-[11px] px-2 py-0.5 bg-white/5 text-gray-400 border border-white/10 rounded">
                              SL: {item.soluong} {item.vattu?.donvitinh || "cái"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Giao Việc */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#12141a] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
              <h3 className="text-xl font-bold text-gray-100 flex items-center">
                <UserPlus className="w-5 h-5 mr-2 text-emerald-400" />
                Giao Việc Mới
              </h3>
              <button onClick={() => setShowModal(false)} aria-label="Đóng" title="Đóng">
                <X className="w-5 h-5 text-gray-500 hover:text-white transition-colors" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0" /> {error}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block" htmlFor="assign-worker">
                  Chọn Nhân Viên (Thợ) <span className="text-red-400">*</span>
                </label>
                <select
                  id="assign-worker"
                  value={selectedWorker}
                  onChange={e => setSelectedWorker(e.target.value)}
                  className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-3 text-gray-200 outline-none focus:border-emerald-500"
                  aria-label="Chọn nhân viên (thợ)"
                  title="Chọn nhân viên (thợ)"
                >
                  <option value="">-- Chọn thợ --</option>
                  {workers.map(w => (
                    <option key={w.mand} value={w.mand}>
                      {w.hoten} {w.sdt ? `(${w.sdt})` : ""}
                    </option>
                  ))}
                </select>
                {workers.length === 0 && (
                  <p className="text-xs text-amber-400 mt-1">
                    Chưa có thợ nào trong hệ thống. Hãy thêm tại trang Nhân sự.
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block" htmlFor="assign-order">
                  Chọn Đơn Hàng Cần Xử Lý <span className="text-red-400">*</span>
                </label>
                <select
                  id="assign-order"
                  value={selectedOrder}
                  onChange={e => setSelectedOrder(e.target.value)}
                  className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-3 text-gray-200 outline-none focus:border-emerald-500"
                  aria-label="Chọn đơn hàng cần xử lý"
                  title="Chọn đơn hàng cần xử lý"
                >
                  <option value="">-- Chọn đơn hàng --</option>
                  {orders.map(o => (
                    <option key={o.madh} value={o.madh}>
                      DH-{o.madh} · {o.khachhang?.hoten || "Không tên"} · {o.chitietdh.length} hạng mục
                    </option>
                  ))}
                </select>
                {orders.length === 0 && (
                  <p className="text-xs text-amber-400 mt-1">
                    Không có đơn hàng nào đang hoạt động. Hãy tạo đơn hàng trước.
                  </p>
                )}
              </div>

              {/* Preview BOM khi chọn đơn */}
              {selectedOrder && (() => {
                const ord = orders.find(o => o.madh === Number(selectedOrder));
                if (!ord || ord.chitietdh.length === 0) return null;
                return (
                  <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">
                      Preview BOM — {ord.chitietdh.length} hạng mục
                    </p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {ord.chitietdh.map((item, i) => (
                        <div key={item.mactdh} className="flex items-center text-xs text-gray-300">
                          <span className="text-emerald-500 mr-2 font-bold">{i + 1}.</span>
                          <span className="flex-1">{item.mota || item.vattu?.tenvt}</span>
                          {item.chieudaicat && (
                            <span className="text-blue-400 font-mono ml-2">{item.chieudaicat}mm</span>
                          )}
                          <span className="text-gray-500 ml-2">×{item.soluong}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end space-x-3 pt-4 border-t border-white/5">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-bold rounded-lg transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  onClick={handleAssign}
                  disabled={saving || !selectedOrder || !selectedWorker}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg transition-colors flex items-center"
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  Xác Nhận Giao Việc
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
