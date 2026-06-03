"use client";

import { useState, useEffect, useCallback, useContext, useMemo } from "react";
import { Scissors, Plus, RotateCcw, Zap, AlertTriangle, CheckCircle2, Info, TrendingUp, X, Search, ArrowUpDown, Database } from "lucide-react";
import { apiData } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { WorkerViewContext } from "../context";

// ─── Hằng số vật lý (chuẩn Dowes) ───
const BAR_LENGTH = 6000;   // mm - chiều dài thanh chuẩn
const BLADE_KERF = 5;      // mm - độ dày lưỡi cưa
const MIN_OFFCUT = 200;    // mm - mảnh còn lại < ngưỡng này = phế liệu

// ─── Bảng giá thị trường mặc định (dùng dự phòng) ───
const FALLBACK_MARKET_PRICES = [
  { code: "XF55", name: "Nhôm trục cánh XF55 (Xingfa)", price: 185000, unit: "thanh 6m", brand: "XINGFA" },
  { code: "XF60", name: "Nhôm khung XF60 (Xingfa)", price: 210000, unit: "thanh 6m", brand: "XINGFA" },
  { code: "MA65", name: "Nhôm Maxpro MA65", price: 195000, unit: "thanh 6m", brand: "MAXPRO" },
  { code: "PMA1", name: "Nhôm PMA cánh lùa", price: 175000, unit: "thanh 6m", brand: "PMA" },
  { code: "BLK8", name: "Nhôm BLK hệ 80mm", price: 220000, unit: "thanh 6m", brand: "BLK" },
  { code: "KINH6", name: "Kính cường lực 6mm", price: 280000, unit: "m²", brand: "Việt Nam" },
  { code: "KINH8", name: "Kính hộp 8.38+12+6.38", price: 850000, unit: "m²", brand: "AGC" },
  { code: "BL4D", name: "Bản lề lá 4D", price: 80000, unit: "cái", brand: "Inox" },
  { code: "KHOA", name: "Thân khóa đa điểm", price: 134000, unit: "cái", brand: "TESA" },
];

interface CutItem { id: string; label: string; length: number; qty: number }
interface CutResult {
  barIndex: number;
  cuts: { label: string; length: number; color: string }[];
  used: number;
  waste: number;
  offcut: number;
}

interface DBVattu {
  mavt: number;
  tenvt: string;
  donvitinh: string;
  chieudaimacdinh: number | null;
  dongiaban: string | null;
  danhmuc?: { tendm: string } | null;
}

interface ReusableOffcut {
  maphoi: number;
  chieudaihientai: number;
  mavt: number;
  vattu: { tenvt: string; donvitinh: string } | null;
}

type StockSource = {
  label: string;
  length: number;
  maphoi?: number;
};

type MaterialOption = {
  code: string;
  name: string;
  brand: string;
  defaultLength: number | null;
};

const DEFAULT_CUT_ITEMS: CutItem[] = [
  { id: "1", label: "Khung đứng", length: 2200, qty: 2 },
  { id: "2", label: "Khung ngang", length: 1400, qty: 3 },
];

const COLORS = [
  "bg-cyan-500", "bg-blue-500", "bg-emerald-500", "bg-violet-500",
  "bg-amber-500", "bg-rose-500", "bg-sky-400", "bg-teal-500",
];

// ─── 1D-CSP: chiến lược xếp giảm dần vào thanh phù hợp đầu tiên (FFD) ───
function runCSP(items: CutItem[], barLength: number): CutResult[] {
  const expanded: { label: string; length: number; color: string }[] = [];
  items.forEach((item, idx) => {
    for (let q = 0; q < item.qty; q++) {
      expanded.push({
        label: `${item.label} (${q + 1})`,
        length: item.length,
        color: COLORS[idx % COLORS.length]
      });
    }
  });
  expanded.sort((a, b) => b.length - a.length);

  const bars: { cuts: typeof expanded; remaining: number }[] = [];

  for (const piece of expanded) {
    const needed = piece.length + BLADE_KERF;
    let placed = false;
    for (const bar of bars) {
      if (bar.remaining >= needed) {
        bar.cuts.push(piece);
        bar.remaining -= needed;
        placed = true;
        break;
      }
    }
    if (!placed) {
      bars.push({ cuts: [piece], remaining: barLength - needed });
    }
  }

  return bars.map((bar, i) => {
    const used = barLength - bar.remaining;
    return {
      barIndex: i + 1,
      cuts: bar.cuts,
      used,
      waste: bar.cuts.length * BLADE_KERF,
      offcut: bar.remaining,
    };
  });
}

export default function WorkerSimulatorPage() {
  const { viewMode } = useContext(WorkerViewContext);
  const supabase = createClient();

  const [items, setItems] = useState<CutItem[]>(DEFAULT_CUT_ITEMS);
  const [results, setResults] = useState<CutResult[]>([]);
  const [calculated, setCalculated] = useState(false);
  const [activeTab, setActiveTab] = useState<"simulator" | "prices">("simulator");

  // Form thêm kích thước
  const [newLabel, setNewLabel] = useState("");
  const [newLength, setNewLength] = useState("");
  const [newQty, setNewQty] = useState("1");
  const [materialQuery, setMaterialQuery] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialOption | null>(null);
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);
  const [error, setError] = useState("");
  const [stockSource, setStockSource] = useState<StockSource>({
    label: "Thanh chuẩn 6m",
    length: BAR_LENGTH,
  });
  const [isDropActive, setIsDropActive] = useState(false);

  // Dữ liệu bảng giá từ DB
  const [dbPrices, setDbPrices] = useState<DBVattu[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [priceSearch, setPriceSearch] = useState("");
  const [sortByPrice, setSortByPrice] = useState<"none" | "asc" | "desc">("none");

  // Tìm kiếm phôi dư
  const [searchLength, setSearchLength] = useState("");
  const [offcutsList, setOffcutsList] = useState<ReusableOffcut[]>([]);
  const [loadingOffcuts, setLoadingOffcuts] = useState(false);
  const [searchedOffcuts, setSearchedOffcuts] = useState(false);

  const longestCutLength = useMemo(
    () => items.reduce((max, item) => Math.max(max, item.length), 0),
    [items],
  );
  const totalPieces = useMemo(() => items.reduce((sum, item) => sum + item.qty, 0), [items]);
  const materialOptions = useMemo<MaterialOption[]>(() => {
    if (dbPrices.length > 0) {
      return dbPrices.map((item) => ({
        code: `VT-${item.mavt}`,
        name: item.tenvt,
        brand: item.danhmuc?.tendm || "Vật Tư",
        defaultLength: item.chieudaimacdinh,
      }));
    }

    return FALLBACK_MARKET_PRICES.map((item) => ({
      code: item.code,
      name: item.name,
      brand: item.brand,
      defaultLength: item.unit.toLowerCase().includes("6m") ? BAR_LENGTH : null,
    }));
  }, [dbPrices]);

  const materialSuggestions = useMemo(() => {
    const search = materialQuery.trim().toLowerCase();
    const filtered = search
      ? materialOptions.filter((item) =>
          item.name.toLowerCase().includes(search) ||
          item.code.toLowerCase().includes(search) ||
          item.brand.toLowerCase().includes(search)
        )
      : materialOptions;

    return filtered.slice(0, 6);
  }, [materialOptions, materialQuery]);

  // Tải bảng giá từ BE
  const fetchPrices = useCallback(async () => {
    setLoadingPrices(true);
    try {
      const data = await apiData<DBVattu[]>("/api/worker/materials");
      if (Array.isArray(data) && data.length > 0) {
        setDbPrices(data);
      }
    } catch (e) {
      void e;
    } finally {
      setLoadingPrices(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // Tìm kiếm phôi dư khả dụng trong kho
  const searchReusableOffcuts = async (overrideLength?: number) => {
    const len = Number(overrideLength ?? searchLength);
    if (!len || len <= 0 || len > BAR_LENGTH) {
      alert(`Vui lòng nhập chiều dài cần tìm hợp lệ (1 - ${BAR_LENGTH} mm)`);
      return;
    }
    setSearchLength(String(len));
    setLoadingOffcuts(true);
    setSearchedOffcuts(true);
    if (viewMode !== "pc") setActiveTab("prices");
    try {
      const { data, error } = await supabase
        .from("khothanhphoi")
        .select(`
          maphoi, chieudaihientai, mavt,
          vattu:mavt(tenvt, donvitinh)
        `)
        .eq("trangthai", "CON_DU")
        .gte("chieudaihientai", len)
        .order("chieudaihientai", { ascending: true })
        .limit(10);

      if (error) throw error;
      setOffcutsList((data as unknown as ReusableOffcut[]) || []);
    } catch (e) {
      void e;
      alert("Không thể kết nối kho dữ liệu phôi.");
    } finally {
      setLoadingOffcuts(false);
    }
  };

  const addItem = () => {
    const len = Number(newLength);
    const qty = Number(newQty);
    const label = newLabel.trim() || selectedMaterial?.name.trim() || "";
    if (!label) { setError("Nhập tên chi tiết hoặc chọn vật liệu!"); return; }
    if (len <= 0 || len > stockSource.length) { setError(`Chiều dài phải từ 1 đến ${stockSource.length}mm theo nguồn thanh đang chọn`); return; }
    if (qty <= 0 || qty > 100) { setError("Số lượng từ 1–100"); return; }
    setItems(prev => [...prev, { id: Date.now().toString(), label, length: len, qty }]);
    setNewLabel(""); setNewLength(""); setNewQty("1");
    setError(""); setCalculated(false);
  };

  const removeItem = (id: string) => { setItems(p => p.filter(i => i.id !== id)); setCalculated(false); };
  const calculate = useCallback(() => {
    if (items.length === 0) { setError("Chưa có chi tiết nào!"); return; }
    const invalid = items.find(i => i.length > stockSource.length);
    if (invalid) { setError(`"${invalid.label}" dài hơn nguồn thanh ${stockSource.length}mm!`); return; }
    setResults(runCSP(items, stockSource.length));
    setCalculated(true);
    setError("");
  }, [items, stockSource.length]);

  const reset = () => {
    setItems(DEFAULT_CUT_ITEMS);
    setResults([]);
    setCalculated(false);
    setError("");
    setNewLabel("");
    setNewLength("");
    setNewQty("1");
    setMaterialQuery("");
    setSelectedMaterial(null);
    setStockSource({ label: "Thanh chuẩn 6m", length: BAR_LENGTH });
  };
  const chooseMaterial = (material: MaterialOption) => {
    setSelectedMaterial(material);
    setMaterialQuery(`${material.name} · ${material.code}`);
    setShowMaterialPicker(false);
    setError("");
    if (!newLabel.trim()) setNewLabel(material.name);
    if (!newLength && material.defaultLength && material.defaultLength <= stockSource.length) {
      setNewLength(String(material.defaultLength));
    }
  };
  const applyStockSource = (source: StockSource) => {
    setStockSource(source);
    const invalid = items.find(i => i.length > source.length);
    if (invalid) {
      setResults([]);
      setCalculated(false);
      setError(`"${invalid.label}" dài hơn phôi ${source.length}mm, không thể dùng phôi này.`);
      setActiveTab("simulator");
      return;
    }
    setResults(items.length > 0 ? runCSP(items, source.length) : []);
    setCalculated(items.length > 0);
    setError("");
    setActiveTab("simulator");
  };
  const resetStockSource = () => applyStockSource({ label: "Thanh chuẩn 6m", length: BAR_LENGTH });
  const handleDropStock = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDropActive(false);
    try {
      const payload = JSON.parse(event.dataTransfer.getData("application/json")) as StockSource;
      if (payload?.length) applyStockSource(payload);
    } catch {
      // Ignore invalid drag payloads.
    }
  };

  const totalBars = results.length;
  const totalWaste = results.reduce((s, r) => s + r.waste, 0);
  const totalOffcut = results.reduce((s, r) => s + r.offcut, 0);
  const efficiency = totalBars > 0 ? ((1 - totalOffcut / (totalBars * stockSource.length)) * 100).toFixed(1) : "0";

  // Lọc bảng giá thị trường
  const filteredPrices = useMemo(() => {
    const search = priceSearch.toLowerCase().trim();
    let baseList = dbPrices.map(item => ({
      code: `VT-${item.mavt}`,
      name: item.tenvt,
      price: item.dongiaban ? Number(item.dongiaban) : 0,
      unit: item.donvitinh,
      brand: item.danhmuc?.tendm || "Vật Tư"
    }));

    if (baseList.length === 0) {
      baseList = FALLBACK_MARKET_PRICES;
    }

    const filtered = baseList.filter(item =>
      item.name.toLowerCase().includes(search) ||
      item.code.toLowerCase().includes(search) ||
      item.brand.toLowerCase().includes(search)
    );

    if (sortByPrice === "asc") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortByPrice === "desc") {
      filtered.sort((a, b) => b.price - a.price);
    }

    return filtered;
  }, [dbPrices, priceSearch, sortByPrice]);

  const handleSortToggle = () => {
    if (sortByPrice === "none") setSortByPrice("asc");
    else if (sortByPrice === "asc") setSortByPrice("desc");
    else setSortByPrice("none");
  };

  // Render phần nhập và hiển thị thuật toán Mô phỏng cắt nhôm
  const SimulatorPanel = () => (
    <div className="space-y-4">
      {/* Thẻ Input danh sách chi tiết */}
      <div className={`border border-slate-800 bg-[#0d1118] p-5 ${viewMode === "pc" ? "rounded-2xl" : "rounded-3xl"}`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
              <Plus className="w-4 h-4 mr-2 text-cyan-400" /> Trợ lý cắt nhanh
            </h3>
            <p className="mt-1 text-[10px] text-slate-500">Nhập chi tiết, tính số thanh cần dùng và tìm phôi dư phù hợp trong kho.</p>
          </div>
          <div className="hidden rounded-xl border border-cyan-400/15 bg-cyan-400/10 px-3 py-2 text-right text-[10px] font-bold text-cyan-200 sm:block">
            <div>{items.length} loại chi tiết</div>
            <div>{totalPieces} đoạn cắt</div>
          </div>
        </div>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDropActive(true);
          }}
          onDragLeave={() => setIsDropActive(false)}
          onDrop={handleDropStock}
          className={`mb-4 rounded-2xl border px-4 py-3 transition-colors ${
            isDropActive
              ? "border-emerald-300 bg-emerald-400/15"
              : "border-cyan-400/20 bg-cyan-400/5"
          }`}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-cyan-300">Nguồn thanh đang tính</div>
              <div className="mt-1 text-sm font-black text-white">
                {stockSource.label} · <span className="font-mono text-cyan-200">{stockSource.length} mm</span>
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                {stockSource.maphoi ? "Đang tính trực tiếp bằng phôi đã chọn. Kết quả bên dưới đã đổi theo chiều dài phôi này." : "Kéo phôi dư từ danh sách bên phải thả vào đây, hoặc bấm “Dùng phôi”."}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {stockSource.maphoi && (
                <button
                  type="button"
                  onClick={calculate}
                  className="h-9 rounded-xl bg-cyan-600 px-3 text-xs font-black text-white hover:bg-cyan-500"
                >
                  Tính bằng phôi này
                </button>
              )}
              {stockSource.maphoi && (
                <button
                  type="button"
                  onClick={resetStockSource}
                  className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-slate-200 hover:bg-white/10"
                >
                  Về thanh 6m
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="relative mb-3">
          <div className="relative">
            <input
              value={materialQuery}
              onChange={(e) => {
                setMaterialQuery(e.target.value);
                setSelectedMaterial(null);
                setShowMaterialPicker(true);
              }}
              onFocus={() => setShowMaterialPicker(true)}
              onBlur={() => window.setTimeout(() => setShowMaterialPicker(false), 120)}
              placeholder="Chọn vật liệu có sẵn (tìm theo tên, mã VT, danh mục)"
              className="w-full rounded-xl border border-white/10 bg-black/40 py-2.5 pl-9 pr-3 text-xs text-white outline-none transition-colors focus:border-cyan-500"
            />
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          </div>

          {showMaterialPicker && (
            <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-slate-700 bg-[#101722] shadow-2xl">
              {materialSuggestions.length === 0 ? (
                <div className="px-4 py-3 text-xs text-slate-500">
                  Không có vật liệu khớp. Có thể nhập tên chi tiết thủ công ở ô bên dưới.
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto">
                  {materialSuggestions.map((material) => (
                    <button
                      key={`${material.code}-${material.name}`}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => chooseMaterial(material)}
                      className="flex w-full items-center justify-between gap-3 border-b border-white/[0.03] px-4 py-3 text-left transition-colors hover:bg-cyan-400/10"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-black text-slate-100">{material.name}</span>
                        <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          {material.brand} · {material.code}
                        </span>
                      </span>
                      {material.defaultLength ? (
                        <span className="shrink-0 rounded-lg border border-cyan-400/15 bg-cyan-400/10 px-2 py-1 font-mono text-[10px] font-black text-cyan-200">
                          {material.defaultLength} mm
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-5 gap-2.5 mb-3">
          <input
            value={newLabel}
            onChange={e => { setNewLabel(e.target.value); setError(""); }}
            placeholder="Tên (Ví dụ: Đứng cánh)"
            className="col-span-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-cyan-500 outline-none transition-colors"
          />
          <input
            type="number"
            value={newLength}
            onChange={e => { setNewLength(e.target.value); setError(""); }}
            placeholder="Dài (mm)"
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-cyan-500 outline-none font-mono text-center transition-colors"
          />
          <input
            type="number"
            value={newQty}
            onChange={e => { setNewQty(e.target.value); setError(""); }}
            placeholder="SL"
            min="1"
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-cyan-500 outline-none text-center transition-colors"
          />
          <button
            onClick={addItem}
            className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl flex items-center justify-center transition-colors active:scale-95"
            aria-label="Thêm chi tiết"
            title="Thêm chi tiết"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center text-rose-400 text-xs mb-3 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
            <AlertTriangle className="w-4 h-4 mr-2 shrink-0" /> {error}
          </div>
        )}

        {/* Danh sách các chi tiết đã thêm */}
        {items.length === 0 ? (
          <p className="text-center text-gray-500 text-xs py-6">Chưa có chi tiết nào. Vui lòng nhập dữ liệu ở trên.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={item.id} className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-2xl px-4 py-3">
                <div className="flex items-center min-w-0 mr-3">
                  <span className={`w-2.5 h-2.5 rounded-full mr-2 shrink-0 ${COLORS[idx % COLORS.length]}`} />
                  <span className="text-xs text-gray-300 font-bold truncate">{item.label}</span>
                </div>
                <div className="flex items-center shrink-0">
                  <span className="font-mono text-xs text-cyan-400 mr-4 font-bold">{item.length} mm</span>
                  <span className="text-xs text-gray-500 mr-4 font-medium">× {item.qty} thanh</span>
                  <button onClick={() => removeItem(item.id)} className="text-gray-500 hover:text-rose-400 transition-colors p-1" aria-label="Xóa" title="Xóa">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex space-x-2 mt-5">
          <button onClick={reset} className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-gray-400 transition-all active:scale-95" aria-label="Khôi phục dữ liệu mẫu" title="Khôi phục dữ liệu mẫu">
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={calculate}
            disabled={items.length === 0}
            className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white font-extrabold text-xs rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/10 transition-all py-3 active:scale-98"
          >
            <Zap className="w-4 h-4 mr-2" /> Tính Toán Sắp Xếp Tối Ưu
          </button>
        </div>
      </div>

      {longestCutLength > 0 && (
        <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-emerald-300">Gợi ý tận dụng phôi dư</h4>
              <p className="mt-1 text-xs text-slate-400">
                Chi tiết dài nhất hiện là <span className="font-mono font-bold text-white">{longestCutLength} mm</span>. Tìm phôi dư rồi kéo thả vào nguồn thanh để tính luôn.
              </p>
            </div>
            <button
              type="button"
              onClick={() => searchReusableOffcuts(longestCutLength)}
              disabled={loadingOffcuts}
              className="h-10 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
            >
              {loadingOffcuts ? "Đang tìm..." : "Tìm phôi phù hợp"}
            </button>
          </div>
        </div>
      )}

      {/* Phân tích kết quả xếp phôi */}
      {calculated && results.length > 0 && (
        <div className="space-y-4">
          {/* Card Tổng kết */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#12141a] rounded-2xl p-3.5 border border-white/5 text-center">
              <p className="text-[9px] text-gray-500 uppercase tracking-wider font-bold mb-1">Thanh 6m Cần</p>
              <p className="text-2xl font-black text-white">{totalBars}</p>
            </div>
            <div className="bg-[#12141a] rounded-2xl p-3.5 border border-white/5 text-center">
              <p className="text-[9px] text-gray-500 uppercase tracking-wider font-bold mb-1">Hiệu Suất Sử Dụng</p>
              <p className={`text-2xl font-black ${Number(efficiency) >= 85 ? "text-emerald-400" : "text-amber-400"}`}>{efficiency}%</p>
            </div>
            <div className="bg-[#12141a] rounded-2xl p-3.5 border border-white/5 text-center">
              <p className="text-[9px] text-gray-500 uppercase tracking-wider font-bold mb-1">Phần Dư Thừa</p>
              <p className={`text-2xl font-black ${totalOffcut > 0 ? "text-amber-400" : "text-emerald-400"}`}>{totalOffcut}mm</p>
            </div>
          </div>

          {Number(efficiency) >= 90 && (
            <div className="flex items-center bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3.5 text-xs text-emerald-400">
              <CheckCircle2 className="w-5 h-5 mr-2 shrink-0" />
              <span><strong>Tối ưu vượt trội!</strong> Sắp xếp đạt tỷ lệ {efficiency}%, hạn chế tối đa phế liệu nhôm bỏ đi.</span>
            </div>
          )}

          {/* Sơ đồ cắt từng thanh nhôm tiêu chuẩn */}
          <div className="space-y-3">
            {results.map(bar => (
              <div key={bar.barIndex} className={`bg-[#0d1118] p-5 border border-slate-800 shadow-sm ${viewMode === "pc" ? "rounded-2xl" : "rounded-3xl"}`}>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-xs font-black text-white">Thanh nhôm #{bar.barIndex}</p>
                  <div className="flex items-center space-x-3 text-[10px] font-bold">
                    <span className="text-gray-400">Đã dùng: <span className="text-gray-200 font-mono">{bar.used}mm</span></span>
                    <span className={bar.offcut < MIN_OFFCUT ? "text-rose-400" : "text-emerald-400"}>
                      Dư thừa: <span className="font-mono">{bar.offcut}mm</span>
                      {bar.offcut < MIN_OFFCUT && bar.offcut > 0 && " (phế)"}
                    </span>
                  </div>
                </div>

                {/* Sơ đồ trực quan dạng thanh nhôm thực tế */}
                <div className="w-full h-11 rounded-xl overflow-hidden border border-white/10 bg-gradient-to-r from-slate-900 to-slate-950 p-0.5 relative shadow-inner">
                  <div className="w-full h-full rounded-lg overflow-hidden flex relative">
                    {(() => (
                      <>
                        {bar.cuts.map((cut, idx) => {
                          const widthPercent = (cut.length / stockSource.length) * 100;
                          return (
                            <div
                              key={idx}
                              className={`h-full flex flex-col justify-center items-center relative text-white font-mono text-[9px] font-black border-r border-cyan-400/80 shadow-[inset_0_1px_8px_rgba(255,255,255,0.08)] ${cut.color}`}
                              style={{ width: `${widthPercent}%` }}
                              title={`${cut.label}: ${cut.length}mm`}
                            >
                              <span className="truncate max-w-full px-1">{cut.label.split(" ")[0]}</span>
                              <span className="text-[8px] opacity-75">{cut.length}mm</span>
                            </div>
                          );
                        })}

                        {/* Lưỡi cắt (Kerf) và Phế liệu / Phôi dư thừa */}
                        {bar.offcut > 0 && (
                          <div
                            className={`h-full flex items-center justify-center font-bold text-[9px] ${
                              bar.offcut < MIN_OFFCUT
                                ? "bg-rose-950/40 text-rose-400/60 pattern-diagonal-stripes"
                                : "bg-slate-800/60 text-slate-400"
                            }`}
                            style={{ width: `${(bar.offcut / stockSource.length) * 100}%` }}
                            title={`Phần thừa: ${bar.offcut}mm`}
                          >
                            {bar.offcut}mm
                          </div>
                        )}
                      </>
                    ))()}
                  </div>
                </div>

                {/* Chú thích các nhát cắt */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {bar.cuts.map((cut, i) => (
                    <span key={i} className="inline-flex items-center text-[10px] text-gray-400 bg-black/20 border border-white/[0.03] rounded-lg px-2 py-0.5">
                      <span className={`w-2 h-2 rounded-full mr-1.5 ${cut.color}`} />
                      {cut.label}: <strong className="text-white ml-0.5">{cut.length}mm</strong>
                    </span>
                  ))}
                </div>

                <div className="mt-4 pt-3.5 border-t border-white/5 flex justify-between text-[10px] text-gray-500 font-bold">
                  <span>🔪 {bar.cuts.length} đường cắt · Hao hụt cưa: {bar.waste}mm</span>
                  <span>Hiệu năng thanh: {((bar.used / stockSource.length) * 100).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Tóm tắt thống kê cuối */}
          <div className={`bg-[#0b0e13] p-5 border border-cyan-500/10 ${viewMode === "pc" ? "rounded-2xl" : "rounded-3xl"}`}>
            <h4 className="text-xs font-black text-cyan-400 mb-3 uppercase tracking-wider">Tổng Kết Vật Tư</h4>
            <div className="space-y-2 text-xs text-gray-400">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Tổng số thanh nguồn cần chuẩn bị:</span>
                <span className="font-extrabold text-white font-mono">{totalBars} thanh ({stockSource.length}mm)</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span>Tổng hao hụt đường cưa (Kerf):</span>
                <span className="font-bold text-rose-400 font-mono">{totalWaste} mm</span>
              </div>
              <div className="flex justify-between pb-1">
                <span>Phôi dư khả dụng (trên 200mm):</span>
                <span className={`font-bold font-mono ${totalOffcut >= MIN_OFFCUT ? "text-emerald-400" : "text-gray-500"}`}>
                  {totalOffcut} mm {totalOffcut < MIN_OFFCUT ? "(Chỉ có phế liệu)" : ""}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render bảng giá và tìm kiếm vật tư
  const PricingPanel = () => (
    <div className="space-y-4">
      {/* Tìm kiếm phôi dư khả dụng trong kho */}
      <div className={`bg-[#0d1118] p-5 border border-slate-800 ${viewMode === "pc" ? "rounded-2xl" : "rounded-3xl"}`}>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center">
          <Database className="w-4 h-4 mr-2 text-emerald-400" /> Khớp Tìm Phôi Dư Tại Kho
        </h3>
        <p className="text-[10px] text-gray-500 mb-3">Nhập chiều dài chi tiết cần cắt để tìm thanh nhôm thừa có sẵn trên kệ kho xưởng.</p>
        <div className="flex gap-2">
          <input
            type="number"
            value={searchLength}
            onChange={e => setSearchLength(e.target.value)}
            placeholder="Chiều dài (mm) VD: 2100"
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none font-mono"
          />
          <button
            onClick={() => searchReusableOffcuts()}
            disabled={loadingOffcuts}
            className="px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors active:scale-95 flex items-center justify-center gap-1.5"
          >
            {loadingOffcuts ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Tìm phôi dư
          </button>
        </div>

        {searchedOffcuts && (
          <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
            {offcutsList.length === 0 ? (
              <p className="text-center text-gray-500 text-xs py-2">Không tìm thấy thanh nhôm thừa nào dài trên mức này.</p>
            ) : (
              <div className="space-y-2">
                {offcutsList.map((off, idx) => (
                  <div
                    key={idx}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData(
                        "application/json",
                        JSON.stringify({
                          label: `UID-${off.maphoi}`,
                          length: off.chieudaihientai,
                          maphoi: off.maphoi,
                        }),
                      );
                    }}
                    className="group grid grid-cols-[1fr_auto] gap-2 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-3 transition-colors hover:border-emerald-400/35 hover:bg-emerald-500/10"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-emerald-300 truncate">{off.vattu?.tenvt || `Vật tư #${off.mavt}`}</p>
                      <p className="text-[9px] text-gray-500 mt-0.5">Mã phôi #{off.maphoi} · kéo vào Trợ lý cắt</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-mono text-xs font-black text-white bg-emerald-500/15 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                        {off.chieudaihientai} mm
                      </span>
                      <button
                        type="button"
                        onClick={() => applyStockSource({
                          label: `UID-${off.maphoi}`,
                          length: off.chieudaihientai,
                          maphoi: off.maphoi,
                        })}
                        className="text-[10px] font-black text-emerald-200 opacity-80 hover:opacity-100"
                      >
                        Dùng phôi
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bảng giá vật tư */}
      <div className={`bg-[#0d1118] border border-slate-800 overflow-hidden ${viewMode === "pc" ? "rounded-2xl" : "rounded-3xl"}`}>
        <div className="p-4 border-b border-white/5 bg-white/[0.01] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-amber-400" /> Bảng Giá Vật Tư Xưởng
            </h3>
            <span className="text-[10px] text-gray-500 font-bold">Cập nhật động DB</span>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                value={priceSearch}
                onChange={e => setPriceSearch(e.target.value)}
                placeholder="Tìm kiếm vật tư..."
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
              />
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
            </div>
            <button
              onClick={handleSortToggle}
              className={`px-3 border rounded-xl flex items-center justify-center transition-colors ${
                sortByPrice !== "none" ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "border-white/10 text-gray-400 bg-white/3"
              }`}
              title="Sắp xếp theo giá"
              aria-label="Sắp xếp theo giá"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loadingPrices ? (
          <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
        ) : filteredPrices.length === 0 ? (
          <p className="text-center text-gray-500 text-xs py-8">Không tìm thấy vật tư khớp từ khóa.</p>
        ) : (
          <div className="divide-y divide-white/[0.03] max-h-[350px] overflow-y-auto no-scrollbar">
            {filteredPrices.map((item, idx) => (
              <div key={idx} className="px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.01] transition-colors">
                <div className="min-w-0 mr-3">
                  <p className="text-xs font-bold text-gray-200 truncate">{item.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[9px] bg-white/5 border border-white/10 text-gray-400 px-1.5 py-0.5 rounded-md font-medium">{item.brand}</span>
                    <span className="text-[9px] text-gray-500">{item.code}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-black text-amber-400 font-mono">
                    {item.price.toLocaleString("vi-VN")} đ
                  </p>
                  <p className="text-[8px] text-gray-500">/ {item.unit}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="p-3.5 border-t border-white/5 bg-white/[0.01] flex items-center justify-center gap-1 text-[9px] text-gray-600">
          <Info className="w-3.5 h-3.5" />
          <span>Báo giá chính xác dựa trên danh mục vật tư hiện hành.</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-full bg-[#030508] text-gray-200 flex flex-col">
      {/* Header Sticky */}
      <div className={`${viewMode === "pc" ? "px-6 pt-7 pb-5" : "pt-10 pb-4 px-5 bg-linear-to-b from-cyan-900/30 to-[#030508] sticky top-0 z-20"}`}>
        <div className="w-full max-w-[1120px] mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-lg font-black text-white flex items-center tracking-tight">
              <Scissors className="w-5 h-5 mr-2 text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.4)]" /> Trợ Lý Cắt Phôi & Tận Dụng Kho
            </h1>
            <p className="text-[10px] text-gray-500 mt-0.5">Kerf {BLADE_KERF}mm · Thanh nhôm tiêu chuẩn {BAR_LENGTH}mm · Chiến lược xếp FFD</p>
          </div>

          {/* Tab Selection (chỉ hiện trên Mobile, PC hiển thị đồng thời song song) */}
          {viewMode !== "pc" && (
            <div className="flex p-1 bg-[#12141a]/90 rounded-xl border border-white/5 w-full md:w-64">
              <button onClick={() => setActiveTab("simulator")} className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeTab === "simulator" ? "bg-cyan-600 text-white shadow-sm" : "text-gray-400"}`}>
                Trợ Lý Cắt
              </button>
              <button onClick={() => setActiveTab("prices")} className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeTab === "prices" ? "bg-amber-500 text-white shadow-sm" : "text-gray-400"}`}>
                Giá Vật Tư & Kho
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className={`flex-1 ${viewMode === "pc" ? "w-full max-w-[1120px] mx-auto px-6 pb-12" : "w-full px-4 pb-8"}`}>
        {viewMode === "pc" ? (
          // CHẾ ĐỘ PC: Giao diện 2 Cột song song tiện lợi
          <div className="grid grid-cols-12 gap-6 items-start">
            <div className="col-span-12 lg:col-span-7">
              {SimulatorPanel()}
            </div>
            <div className="col-span-12 lg:col-span-5">
              {PricingPanel()}
            </div>
          </div>
        ) : (
          // CHẾ ĐỘ MOBILE: Giao diện chuyển đổi Tabs
          activeTab === "simulator" ? SimulatorPanel() : PricingPanel()
        )}
      </div>
    </div>
  );
}

function Loader2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`animate-spin ${props.className}`}
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
