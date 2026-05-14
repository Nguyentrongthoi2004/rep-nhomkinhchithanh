"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Scissors, Loader2, Plus, Trash2, Users, ArrowRight } from "lucide-react";
import { apiData, apiJson } from "@/lib/api";

type Worker = {
  mand: number;
  hoten: string;
  tendangnhap: string;
  trangthai: string;
  vaitro: string;
};

type OrderRow = {
  madh: number;
  trangthai: string;
  ngaytao: string;
  khachhang: { hoten: string } | null;
};

type AssignmentRow = {
  mapc: number;
  trangthai: string;
  donhang: OrderRow | null;
  nguoidung: Worker | null;
};

export default function SanXuatPage() {
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ madh: 0, matho: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [assignmentsData, usersData, ordersData] = await Promise.all([
        apiData<AssignmentRow[]>("/api/admin/assignments"),
        apiData<Worker[]>("/api/admin/users"),
        apiData<OrderRow[]>("/api/admin/orders-list"),
      ]);

      setAssignments(assignmentsData || []);
      const allUsers = usersData || [];
      setWorkers(allUsers.filter((x) => x.vaitro === "WORKER" && x.trangthai === "DANG_LAM"));
      setOrders(ordersData || []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const pendingOrders = useMemo(() => {
    // các đơn chưa hoàn thành/huỷ để phân công
    const blocked = new Set(["KHAO_SAT", "BAO_GIA_NHAP", "HOAN_THANH", "DA_HUY"]);
    return orders.filter((o) => !blocked.has(o.trangthai));
  }, [orders]);

  const openCreate = () => {
    setForm({
      madh: pendingOrders[0]?.madh ?? 0,
      matho: workers[0]?.mand ?? 0,
    });
    setIsModalOpen(true);
  };

  const createAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.madh || !form.matho) return;
    setIsSubmitting(true);
    try {
      await apiJson("/api/admin/assignments", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setIsModalOpen(false);
      fetchAll();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeAssignment = async (mapc: number) => {
    if (!confirm(`Xóa phân công PC-${mapc}?`)) return;
    setIsSubmitting(true);
    try {
      await apiJson(`/api/admin/assignments/${mapc}`, { method: "DELETE" });
      fetchAll();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="admin-metal-panel rounded-2xl p-6 relative overflow-hidden">
        <div className="admin-metal-shine" />
        <div className="relative z-10 flex justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-100 flex items-center">
              <Scissors className="w-6 h-6 mr-3 text-slate-300" />
              Bản vẽ & Sản xuất
            </h1>
            <p className="text-gray-400 text-sm mt-1 ml-9">
              Phân công đơn hàng cho thợ. Worker sẽ thấy việc ở tab “Máy cắt”.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/toi-uu-cat"
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 font-semibold transition-colors flex items-center"
              title="Mở mô phỏng tối ưu cắt"
            >
              Mô phỏng cắt <ArrowRight className="w-4 h-4 ml-2 text-amber-300" />
            </Link>
            <button
              onClick={openCreate}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors flex items-center"
              title="Tạo phân công"
              aria-label="Tạo phân công"
            >
              <Plus className="w-4 h-4 mr-2" /> Phân công
            </button>
          </div>
        </div>
      </div>

      {errorMsg && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300">{errorMsg}</div>}

      <div className="bg-[#0a0a0c]/60 border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-[11px] uppercase tracking-wider text-gray-400">
                <th className="p-4 font-semibold w-24">Mã PC</th>
                <th className="p-4 font-semibold">Đơn hàng</th>
                <th className="p-4 font-semibold w-64">Thợ</th>
                <th className="p-4 font-semibold w-32 text-center">Trạng thái</th>
                <th className="p-4 font-semibold w-24 text-right">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {assignments.map((a) => (
                <tr key={a.mapc} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 text-sm font-mono text-gray-300">PC-{a.mapc}</td>
                  <td className="p-4">
                    <div className="text-sm font-bold text-gray-100">
                      DH-{a.donhang?.madh ?? "N/A"} — {a.donhang?.khachhang?.hoten || "Không tên"}
                    </div>
                    <div className="text-xs text-gray-500">Trạng thái đơn: {a.donhang?.trangthai || "N/A"}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-200 font-semibold">
                      <Users className="w-4 h-4 text-slate-400" />
                      {a.nguoidung?.hoten || "N/A"} <span className="text-xs text-gray-500 font-mono">({a.nguoidung?.tendangnhap})</span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide border bg-blue-500/10 text-blue-300 border-blue-500/20">
                      {a.trangthai}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => removeAssignment(a.mapc)}
                      disabled={isSubmitting}
                      className="p-2 text-gray-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-60"
                      title="Xóa phân công"
                      aria-label="Xóa phân công"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {assignments.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    Chưa có phân công nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative">
            <div className="admin-metal-shine" />
            <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-[#0a0a0c] relative z-10">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <Plus className="w-5 h-5 mr-2 text-blue-300" />
                Tạo phân công
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-md transition-colors"
                aria-label="Đóng"
                title="Đóng"
              >
                &times;
              </button>
            </div>
            <form onSubmit={createAssignment} className="p-6 space-y-4 relative z-10">
              <div className="space-y-2">
                <label className="text-sm text-gray-400 font-medium">Chọn đơn hàng</label>
                <select
                  value={form.madh}
                  onChange={(e) => setForm((p) => ({ ...p, madh: Number(e.target.value) }))}
                  className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-4 py-3 text-gray-200 focus:outline-none focus:border-blue-500"
                  aria-label="Chọn đơn hàng"
                >
                  {pendingOrders.map((o) => (
                    <option key={o.madh} value={o.madh}>
                      DH-{o.madh} — {o.khachhang?.hoten || "Không tên"} ({o.trangthai})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400 font-medium">Chọn thợ</label>
                <select
                  value={form.matho}
                  onChange={(e) => setForm((p) => ({ ...p, matho: Number(e.target.value) }))}
                  className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-4 py-3 text-gray-200 focus:outline-none focus:border-blue-500"
                  aria-label="Chọn thợ"
                >
                  {workers.map((w) => (
                    <option key={w.mand} value={w.mand}>
                      {w.hoten} ({w.tendangnhap})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-300 hover:bg-white/5 border border-white/10 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-70 flex items-center"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Tạo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

