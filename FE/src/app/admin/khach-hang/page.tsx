"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Contact, Edit2, Loader2, Plus, Search, Save, Trash2, X } from "lucide-react";
import { apiData, apiJson } from "@/lib/api";

type Customer = {
  makh: number;
  hoten: string;
  sdt: string;
  diachi: string | null;
  donhang?: { madh: number; tonggiatri: number; trangthai: string }[];
};

const blankForm = { hoten: "", sdt: "", diachi: "" };

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(blankForm);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await apiData<Customer[]>("/api/admin/customers"));
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
    return rows.filter((x) => `${x.hoten} ${x.sdt} ${x.diachi || ""} KH-${x.makh}`.toLowerCase().includes(q));
  }, [rows, search]);

  const showCreate = () => {
    setEditing(null);
    setForm(blankForm);
    setOpen(true);
  };

  const showEdit = (row: Customer) => {
    setEditing(row);
    setForm({ hoten: row.hoten, sdt: row.sdt, diachi: row.diachi || "" });
    setOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await apiJson(editing ? `/api/admin/customers/${editing.makh}` : "/api/admin/customers", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify({ ...form, diachi: form.diachi.trim() || null }),
      });
      setOpen(false);
      reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: Customer) => {
    if (!confirm(`Xóa khách hàng "${row.hoten}"?`)) return;
    try {
      await apiJson(`/api/admin/customers/${row.makh}`, { method: "DELETE" });
      reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center">
            <Contact className="w-6 h-6 mr-3 text-sky-400" /> Quản lý khách hàng
          </h1>
          <p className="text-sm text-gray-400 mt-1 ml-9">
            Hồ sơ khách hàng dùng chung cho đơn hàng, công nợ và báo giá.
          </p>
        </div>
        <button onClick={showCreate} className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2.5 rounded-lg font-bold flex items-center">
          <Plus className="w-4 h-4 mr-2" /> Thêm khách hàng
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm tên, SĐT, địa chỉ…"
          className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 outline-none focus:border-sky-500"
        />
      </div>

      <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-white/5 text-[11px] uppercase text-gray-400">
              <tr>
                <th className="p-4">Mã KH</th>
                <th className="p-4">Khách hàng</th>
                <th className="p-4">SĐT</th>
                <th className="p-4">Địa chỉ</th>
                <th className="p-4 text-right">Đơn hàng</th>
                <th className="p-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((row) => (
                <tr key={row.makh} className="hover:bg-white/3">
                  <td className="p-4 font-mono text-sky-300">KH-{row.makh}</td>
                  <td className="p-4 font-semibold text-gray-100">{row.hoten}</td>
                  <td className="p-4 text-gray-300">{row.sdt}</td>
                  <td className="p-4 text-gray-400">{row.diachi || "Chưa có"}</td>
                  <td className="p-4 text-right text-gray-300">{row.donhang?.length || 0}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => showEdit(row)}
                        className="p-2 text-gray-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-lg"
                        title="Sửa"
                        aria-label="Sửa khách hàng"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => remove(row)}
                        className="p-2 text-gray-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg"
                        title="Xóa"
                        aria-label="Xóa khách hàng"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Không có khách hàng phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#121214] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-6 py-5 bg-[#0a0a0c] border-b border-white/5 flex items-center justify-between">
              <h2 className="font-bold text-white">{editing ? "Sửa khách hàng" : "Thêm khách hàng"}</h2>
              <button onClick={() => setOpen(false)} className="p-1 text-gray-400 hover:text-white" title="Đóng" aria-label="Đóng">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              <Field
                label="Tên khách hàng"
                value={form.hoten}
                onChange={(v) => setForm((p) => ({ ...p, hoten: v }))}
                required
              />
              <Field label="Số điện thoại" value={form.sdt} onChange={(v) => setForm((p) => ({ ...p, sdt: v }))} required />
              <Field label="Địa chỉ" value={form.diachi} onChange={(v) => setForm((p) => ({ ...p, diachi: v }))} />
              <div className="pt-3 flex justify-end gap-3">
                <button type="button" onClick={() => setOpen(false)} className="px-5 py-2.5 rounded-lg border border-white/10 text-gray-300">
                  Hủy
                </button>
                <button disabled={saving} className="px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center">
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

function Field({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-gray-400">{label}{required && <span className="text-red-400 ml-1">*</span>}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} required={required} className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-100 outline-none focus:border-sky-500" />
    </label>
  );
}
