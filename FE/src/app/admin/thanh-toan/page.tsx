"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, ReceiptText, Save, Search, WalletCards, X } from "lucide-react";
import { apiData, apiJson } from "@/lib/api";
import { formatOrderStatus } from "@/lib/order-status";

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
  khachhang: { hoten: string; sdt: string } | null;
  dathanhtoan: number;
  conno: number;
  giaodich: PaymentRow[];
};

const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value || 0);

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

export default function PaymentsPage() {
  const [rows, setRows] = useState<OrderPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ madh: 0, loaigd: "DAT_COC", phuongthuc: "TIEN_MAT", sotien: 0, ghichu: "" });

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiData<OrderPayment[]>("/api/admin/payments");
      setRows(data);
      setForm((p) => ({ ...p, madh: p.madh || data[0]?.madh || 0 }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => `DH-${row.madh} ${row.khachhang?.hoten || ""} ${row.khachhang?.sdt || ""}`.toLowerCase().includes(q));
  }, [rows, search]);

  const totals = useMemo(() => ({
    revenue: rows.reduce((sum, row) => sum + row.tonggiatri, 0),
    paid: rows.reduce((sum, row) => sum + row.dathanhtoan, 0),
    debt: rows.reduce((sum, row) => sum + row.conno, 0),
  }), [rows]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.madh || form.sotien <= 0) return;
    setSaving(true);
    try {
      await apiJson("/api/admin/payments", {
        method: "POST",
        body: JSON.stringify({ ...form, ghichu: form.ghichu.trim() || null }),
      });
      setOpen(false);
      reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
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
        <button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg font-bold flex items-center">
          <Plus className="w-4 h-4 mr-2" /> Ghi nhận
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Tổng giá trị đơn" value={money(totals.revenue)} />
        <Stat label="Đã thu" value={money(totals.paid)} tone="text-emerald-300" />
        <Stat label="Còn nợ" value={money(totals.debt)} tone="text-amber-300" />
      </div>

      <div className="relative max-w-md">
        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo mã đơn, khách hàng, SĐT..."
          className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 outline-none focus:border-emerald-500"
        />
      </div>

      <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center text-gray-400"><Loader2 className="w-8 h-8 animate-spin" /></div>
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
              {filtered.map((row) => {
                const latest = row.giaodich[0];
                return (
                  <tr key={row.madh} className="hover:bg-white/3">
                    <td className="p-4 font-mono text-emerald-300">DH-{row.madh}</td>
                    <td className="p-4">
                      <div className="font-semibold text-gray-100">{row.khachhang?.hoten || "Khách lẻ"}</div>
                      <div className="text-xs text-gray-500">{row.khachhang?.sdt}</div>
                      <div className="text-[11px] text-gray-500 mt-1">
                        Trạng thái: <span className="text-gray-300">{formatOrderStatus(row.trangthai)}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right font-mono text-gray-200">{money(row.tonggiatri)}</td>
                    <td className="p-4 text-right font-mono text-emerald-300">{money(row.dathanhtoan)}</td>
                    <td className="p-4 text-right font-mono text-amber-300">{money(row.conno)}</td>
                    <td className="p-4 text-sm text-gray-400">
                      {latest
                        ? `${formatTransactionType(latest.loaigd)} · ${formatPaymentMethod(latest.phuongthuc)} · ${money(latest.sotien)} · ${new Date(latest.ngaygd).toLocaleDateString("vi-VN")}`
                        : "Chưa có"}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-500">Không có dữ liệu thanh toán.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#121214] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-6 py-5 bg-[#0a0a0c] border-b border-white/5 flex items-center justify-between">
              <h2 className="font-bold text-white flex items-center"><ReceiptText className="w-5 h-5 mr-2 text-emerald-300" /> Ghi nhận thanh toán</h2>
              <button onClick={() => setOpen(false)} className="p-1 text-gray-400 hover:text-white" title="Đóng" aria-label="Đóng"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <Select label="Đơn hàng" value={String(form.madh)} onChange={(v) => setForm((p) => ({ ...p, madh: Number(v) }))}>
                {rows.map((row) => <option key={row.madh} value={row.madh}>DH-{row.madh} — {row.khachhang?.hoten || "Khách lẻ"} — còn {money(row.conno)}</option>)}
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
                <input type="number" min={1} value={form.sotien || ""} onChange={(e) => setForm((p) => ({ ...p, sotien: Number(e.target.value) }))} className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-100 outline-none focus:border-emerald-500" required />
              </label>
              <label className="block space-y-2">
                <span className="text-sm text-gray-400">Ghi chú</span>
                <input value={form.ghichu} onChange={(e) => setForm((p) => ({ ...p, ghichu: e.target.value }))} className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-100 outline-none focus:border-emerald-500" />
              </label>
              <div className="pt-3 flex justify-end gap-3">
                <button type="button" onClick={() => setOpen(false)} className="px-5 py-2.5 rounded-lg border border-white/10 text-gray-300">Hủy</button>
                <button disabled={saving} className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center">
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
