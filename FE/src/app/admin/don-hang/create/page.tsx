"use client";

import { useCallback, useEffect, useMemo, useState, useId } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Loader2, Plus, Printer, Save, Trash2, User } from "lucide-react";
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

function calcDoorDims(width: number, height: number) {
  const wingWidth = Math.max(1, Math.round((width - 87) / 2));
  const wingHeight = Math.max(1, Math.round(height - 46));
  const glassWidth = Math.max(1, wingWidth - 120);
  const glassHeight = Math.max(1, Math.round(wingHeight - 120));
  return { wingWidth, wingHeight, glassWidth, glassHeight };
}

type CreateMode = "DOOR_TEMPLATE" | "MANUAL_BOM";

type ManualLine = {
  id: string;
  mavt: number;
  name: string;
  kind?: "LINEAR" | "SHEET";
  length?: number;
  w?: number;
  h?: number;
  qty: number;
  unitPrice?: number;
};

function materialLabel(m: MaterialOption) {
  const cat = m.danhmuc?.tendm ? ` · ${m.danhmuc.tendm}` : "";
  return `VT-${m.mavt} · ${m.tenvt}${cat} · ${m.donvitinh} · ${money(unitPrice(m))}`;
}

export default function CreateOrderPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [mode, setMode] = useState<CreateMode>("DOOR_TEMPLATE");
  const [width, setWidth] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");
  const [frameId, setFrameId] = useState(0);
  const [wingId, setWingId] = useState(0);
  const [glassId, setGlassId] = useState(0);
  const [laborPerSqm, setLaborPerSqm] = useState(350000);
  const [margin, setMargin] = useState(15);
  const [saving, setSaving] = useState(false);

  const [manualLines, setManualLines] = useState<ManualLine[]>([]);

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
      setManualLines((prev) => {
        if (prev.length) return prev;
        const first = list[0]?.mavt || 0;
        return first
          ? [{ id: crypto.randomUUID(), mavt: first, name: "Hạng mục", length: 1000, qty: 1 }]
          : [];
      });
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

  const manualBom = useMemo(() => {
    return manualLines
      .filter((l) => l.mavt > 0 && l.name.trim() && l.qty > 0)
      .map((l) => {
        const price = Number(l.unitPrice ?? 0);
        const item: OrderItemPayload = {
          mavt: l.mavt,
          name: l.name.trim(),
          qty: l.qty,
          unitPrice: price,
        };
        if (l.kind === "SHEET" && l.w !== undefined && l.h !== undefined) {
          item.w = l.w;
          item.h = l.h;
        } else {
          item.length = l.length ?? 0;
        }
        return item;
      });
  }, [manualLines]);

  const doorBom = hasSize && frame && wing && glass ? buildBom(width, height, frame, wing, glass) : [];
  const bom = mode === "MANUAL_BOM" ? manualBom : doorBom;
  const doorDims = useMemo(() => (hasSize ? calcDoorDims(Number(width), Number(height)) : null), [hasSize, height, width]);

  const sqm = useMemo(() => {
    if (mode === "DOOR_TEMPLATE") return hasSize ? (Number(width) * Number(height)) / 1_000_000 : 0;
    // manual: approximate sqm from glass-like lines (w*h)
    return manualBom.reduce((sum, it) => {
      if (it.w !== undefined && it.h !== undefined) return sum + (it.w * it.h * it.qty) / 1_000_000;
      return sum;
    }, 0);
  }, [hasSize, height, manualBom, mode, width]);

  const materialTotal = useMemo(() => bom.reduce((sum, item) => sum + (item.unitPrice || 0) * item.qty, 0), [bom]);
  const laborTotal = Math.round(sqm * laborPerSqm);
  const quoteTotal = Math.round((materialTotal + laborTotal) * (1 + margin / 100));

  const saveOrder = async () => {
    if (!customer.trim() || !phone.trim()) return alert("Nhập tên và số điện thoại khách hàng.");
    if (bom.length === 0) {
      return alert(mode === "MANUAL_BOM" ? "Nhập ít nhất 1 dòng BOM hợp lệ." : "Nhập kích thước và chọn vật tư hợp lệ.");
    }
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

  const updateManual = (lineId: string, patch: Partial<ManualLine>) => {
    setManualLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, ...patch } : l)));
  };
  const removeManual = (lineId: string) => setManualLines((prev) => prev.filter((l) => l.id !== lineId));
  const addManual = () => {
    const first = materials[0]?.mavt || 0;
    if (!first) return;
    setManualLines((prev) => [...prev, { id: crypto.randomUUID(), mavt: first, name: "Hạng mục mới", kind: "LINEAR", length: 1000, qty: 1 }]);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-start md:items-center">
          <Link href="/admin/don-hang" className="p-2 hover:bg-white/10 rounded-lg mr-3 md:mr-4 text-gray-400 mt-0.5 md:mt-0" title="Quay lại">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-100 flex items-center">
              <FileText className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 text-orange-400" /> Tạo đơn hàng & báo giá
            </h1>
            <p className="text-xs md:text-sm text-gray-400 mt-1">BOM và giá được tính từ vật tư trong cơ sở dữ liệu.</p>
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
            <h2 className="text-sm font-bold uppercase tracking-wider text-orange-300 mb-5">Cách tạo BOM</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode("DOOR_TEMPLATE")}
                className={`rounded-xl border px-4 py-3 text-left ${mode === "DOOR_TEMPLATE" ? "border-orange-500/40 bg-orange-500/10" : "border-white/10 bg-white/3 hover:bg-white/5"}`}
              >
                <div className="text-sm font-bold text-gray-100">Mẫu cửa nhôm kính</div>
                <div className="text-xs text-gray-400 mt-1">Nhập W/H + chọn khung/cánh/kính (tự tính).</div>
              </button>
              <button
                type="button"
                onClick={() => setMode("MANUAL_BOM")}
                className={`rounded-xl border px-4 py-3 text-left ${mode === "MANUAL_BOM" ? "border-emerald-500/40 bg-emerald-500/10" : "border-white/10 bg-white/3 hover:bg-white/5"}`}
              >
                <div className="text-sm font-bold text-gray-100">Nhập BOM thủ công</div>
                <div className="text-xs text-gray-400 mt-1">Dùng cho tủ, phụ kiện (bánh xe…), case đặc thù.</div>
              </button>
            </div>

            {mode === "DOOR_TEMPLATE" ? (
              <>
                <h2 className="text-sm font-bold uppercase tracking-wider text-orange-300 mt-6 mb-5">Thông số sản xuất (cửa)</h2>
                <div className="grid grid-cols-2 gap-4">
                  <NumberInput label="Chiều rộng W (mm)" value={width} onChange={setWidth} />
                  <NumberInput label="Chiều cao H (mm)" value={height} onChange={setHeight} />
                </div>
                {doorDims && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/3 p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Kích thước cắt (tự tính)</div>
                    <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                      <div className="rounded-xl border border-white/10 bg-[#0a0a0c] p-3">
                        <div className="text-gray-500">Cánh (Thanh)</div>
                        <div className="mt-1 font-mono text-emerald-300 font-bold">{doorDims.wingWidth} × {doorDims.wingHeight} mm</div>
                        <div className="mt-1 text-[11px] text-gray-500">Dòng nhôm đi theo “cắt mm” (dọc/ngang).</div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-[#0a0a0c] p-3">
                        <div className="text-gray-500">Kính (Tấm)</div>
                        <div className="mt-1 font-mono text-sky-300 font-bold">{doorDims.glassWidth} × {doorDims.glassHeight} mm</div>
                        <div className="mt-1 text-[11px] text-gray-500">Kính là “W×H” để biết cắt tấm.</div>
                      </div>
                    </div>
                  </div>
                )}
                <div className="space-y-4 mt-4">
                  <SearchableMaterialSelect label="Vật tư khung bao" materials={materials} value={frameId} onChange={setFrameId} />
                  <SearchableMaterialSelect label="Vật tư cánh" materials={materials} value={wingId} onChange={setWingId} />
                  <SearchableMaterialSelect label="Vật tư kính" materials={materials} value={glassId} onChange={setGlassId} />
                  {loadingMaterials && (
                    <div className="text-sm text-gray-400 flex items-center">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang tải vật tư…
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-300 mt-6 mb-5 flex items-center justify-between">
                  <span>BOM thủ công</span>
                  <button
                    type="button"
                    onClick={addManual}
                    className="text-xs px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 border border-emerald-500/20 rounded-lg font-bold flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1.5" /> Thêm dòng
                  </button>
                </h2>

                <div className="space-y-3">
                  {manualLines.map((l) => (
                    <div key={l.id} className="rounded-2xl border border-white/10 bg-white/2 p-4 space-y-3">
                      <SearchableMaterialSelect
                        label="Vật tư"
                        materials={materials}
                        value={l.mavt}
                        onChange={(mavt) => updateManual(l.id, { mavt })}
                      />
                      <Input label="Mô tả" value={l.name} onChange={(v) => updateManual(l.id, { name: v })} />
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block space-y-2">
                          <span className="block text-xs text-gray-400">Kiểu</span>
                          <select
                            value={l.kind ?? "LINEAR"}
                            onChange={(e) => {
                              const next = e.target.value as "LINEAR" | "SHEET";
                              updateManual(l.id, next === "SHEET"
                                ? { kind: "SHEET", w: l.w ?? 600, h: l.h ?? 600, length: undefined }
                                : { kind: "LINEAR", length: l.length ?? 1000, w: undefined, h: undefined },
                              );
                            }}
                            className="w-full bg-[#111318] border border-white/10 rounded-lg px-4 py-2.5 text-gray-100 outline-none focus:border-emerald-500/50"
                            aria-label="Kiểu dòng"
                            title="Kiểu dòng"
                          >
                            <option value="LINEAR">Thanh (cắt theo mm)</option>
                            <option value="SHEET">Tấm (W × H mm)</option>
                          </select>
                        </label>

                        <NumberInput
                          label="SL"
                          value={l.qty}
                          onChange={(v) => updateManual(l.id, { qty: typeof v === "number" ? Math.max(1, v) : 1 })}
                        />
                      </div>

                      {(l.kind ?? "LINEAR") === "SHEET" ? (
                        <div className="grid grid-cols-2 gap-3">
                          <NumberInput
                            label="Rộng W (mm)"
                            value={typeof l.w === "number" ? l.w : ""}
                            onChange={(v) => updateManual(l.id, { w: typeof v === "number" ? v : undefined })}
                          />
                          <NumberInput
                            label="Cao H (mm)"
                            value={typeof l.h === "number" ? l.h : ""}
                            onChange={(v) => updateManual(l.id, { h: typeof v === "number" ? v : undefined })}
                          />
                        </div>
                      ) : (
                        <NumberInput
                          label="Cắt (mm)"
                          value={typeof l.length === "number" ? l.length : ""}
                          onChange={(v) => updateManual(l.id, { length: typeof v === "number" ? v : undefined })}
                        />
                      )}
                      <NumberInput
                        label="Đơn giá (VND)"
                        value={typeof l.unitPrice === "number" ? l.unitPrice : ""}
                        onChange={(v) => updateManual(l.id, { unitPrice: typeof v === "number" ? v : undefined })}
                      />
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-500 truncate">{materials.find((m) => m.mavt === l.mavt) ? materialLabel(materials.find((m) => m.mavt === l.mavt)!) : "—"}</span>
                        <button
                          type="button"
                          onClick={() => removeManual(l.id)}
                          className="px-3 py-2 rounded-xl bg-red-600/15 hover:bg-red-600/25 border border-red-500/20 text-red-300 font-bold flex items-center"
                          title="Xóa dòng"
                        >
                          <Trash2 className="w-4 h-4 mr-1.5" /> Xóa
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
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
              {mode === "MANUAL_BOM" ? "Nhập BOM thủ công để tính báo giá." : "Nhập kích thước và chọn vật tư để tính BOM."}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-white/10 print:border-gray-300">
                <table className="w-full text-sm min-w-[500px]">
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
  const id = useFieldId(label);
  return (
    <div className="block space-y-2">
      <label htmlFor={id} id={`${id}-lbl`} className="block text-xs text-gray-400">
        {label}
      </label>
      <input
        id={id}
        aria-labelledby={`${id}-lbl`}
        name={slugify(label)}
        type="text"
        autoComplete="on"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        title={label}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-gray-100 outline-none focus:border-orange-500"
      />
    </div>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number | ""; onChange: (value: number | "") => void }) {
  const id = useFieldId(label);
  return (
    <div className="block space-y-2">
      <label htmlFor={id} id={`${id}-lbl`} className="block text-xs text-gray-400">
        {label}
      </label>
      <input
        id={id}
        aria-labelledby={`${id}-lbl`}
        name={slugify(label)}
        type="number"
        inputMode="numeric"
        title={label}
        value={value}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-gray-100 outline-none focus:border-orange-500"
      />
    </div>
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
  onChange: (value: number) => void;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return materials;
    return materials.filter((m) => materialLabel(m).toLowerCase().includes(s));
  }, [materials, q]);

  const id = useFieldId(label);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="block text-xs text-gray-400">
          {label}
        </label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Gõ để lọc…"
          className="h-9 w-[240px] max-w-full rounded-xl bg-[#0a0a0c] border border-white/10 px-3 text-xs text-white outline-none focus:border-emerald-500/50"
          aria-label={`Lọc ${label}`}
          title={`Lọc ${label}`}
        />
      </div>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-[#111318] border border-white/10 rounded-lg px-4 py-2.5 text-gray-100 outline-none focus:border-orange-500"
        aria-label={label}
        title={label}
        name={slugify(label)}
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

/** Stable field id for axe/Edge tooling (colon in useId() can confuse some scanners). */
function useFieldId(label: string) {
  const base = useId().replace(/:/g, "");
  return `${base}-${slugify(label)}`;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "")
    || "field";
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-gray-300 print:text-gray-800">
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
