"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ClipboardList, Edit3, FileText, ListChecks, Loader2, ReceiptText } from "lucide-react";
import { apiData } from "@/lib/api";
import { formatOrderStatus } from "@/lib/order-status";

type OrderDetail = {
  madh: number;
  ngaytao: string;
  trangthai: string;
  baogia_gui_luc: string | null;
  baogia_email: string | null;
  tonggiatri: number;
  khachhang: { makh: number; hoten: string; sdt: string; diachi: string | null } | null;
  chitietdh: Array<{
    mactdh: number;
    mavt: number;
    mota: string | null;
    chieudaicat: number | null;
    soluong: number;
    dongiadongbang: number | null;
    thanhtien: number | null;
    vattu: { tenvt: string; donvitinh: string } | null;
  }>;
};

const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value || 0);

export default function AdminOrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params?.id || 0);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [order, setOrder] = useState<OrderDetail | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      setOrder(await apiData<OrderDetail>(`/api/admin/orders/${id}`));
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    load();
  }, [id, load]);

  const bomSumMaterial = useMemo(() => (order?.chitietdh ?? []).reduce((s, it) => s + Number(it.thanhtien ?? 0), 0), [order]);
  const quoteGap = order ? Math.round(Number(order.tonggiatri) - bomSumMaterial) : 0;
  const hasBom = (order?.chitietdh?.length ?? 0) > 0;
  const isApproved = order ? !["KHAO_SAT", "BAO_GIA_NHAP"].includes(order.trangthai) : false;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-[#0a0a0c] p-6">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => router.push("/admin/don-hang")}
            className="mr-4 rounded-lg p-2 text-gray-400 hover:bg-white/10"
            title="Quay lại danh sách"
            aria-label="Quay lại danh sách"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="flex items-center text-2xl font-bold text-gray-100">
              <ReceiptText className="mr-3 h-6 w-6 text-orange-400" />
              Chi tiết đơn hàng DH-{id}
            </h1>
            <p className="mt-1 text-sm text-gray-400">Thông tin khách hàng, BOM và trạng thái xử lý đơn hàng.</p>
          </div>
        </div>

        {order && (
          <div className="flex items-center gap-3">
            {isApproved && (
              <Link href="/admin/don-hang" className="flex items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 font-bold text-gray-200 hover:bg-white/10">
                <ListChecks className="mr-2 h-4 w-4" />
                Về quản lý đơn hàng
              </Link>
            )}
            {!isApproved && (
              <Link href={`/admin/don-hang/${id}/bom`} className="flex items-center rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 font-bold text-gray-200 hover:bg-white/10">
                <Edit3 className="mr-2 h-4 w-4" />
                Sửa BOM
              </Link>
            )}
            {hasBom && (
              <Link href={`/admin/don-hang/${id}/bao-gia`} className="flex items-center rounded-lg bg-orange-600 px-4 py-2.5 font-bold text-white hover:bg-orange-500">
                <FileText className="mr-2 h-4 w-4" />
                Xem báo giá
              </Link>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : errorMsg ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{errorMsg}</div>
      ) : !order ? (
        <div className="p-6 text-gray-400">Không tìm thấy đơn hàng.</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <section className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-6 xl:col-span-5">
            <div className="text-xs uppercase tracking-wider text-gray-500">Khách hàng</div>
            <div className="mt-2 text-lg font-bold text-gray-100">{order.khachhang?.hoten || "Không tên"}</div>
            <div className="mt-1 text-sm text-gray-400">{order.khachhang?.sdt || "Chưa có số điện thoại"}</div>
            {order.khachhang?.diachi && <div className="mt-1 text-sm text-gray-500">{order.khachhang.diachi}</div>}

            <div className="mt-6 space-y-2 border-t border-white/5 pt-4 text-sm">
              <Row label="Trạng thái" value={formatOrderStatus(order.trangthai)} />
              <Row label="Ngày tạo" value={new Date(order.ngaytao).toLocaleString("vi-VN")} />
              <Row label="Số hạng mục" value={`${order.chitietdh.length}`} />
              <Row label="Tổng giá trị" value={money(order.tonggiatri)} strong />
            </div>

            {!isApproved && (
              <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
                Đơn chưa được duyệt giá. Cần gửi báo giá và khách xác nhận trước khi thanh toán, phân công hoặc tối ưu cắt.
              </div>
            )}

            {order.baogia_gui_luc && (
              <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                <div className="font-bold">Báo giá đã gửi</div>
                <div className="mt-1 text-xs text-emerald-100/80">
                  {order.baogia_email} - {new Date(order.baogia_gui_luc).toLocaleString("vi-VN")}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-6 xl:col-span-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-gray-100">Bóc tách vật tư (BOM)</div>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">Đơn giá từng dòng là vật tư. Phần chênh với tổng đơn thường là nhân công và lợi nhuận.</p>
              </div>
              {!hasBom && (
                <Link href={`/admin/don-hang/${id}/bom`} className="flex items-center rounded-lg bg-orange-600 px-3 py-2 text-sm font-bold text-white hover:bg-orange-500">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Lập BOM
                </Link>
              )}
            </div>

            {!hasBom ? (
              <div className="mt-5 rounded-xl border border-dashed border-white/10 p-10 text-center text-gray-500">Đơn hàng chưa có BOM.</div>
            ) : (
              <div className="mt-5 overflow-hidden rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 text-gray-400">
                    <tr>
                      <th className="p-3 text-left">Hạng mục</th>
                      <th className="p-3 text-right">Kích thước</th>
                      <th className="p-3 text-right">SL</th>
                      <th className="p-3 text-right">Đơn giá</th>
                      <th className="p-3 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {order.chitietdh.map((it) => (
                      <tr key={it.mactdh}>
                        <td className="p-3 text-gray-200">
                          <div className="font-semibold">{it.mota || it.vattu?.tenvt || "Hạng mục"}</div>
                          {it.vattu?.donvitinh && <div className="text-xs text-gray-500">{it.vattu.donvitinh}</div>}
                        </td>
                        <td className="p-3 text-right font-mono text-gray-300">{formatCutSize(it)}</td>
                        <td className="p-3 text-right">{it.soluong}</td>
                        <td className="p-3 text-right font-mono">{money(Number(it.dongiadongbang ?? 0))}</td>
                        <td className="p-3 text-right font-mono font-bold">{money(Number(it.thanhtien ?? 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                  {Math.abs(quoteGap) > 10 && (
                    <tfoot className="border-t border-white/10 bg-white/[0.03]">
                      <tr>
                        <td colSpan={4} className="p-3 text-left text-xs text-amber-200/90">
                          Nhân công & lợi nhuận
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-amber-100">{money(quoteGap)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function formatCutSize(item: OrderDetail["chitietdh"][number]) {
  const name = item.mota ?? "";
  const dim = name.match(/\((\d+)\s*x\s*(\d+)\s*mm\)/i);
  if (dim) return `${dim[1]} x ${dim[2]} mm`;
  if (item.chieudaicat != null) return `${item.chieudaicat} mm`;
  return "Theo SL";
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-gray-500">{label}</div>
      <div className={strong ? "font-bold text-gray-100" : "text-gray-300"}>{value}</div>
    </div>
  );
}
