"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { apiData, apiJson } from "@/lib/api";

type MaterialOption = {
  mavt: number;
  tenvt: string;
  donvitinh: string;
  chieudaimacdinh: number | null;
  dongianhap: number;
  dongiaban: number | null;
  danhmuc: { tendm: string } | null;
};

type OrderDetail = {
  madh: number;
  ngaytao: string;
  trangthai: string;
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

type EditLine = {
  id: string;
  mavt: number;
  name: string;
  length?: number;
  w?: number;
  h?: number;
  qty: number;
  unitPrice?: number;
};

const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value || 0);
const unitPrice = (m?: MaterialOption | null) => Number(m?.dongiaban ?? m?.dongianhap ?? 0);

function materialLabel(m: MaterialOption) {
  const cat = m.danhmuc?.tendm ? ` · ${m.danhmuc.tendm}` : "";
  return `VT-${m.mavt} · ${m.tenvt}${cat} · ${m.donvitinh} · ${money(unitPrice(m))}`;
}

function parseDimsFromMota(mota: string | null) {
  const s = (mota ?? "").trim();
  const m = s.match(/\((\d+)\s*x\s*(\d+)\s*mm\)/i);
  if (!m) return null;
  return { w: Number(m[1]), h: Number(m[2]) };
}

export default function AdminOrderEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params?.id || 0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [lines, setLines] = useState<EditLine[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const [order, mats] = await Promise.all([
        apiData<OrderDetail>(`/api/admin/orders/${id}`),
        apiData<MaterialOption[]>("/api/admin/materials-options"),
      ]);

      setMaterials(mats);
      setCustomer(order.khachhang?.hoten || "");
      setPhone(order.khachhang?.sdt || "");
      setAddress(order.khachhang?.diachi || "");

      const mapped = (order.chitietdh ?? []).map((it) => {
        const dims = parseDimsFromMota(it.mota);
        const name = (it.mota ?? it.vattu?.tenvt ?? "").replace(/\(\d+\s*x\s*\d+\s*mm\)/i, "").trim();
        const base: EditLine = {
          id: String(it.mactdh),
          mavt: it.mavt,
          name: name || it.vattu?.tenvt || `VT-${it.mavt}`,
          qty: it.soluong,
          unitPrice: Number(it.dongiadongbang ?? 0) || undefined,
        };
        if (dims) return { ...base, w: dims.w, h: dims.h };
        if (it.chieudaicat !== null) return { ...base, length: it.chieudaicat };
        return base;
      });
      setLines(mapped.length ? mapped : [
        { id: crypto.randomUUID(), mavt: mats[0]?.mavt || 0, name: "Hạng mục", length: 1000, qty: 1 },
      ]);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const totalCost = useMemo(() => {
    return Math.round(
      lines.reduce((sum, it) => {
        const price = Number(it.unitPrice ?? 0);
        return sum + price * Number(it.qty || 0);
      }, 0),
    );
  }, [lines]);

  const updateLine = (lineId: string, patch: Partial<EditLine>) => {
    setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, ...patch } : l)));
  };

  const removeLine = (lineId: string) => {
    setLines((prev) => prev.filter((l) => l.id !== lineId));
  };

  const addLine = () => {
    const first = materials[0]?.mavt || 0;
    setLines((prev) => [
      ...prev,
      { id: crypto.randomUUID(), mavt: first, name: "Hạng mục mới", length: 1000, qty: 1 },
    ]);
  };

  const save = async () => {
    if (!customer.trim() || !phone.trim()) return alert("Nhập tên và số điện thoại khách hàng.");
    if (lines.length === 0) return alert("Đơn hàng phải có ít nhất 1 dòng vật tư.");

    const payloadItems = lines.map((l) => {
      const base: {
        mavt: number;
        name: string;
        qty: number;
        unitPrice?: number;
        length?: number;
        w?: number;
        h?: number;
      } = {
        mavt: Number(l.mavt),
        name: l.name.trim() || `VT-${l.mavt}`,
        qty: Number(l.qty || 1),
        unitPrice: Number(l.unitPrice ?? 0) || undefined,
      };
      if (l.w !== undefined && l.h !== undefined) {
        base.w = Number(l.w);
        base.h = Number(l.h);
      } else {
        base.length = Number(l.length ?? 0);
      }
      return base;
    });

    setSaving(true);
    try {
      await apiJson(`/api/admin/orders/${id}/edit`, {
        method: "PATCH",
        body: JSON.stringify({
          customer,
          phone,
          address: address.trim() || null,
          totalCost,
          items: payloadItems,
        }),
      });
      alert(`Đã cập nhật DH-${id}`);
      router.push(`/admin/don-hang/${id}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const materialById = useMemo(() => new Map(materials.map((m) => [m.mavt, m])), [materials]);

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-6 flex items-center justify-between">
        <div className="flex items-center">
          <Link
            href={`/admin/don-hang/${id}`}
            className="p-2 hover:bg-white/10 rounded-lg mr-4 text-gray-400"
            title="Quay lại"
            aria-label="Quay lại"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Sửa đơn hàng DH-{id}</h1>
            <p className="text-sm text-gray-400 mt-1">Cho phép chỉnh BOM + thông tin khách (chỉ khi đang báo giá).</p>
          </div>
        </div>
        <button
          onClick={save}
          disabled={saving || loading}
          className="bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white px-4 py-2.5 rounded-lg font-bold flex items-center"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Lưu thay đổi
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : errorMsg ? (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-sm">{errorMsg}</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <section className="xl:col-span-5 bg-[#0a0a0c] border border-white/5 rounded-2xl p-6 space-y-4">
            <div className="text-sm font-bold text-gray-100">Khách hàng</div>
            <Field label="Tên khách hàng / công trình" value={customer} onChange={setCustomer} />
            <Field label="Số điện thoại" value={phone} onChange={setPhone} />
            <Field label="Địa chỉ" value={address} onChange={setAddress} />

            <div className="pt-3 border-t border-white/5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Tổng vật tư (tạm tính)</span>
                <span className="font-mono font-bold text-orange-300">{money(totalCost)}</span>
              </div>
            </div>
          </section>

          <section className="xl:col-span-7 bg-[#0a0a0c] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <div className="text-sm font-bold text-gray-100">BOM (có thể thêm bánh xe / phụ kiện)</div>
                <div className="text-[11px] text-gray-500 mt-1">
                  Mỗi dòng: chọn vật tư nhanh bằng ô gõ, nhập kích thước (mm), số lượng và đơn giá.
                </div>
              </div>
              <button
                type="button"
                onClick={addLine}
                className="text-xs px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 border border-emerald-500/20 rounded-lg font-bold flex items-center"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Thêm dòng
              </button>
            </div>

            <div className="space-y-3">
              {lines.map((l) => {
                const m = materialById.get(l.mavt) || null;
                return (
                  <div key={l.id} className="rounded-2xl border border-white/10 bg-white/2 p-4 space-y-3">
                    <SearchableMaterialSelect
                      label="Vật tư"
                      materials={materials}
                      value={l.mavt}
                      onChange={(mavt) => updateLine(l.id, { mavt })}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field label="Mô tả" value={l.name} onChange={(v) => updateLine(l.id, { name: v })} />
                      <Field
                        label="Đơn giá (VND)"
                        value={String(l.unitPrice ?? "")}
                        inputMode="numeric"
                        onChange={(v) => updateLine(l.id, { unitPrice: v ? Number(v) : undefined })}
                        placeholder={m ? String(unitPrice(m)) : ""}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <Field
                        label="Cắt (mm)"
                        value={String(l.length ?? "")}
                        inputMode="numeric"
                        onChange={(v) => updateLine(l.id, { length: v ? Number(v) : undefined, w: undefined, h: undefined })}
                        placeholder="VD: 2300"
                      />
                      <Field
                        label="SL"
                        value={String(l.qty)}
                        inputMode="numeric"
                        onChange={(v) => updateLine(l.id, { qty: Math.max(1, Number(v || 1)) })}
                      />
                      <div className="flex items-end justify-end">
                        <button
                          type="button"
                          onClick={() => removeLine(l.id)}
                          className="h-10 px-3 rounded-xl bg-red-600/15 hover:bg-red-600/25 border border-red-500/20 text-red-300 font-bold flex items-center"
                          title="Xóa dòng"
                        >
                          <Trash2 className="w-4 h-4 mr-1.5" /> Xóa
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-gray-400 flex justify-between">
                      <span>{m ? materialLabel(m) : "—"}</span>
                      <span className="font-mono font-bold text-gray-200">
                        {money(Number(l.unitPrice ?? 0) * Number(l.qty || 0))}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs text-gray-400">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="w-full h-10 rounded-xl bg-[#0a0a0c] border border-white/10 px-3 text-sm text-white outline-none focus:border-orange-500/60"
      />
    </label>
  );
}

function SearchableMaterialSelect({
  label,
  materials,
  value,
  onChange,
}: {
  label: string;
  materials: MaterialOption[];
  value: number;
  onChange: (mavt: number) => void;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return materials;
    return materials.filter((m) => materialLabel(m).toLowerCase().includes(s));
  }, [materials, q]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-gray-400">{label}</div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Gõ để lọc vật tư…"
          className="h-9 w-[260px] max-w-full rounded-xl bg-[#0a0a0c] border border-white/10 px-3 text-xs text-white outline-none focus:border-emerald-500/50"
        />
      </div>
      <select
        aria-label={label}
        title={label}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-10 rounded-xl bg-[#111318] border border-white/10 px-3 text-sm text-white outline-none focus:border-orange-500/60"
      >
        {filtered.map((m) => (
          <option key={m.mavt} value={m.mavt}>
            {materialLabel(m)}
          </option>
        ))}
      </select>
    </div>
  );
}

