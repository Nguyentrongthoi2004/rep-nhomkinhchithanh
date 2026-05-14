"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ClipboardList, Loader2, User } from "lucide-react";
import { apiData, apiJson } from "@/lib/api";

type OrderDetail = {
  madh: number;
  trangthai: string;
  khachhang: { hoten: string; sdt: string; diachi: string | null } | null;
};

export default function CreateOrderPage() {
  const router = useRouter();
  const [editingId, setEditingId] = useState(0);

  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const canSubmit = useMemo(() => customer.trim().length > 0 && phone.trim().length > 0 && !saving, [customer, phone, saving]);

  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get("id") || 0);
    setEditingId(Number.isFinite(id) ? id : 0);
  }, []);

  const loadOrder = useCallback(async () => {
    if (!editingId) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const order = await apiData<OrderDetail>(`/api/admin/orders/${editingId}`);
      setCustomer(order.khachhang?.hoten || "");
      setPhone(order.khachhang?.sdt || "");
      setAddress(order.khachhang?.diachi || "");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [editingId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const submitInfo = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setErrorMsg("");
    try {
      if (editingId) {
        await apiJson(`/api/admin/orders/${editingId}/customer`, {
          method: "PATCH",
          body: JSON.stringify({
            customer: customer.trim(),
            phone: phone.trim(),
            address: address.trim() || null,
          }),
        });
        router.push(`/admin/don-hang/${editingId}/bom`);
        return;
      }

      const result = await apiData<{ madh: number }>("/api/admin/orders", {
        method: "POST",
        body: JSON.stringify({
          customer: customer.trim(),
          phone: phone.trim(),
          address: address.trim() || null,
          totalCost: 0,
          items: [],
        }),
      });
      router.push(`/admin/don-hang/${result.madh}/bom`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      <div className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-5 md:p-6">
        <div className="flex items-start gap-4">
          <Link href="/admin/don-hang" className="mt-0.5 rounded-lg p-2 text-gray-400 hover:bg-white/10" title="Quay lại danh sách">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="flex items-center text-xl font-bold text-gray-100 md:text-2xl">
              <ClipboardList className="mr-3 h-6 w-6 text-orange-400" />
              Tạo đơn hàng - Thông tin khách hàng
            </h1>
            <p className="mt-1 text-sm text-gray-400">Ghi nhận khách hàng/công trình trước, sau đó mới lập BOM và gửi báo giá.</p>
          </div>
        </div>
      </div>

      {errorMsg && <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">{errorMsg}</div>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-6 lg:col-span-7">
          <h2 className="mb-5 flex items-center text-sm font-bold uppercase tracking-wider text-orange-300">
            <User className="mr-2 h-4 w-4" />
            Khách hàng
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Đang tải thông tin đơn hàng...
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input label="Tên khách hàng / công trình" value={customer} onChange={setCustomer} autoFocus />
                <Input label="Số điện thoại" value={phone} onChange={setPhone} inputMode="tel" />
                <div className="md:col-span-2">
                  <Input label="Địa chỉ" value={address} onChange={setAddress} />
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-relaxed text-gray-400">
                Sau khi xác nhận, hệ thống tạo đơn ở bước tiếp nhận. Đơn vẫn chưa được báo giá, chưa thanh toán và chưa phân công cho đến khi khách xác nhận giá.
              </div>

              <button
                type="button"
                onClick={submitInfo}
                disabled={!canSubmit}
                className="flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                Xác nhận thông tin
              </button>
            </div>
          )}
        </section>

        <aside className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-6 lg:col-span-5">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Luồng xử lý</div>
          <div className="mt-5 space-y-4">
            <Step index={1} title="Thông tin khách hàng" active text="Nhập tên, số điện thoại và địa chỉ công trình." />
            <Step index={2} title="Lập BOM" text="Chọn mẫu cửa hoặc nhập BOM thủ công." />
            <Step index={3} title="Báo giá" text="Gửi báo giá cho khách trước khi duyệt." />
            <Step index={4} title="Chi tiết đơn hàng" text="Thanh toán, phân công và sản xuất sau duyệt giá." />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  inputMode,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoFocus?: boolean;
}) {
  return (
    <label className="block space-y-2">
      <span className="block text-xs text-gray-400">{label}</span>
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-gray-100 outline-none transition-colors focus:border-orange-500/70"
      />
    </label>
  );
}

function Step({ index, title, text, active = false }: { index: number; title: string; text: string; active?: boolean }) {
  return (
    <div className="flex gap-3">
      <div
        className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
          active ? "border-orange-400/50 bg-orange-500/15 text-orange-200" : "border-white/10 bg-white/5 text-gray-400"
        }`}
      >
        {index}
      </div>
      <div>
        <div className="text-sm font-bold text-gray-100">{title}</div>
        <div className="mt-1 text-xs leading-relaxed text-gray-500">{text}</div>
      </div>
    </div>
  );
}
