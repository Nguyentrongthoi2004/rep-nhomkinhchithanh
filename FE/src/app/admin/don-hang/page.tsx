"use client";

import { Ban, ClipboardList, Edit3, FileText, Loader2, Mail, Phone, Plus, RefreshCw, Search, Trash2, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiData, apiJson } from "@/lib/api";
import { formatOrderStatus } from "@/lib/order-status";
import { CustomerContactModal, type CustomerContact } from "@/components/admin/CustomerContactModal";
import { ConfirmDialog, InlineNotice, type NoticeState } from "@/components/admin/Feedback";
import { ListPagination } from "@/components/admin/ListPagination";
import { DEFAULT_PAGE_SIZE, matchesTimeFilter, paginate, type TimeFilter } from "@/lib/list-controls";

interface Order {
  madh: number;
  ngaytao: string;
  trangthai: string;
  tonggiatri: number;
  khachhang: CustomerContact | null;
  chitietdh: { mactdh: number }[];
}

// Trang danh sách đơn hàng quản trị: hiển thị tất cả đơn với bộ lọc trạng thái, tìm kiếm, phân trang.
// Hỗ trợ: xem chi tiết, sửa KH, lập BOM, hủy đơn, xóa đơn
export default function OrderListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<CustomerContact | null>(null);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    tone?: "danger" | "warn" | "ok";
    run: () => Promise<void>;
  } | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [page, setPage] = useState(1);

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

  useEffect(() => {
    setPage(1);
  }, [searchTerm, timeFilter]);

  const handleDeleteOrder = async (madh: number) => {
    setConfirmAction({
      title: `Xóa đơn hàng DH-${madh}`,
      description: "Thao tác này sẽ xóa đơn hàng và các dòng BOM liên quan. Chỉ thực hiện khi chắc chắn đây là dữ liệu nhập sai hoặc đơn test.",
      confirmLabel: "Xóa đơn",
      tone: "danger",
      run: async () => {
        setBusyId(madh);
        try {
          await apiJson(`/api/admin/orders/${madh}`, { method: "DELETE" });
          setNotice({ tone: "ok", text: `Đã xóa đơn hàng DH-${madh}.` });
          await reloadOrders();
        } catch (err: unknown) {
          setNotice({ tone: "error", text: err instanceof Error ? err.message : String(err) });
        } finally {
          setBusyId(null);
        }
      },
    });
  };

  const updateStatus = async (madh: number, trangthai: string) => {
    setBusyId(madh);
    try {
      await apiJson(`/api/admin/orders/${madh}`, {
        method: "PATCH",
        body: JSON.stringify({ trangthai }),
      });
      setNotice({ tone: "ok", text: `Đã cập nhật trạng thái DH-${madh}.` });
      reloadOrders();
    } catch (err: unknown) {
      setNotice({ tone: "error", text: err instanceof Error ? err.message : String(err) });
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
  const filteredOrders = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return orders.filter((o) => {
      const text = `DH-${o.madh} ${o.khachhang?.hoten || ""} ${o.khachhang?.sdt || ""} ${o.khachhang?.email || ""} ${o.khachhang?.diachi || ""}`.toLowerCase();
      return (!q || text.includes(q)) && matchesTimeFilter(o.ngaytao, timeFilter);
    });
  }, [orders, searchTerm, timeFilter]);
  const pagedOrders = useMemo(() => paginate(filteredOrders, page, DEFAULT_PAGE_SIZE), [filteredOrders, page]);

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

      <div className="relative z-10 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Tìm theo mã ĐH, tên KH, SĐT, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoComplete="off"
            name="mini-erp-order-search"
            className="w-full rounded-lg border border-white/10 bg-[#0a0a0c] py-2.5 pl-10 pr-4 text-sm text-gray-200 shadow-inner outline-none transition-all focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TimeFilterButton active={timeFilter === "all"} onClick={() => setTimeFilter("all")}>Tất cả</TimeFilterButton>
          <TimeFilterButton active={timeFilter === "today"} onClick={() => setTimeFilter("today")}>Hôm nay</TimeFilterButton>
          <TimeFilterButton active={timeFilter === "month"} onClick={() => setTimeFilter("month")}>Tháng này</TimeFilterButton>
          <TimeFilterButton active={timeFilter === "year"} onClick={() => setTimeFilter("year")}>Năm này</TimeFilterButton>
        </div>
      </div>

      <InlineNotice notice={notice} onClose={() => setNotice(null)} />

      {!loading && (
        <div className="space-y-3 md:hidden">
          {pagedOrders.items.map((order) => {
            const workLink = order.trangthai === "KHAO_SAT" ? `/admin/don-hang/${order.madh}/bom` : `/admin/don-hang/${order.madh}/bao-gia`;
            const workTitle = order.trangthai === "KHAO_SAT" ? "Lập BOM" : "Xem báo giá";
            return (
              <div key={order.madh} className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-4 shadow-lg">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/admin/don-hang/${order.madh}`} className="font-mono text-sm font-bold text-orange-300">
                      DH-{order.madh}
                    </Link>
                    <p className="mt-1 text-base font-bold text-gray-100">{order.khachhang?.hoten || "Không tên"}</p>
                    <p className="text-xs text-gray-500">Lập ngày: {new Date(order.ngaytao).toLocaleDateString("vi-VN")}</p>
                  </div>
                  {getStatusBadge(order.trangthai)}
                </div>
                <div className="mt-3 space-y-1 text-sm">
                  <p className="text-gray-300">{order.khachhang?.sdt || "Chưa có SĐT"}</p>
                  <p className={`break-all ${order.khachhang?.email ? "text-sky-300" : "text-gray-600"}`}>
                    {order.khachhang?.email || "Chưa có email"}
                  </p>
                  <p className="line-clamp-2 text-gray-500">{order.khachhang?.diachi || "Chưa có địa chỉ"}</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">BOM</p>
                    <p className="font-semibold text-gray-200">{order.chitietdh?.length || 0} hạng mục</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Giá trị</p>
                    <p className="font-mono font-bold text-gray-100">{formatCurrency(order.tonggiatri)}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  <Link href={`/admin/don-hang/${order.madh}`} className="rounded-lg bg-white/5 px-3 py-2 text-center text-xs font-bold text-gray-200">
                    Chi tiết
                  </Link>
                  {order.khachhang && (
                    <button type="button" onClick={() => setEditingCustomer(order.khachhang)} className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200">
                      Sửa KH
                    </button>
                  )}
                  {["KHAO_SAT", "BAO_GIA_NHAP"].includes(order.trangthai) ? (
                    <Link href={workLink} className="rounded-lg bg-orange-500/10 px-3 py-2 text-center text-xs font-bold text-orange-200">
                      {workTitle}
                    </Link>
                  ) : (
                    <span className="rounded-lg bg-white/5 px-3 py-2 text-center text-xs font-bold text-gray-500">BOM</span>
                  )}
                  <button type="button" onClick={() => handleDeleteOrder(order.madh)} className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200">
                    Xóa
                  </button>
                </div>
              </div>
            );
          })}
          {filteredOrders.length === 0 && <div className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-8 text-center text-sm text-gray-500">Chưa có đơn hàng phù hợp.</div>}
        </div>
      )}

      <div className="hidden overflow-hidden rounded-2xl border border-white/5 bg-[#0a0a0c] shadow-lg md:block">
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
                pagedOrders.items.map((order) => {
                  const workLink = order.trangthai === "KHAO_SAT" ? `/admin/don-hang/${order.madh}/bom` : `/admin/don-hang/${order.madh}/bao-gia`;
                  const workTitle = order.trangthai === "KHAO_SAT" ? "Lập BOM" : "Xem báo giá";
                  return (
                    <tr key={order.madh} className="group cursor-pointer transition-colors hover:bg-white/[0.02]">
                      <td className="p-4 font-mono text-sm font-bold text-orange-400">
                        <Link href={`/admin/don-hang/${order.madh}`}>DH-{order.madh}</Link>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-bold text-gray-200">{order.khachhang?.hoten || "Không tên"}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                          <span>Lập ngày: {new Date(order.ngaytao).toLocaleDateString("vi-VN")}</span>
                          {order.khachhang?.sdt && (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {order.khachhang.sdt}
                            </span>
                          )}
                        </div>
                        <div className={`mt-1 flex items-start gap-1 text-xs ${order.khachhang?.email ? "text-sky-300/90" : "text-gray-600"}`}>
                          <Mail className="mt-0.5 h-3 w-3 shrink-0" />
                          <span className="break-all">{order.khachhang?.email || "Chưa có email"}</span>
                        </div>
                        <div className="mt-1 line-clamp-2 text-xs text-gray-500">{order.khachhang?.diachi || "Chưa có địa chỉ"}</div>
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
                          {order.khachhang && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCustomer(order.khachhang);
                              }}
                              className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-emerald-400/10 hover:text-emerald-300"
                              title="Sửa thông tin khách hàng"
                              aria-label="Sửa thông tin khách hàng"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          )}
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
        {!loading && (
          <ListPagination
            page={pagedOrders.page}
            pageCount={pagedOrders.pageCount}
            total={filteredOrders.length}
            start={pagedOrders.start}
            end={pagedOrders.end}
            onPageChange={setPage}
          />
        )}
      </div>
      {!loading && (
        <div className="md:hidden">
          <ListPagination
            page={pagedOrders.page}
            pageCount={pagedOrders.pageCount}
            total={filteredOrders.length}
            start={pagedOrders.start}
            end={pagedOrders.end}
            onPageChange={setPage}
          />
        </div>
      )}

      <CustomerContactModal
        open={!!editingCustomer}
        customer={editingCustomer}
        onClose={() => setEditingCustomer(null)}
        onSaved={reloadOrders}
      />
      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.title || ""}
        description={confirmAction?.description || ""}
        confirmLabel={confirmAction?.confirmLabel}
        tone={confirmAction?.tone}
        busy={busyId != null}
        onCancel={() => setConfirmAction(null)}
        onConfirm={async () => {
          const action = confirmAction;
          if (!action) return;
          await action.run();
          setConfirmAction(null);
        }}
      />
    </div>
  );
}

function TimeFilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
        active
          ? "border-orange-500/40 bg-orange-500/15 text-orange-200"
          : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}
