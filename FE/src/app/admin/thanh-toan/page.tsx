"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, ReceiptText, Save, Search, WalletCards, X } from "lucide-react";
import { apiData, apiJson } from "@/lib/api";
import { formatOrderStatus } from "@/lib/order-status";
import { ListPagination } from "@/components/admin/ListPagination";
import { DEFAULT_PAGE_SIZE, matchesTimeFilter, paginate, type TimeFilter } from "@/lib/list-controls";

type PaymentRow = {
  magd: number;
  madh: number;
  loaigd: string;
  phuongthuc: string;
  sotien: number;
  ngaygd: string;
  ghichu: string | null;
};

type OrderPayment = {
  madh: number;
  ngaytao: string;
  trangthai: string;
  tonggiatri: number;
  khachhang: { makh: number; hoten: string; sdt: string; email: string | null; diachi: string | null } | null;
  dathanhtoan: number;
  conno: number;
  giaodich: PaymentRow[];
};

const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value || 0);
const moneyPlain = (value: number) => `${new Intl.NumberFormat("vi-VN").format(value || 0)} đ`;

function parseCurrencyInput(raw: string): { value: number; valid: boolean } {
  const text = raw.trim();
  if (!text) return { value: 0, valid: true };
  if (/[^0-9.,\s]/.test(text)) return { value: 0, valid: false };
  const normalized = text.replace(/[.,\s]/g, "");
  if (!normalized) return { value: 0, valid: true };
  const value = Number(normalized);
  return { value, valid: Number.isSafeInteger(value) && value >= 0 };
}

function formatCurrencyInput(raw: string): string {
  const parsed = parseCurrencyInput(raw);
  if (!parsed.valid || parsed.value <= 0) return raw;
  return new Intl.NumberFormat("vi-VN").format(parsed.value);
}

function formatTransactionType(code: string): string {
  switch (code) {
    case "DAT_COC":
      return "Đặt cọc";
    case "TAM_UNG":
      return "Tạm ứng";
    case "HOAN_TAT":
      return "Hoàn tất";
    case "HUY_DON":
      return "Hủy đơn / hoàn tiền";
    default:
      return code;
  }
}

function formatPaymentMethod(code: string): string {
  switch (code) {
    case "TIEN_MAT":
      return "Tiền mặt";
    case "CHUYEN_KHOAN":
      return "Chuyển khoản";
    default:
      return code;
  }
}

function getPaymentFilterDate(row: OrderPayment) {
  return row.giaodich[0]?.ngaygd ?? row.ngaytao;
}

export default function PaymentsPage() {
  const [rows, setRows] = useState<OrderPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ madh: 0, loaigd: "DAT_COC", phuongthuc: "TIEN_MAT", ghichu: "" });
  const [amountInput, setAmountInput] = useState("");
  const [receiptEmail, setReceiptEmail] = useState("");
  const [notice, setNotice] = useState<{ type: "ok" | "warn"; text: string } | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [page, setPage] = useState(1);

  const updateAmountInput = (raw: string) => {
    setAmountInput(formatCurrencyInput(raw));
  };

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiData<OrderPayment[]>("/api/admin/payments");
      setRows(data);
      const firstPayable = data.find((row) => !["KHAO_SAT", "BAO_GIA_NHAP"].includes(row.trangthai)) ?? data[0];
      setForm((p) => ({ ...p, madh: p.madh || firstPayable?.madh || 0 }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    setPage(1);
  }, [search, timeFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const text = `DH-${row.madh} ${row.khachhang?.hoten || ""} ${row.khachhang?.sdt || ""} ${row.khachhang?.email || ""} ${row.khachhang?.diachi || ""} ${formatOrderStatus(row.trangthai)}`.toLowerCase();
      return (!q || text.includes(q)) && matchesTimeFilter(getPaymentFilterDate(row), timeFilter);
    });
  }, [rows, search, timeFilter]);

  const pagedRows = useMemo(() => paginate(filtered, page, DEFAULT_PAGE_SIZE), [filtered, page]);

  const totals = useMemo(
    () => ({
      revenue: rows.reduce((sum, row) => sum + row.tonggiatri, 0),
      paid: rows.reduce((sum, row) => sum + row.dathanhtoan, 0),
      debt: rows.reduce((sum, row) => sum + row.conno, 0),
    }),
    [rows],
  );

  const selectedOrder = useMemo(() => rows.find((row) => row.madh === form.madh) ?? null, [form.madh, rows]);
  const openPaymentModal = () => {
    setReceiptEmail(selectedOrder?.khachhang?.email || "");
    setOpen(true);
  };
  const selectPaymentOrder = (madh: number) => {
    const nextOrder = rows.find((row) => row.madh === madh) ?? null;
    setForm((p) => ({ ...p, madh }));
    setReceiptEmail(nextOrder?.khachhang?.email || "");
  };
  const parsedAmount = useMemo(() => parseCurrencyInput(amountInput), [amountInput]);
  const clearsDebt = useMemo(
    () =>
      form.loaigd !== "HUY_DON" &&
      !!selectedOrder &&
      selectedOrder.conno > 0 &&
      parsedAmount.valid &&
      parsedAmount.value >= selectedOrder.conno,
    [form.loaigd, parsedAmount, selectedOrder],
  );
  const effectiveTransactionType = clearsDebt ? "HOAN_TAT" : form.loaigd;
  const amountError = useMemo(() => {
    if (!parsedAmount.valid) return "Số tiền chỉ được nhập chữ số, dấu chấm hoặc dấu phẩy.";
    if (parsedAmount.value <= 0) return "Số tiền phải lớn hơn 0.";
    if (selectedOrder && ["KHAO_SAT", "BAO_GIA_NHAP"].includes(selectedOrder.trangthai)) return "Đơn hàng cần được duyệt giá trước khi ghi nhận thanh toán.";
    if (form.loaigd !== "HUY_DON" && selectedOrder && parsedAmount.value > selectedOrder.conno) {
      return `Số tiền vượt quá công nợ còn lại (${money(selectedOrder.conno)}).`;
    }
    return "";
  }, [form.loaigd, parsedAmount, selectedOrder]);

  const receiptEmailTrimmed = receiptEmail.trim();
  const receiptEmailError =
    receiptEmailTrimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(receiptEmailTrimmed)
      ? "Email nhận xác nhận chưa hợp lệ."
      : "";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.madh || amountError || receiptEmailError) return;
    setSaving(true);
    setNotice(null);
    try {
      await apiJson("/api/admin/payments", {
        method: "POST",
        body: JSON.stringify({ ...form, sotien: parsedAmount.value, ghichu: form.ghichu.trim() || null }),
      });
      let emailMsg = "";
      if (receiptEmailTrimmed && selectedOrder) {
        try {
          await apiJson("/api/admin/emails/send-payment-receipt", {
            method: "POST",
            body: JSON.stringify({
              madh: selectedOrder.madh,
              email: receiptEmailTrimmed,
              customer: selectedOrder.khachhang?.hoten || `DH-${selectedOrder.madh}`,
              phone: selectedOrder.khachhang?.sdt || null,
              transactionType: formatTransactionType(effectiveTransactionType),
              paymentMethod: formatPaymentMethod(form.phuongthuc),
              amount: parsedAmount.value,
              paidTotal: selectedOrder.dathanhtoan + parsedAmount.value,
              remainingDebt: Math.max(0, selectedOrder.conno - parsedAmount.value),
              note: form.ghichu.trim() || null,
            }),
          });
          emailMsg = ` Email xác nhận đã gửi tới ${receiptEmailTrimmed}.`;
          if (selectedOrder.khachhang?.makh && !selectedOrder.khachhang.email) {
            await apiJson(`/api/admin/customers/${selectedOrder.khachhang.makh}`, {
              method: "PATCH",
              body: JSON.stringify({ email: receiptEmailTrimmed }),
            });
          }
        } catch (mailErr: unknown) {
          emailMsg = ` Giao dịch đã lưu nhưng gửi email lỗi: ${mailErr instanceof Error ? mailErr.message : String(mailErr)}.`;
        }
      }
      setOpen(false);
      setAmountInput("");
      setReceiptEmail("");
      setForm((p) => ({ ...p, ghichu: "" }));
      setNotice({ type: emailMsg.includes("lỗi") ? "warn" : "ok", text: `Đã ghi nhận thanh toán DH-${form.madh}.${emailMsg}` });
      reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const fillRemainingDebt = () => {
    if (!selectedOrder || selectedOrder.conno <= 0) return;
    setAmountInput(formatCurrencyInput(String(selectedOrder.conno)));
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center">
            <WalletCards className="w-6 h-6 mr-3 text-emerald-400" /> Quản lý thanh toán
          </h1>
          <p className="text-sm text-gray-400 mt-1 ml-9">Ghi nhận giao dịch và theo dõi công nợ theo từng đơn hàng.</p>
        </div>
        <button onClick={openPaymentModal} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg font-bold flex items-center">
          <Plus className="w-4 h-4 mr-2" /> Ghi nhận
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Tổng giá trị đơn" value={money(totals.revenue)} />
        <Stat label="Đã thu" value={money(totals.paid)} tone="text-emerald-300" />
        <Stat label="Còn nợ" value={money(totals.debt)} tone="text-amber-300" />
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full max-w-xl">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã đơn, khách hàng, SĐT, email..."
            autoComplete="off"
            name="mini-erp-payment-search"
            className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TimeFilterButton active={timeFilter === "all"} onClick={() => setTimeFilter("all")}>Tất cả</TimeFilterButton>
          <TimeFilterButton active={timeFilter === "today"} onClick={() => setTimeFilter("today")}>Hôm nay</TimeFilterButton>
          <TimeFilterButton active={timeFilter === "month"} onClick={() => setTimeFilter("month")}>Tháng này</TimeFilterButton>
          <TimeFilterButton active={timeFilter === "year"} onClick={() => setTimeFilter("year")}>Năm này</TimeFilterButton>
        </div>
      </div>

      {notice && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            notice.type === "ok"
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
              : "border-amber-500/25 bg-amber-500/10 text-amber-200"
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-white/5 text-[11px] uppercase text-gray-400">
              <tr>
                <th className="p-4">Đơn hàng</th>
                <th className="p-4">Khách hàng</th>
                <th className="p-4 text-right">Giá trị</th>
                <th className="p-4 text-right">Đã thu</th>
                <th className="p-4 text-right">Còn nợ</th>
                <th className="p-4">Giao dịch gần nhất</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pagedRows.items.map((row) => {
                const latest = row.giaodich[0];
                return (
                  <tr key={row.madh} className="hover:bg-white/3">
                    <td className="p-4 font-mono text-emerald-300">DH-{row.madh}</td>
                    <td className="p-4">
                      <div className="font-semibold text-gray-100">{row.khachhang?.hoten || "Khách lẻ"}</div>
                      <div className="text-xs text-gray-500">{row.khachhang?.sdt || "Chưa có SĐT"}</div>
                      <div className={`mt-1 break-all text-xs ${row.khachhang?.email ? "font-mono text-sky-300/90" : "text-gray-600"}`}>
                        {row.khachhang?.email || "Chưa có email"}
                      </div>
                      <div className="mt-1 line-clamp-2 text-xs text-gray-500">{row.khachhang?.diachi || "Chưa có địa chỉ"}</div>
                      <div className="text-[11px] text-gray-500 mt-1">
                        Trạng thái: <span className="text-gray-300">{formatOrderStatus(row.trangthai)}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right font-mono text-gray-200">{money(row.tonggiatri)}</td>
                    <td className="p-4 text-right font-mono text-emerald-300">{money(row.dathanhtoan)}</td>
                    <td className="p-4 text-right font-mono text-amber-300">{money(row.conno)}</td>
                    <td className="p-4 text-sm text-gray-400">
                      {latest ? (
                        <div className="space-y-1">
                          <div>
                            {formatTransactionType(latest.loaigd)} · {formatPaymentMethod(latest.phuongthuc)} · {money(latest.sotien)} · {new Date(latest.ngaygd).toLocaleDateString("vi-VN")}
                          </div>
                          {latest.ghichu && <div className="text-xs text-gray-500 line-clamp-2">Ghi chú: {latest.ghichu}</div>}
                        </div>
                      ) : (
                        "Chưa có"
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Không có dữ liệu thanh toán.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        {!loading && (
          <ListPagination
            page={pagedRows.page}
            pageCount={pagedRows.pageCount}
            total={filtered.length}
            start={pagedRows.start}
            end={pagedRows.end}
            onPageChange={setPage}
          />
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#121214] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-6 py-5 bg-[#0a0a0c] border-b border-white/5 flex items-center justify-between">
              <h2 className="font-bold text-white flex items-center">
                <ReceiptText className="w-5 h-5 mr-2 text-emerald-300" /> Ghi nhận thanh toán
              </h2>
              <button onClick={() => setOpen(false)} className="p-1 text-gray-400 hover:text-white" title="Đóng" aria-label="Đóng">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <Select label="Đơn hàng" value={String(form.madh)} onChange={(v) => selectPaymentOrder(Number(v))}>
                {rows.map((row) => (
                  <option key={row.madh} value={row.madh} disabled={["KHAO_SAT", "BAO_GIA_NHAP"].includes(row.trangthai)}>
                    DH-{row.madh} - {row.khachhang?.hoten || "Khách lẻ"} - còn {money(row.conno)}
                    {["KHAO_SAT", "BAO_GIA_NHAP"].includes(row.trangthai) ? " - cần duyệt giá" : ""}
                  </option>
                ))}
              </Select>
              <Select label="Loại giao dịch" value={form.loaigd} onChange={(v) => setForm((p) => ({ ...p, loaigd: v }))}>
                <option value="DAT_COC">Đặt cọc</option>
                <option value="TAM_UNG">Tạm ứng</option>
                <option value="HOAN_TAT">Hoàn tất</option>
                <option value="HUY_DON">Hủy đơn / hoàn tiền</option>
              </Select>
              <Select label="Phương thức" value={form.phuongthuc} onChange={(v) => setForm((p) => ({ ...p, phuongthuc: v }))}>
                <option value="TIEN_MAT">Tiền mặt</option>
                <option value="CHUYEN_KHOAN">Chuyển khoản</option>
              </Select>
              <label className="block space-y-2">
                <span className="text-sm text-gray-400">Số tiền</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amountInput}
                  onChange={(e) => updateAmountInput(e.target.value)}
                  placeholder="VD: 7.858.808"
                  className={`w-full bg-[#0a0a0c] border rounded-lg px-4 py-2.5 text-gray-100 outline-none focus:border-emerald-500 font-mono text-base ${
                    amountError ? "border-red-500/40" : "border-white/10"
                  }`}
                  required
                />
                <div className="flex items-center justify-between gap-3">
                  <div className={`text-sm font-semibold ${amountError ? "text-red-300" : "text-emerald-300"}`}>
                    {amountError || `Số tiền sẽ ghi nhận: ${moneyPlain(parsedAmount.value)}`}
                  </div>
                  <button
                    type="button"
                    onClick={fillRemainingDebt}
                    disabled={!selectedOrder || ["KHAO_SAT", "BAO_GIA_NHAP"].includes(selectedOrder.trangthai) || selectedOrder.conno <= 0}
                    className="shrink-0 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-40 disabled:hover:bg-emerald-500/10"
                  >
                    Thanh toán đủ số còn nợ
                  </button>
                </div>
                {clearsDebt && !amountError && (
                  <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200">
                    Thanh toán đủ công nợ, giao dịch sẽ được lưu là Hoàn tất.
                  </div>
                )}
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-gray-400">Ghi chú</span>
                <input
                  value={form.ghichu}
                  onChange={(e) => setForm((p) => ({ ...p, ghichu: e.target.value }))}
                  className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-100 outline-none focus:border-emerald-500"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-gray-400">Email nhận xác nhận thanh toán</span>
                <input
                  value={receiptEmail}
                  onChange={(e) => setReceiptEmail(e.target.value)}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="tenkhach@example.com"
                  className={`w-full bg-[#0a0a0c] border rounded-lg px-4 py-2.5 text-gray-100 outline-none focus:border-emerald-500 ${
                    receiptEmailError ? "border-red-500/40" : "border-white/10"
                  }`}
                />
                <div className={`text-xs ${receiptEmailError ? "text-red-300" : "text-gray-500"}`}>
                  {receiptEmailError ||
                    (selectedOrder?.khachhang?.email
                      ? "Email được lấy mặc định từ hồ sơ khách hàng, có thể sửa trước khi gửi."
                      : "Khách chưa có email. Có thể nhập thủ công hoặc để trống để chỉ ghi nhận thanh toán.")}
                </div>
              </label>
              <div className="pt-3 flex justify-end gap-3">
                <button type="button" onClick={() => setOpen(false)} className="px-5 py-2.5 rounded-lg border border-white/10 text-gray-300">
                  Hủy
                </button>
                <button disabled={saving || !!amountError || !!receiptEmailError} className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center disabled:opacity-60">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone = "text-gray-100" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-5">
      <div className="text-xs uppercase tracking-wider text-gray-500 font-bold">{label}</div>
      <div className={`text-xl font-bold font-mono mt-2 ${tone}`}>{value}</div>
    </div>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-gray-400">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-100 outline-none focus:border-emerald-500">
        {children}
      </select>
    </label>
  );
}

function TimeFilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
        active
          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
          : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}
