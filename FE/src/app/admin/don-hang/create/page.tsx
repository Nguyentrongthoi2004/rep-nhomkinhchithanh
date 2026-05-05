"use client";

import { useCallback, useEffect, useMemo, useState, useId } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Loader2, Printer, Save, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiData } from "@/lib/api";

type MaterialOption = {
  mavt: number;
  tenvt: string;
  donvitinh: string;
  chieudaimacdinh: number | null;
  dongianhap: number;
  dongiaban: number | null;
  danhmuc: { tendm: string } | null;
};

type OrderItemPayload = {
  mavt: number;
  name: string;
  length?: number;
  w?: number;
  h?: number;
  qty: number;
  unitPrice: number;
};

const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value || 0);
const unitPrice = (m?: MaterialOption | null) => Number(m?.dongiaban ?? m?.dongianhap ?? 0);

function isGlass(m: MaterialOption) {
  const text = `${m.tenvt} ${m.danhmuc?.tendm || ""} ${m.donvitinh}`.toLowerCase();
  return text.includes("kinh") || text.includes("glass") || text.includes("m2") || text.includes("m²");
}

function buildBom(width: number, height: number, frame: MaterialOption, wing: MaterialOption, glass: MaterialOption) {
  const wingWidth = Math.max(1, Math.round((width - 87) / 2));
  const wingHeight = Math.max(1, Math.round(height - 46));
  const glassWidth = Math.max(1, wingWidth - 120);
  const glassHeight = Math.max(1, wingHeight - 120);

  const linearUnit = (material: MaterialOption, length: number) => {
    const baseLength = material.chieudaimacdinh || length;
    return Math.round((unitPrice(material) * length) / baseLength);
  };
  const glassLinePrice = Math.round((unitPrice(glass) * glassWidth * glassHeight) / 1_000_000);

  return [
    { mavt: frame.mavt, name: `Khung bao đứng - ${frame.tenvt}`, length: height, qty: 2, unitPrice: linearUnit(frame, height) },
    { mavt: frame.mavt, name: `Khung bao ngang - ${frame.tenvt}`, length: width, qty: 1, unitPrice: linearUnit(frame, width) },
    { mavt: wing.mavt, name: `Cánh dọc - ${wing.tenvt}`, length: wingHeight, qty: 4, unitPrice: linearUnit(wing, wingHeight) },
    { mavt: wing.mavt, name: `Cánh ngang - ${wing.tenvt}`, length: wingWidth, qty: 4, unitPrice: linearUnit(wing, wingWidth) },
    { mavt: glass.mavt, name: `Kính - ${glass.tenvt}`, w: glassWidth, h: glassHeight, qty: 2, unitPrice: glassLinePrice },
  ] satisfies OrderItemPayload[];
}

export default function CreateOrderPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [width, setWidth] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");
  const [frameId, setFrameId] = useState(0);
  const [wingId, setWingId] = useState(0);
  const [glassId, setGlassId] = useState(0);
  const [laborPerSqm, setLaborPerSqm] = useState(350000);
  const [margin, setMargin] = useState(15);
  const [saving, setSaving] = useState(false);

  const loadMaterials = useCallback(async () => {
    setLoadingMaterials(true);
    try {
      const list = await apiData<MaterialOption[]>("/api/admin/materials-options");
      setMaterials(list);
      const bars = list.filter((m) => m.chieudaimacdinh);
      const glasses = list.filter(isGlass);
      setFrameId((p) => p || bars[0]?.mavt || list[0]?.mavt || 0);
      setWingId((p) => p || bars[1]?.mavt || bars[0]?.mavt || list[0]?.mavt || 0);
      setGlassId((p) => p || glasses[0]?.mavt || list.find((m) => !m.chieudaimacdinh)?.mavt || list[0]?.mavt || 0);
    } finally {
      setLoadingMaterials(false);
    }
  }, []);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  const frame = materials.find((m) => m.mavt === frameId) || null;
  const wing = materials.find((m) => m.mavt === wingId) || null;
  const glass = materials.find((m) => m.mavt === glassId) || null;
  const hasSize = typeof width === "number" && typeof height === "number" && width > 0 && height > 0;
  const bom = hasSize && frame && wing && glass ? buildBom(width, height, frame, wing, glass) : [];
  const sqm = hasSize ? (width * height) / 1_000_000 : 0;
  const materialTotal = bom.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  const laborTotal = Math.round(sqm * laborPerSqm);
  const quoteTotal = Math.round((materialTotal + laborTotal) * (1 + margin / 100));

  const saveOrder = async () => {
    if (!customer.trim() || !phone.trim()) return alert("Nhập tên và số điện thoại khách hàng.");
    if (bom.length === 0) return alert("Nhập kích thước và chọn vật tư hợp lệ.");
    setSaving(true);
    try {
      const result = await apiData<{ madh: number }>("/api/admin/orders", {
        method: "POST",
        body: JSON.stringify({
          customer,
          phone,
          address: address.trim() || null,
          totalCost: quoteTotal,
          items: bom,
        }),
      });
      alert(`Đã tạo đơn hàng DH-${result.madh}`);
      router.push(`/admin/don-hang/${result.madh}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const materialChoices = useMemo(() => materials.map((m) => (
    <option key={m.mavt} value={m.mavt}>
      VT-{m.mavt} - {m.tenvt} - {money(unitPrice(m))}
    </option>
  )), [materials]);

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-6 flex items-center justify-between print:hidden">
        <div className="flex items-center">
          <Link href="/admin/don-hang" className="p-2 hover:bg-white/10 rounded-lg mr-4 text-gray-400" title="Quay lại">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-100 flex items-center">
              <FileText className="w-6 h-6 mr-3 text-orange-400" /> Tạo đơn hàng & báo giá
            </h1>
            <p className="text-sm text-gray-400 mt-1">BOM và giá được tính từ vật tư trong cơ sở dữ liệu.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => window.print()} disabled={bom.length === 0} className="bg-white/5 border border-white/10 hover:bg-white/10 text-gray-200 px-4 py-2.5 rounded-lg font-bold flex items-center disabled:opacity-50">
            <Printer className="w-4 h-4 mr-2" /> In / lưu PDF
          </button>
          <button onClick={saveOrder} disabled={saving || bom.length === 0} className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-lg font-bold flex items-center disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Lưu đơn
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-5 space-y-6 print:hidden">
          <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-orange-300 flex items-center mb-5">
              <User className="w-4 h-4 mr-2" /> Khách hàng
            </h2>
            <div className="space-y-4">
              <Input label="Tên khách hàng / công trình" value={customer} onChange={setCustomer} />
              <Input label="Số điện thoại" value={phone} onChange={setPhone} />
              <Input label="Địa chỉ" value={address} onChange={setAddress} />
            </div>
          </div>

          <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-orange-300 mb-5">Thông số sản xuất</h2>
            <div className="grid grid-cols-2 gap-4">
              <NumberInput label="Chiều rộng W (mm)" value={width} onChange={setWidth} />
              <NumberInput label="Chiều cao H (mm)" value={height} onChange={setHeight} />
            </div>
            <div className="space-y-4 mt-4">
              <Select label="Vật tư khung bao" value={frameId} onChange={setFrameId}>{materialChoices}</Select>
              <Select label="Vật tư cánh" value={wingId} onChange={setWingId}>{materialChoices}</Select>
              <Select label="Vật tư kính" value={glassId} onChange={setGlassId}>{materialChoices}</Select>
              {loadingMaterials && (
                <div className="text-sm text-gray-400 flex items-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang tải vật tư…
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-blue-300 mb-5">Cấu hình báo giá</h2>
            <div className="grid grid-cols-2 gap-4">
              <NumberInput label="Nhân công / m²" value={laborPerSqm} onChange={(v) => setLaborPerSqm(v === "" ? 0 : v)} />
              <NumberInput label="Lợi nhuận (%)" value={margin} onChange={(v) => setMargin(v === "" ? 0 : v)} />
            </div>
          </div>
        </section>

        <section className="xl:col-span-7 print:col-span-12 max-w-[210mm] print:mx-auto bg-[#0a0a0c] border border-white/5 rounded-2xl p-6 print:border-0 print:shadow-none print:bg-white print:text-black">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-100 print:text-black">Báo giá nhôm kính</h2>
              <p className="text-sm text-gray-400 print:text-gray-700">
                {customer || "Khách hàng"} {phone && `· ${phone}`}
              </p>
              {address && <p className="text-sm text-gray-500 print:text-gray-700">{address}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-gray-500 print:text-gray-600">Tổng thanh toán</p>
              <p className="text-2xl font-bold text-orange-300 print:text-black">{money(quoteTotal)}</p>
            </div>
          </div>

          {bom.length === 0 ? (
            <div className="p-10 border border-dashed border-white/10 rounded-xl text-center text-gray-500">
              Nhập kích thước và chọn vật tư để tính BOM.
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border border-white/10 print:border-gray-300">
                <table className="w-full text-sm">
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
                    {bom.map((item, index) => (
                      <tr key={`${item.mavt}-${index}`}>
                        <td className="p-3 text-gray-200 print:text-black">{item.name}</td>
                        <td className="p-3 text-right font-mono text-gray-300 print:text-black">
                          {"length" in item ? `${item.length} mm` : `${item.w} x ${item.h} mm`}
                        </td>
                        <td className="p-3 text-right">{item.qty}</td>
                        <td className="p-3 text-right font-mono">{money(item.unitPrice)}</td>
                        <td className="p-3 text-right font-mono font-bold">{money(item.unitPrice * item.qty)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end">
                <div className="w-full max-w-sm space-y-2 text-sm">
                  <Line label="Vật tư" value={money(materialTotal)} />
                  <Line label={`Nhân công (${sqm.toFixed(2)} m²)`} value={money(laborTotal)} />
                  <Line label={`Lợi nhuận (${margin}%)`} value={money(quoteTotal - materialTotal - laborTotal)} />
                  <div className="pt-3 border-t border-white/10 print:border-gray-300 flex justify-between text-lg font-bold">
                    <span>Tổng cộng</span>
                    <span>{money(quoteTotal)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs text-gray-400">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-gray-100 outline-none focus:border-orange-500" />
    </label>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number | ""; onChange: (value: number | "") => void }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs text-gray-400">{label}</span>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-gray-100 outline-none focus:border-orange-500" />
    </label>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: number; onChange: (value: number) => void; children: React.ReactNode }) {
  // Some a11y tooling struggles with ":" in auto-generated ids.
  const id = useId().replace(/:/g, "");
  return (
    <div className="block space-y-2">
      <label htmlFor={id} className="text-xs text-gray-400">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-[#111318] border border-white/10 rounded-lg px-4 py-2.5 text-gray-100 outline-none focus:border-orange-500"
        aria-label={label}
        title={label}
        name={label}
      >
        {children}
      </select>
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
