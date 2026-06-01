"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, ClipboardList, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { apiData, apiJson } from "@/lib/api";
import { calculateQuoteLabor } from "@/lib/quote-pricing";

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
  trangthai: string;
  tonggiatri: number;
  khachhang: { hoten: string; sdt: string; email: string | null; diachi: string | null } | null;
  chitietdh: Array<{
    mactdh: number;
    mavt: number;
    mota: string | null;
    chieudaicat: number | null;
    soluong: number;
    dongiadongbang: number | null;
    vattu: { tenvt: string; donvitinh: string } | null;
  }>;
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

type CreateMode = "DOOR_TEMPLATE" | "MANUAL_BOM";
type ManualKind = "LINEAR" | "SHEET" | "ITEM";

type ManualLine = {
  id: string;
  mavt: number;
  name: string;
  kind?: ManualKind;
  length?: number;
  w?: number;
  h?: number;
  qty: number | "";
  unitPrice?: number;
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
  const glassHeight = Math.max(1, wingHeight - 120);
  return { wingWidth, wingHeight, glassWidth, glassHeight };
}

function inferManualKind(material?: MaterialOption | null): ManualKind {
  if (!material) return "ITEM";
  if (isGlass(material)) return "SHEET";
  if (material.chieudaimacdinh && material.chieudaimacdinh > 0) return "LINEAR";
  return "ITEM";
}

function calcManualUnitPrice(line: ManualLine, material?: MaterialOption | null) {
  if (typeof line.unitPrice === "number") return line.unitPrice;
  const base = unitPrice(material);
  const kind = line.kind ?? inferManualKind(material);
  if (kind === "LINEAR") {
    const length = Number(line.length || 0);
    const baseLength = material?.chieudaimacdinh || length || 1;
    return Math.round((base * length) / baseLength);
  }
  if (kind === "SHEET") {
    const w = Number(line.w || 0);
    const h = Number(line.h || 0);
    return Math.round((base * w * h) / 1_000_000);
  }
  return Math.round(base);
}

function makeManualLine(material?: MaterialOption | null): ManualLine {
  const kind = inferManualKind(material);
  const base = {
    id: crypto.randomUUID(),
    mavt: material?.mavt || 0,
    name: material?.tenvt || "Hạng mục mới",
    kind,
    qty: 1,
  };
  if (kind === "LINEAR") return { ...base, length: 1000 };
  if (kind === "SHEET") return { ...base, w: 1000, h: 1000 };
  return base;
}

function parseDimsFromMota(mota: string | null) {
  const s = (mota ?? "").trim();
  const m = s.match(/\((\d+)\s*x\s*(\d+)\s*mm\)/i);
  if (!m) return null;
  return { w: Number(m[1]), h: Number(m[2]) };
}

export default function OrderBomPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Number(params?.id || 0);

  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [mode, setMode] = useState<CreateMode>("DOOR_TEMPLATE");
  const [width, setWidth] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");
  const [frameId, setFrameId] = useState(0);
  const [wingId, setWingId] = useState(0);
  const [glassId, setGlassId] = useState(0);
  const [margin, setMargin] = useState(15);
  const [saving, setSaving] = useState(false);
  const [manualLines, setManualLines] = useState<ManualLine[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const [loadedOrder, list] = await Promise.all([
        apiData<OrderDetail>(`/api/admin/orders/${id}`),
        apiData<MaterialOption[]>("/api/admin/materials-options"),
      ]);
      setOrder(loadedOrder);
      setMaterials(list);

      // Chọn sẵn vật tư hợp lý để bước lập BOM không bắt quản trị viên cấu hình từ đầu.
      // Nếu đơn đã có BOM, phía dưới sẽ phục hồi về manualLines để sửa tiếp.
      const bars = list.filter((m) => m.chieudaimacdinh);
      const glasses = list.filter(isGlass);
      setFrameId((p) => p || bars[0]?.mavt || list[0]?.mavt || 0);
      setWingId((p) => p || bars[1]?.mavt || bars[0]?.mavt || list[0]?.mavt || 0);
      setGlassId((p) => p || glasses[0]?.mavt || list.find((m) => !m.chieudaimacdinh)?.mavt || list[0]?.mavt || 0);

      setManualLines(
        (loadedOrder.chitietdh ?? []).map((it) => {
          const dims = parseDimsFromMota(it.mota);
          const name = (it.mota ?? it.vattu?.tenvt ?? "").replace(/\(\d+\s*x\s*\d+\s*mm\)/i, "").trim();
          const base: ManualLine = {
            id: String(it.mactdh),
            mavt: it.mavt,
            name: name || it.vattu?.tenvt || `VT-${it.mavt}`,
            qty: it.soluong,
            unitPrice: Number(it.dongiadongbang ?? 0) || undefined,
          };
          if (dims) return { ...base, kind: "SHEET", w: dims.w, h: dims.h };
          if (it.chieudaicat !== null) return { ...base, kind: "LINEAR", length: it.chieudaicat };
          return { ...base, kind: "ITEM" };
        }),
      );
      if ((loadedOrder.chitietdh ?? []).length > 0) setMode("MANUAL_BOM");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const materialById = useMemo(() => new Map(materials.map((m) => [m.mavt, m])), [materials]);
  const materialLabels = useMemo(() => new Map(materials.map((m) => [m.mavt, materialLabel(m)])), [materials]);
  const canEditBom = Boolean(order && ["KHAO_SAT", "BAO_GIA_NHAP"].includes(order.trangthai));
  const frame = materialById.get(frameId) || null;
  const wing = materialById.get(wingId) || null;
  const glass = materialById.get(glassId) || null;
  const hasSize = typeof width === "number" && typeof height === "number" && width > 0 && height > 0;

  const manualBom = useMemo(() => {
    // Chuẩn hóa dòng nhập thủ công thành payload chung cho backend.
    // Cho phép xóa tạm số lượng trong ô nhập bằng chuỗi rỗng, chỉ dòng hợp lệ mới vào BOM.
    return manualLines
      .filter((l) => l.mavt > 0 && l.name.trim() && typeof l.qty === "number" && l.qty > 0)
      .map((l) => {
        const material = materialById.get(l.mavt) || null;
        const kind = l.kind ?? inferManualKind(material);
        const price = calcManualUnitPrice(l, material);
        const item: OrderItemPayload = {
          mavt: l.mavt,
          name: l.name.trim(),
          qty: l.qty as number,
          unitPrice: price,
        };
        if (kind === "SHEET" && l.w !== undefined && l.h !== undefined && l.w > 0 && l.h > 0) {
          item.w = l.w;
          item.h = l.h;
        } else if (kind === "LINEAR" && l.length !== undefined && l.length > 0) {
          item.length = l.length;
        } else if (kind !== "ITEM") {
          return null;
        }
        return item;
      })
      .filter((item): item is OrderItemPayload => item !== null);
  }, [manualLines, materialById]);

  const doorBom = useMemo(
    () => (hasSize && frame && wing && glass ? buildBom(width, height, frame, wing, glass) : []),
    [frame, glass, hasSize, height, width, wing],
  );
  const bom = useMemo(
    // Chế độ mẫu cửa vẫn cộng thêm vật tư bổ sung để khách mua thêm phụ kiện/vật tư ngoài mẫu.
    () => (mode === "MANUAL_BOM" ? manualBom : [...doorBom, ...manualBom]),
    [doorBom, manualBom, mode],
  );
  const doorDims = useMemo(() => (hasSize ? calcDoorDims(Number(width), Number(height)) : null), [hasSize, height, width]);

  const materialTotal = useMemo(() => bom.reduce((sum, item) => sum + (item.unitPrice || 0) * item.qty, 0), [bom]);
  const doorAreaSqm = mode === "DOOR_TEMPLATE" && hasSize ? (Number(width) * Number(height)) / 1_000_000 : 0;
  const labor = useMemo(
    () =>
      calculateQuoteLabor(
        bom.map((item) => ({
          name: item.name,
          length: item.length ?? null,
          w: item.w ?? null,
          h: item.h ?? null,
          qty: item.qty,
        })),
        doorAreaSqm,
      ),
    [bom, doorAreaSqm],
  );
  const laborTotal = labor.total;
  const quoteTotal = Math.round((materialTotal + laborTotal) * (1 + margin / 100));

  const saveBom = async () => {
    if (!order?.khachhang?.hoten || !order.khachhang.sdt) return;
    if (bom.length === 0) {
      setErrorMsg(mode === "MANUAL_BOM" ? "Nhập ít nhất 1 dòng BOM hợp lệ." : "Nhập kích thước và chọn vật tư hợp lệ.");
      return;
    }
    setSaving(true);
    setErrorMsg("");
    try {
      // Payload vẫn gửi thông tin KH hiện tại để backend không làm mất email/địa chỉ khi lưu BOM.
      await apiJson(`/api/admin/orders/${id}/edit`, {
        method: "PATCH",
        body: JSON.stringify({
          customer: order.khachhang.hoten,
          phone: order.khachhang.sdt,
          email: order.khachhang.email || null,
          address: order.khachhang.diachi || null,
          totalCost: quoteTotal,
          items: bom,
        }),
      });
      router.push(`/admin/don-hang/${id}/bao-gia`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const updateManual = (lineId: string, patch: Partial<ManualLine>) => {
    setManualLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, ...patch } : l)));
  };

  const updateManualMaterial = (lineId: string, mavt: number) => {
    const material = materialById.get(mavt) || null;
    const kind = inferManualKind(material);
    setManualLines((prev) =>
      prev.map((l) => {
        if (l.id !== lineId) return l;
        // Đổi vật tư thì xóa unitPrice override để đơn giá được tính lại theo vật tư mới.
        const base = { ...l, mavt, name: material?.tenvt || l.name || "Hạng mục", kind, unitPrice: undefined };
        if (kind === "LINEAR") return { ...base, length: l.length ?? 1000, w: undefined, h: undefined };
        if (kind === "SHEET") return { ...base, w: l.w ?? 1000, h: l.h ?? 1000, length: undefined };
        return { ...base, length: undefined, w: undefined, h: undefined };
      }),
    );
  };

  const addManual = () => {
    const first = materials[0] || null;
    if (!first) return;
    // Mỗi lần bấm chỉ thêm 1 dòng, tránh lỗi sinh cả cụm bảng làm trang kéo dài.
    setManualLines((prev) => [...prev, makeManualLine(first)]);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20">
      <div className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <Link href={`/admin/don-hang/create?id=${id}`} className="mt-0.5 rounded-lg p-2 text-gray-400 hover:bg-white/10" title="Quay lại thông tin khách hàng">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="flex items-center text-xl font-bold text-gray-100 md:text-2xl">
                <ClipboardList className="mr-3 h-6 w-6 text-orange-400" />
                Lập BOM đơn hàng DH-{id}
              </h1>
              <p className="mt-1 text-sm text-gray-400">
                Đơn hàng DH-{id} - {order?.khachhang?.hoten || "Khách hàng"}
              </p>
            </div>
          </div>
          <StepBar active={2} />
        </div>
      </div>

      {errorMsg && <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">{errorMsg}</div>}
      {!canEditBom && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Đơn hàng đã qua bước duyệt giá nên không thể sửa BOM. Hãy quay lại báo giá/chi tiết đơn hàng để tiếp tục xử lý.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(500px,0.82fr)]">
        <section className="space-y-6">
          <Card title="Cách tạo BOM">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <ModeButton active={mode === "DOOR_TEMPLATE"} title="Mẫu cửa nhôm kính" text="Nhập W/H và chọn khung, cánh, kính." onClick={() => setMode("DOOR_TEMPLATE")} />
              <ModeButton active={mode === "MANUAL_BOM"} title="Nhập BOM thủ công" text="Dùng cho tủ, phụ kiện, vật tư mua kèm." onClick={() => setMode("MANUAL_BOM")} />
            </div>
          </Card>

          {mode === "DOOR_TEMPLATE" && (
            <Card title="Thông số sản xuất cửa">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <NumberInput label="Chiều rộng W (mm)" value={width} onChange={setWidth} />
                <NumberInput label="Chiều cao H (mm)" value={height} onChange={setHeight} />
              </div>

              {doorDims && (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <InfoBox label="Cánh (thanh)" value={`${doorDims.wingWidth} x ${doorDims.wingHeight} mm`} />
                  <InfoBox label="Kính (tấm)" value={`${doorDims.glassWidth} x ${doorDims.glassHeight} mm`} />
                </div>
              )}

              <div className="mt-4 space-y-4">
                <SearchableMaterialSelect label="Vật tư khung bao" materials={materials} labels={materialLabels} value={frameId} onChange={setFrameId} />
                <SearchableMaterialSelect label="Vật tư cánh" materials={materials} labels={materialLabels} value={wingId} onChange={setWingId} />
                <SearchableMaterialSelect label="Vật tư kính" materials={materials} labels={materialLabels} value={glassId} onChange={setGlassId} />
              </div>
            </Card>
          )}

          <Card
            title={mode === "DOOR_TEMPLATE" ? "Vật tư bổ sung" : "BOM thủ công"}
            action={
              <button
                type="button"
                onClick={addManual}
                className="flex items-center rounded-lg border border-emerald-500/20 bg-emerald-600/20 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-600/35"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Thêm dòng
              </button>
            }
          >
            <p className="mb-3 text-xs text-gray-500">Khách muốn mua thêm vật tư ngoài mẫu cửa thì nhập tại đây, tất cả sẽ gộp vào cùng báo giá.</p>
            <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
              {manualLines.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-center text-sm text-gray-500">
                  Chưa có vật tư bổ sung.
                </div>
              ) : (
                manualLines.map((line, index) => {
                  const material = materialById.get(line.mavt) || null;
                  const kind = line.kind ?? inferManualKind(material);
                  const displayPrice = calcManualUnitPrice(line, material);
                  const lineTotal = displayPrice * Number(line.qty || 0);

                  return (
                    <div key={line.id} className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-gray-400">Dòng {index + 1}</div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold text-emerald-300">{money(lineTotal)}</span>
                          <button
                            type="button"
                            onClick={() => setManualLines((prev) => prev.filter((l) => l.id !== line.id))}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/20 bg-red-600/15 text-red-300 hover:bg-red-600/25"
                            title="Xóa dòng"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <CompactMaterialSelect materials={materials} labels={materialLabels} value={line.mavt} onChange={(mavt) => updateManualMaterial(line.id, mavt)} />
                      <Input label="Mô tả" value={line.name} onChange={(v) => updateManual(line.id, { name: v })} />

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <label className="block space-y-2">
                          <span className="block text-xs text-gray-400">Kiểu tính</span>
                          <select
                            value={kind}
                            onChange={(e) => {
                              const next = e.target.value as ManualKind;
                              updateManual(
                                line.id,
                                next === "SHEET"
                                  ? { kind: "SHEET", w: line.w ?? 1000, h: line.h ?? 1000, length: undefined, unitPrice: undefined }
                                  : next === "LINEAR"
                                    ? { kind: "LINEAR", length: line.length ?? 1000, w: undefined, h: undefined, unitPrice: undefined }
                                    : { kind: "ITEM", length: undefined, w: undefined, h: undefined, unitPrice: undefined },
                              );
                            }}
                            className="w-full rounded-lg border border-white/10 bg-[#111318] px-4 py-2.5 text-gray-100 outline-none focus:border-emerald-500/50"
                          >
                            <option value="LINEAR">Thanh (cắt theo mm)</option>
                            <option value="SHEET">Tấm (W x H mm)</option>
                            <option value="ITEM">Theo số lượng</option>
                          </select>
                        </label>
                        <NumberInput label="Số lượng" value={line.qty} onChange={(v) => updateManual(line.id, { qty: typeof v === "number" ? Math.max(1, v) : "" })} />
                      </div>

                      {kind === "SHEET" ? (
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <NumberInput label="Rộng W (mm)" value={typeof line.w === "number" ? line.w : ""} onChange={(v) => updateManual(line.id, { w: typeof v === "number" ? v : undefined, unitPrice: undefined })} />
                          <NumberInput label="Cao H (mm)" value={typeof line.h === "number" ? line.h : ""} onChange={(v) => updateManual(line.id, { h: typeof v === "number" ? v : undefined, unitPrice: undefined })} />
                        </div>
                      ) : kind === "LINEAR" ? (
                        <NumberInput label="Chiều dài cắt (mm)" value={typeof line.length === "number" ? line.length : ""} onChange={(v) => updateManual(line.id, { length: typeof v === "number" ? v : undefined, unitPrice: undefined })} />
                      ) : null}

                      <NumberInput label="Đơn giá (VND)" value={displayPrice || ""} onChange={(v) => updateManual(line.id, { unitPrice: typeof v === "number" ? v : undefined })} />
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <Card title="Cấu hình tạm tính">
            <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
              <Line label={`Gia công xưởng (${labor.linearMeters.toFixed(2)} m dài)`} value={money(labor.fabrication)} />
              <Line label={`Xử lý kính/tấm (${labor.sheetSqm.toFixed(2)} m²)`} value={money(labor.glassHandling)} />
              <Line label={`Lắp đặt (${labor.installationAreaSqm.toFixed(2)} m²)`} value={money(labor.installation)} />
              <Line label="Khảo sát / di chuyển" value={money(labor.siteSetup)} />
            </div>
            <div className="mt-4">
              <NumberInput label="Lợi nhuận (%)" value={margin} onChange={(v) => setMargin(v === "" ? 0 : v)} />
            </div>
          </Card>
        </section>

        <aside>
          <div className="sticky top-6 rounded-2xl border border-white/5 bg-[#0a0a0c] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-100">BOM tạm tính</h2>
                <p className="mt-1 text-xs text-gray-500">Chưa phải báo giá cuối. Bấm lưu để chuyển sang trang báo giá.</p>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wider text-gray-500">Tạm tính</div>
                <div className="text-xl font-bold text-orange-300">{money(quoteTotal)}</div>
              </div>
            </div>

            <div className="mt-5 max-h-[440px] overflow-y-auto rounded-xl border border-white/10">
              {bom.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">Chưa có dòng BOM hợp lệ.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-white/5 text-xs text-gray-400">
                    <tr>
                      <th className="p-3 text-left">Hạng mục</th>
                      <th className="p-3 text-right">SL</th>
                      <th className="p-3 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {bom.map((item, index) => (
                      <tr key={`${item.mavt}-${index}`}>
                        <td className="p-3 text-gray-200">
                          <div className="font-semibold">{item.name}</div>
                          <div className="mt-0.5 font-mono text-xs text-gray-500">
                            {item.length !== undefined ? `${item.length} mm` : item.w !== undefined && item.h !== undefined ? `${item.w} x ${item.h} mm` : "Theo số lượng"}
                          </div>
                        </td>
                        <td className="p-3 text-right">{item.qty}</td>
                        <td className="p-3 text-right font-mono font-bold">{money(item.unitPrice * item.qty)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-5 space-y-2 text-sm">
              <Line label="Vật tư" value={money(materialTotal)} />
              <Line label="Nhân công" value={money(laborTotal)} />
              <Line label={`Lợi nhuận (${margin}%)`} value={money(quoteTotal - materialTotal - laborTotal)} />
            </div>

            <button
              type="button"
              onClick={saveBom}
              disabled={!canEditBom || saving || bom.length === 0}
              className="mt-5 flex w-full items-center justify-center rounded-xl bg-orange-600 px-4 py-3 font-bold text-white hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
              Lưu BOM và xem báo giá
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function materialLabel(m: MaterialOption) {
  const cat = m.danhmuc?.tendm ? ` - ${m.danhmuc.tendm}` : "";
  return `VT-${m.mavt} - ${m.tenvt}${cat} - ${m.donvitinh} - ${money(unitPrice(m))}`;
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

function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-orange-300">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ModeButton({ active, title, text, onClick }: { active: boolean; title: string; text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-3 text-left transition-colors ${active ? "border-orange-500/40 bg-orange-500/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}
    >
      <div className="text-sm font-bold text-gray-100">{title}</div>
      <div className="mt-1 text-xs text-gray-400">{text}</div>
    </button>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 font-mono font-bold text-emerald-300">{value}</div>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = useFieldId(label);
  return (
    <label className="block space-y-2" htmlFor={id}>
      <span className="block text-xs text-gray-400">{label}</span>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-gray-100 outline-none focus:border-orange-500" />
    </label>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number | ""; onChange: (value: number | "") => void }) {
  const id = useFieldId(label);
  return (
    <label className="block space-y-2" htmlFor={id}>
      <span className="block text-xs text-gray-400">{label}</span>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-gray-100 outline-none focus:border-orange-500"
      />
    </label>
  );
}

function CompactMaterialSelect({
  materials,
  labels,
  value,
  onChange,
}: {
  materials: MaterialOption[];
  labels: Map<number, string>;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="block text-xs text-gray-400">Vật tư</span>
      <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full rounded-lg border border-white/10 bg-[#111318] px-4 py-2.5 text-gray-100 outline-none focus:border-emerald-500/50">
        {materials.map((m) => (
          <option key={m.mavt} value={m.mavt}>
            {labels.get(m.mavt)}
          </option>
        ))}
      </select>
    </label>
  );
}

function SearchableMaterialSelect({
  label,
  materials,
  labels,
  value,
  onChange,
}: {
  label: string;
  materials: MaterialOption[];
  labels: Map<number, string>;
  value: number;
  onChange: (value: number) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return materials;
    return materials.filter((m) => (labels.get(m.mavt) || "").toLowerCase().includes(s));
  }, [labels, materials, q]);
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
          placeholder="Gõ để lọc..."
          className="h-9 w-[220px] max-w-full rounded-xl border border-white/10 bg-[#0a0a0c] px-3 text-xs text-white outline-none focus:border-emerald-500/50"
        />
      </div>
      <select id={id} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full rounded-lg border border-white/10 bg-[#111318] px-4 py-2.5 text-gray-100 outline-none focus:border-orange-500">
        {filtered.map((m) => (
          <option key={m.mavt} value={m.mavt}>
            {labels.get(m.mavt)}
          </option>
        ))}
      </select>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-gray-300">
      <span>{label}</span>
      <span className="font-mono font-semibold">{value}</span>
    </div>
  );
}

function useFieldId(label: string) {
  const base = useId().replace(/:/g, "");
  return `${base}-${slugify(label)}`;
}

function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .normalize("NFD")
      .replaceAll(/[\u0300-\u036f]/g, "")
      .replaceAll(/[^a-z0-9]+/g, "-")
      .replaceAll(/^-|-$/g, "") || "field"
  );
}
