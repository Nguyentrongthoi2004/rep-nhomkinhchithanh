"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Edit3, Loader2, Mail, ReceiptText, X } from "lucide-react";
import { apiData, apiJson } from "@/lib/api";
import { formatOrderStatus } from "@/lib/order-status";

type OrderDetail = {
  madh: number;
  ngaytao: string;
  trangthai: string;
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

/** Gộp BOM đơn hàng thành payload email (phôi nhôm vs kính theo ĐVT / tên / kích mm trong mô tả). */
function buildQuoteBomFromLines(
  lines: OrderDetail["chitietdh"],
): { sqm: number; phoiNhom: Array<{ code: string; name: string; length: number; qty: number }>; kinh: Array<{ name: string; w: number; h: number; qty: number }> } {
  const dimInMota = /\((\d+)\s*x\s*(\d+)\s*mm\)/i;
  const phoiNhom: Array<{ code: string; name: string; length: number; qty: number }> = [];
  const kinh: Array<{ name: string; w: number; h: number; qty: number }> = [];
  let sqm = 0;

  for (const it of lines) {
    const dvt = (it.vattu?.donvitinh ?? "").toLowerCase().trim();
    const name = (it.mota ?? it.vattu?.tenvt ?? "—").trim() || "—";
    const dim = name.match(dimInMota);
    const glassByUnit = dvt === "m2" || dvt === "m²" || /\bm2\b/i.test(dvt);
    const glassByName = /kinh/i.test(name);
    const isGlass = glassByUnit || glassByName || !!dim;

    if (isGlass) {
      const w = dim ? Number(dim[1]) : 0;
      const h = dim ? Number(dim[2]) : 0;
      kinh.push({ name, w, h, qty: it.soluong });
      if (w > 0 && h > 0) {
        sqm += (w / 1000) * (h / 1000) * it.soluong;
      }
    } else {
      phoiNhom.push({
        code: `VT-${it.mavt}`,
        name,
        length: it.chieudaicat ?? 0,
        qty: it.soluong,
      });
    }
  }

  return { sqm, phoiNhom, kinh };
}

const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value || 0);

export default function AdminOrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params?.id || 0);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailResult, setEmailResult] = useState<{ ok: boolean; previewUrl: string | null; messageId: string } | null>(null);
  const [emailErr, setEmailErr] = useState("");

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

  /** Tổng thành tiền các dòng BOM (chỉ vật tư); chênh với `tonggiatri` thường là nhân công + %LN lúc lưu báo giá. */
  const bomSumMaterial = useMemo(
    () => (order?.chitietdh ?? []).reduce((s, it) => s + Number(it.thanhtien ?? 0), 0),
    [order],
  );
  const quoteGapRounded = order ? Math.round(Number(order.tonggiatri) - bomSumMaterial) : 0;
  const showQuoteGapFoot = Math.abs(quoteGapRounded) > 10;

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
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/don-hang/${id}/edit`}
            className="bg-white/5 border border-white/10 hover:bg-white/10 text-gray-200 px-4 py-2.5 rounded-lg font-bold flex items-center"
            title="Chỉnh sửa đơn hàng"
            aria-label="Chỉnh sửa đơn hàng"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Sửa đơn
          </Link>
          <Link href="/admin/don-hang/create" className="text-sm text-gray-300 hover:text-white underline underline-offset-4">
            Tạo đơn mới
          </Link>
        </div>
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

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmailResult(null);
                  setEmailErr("");
                  setEmailTo("");
                  setEmailOpen(true);
                }}
                className="w-full rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white font-bold py-2.5 flex items-center justify-center"
                title="Gửi email báo giá"
                aria-label="Gửi email báo giá"
              >
                <Mail className="w-4 h-4 mr-2" />
                Gửi email báo giá
              </button>
            </div>
          </section>

          <section className="xl:col-span-7 bg-[#0a0a0c] border border-white/5 rounded-2xl p-6">
            <div className="text-sm font-bold text-gray-100">Bóc tách vật tư (BOM)</div>
            <p className="text-[11px] text-gray-500 mt-1 mb-4 leading-relaxed">
              Đơn giá / thành tiền từng dòng là phần vật tư cắt. Tổng đơn hàng còn gồm nhân công theo m² và % lợi nhuận đã nhập khi tạo báo giá (nếu có chênh, xem dòng cuối bảng).
            </p>
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
                  {showQuoteGapFoot && (
                    <tfoot className="bg-white/3 border-t border-white/10">
                      <tr>
                        <td colSpan={3} className="p-3 text-left text-xs text-amber-200/90">
                          {quoteGapRounded > 0
                            ? "Nhân công & lợi nhuận (phần chênh so với tổng vật tư trên — đã gộp trong tổng đơn)"
                            : "Chênh lệch âm (tổng dòng vượt tổng đơn — kiểm tra lại dữ liệu)"}
                        </td>
                        <td className="p-3" />
                        <td className="p-3 text-right font-mono font-bold text-amber-100">{money(quoteGapRounded)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {emailOpen && order && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-4 pb-[80px]">
          <div className="w-full max-w-md bg-[#12141a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">Gửi báo giá DH-{order.madh}</div>
                <div className="text-xs text-gray-400 mt-0.5">{order.khachhang?.hoten || "Khách hàng"}</div>
              </div>
              <button
                type="button"
                onClick={() => setEmailOpen(false)}
                className="p-2 rounded-xl hover:bg-white/5 text-gray-400"
                title="Đóng"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setEmailErr("");
                setEmailResult(null);
                const email = emailTo.trim();
                if (!email) return;
                setEmailLoading(true);
                try {
                  const json = await apiJson<{ messageId: string; previewUrl: string | null }>("/api/admin/emails/send-quote", {
                    method: "POST",
                    body: JSON.stringify({
                      madh: order.madh,
                      email,
                      customer: order.khachhang?.hoten || `DH-${order.madh}`,
                      phone: order.khachhang?.sdt || null,
                      quotePrice: order.tonggiatri,
                      bom: buildQuoteBomFromLines(order.chitietdh),
                      doorType: null,
                      width: null,
                      height: null,
                      laborCost: null,
                      margin: null,
                    }),
                  });
                  const data = json.data as { messageId: string; previewUrl: string | null };
                  setEmailResult({ ok: true, messageId: data.messageId, previewUrl: data.previewUrl });
                } catch (err: unknown) {
                  setEmailErr(err instanceof Error ? err.message : String(err));
                } finally {
                  setEmailLoading(false);
                }
              }}
              className="p-5 space-y-4"
            >
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300">Email nhận báo giá</label>
                <input
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="tenkhach@example.com"
                  className="w-full h-11 rounded-xl bg-[#0a0a0c] border border-white/10 px-3 text-sm text-white outline-none focus:border-sky-400/60"
                  required
                />
                <div className="text-[11px] text-gray-500">
                  Nếu bạn chưa cấu hình SMTP thật, hệ thống sẽ tạo <span className="text-gray-300 font-semibold">link preview</span> thay vì gửi vào Gmail.
                </div>
              </div>

              {emailErr && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {emailErr}
                </div>
              )}

              {emailResult?.ok && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  <div className="flex items-center font-bold">
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Đã tạo yêu cầu gửi email
                  </div>
                  <div className="text-[11px] text-emerald-200/80 mt-1">messageId: <span className="font-mono">{emailResult.messageId}</span></div>
                  {emailResult.previewUrl ? (
                    <div className="text-[11px] mt-1">
                      Preview (dev):{" "}
                      <a className="underline underline-offset-2" href={emailResult.previewUrl} target="_blank" rel="noreferrer">
                        mở preview
                      </a>
                    </div>
                  ) : (
                    <div className="text-[11px] text-emerald-200/80 mt-1">Đã gửi qua SMTP cấu hình.</div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEmailOpen(false)}
                  className="flex-1 h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 font-bold"
                >
                  Đóng
                </button>
                <button
                  disabled={emailLoading}
                  className="flex-1 h-11 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white font-bold flex items-center justify-center"
                  type="submit"
                >
                  {emailLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                  Gửi
                </button>
              </div>
            </form>
          </div>
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

