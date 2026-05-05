"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, ReceiptText } from "lucide-react";
import { apiData } from "@/lib/api";
import { formatOrderStatus } from "@/lib/order-status";

type OrderDetail = {
  madh: number;
  ngaytao: string;
  trangthai: string;
  tonggiatri: number;
  khachhang: { makh: number; hoten: string; sdt: string; diachi: string | null } | null;
  chitietdh: Array<{
    mactdh: number;
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

  const totalLines = useMemo(() => order?.chitietdh?.length ?? 0, [order]);

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-6 flex items-center justify-between">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? router.back() : router.push("/admin/don-hang"))}
            className="p-2 hover:bg-white/10 rounded-lg mr-4 text-gray-400"
            title="Quay lại"
            aria-label="Quay lại"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-100 flex items-center">
              <ReceiptText className="w-6 h-6 mr-3 text-orange-400" /> Chi tiết đơn hàng DH-{id}
            </h1>
            <p className="text-sm text-gray-400 mt-1">Xem BOM và thông tin khách hàng.</p>
          </div>
        </div>
        <Link href="/admin/don-hang/create" className="text-sm text-gray-300 hover:text-white underline underline-offset-4">
          Tạo đơn mới
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : errorMsg ? (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-sm">{errorMsg}</div>
      ) : !order ? (
        <div className="p-6 text-gray-400">Không tìm thấy đơn hàng.</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <section className="xl:col-span-5 bg-[#0a0a0c] border border-white/5 rounded-2xl p-6">
            <div className="text-xs uppercase tracking-wider text-gray-500">KHÁCH HÀNG</div>
            <div className="mt-2 text-lg font-bold text-gray-100">{order.khachhang?.hoten || "—"}</div>
            <div className="mt-1 text-sm text-gray-400">{order.khachhang?.sdt || "—"}</div>
            {order.khachhang?.diachi && <div className="mt-1 text-sm text-gray-500">{order.khachhang.diachi}</div>}

            <div className="mt-6 border-t border-white/5 pt-4 space-y-2 text-sm">
              <Row label="Trạng thái" value={formatOrderStatus(order.trangthai)} />
              <Row label="Ngày tạo" value={new Date(order.ngaytao).toLocaleString("vi-VN")} />
              <Row label="Số hạng mục" value={`${totalLines}`} />
              <Row label="Tổng giá trị" value={money(order.tonggiatri)} strong />
            </div>
          </section>

          <section className="xl:col-span-7 bg-[#0a0a0c] border border-white/5 rounded-2xl p-6">
            <div className="text-sm font-bold text-gray-100 mb-4">Bóc tách vật tư (BOM)</div>
            {order.chitietdh.length === 0 ? (
              <div className="p-10 border border-dashed border-white/10 rounded-xl text-center text-gray-500">
                Đơn hàng chưa có BOM.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 text-gray-400">
                    <tr>
                      <th className="p-3 text-left">Hạng mục</th>
                      <th className="p-3 text-right">Cắt (mm)</th>
                      <th className="p-3 text-right">SL</th>
                      <th className="p-3 text-right">Đơn giá</th>
                      <th className="p-3 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {order.chitietdh.map((it) => (
                      <tr key={it.mactdh}>
                        <td className="p-3 text-gray-200">
                          <div className="font-semibold">{it.mota || it.vattu?.tenvt || "—"}</div>
                          {it.vattu?.donvitinh && <div className="text-xs text-gray-500">{it.vattu.donvitinh}</div>}
                        </td>
                        <td className="p-3 text-right font-mono text-gray-300">{it.chieudaicat ?? "—"}</td>
                        <td className="p-3 text-right">{it.soluong}</td>
                        <td className="p-3 text-right font-mono">{money(Number(it.dongiadongbang ?? 0))}</td>
                        <td className="p-3 text-right font-mono font-bold">{money(Number(it.thanhtien ?? 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-gray-500">{label}</div>
      <div className={strong ? "text-gray-100 font-bold" : "text-gray-300"}>{value}</div>
    </div>
  );
}

