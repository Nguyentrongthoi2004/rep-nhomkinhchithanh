"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileText, Loader2, Mail, Printer, X } from "lucide-react";
import { apiData, apiJson } from "@/lib/api";
import { formatOrderStatus } from "@/lib/order-status";

type OrderDetail = {
  madh: number;
  ngaytao: string;
  trangthai: string;
  baogia_gui_luc: string | null;
  baogia_email: string | null;
  tonggiatri: number;
  khachhang: { hoten: string; sdt: string; diachi: string | null } | null;
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

function buildQuoteBomFromLines(lines: OrderDetail["chitietdh"]) {
  const dimInMota = /\((\d+)\s*x\s*(\d+)\s*mm\)/i;
  const phoiNhom: Array<{ code: string; name: string; length: number; qty: number }> = [];
  const kinh: Array<{ name: string; w: number; h: number; qty: number }> = [];
  let sqm = 0;

  for (const it of lines) {
    const dvt = (it.vattu?.donvitinh ?? "").toLowerCase().trim();
    const name = (it.mota ?? it.vattu?.tenvt ?? "Hạng mục").trim() || "Hạng mục";
    const dim = name.match(dimInMota);
    const isGlass = dvt === "m2" || dvt === "m²" || /\bm2\b/i.test(dvt) || /kinh/i.test(name) || !!dim;

    if (isGlass) {
      const w = dim ? Number(dim[1]) : 0;
      const h = dim ? Number(dim[2]) : 0;
      kinh.push({ name, w, h, qty: it.soluong });
      if (w > 0 && h > 0) sqm += (w / 1000) * (h / 1000) * it.soluong;
    } else {
      phoiNhom.push({ code: `VT-${it.mavt}`, name, length: it.chieudaicat ?? 0, qty: it.soluong });
    }
  }

  return { sqm, phoiNhom, kinh };
}

export default function QuotePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params?.id || 0);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailResult, setEmailResult] = useState<{ messageId: string; previewUrl: string | null } | null>(null);
  const [emailErr, setEmailErr] = useState("");
  const [approving, setApproving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
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
    load();
  }, [load]);

  const materialTotal = useMemo(() => (order?.chitietdh ?? []).reduce((sum, it) => sum + Number(it.thanhtien ?? 0), 0), [order]);
  const quoteGap = order ? Math.round(Number(order.tonggiatri || 0) - materialTotal) : 0;
  const hasBom = (order?.chitietdh?.length ?? 0) > 0;
  const quoteSent = Boolean(order?.baogia_gui_luc);

  const openEmail = () => {
    setEmailResult(null);
    setEmailErr("");
    setEmailTo(order?.baogia_email || "");
    setEmailOpen(true);
  };

  const sendQuote = async (e: FormEvent) => {
    e.preventDefault();
    if (!order) return;
    const email = emailTo.trim();
    if (!email) return;
    setEmailLoading(true);
    setEmailErr("");
    setEmailResult(null);
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
      setEmailResult(data);
      await load();
    } catch (err: unknown) {
      setEmailErr(err instanceof Error ? err.message : String(err));
    } finally {
      setEmailLoading(false);
    }
  };

  const approvePrice = async () => {
    if (!order) return;
    if (!quoteSent) {
      setErrorMsg("Cần gửi báo giá cho khách trước khi duyệt giá.");
      return;
    }
    setApproving(true);
    setErrorMsg("");
    try {
      await apiJson(`/api/admin/orders/${order.madh}/approve-price`, { method: "POST" });
      router.push(`/admin/don-hang/${order.madh}`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-20">
      <div className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-5 md:p-6 print:hidden">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <Link href={`/admin/don-hang/${id}/bom`} className="mt-0.5 rounded-lg p-2 text-gray-400 hover:bg-white/10" title="Quay lại sửa BOM">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="flex items-center text-xl font-bold text-gray-100 md:text-2xl">
                <FileText className="mr-3 h-6 w-6 text-orange-400" />
                Báo giá đơn hàng DH-{id}
              </h1>
              <p className="mt-1 text-sm text-gray-400">Kiểm tra báo giá, gửi email cho khách, rồi duyệt giá khi khách đồng ý.</p>
            </div>
          </div>
          <StepBar active={3} />
        </div>
      </div>

      {errorMsg && <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300 print:hidden">{errorMsg}</div>}

      {loading ? (
        <div className="flex justify-center py-20 text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : !order ? (
        <div className="rounded-xl border border-white/10 bg-[#0a0a0c] p-8 text-center text-gray-400">Không tìm thấy đơn hàng.</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <section className="xl:col-span-8">
            <div className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-6 print:border-0 print:bg-white print:text-black">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-100 print:text-black">Báo giá nhôm kính</h2>
                  <p className="mt-1 text-sm text-gray-400 print:text-gray-700">
                    DH-{order.madh} - {order.khachhang?.hoten || "Khách hàng"} {order.khachhang?.sdt ? `- ${order.khachhang.sdt}` : ""}
                  </p>
                  {order.khachhang?.diachi && <p className="text-sm text-gray-500 print:text-gray-700">{order.khachhang.diachi}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wider text-gray-500 print:text-gray-600">Tổng thanh toán</p>
                  <p className="text-2xl font-bold text-orange-300 print:text-black">{money(order.tonggiatri)}</p>
                </div>
              </div>

              {!hasBom ? (
                <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-gray-500 print:border-gray-300">
                  Đơn hàng chưa có BOM. Vui lòng quay lại bước lập BOM.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-white/10 print:border-gray-300">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead className="bg-white/5 text-gray-400 print:bg-gray-100 print:text-gray-700">
                        <tr>
                          <th className="p-3 text-left">Hạng mục</th>
                          <th className="p-3 text-right">Kích thước</th>
                          <th className="p-3 text-right">SL</th>
                          <th className="p-3 text-right">Đơn giá</th>
                          <th className="p-3 text-right">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 print:divide-gray-200">
                        {order.chitietdh.map((item) => (
                          <tr key={item.mactdh}>
                            <td className="p-3 text-gray-200 print:text-black">
                              <div className="font-semibold">{item.mota || item.vattu?.tenvt || "Hạng mục"}</div>
                              {item.vattu?.donvitinh && <div className="text-xs text-gray-500">{item.vattu.donvitinh}</div>}
                            </td>
                            <td className="p-3 text-right font-mono text-gray-300 print:text-black">{formatCutSize(item)}</td>
                            <td className="p-3 text-right">{item.soluong}</td>
                            <td className="p-3 text-right font-mono">{money(Number(item.dongiadongbang ?? 0))}</td>
                            <td className="p-3 text-right font-mono font-bold">{money(Number(item.thanhtien ?? 0))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <div className="w-full max-w-sm space-y-2 text-sm">
                      <Line label="Vật tư" value={money(materialTotal)} />
                      {Math.abs(quoteGap) > 10 && <Line label="Nhân công & lợi nhuận" value={money(quoteGap)} />}
                      <div className="flex justify-between border-t border-white/10 pt-3 text-lg font-bold print:border-gray-300">
                        <span>Tổng cộng</span>
                        <span>{money(order.tonggiatri)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          <aside className="space-y-4 xl:col-span-4 print:hidden">
            <div className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-6">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Trạng thái báo giá</div>
              <div className="mt-3 text-lg font-bold text-gray-100">{formatOrderStatus(order.trangthai)}</div>
              {quoteSent ? (
                <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                  <div className="font-bold">Đã gửi báo giá</div>
                  <div className="mt-1 text-xs text-emerald-100/80">
                    {order.baogia_email} - {new Date(order.baogia_gui_luc as string).toLocaleString("vi-VN")}
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
                  Cần gửi báo giá cho khách trước khi duyệt giá.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-6">
              <div className="space-y-3">
                <Link href={`/admin/don-hang/${id}/bom`} className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-gray-200 hover:bg-white/10">
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  Quay lại sửa BOM
                </Link>
                <button type="button" onClick={() => window.print()} disabled={!hasBom} className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-gray-200 hover:bg-white/10 disabled:opacity-50">
                  <Printer className="mr-2 h-5 w-5" />
                  In / lưu PDF
                </button>
                <button type="button" onClick={openEmail} disabled={!hasBom} className="flex w-full items-center justify-center rounded-xl bg-sky-600 px-4 py-3 font-bold text-white hover:bg-sky-500 disabled:opacity-50">
                  <Mail className="mr-2 h-5 w-5" />
                  Gửi email báo giá
                </button>
                <button
                  type="button"
                  onClick={approvePrice}
                  disabled={!hasBom || approving || !quoteSent}
                  className="flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {approving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                  Khách đã xác nhận / Duyệt giá
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {emailOpen && order && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 pb-[80px] backdrop-blur-sm md:items-center">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#12141a] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <div className="text-sm font-bold text-white">Gửi báo giá DH-{order.madh}</div>
                <div className="mt-0.5 text-xs text-gray-400">{order.khachhang?.hoten || "Khách hàng"}</div>
              </div>
              <button type="button" onClick={() => setEmailOpen(false)} className="rounded-xl p-2 text-gray-400 hover:bg-white/5" title="Đóng">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={sendQuote} className="space-y-4 p-5">
              <label className="block space-y-2">
                <span className="text-xs font-semibold text-gray-300">Email nhận báo giá</span>
                <input
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="tenkhach@example.com"
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#0a0a0c] px-3 text-sm text-white outline-none focus:border-sky-400/60"
                  required
                />
              </label>

              {emailErr && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{emailErr}</div>}

              {emailResult && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  <div className="flex items-center font-bold">
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Đã gửi và ghi nhận báo giá
                  </div>
                  <div className="mt-1 text-[11px] text-emerald-200/80">
                    messageId: <span className="font-mono">{emailResult.messageId}</span>
                  </div>
                  {emailResult.previewUrl && (
                    <a className="mt-1 block text-[11px] underline underline-offset-2" href={emailResult.previewUrl} target="_blank" rel="noreferrer">
                      Mở preview email
                    </a>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button type="button" onClick={() => setEmailOpen(false)} className="h-11 flex-1 rounded-xl border border-white/10 bg-white/5 font-bold text-gray-200 hover:bg-white/10">
                  Đóng
                </button>
                <button disabled={emailLoading} className="flex h-11 flex-1 items-center justify-center rounded-xl bg-sky-600 font-bold text-white hover:bg-sky-500 disabled:opacity-60" type="submit">
                  {emailLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
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

function formatCutSize(item: OrderDetail["chitietdh"][number]) {
  const name = item.mota ?? "";
  const dim = name.match(/\((\d+)\s*x\s*(\d+)\s*mm\)/i);
  if (dim) return `${dim[1]} x ${dim[2]} mm`;
  if (item.chieudaicat != null) return `${item.chieudaicat} mm`;
  return "Theo SL";
}

function StepBar({ active }: { active: number }) {
  const steps = ["Thông tin", "Lập BOM", "Báo giá", "Chi tiết"];
  return (
    <div className="grid grid-cols-4 gap-2 text-xs">
      {steps.map((label, index) => {
        const step = index + 1;
        const done = step < active;
        return (
          <div key={label} className={`rounded-lg border px-2.5 py-2 ${done ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200" : step === active ? "border-orange-500/30 bg-orange-500/10 text-orange-200" : "border-white/10 bg-white/[0.03] text-gray-500"}`}>
            <div className="flex items-center gap-1.5 font-bold">
              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : step}
              <span>{label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-gray-300 print:text-gray-800">
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
