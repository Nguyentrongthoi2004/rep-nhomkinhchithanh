"use client";

import { Plus, Search, Filter, FileText, ClipboardList, TrendingUp, Loader2, Trash2, Ban, RefreshCw } from "lucide-react";
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
    try {
      await apiJson(`/api/admin/orders/${madh}`, { method: "DELETE" });
      reloadOrders();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const updateStatus = async (madh: number, trangthai: string) => {
    try {
      await apiJson(`/api/admin/orders/${madh}`, {
        method: "PATCH",
        body: JSON.stringify({ trangthai }),
      });
      reloadOrders();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'SẢN XUẤT': 
      case 'DANG_GIA_CONG':
        return <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded">SẢN XUẤT</span>;
      case 'BÁO GIÁ': 
      case 'BAO_GIA_NHAP':
        return <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded">CHỜ DUYỆT GIÁ</span>;
      case 'HOÀN THÀNH': 
        return <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded">HOÀN THÀNH</span>;
      default:
        return (
          <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-gray-400 bg-gray-500/10 border border-gray-500/20 rounded">
            {formatOrderStatus(status)}
          </span>
        );
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const filteredOrders = orders.filter(o => 
    `DH-${o.madh}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (o.khachhang?.hoten || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-[#0a0a0c] p-6 rounded-2xl border border-white/5 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center">
            <ClipboardList className="w-6 h-6 mr-3 text-orange-500" />
            Quản Lý Đơn Hàng & CRM
          </h1>
          <p className="text-gray-400 text-sm mt-1 ml-9">Theo dõi luồng xử lý từ Báo giá đến Trả hàng.</p>
        </div>
        
        <Link href="/admin/don-hang/create">
          <button className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-lg flex items-center font-bold transition-colors shadow-[0_0_20px_-3px_rgba(234,88,12,0.4)]">
            <Plus className="w-5 h-5 mr-2 stroke-[3px]" />
            Tạo Đơn Mới (Bóc Tách)
          </button>
        </Link>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#0a0a0c] border border-white/5 p-5 rounded-2xl flex items-center shadow-lg">
          <div className="p-3 bg-blue-500/10 rounded-full mr-4 border border-blue-500/20"><TrendingUp className="text-blue-400 w-6 h-6"/></div>
          <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Đang Sản Xuất</p>
            <p className="text-2xl font-bold text-gray-100">
              {orders.filter(o => o.trangthai === 'DANG_GIA_CONG').length} <span className="text-sm font-normal text-gray-500">đơn</span>
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text"
            placeholder="Tìm theo mã ĐH, tên KH..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all shadow-inner"
          />
        </div>
        <button
          title="Bộ lọc"
          aria-label="Bộ lọc"
          className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
        >
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {/* Order List Table */}
      <div className="bg-[#0a0a0c] rounded-2xl border border-white/5 overflow-hidden shadow-lg">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
             <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
             <p className="text-gray-400">Đang tải danh sách đơn hàng...</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-[11px] uppercase tracking-wider text-gray-400">
                <th className="p-4 font-semibold w-24">Mã ĐH</th>
                <th className="p-4 font-semibold">Khách Hàng / Dự Án</th>
                <th className="p-4 font-semibold text-center">Chi tiết</th>
                <th className="p-4 font-semibold text-right">Giá Trị</th>
                <th className="p-4 font-semibold w-32 text-center">Trạng Thái</th>
                <th className="p-4 font-semibold w-24 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredOrders.length === 0 ? (
                 <tr><td colSpan={6} className="p-8 text-center text-gray-500">Chưa có đơn hàng nào.</td></tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.madh} className="hover:bg-white/2 transition-colors group cursor-pointer">
                    <td className="p-4 text-sm font-bold text-orange-400 font-mono"><Link href={`/admin/don-hang/${order.madh}`}>DH-{order.madh}</Link></td>
                    <td className="p-4">
                      <p className="text-sm font-bold text-gray-200">{order.khachhang?.hoten || "Không tên"}</p>
                      <p className="text-xs text-gray-500 mt-1">Lập ngày: {new Date(order.ngaytao).toLocaleDateString("vi-VN")}</p>
                    </td>
                    <td className="p-4 text-center text-sm text-gray-300 font-medium">
                      {order.chitietdh?.length || 0} <span className="text-xs text-gray-500 font-normal">hạng mục</span>
                    </td>
                    <td className="p-4 text-right text-sm font-bold text-gray-200 font-mono tracking-tight">
                      {formatCurrency(order.tonggiatri)}
                    </td>
                    <td className="p-4 text-center">
                      {getStatusBadge(order.trangthai)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/don-hang/${order.madh}`}>
                          <button className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors" title="Xem chi tiết" aria-label="Xem chi tiết">
                          <FileText className="w-4 h-4" />
                          </button>
                        </Link>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(order.madh, order.trangthai === "DA_HUY" ? "BAO_GIA_NHAP" : "DA_HUY");
                          }}
                          className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-md transition-colors"
                          title={order.trangthai === "DA_HUY" ? "Mo lai don" : "Huy don"}
                          aria-label={order.trangthai === "DA_HUY" ? "Mo lai don" : "Huy don"}
                        >
                          {order.trangthai === "DA_HUY" ? <RefreshCw className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOrder(order.madh);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                          title="Xóa đơn hàng"
                          aria-label="Xóa đơn hàng"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
