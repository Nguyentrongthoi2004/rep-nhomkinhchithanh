"use client";

import { Ban, ClipboardList, FileText, Filter, Loader2, Plus, RefreshCw, Search, Trash2, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiData, apiJson } from "@/lib/api";
import { formatOrderStatus } from "@/lib/order-status";

interface Order {
  madh: number;
  ngaytao: string;
  trangthai: string;
  tonggiatri: number;
  khachhang: { hoten: string } | null;
  chitietdh: { mactdh: number }[];
}

export default function OrderListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const reloadOrders = useCallback(async () => {
    setLoading(true);
    try {
      setOrders(await apiData<Order[]>("/api/admin/orders"));
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadOrders();
  }, [reloadOrders]);

  const handleDeleteOrder = async (madh: number) => {
    if (!confirm(`Xóa đơn hàng DH-${madh}? (Sẽ xóa cả BOM chi tiết)`)) return;
    setBusyId(madh);
    try {
      await apiJson(`/api/admin/orders/${madh}`, { method: "DELETE" });
      reloadOrders();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const updateStatus = async (madh: number, trangthai: string) => {
    setBusyId(madh);
    try {
      await apiJson(`/api/admin/orders/${madh}`, {
        method: "PATCH",
        body: JSON.stringify({ trangthai }),
      });
      reloadOrders();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const base = "px-2.5 py-1 text-[10px] font-bold tracking-wider border rounded";
    switch (status) {
      case "KHAO_SAT":
        return <span className={`${base} border-gray-500/20 bg-gray-500/10 text-gray-300`}>TIẾP NHẬN</span>;
      case "BAO_GIA_NHAP":
        return <span className={`${base} border-amber-500/20 bg-amber-500/10 text-amber-400`}>CHỜ DUYỆT GIÁ</span>;
      case "DA_DUYET_GIA":
        return <span className={`${base} border-sky-500/20 bg-sky-500/10 text-sky-400`}>ĐÃ DUYỆT GIÁ</span>;
      case "DA_THANH_TOAN":
        return <span className={`${base} border-emerald-500/20 bg-emerald-500/10 text-emerald-300`}>ĐÃ THANH TOÁN</span>;
      case "DANG_GIA_CONG":
        return <span className={`${base} border-blue-500/20 bg-blue-500/10 text-blue-400`}>ĐANG GIA CÔNG</span>;
      case "HOAN_THANH":
        return <span className={`${base} border-emerald-500/20 bg-emerald-500/10 text-emerald-400`}>HOÀN THÀNH</span>;
      case "DA_HUY":
        return <span className={`${base} border-red-500/20 bg-red-500/10 text-red-400`}>ĐÃ HỦY</span>;
      default:
        return <span className={`${base} border-gray-500/20 bg-gray-500/10 text-gray-400`}>{formatOrderStatus(status)}</span>;
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
  const filteredOrders = orders.filter(
    (o) =>
      `DH-${o.madh}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.khachhang?.hoten || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-[#0a0a0c] p-6 shadow-sm">
        <div>
          <h1 className="flex items-center text-2xl font-bold text-gray-100">
            <ClipboardList className="mr-3 h-6 w-6 text-orange-500" />
            Quản lý đơn hàng & CRM
          </h1>
          <p className="ml-9 mt-1 text-sm text-gray-400">Theo dõi luồng xử lý từ tiếp nhận, lập BOM, báo giá đến sản xuất.</p>
        </div>

        <Link href="/admin/don-hang/create">
          <button className="flex items-center rounded-lg bg-orange-600 px-5 py-2.5 font-bold text-white shadow-[0_0_20px_-3px_rgba(234,88,12,0.4)] transition-colors hover:bg-orange-500">
            <Plus className="mr-2 h-5 w-5 stroke-[3px]" />
            Tạo đơn mới
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center rounded-2xl border border-white/5 bg-[#0a0a0c] p-5 shadow-lg">
          <div className="mr-4 rounded-full border border-blue-500/20 bg-blue-500/10 p-3">
            <TrendingUp className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-gray-500">Đang sản xuất</p>
            <p className="text-2xl font-bold text-gray-100">
              {orders.filter((o) => o.trangthai === "DANG_GIA_CONG").length} <span className="text-sm font-normal text-gray-500">đơn</span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Tìm theo mã ĐH, tên KH..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#0a0a0c] py-2.5 pl-10 pr-4 text-sm text-gray-200 shadow-inner outline-none transition-all focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          />
        </div>
        <button title="Bộ lọc" aria-label="Bộ lọc" className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-gray-400 transition-colors hover:text-white">
          <Filter className="h-5 w-5" />
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#0a0a0c] shadow-lg">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="mb-4 h-8 w-8 animate-spin text-orange-500" />
            <p className="text-gray-400">Đang tải danh sách đơn hàng...</p>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10 bg-white/5 text-[11px] uppercase tracking-wider text-gray-400">
                <th className="w-24 p-4 font-semibold">Mã ĐH</th>
                <th className="p-4 font-semibold">Khách hàng / Dự án</th>
                <th className="p-4 text-center font-semibold">Chi tiết</th>
                <th className="p-4 text-right font-semibold">Giá trị</th>
                <th className="w-36 p-4 text-center font-semibold">Trạng thái</th>
                <th className="w-32 p-4 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Chưa có đơn hàng nào.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const workLink = order.trangthai === "KHAO_SAT" ? `/admin/don-hang/${order.madh}/bom` : `/admin/don-hang/${order.madh}/bao-gia`;
                  const workTitle = order.trangthai === "KHAO_SAT" ? "Lập BOM" : "Xem báo giá";
                  return (
                    <tr key={order.madh} className="group cursor-pointer transition-colors hover:bg-white/[0.02]">
                      <td className="p-4 font-mono text-sm font-bold text-orange-400">
                        <Link href={`/admin/don-hang/${order.madh}`}>DH-{order.madh}</Link>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-gray-200">{order.khachhang?.hoten || "Không tên"}</p>
                        <p className="mt-1 text-xs text-gray-500">Lập ngày: {new Date(order.ngaytao).toLocaleDateString("vi-VN")}</p>
                      </td>
                      <td className="p-4 text-center text-sm font-medium text-gray-300">
                        {order.chitietdh?.length || 0} <span className="text-xs font-normal text-gray-500">hạng mục</span>
                      </td>
                      <td className="p-4 text-right font-mono text-sm font-bold tracking-tight text-gray-200">{formatCurrency(order.tonggiatri)}</td>
                      <td className="p-4 text-center">{getStatusBadge(order.trangthai)}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/admin/don-hang/${order.madh}`}>
                            <button className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-blue-400/10 hover:text-blue-400" title="Xem chi tiết" aria-label="Xem chi tiết">
                              <FileText className="h-4 w-4" />
                            </button>
                          </Link>
                          {["KHAO_SAT", "BAO_GIA_NHAP"].includes(order.trangthai) && (
                            <Link href={workLink}>
                              <button className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-orange-400/10 hover:text-orange-400" title={workTitle} aria-label={workTitle}>
                                <ClipboardList className="h-4 w-4" />
                              </button>
                            </Link>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateStatus(order.madh, order.trangthai === "DA_HUY" ? "BAO_GIA_NHAP" : "DA_HUY");
                            }}
                            disabled={busyId === order.madh}
                            className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-amber-400/10 hover:text-amber-400 disabled:opacity-50"
                            title={order.trangthai === "DA_HUY" ? "Mở lại đơn" : "Hủy đơn"}
                            aria-label={order.trangthai === "DA_HUY" ? "Mở lại đơn" : "Hủy đơn"}
                          >
                            {order.trangthai === "DA_HUY" ? <RefreshCw className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteOrder(order.madh);
                            }}
                            disabled={busyId === order.madh}
                            className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-400/10 hover:text-red-400 disabled:opacity-50"
                            title="Xóa đơn hàng"
                            aria-label="Xóa đơn hàng"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
