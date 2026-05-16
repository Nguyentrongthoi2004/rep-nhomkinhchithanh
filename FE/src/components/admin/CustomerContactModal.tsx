"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, X } from "lucide-react";
import { apiData, apiJson } from "@/lib/api";

export type CustomerContact = {
  makh: number;
  hoten: string;
  sdt: string | null;
  email: string | null;
  diachi: string | null;
};

type Props = {
  open: boolean;
  customer: CustomerContact | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

export function CustomerContactModal({ open, customer, onClose, onSaved }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!open || !customer) return;
    setName(customer.hoten || "");
    setPhone(customer.sdt || "");
    setEmail(customer.email || "");
    setAddress(customer.diachi || "");
    setErrorMsg("");

    let active = true;
    setLoadingDetail(true);
    apiData<CustomerContact>(`/api/admin/customers/${customer.makh}`)
      .then((fresh) => {
        if (!active) return;
        setName(fresh.hoten || "");
        setPhone(fresh.sdt || "");
        setEmail(fresh.email || "");
        setAddress(fresh.diachi || "");
      })
      .catch(() => null)
      .finally(() => {
        if (active) setLoadingDetail(false);
      });

    return () => {
      active = false;
    };
  }, [customer, open]);

  if (!open || !customer) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setSaving(true);
    setErrorMsg("");
    try {
      await apiJson(`/api/admin/customers/${customer.makh}`, {
        method: "PATCH",
        body: JSON.stringify({
          hoten: name.trim(),
          sdt: phone.trim(),
          email: email.trim() || null,
          diachi: address.trim() || null,
        }),
      });
      await onSaved();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-[#121214] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/5 bg-[#0a0a0c] px-6 py-5">
          <div>
            <h2 className="font-bold text-white">Sửa thông tin khách hàng</h2>
            <p className="mt-1 text-xs text-gray-500">Cập nhật liên hệ, email và địa chỉ mà không thay đổi BOM hay trạng thái đơn.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-white/10 hover:text-white" title="Đóng" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 p-6">
          {errorMsg && <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">{errorMsg}</div>}
          {loadingDetail && (
            <div className="flex items-center rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang lấy đủ số điện thoại, email và địa chỉ...
            </div>
          )}

          <Input label="Tên khách hàng / công trình" value={name} onChange={setName} required />
          <Input label="Số điện thoại" value={phone} onChange={setPhone} inputMode="tel" required />
          <Input label="Email" value={email} onChange={setEmail} type="email" inputMode="email" placeholder="tenkhach@example.com" />
          <Input label="Địa chỉ" value={address} onChange={setAddress} />

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-white/10 px-5 py-2.5 font-semibold text-gray-300 hover:bg-white/5">
              Hủy
            </button>
            <button
              disabled={saving || !name.trim() || !phone.trim()}
              className="flex items-center rounded-lg bg-emerald-600 px-5 py-2.5 font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Lưu thông tin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  type?: React.HTMLInputTypeAttribute;
  required?: boolean;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm text-gray-400">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        type={type}
        required={required}
        className="w-full rounded-lg border border-white/10 bg-[#0a0a0c] px-4 py-2.5 text-gray-100 outline-none focus:border-emerald-500"
      />
    </label>
  );
}
