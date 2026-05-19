"use client";

import { useState, useCallback } from "react";
import { Scissors, Plus, RotateCcw, Zap, AlertTriangle, CheckCircle2, Info, TrendingUp, X } from "lucide-react";

// ─── Hằng số vật lý (chuẩn Dowes) ───
const BAR_LENGTH = 6000;   // mm - chiều dài thanh chuẩn
const BLADE_KERF = 5;      // mm - độ dày lưỡi cưa
const MIN_OFFCUT = 200;    // mm - mảnh còn lại < ngưỡng này = phế liệu

// ─── Bảng giá thị trường (tham khảo) ───
const MARKET_PRICES = [
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

// ─── 1D-CSP: chiến lược xếp giảm dần vào thanh phù hợp đầu tiên (FFD) ───
interface CutItem { id: string; length: number; label: string; qty: number }
interface CutResult {
  barIndex: number;
  cuts: { label: string; length: number; color: string }[];
  used: number;
  waste: number;
  offcut: number;
}

const COLORS = [
  "bg-cyan-500", "bg-blue-500", "bg-emerald-500", "bg-violet-500",
  "bg-amber-500", "bg-rose-500", "bg-sky-400", "bg-teal-500",
];

function runCSP(items: CutItem[]): CutResult[] {
  // Mở rộng số lượng → danh sách từng nhát cắt
  const expanded: { label: string; length: number; color: string }[] = [];
  items.forEach((item, idx) => {
    for (let q = 0; q < item.qty; q++) {
      expanded.push({ label: `${item.label} (${q + 1})`, length: item.length, color: COLORS[idx % COLORS.length] });
    }
  });
  // Sắp xếp giảm dần theo chiến lược FFD.
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
      bars.push({ cuts: [piece], remaining: BAR_LENGTH - needed });
    }
  }

  return bars.map((bar, i) => {
    const used = BAR_LENGTH - bar.remaining;
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
  const [items, setItems] = useState<CutItem[]>([
    { id: "1", label: "Cột đứng", length: 2100, qty: 2 },
    { id: "2", label: "Xà ngang", length: 1200, qty: 3 },
  ]);
  const [results, setResults] = useState<CutResult[]>([]);
  const [calculated, setCalculated] = useState(false);
  const [activeTab, setActiveTab] = useState<"simulator" | "prices">("simulator");

  // Form thêm kích thước
  const [newLabel, setNewLabel] = useState("");
  const [newLength, setNewLength] = useState("");
  const [newQty, setNewQty] = useState("1");
  const [error, setError] = useState("");

  const addItem = () => {
    const len = Number(newLength);
    const qty = Number(newQty);
    if (!newLabel.trim()) { setError("Nhập tên chi tiết!"); return; }
    if (len <= 0 || len > BAR_LENGTH) { setError(`Chiều dài phải từ 1 đến ${BAR_LENGTH}mm`); return; }
    if (qty <= 0 || qty > 100) { setError("Số lượng từ 1–100"); return; }
    setItems(prev => [...prev, { id: Date.now().toString(), label: newLabel.trim(), length: len, qty }]);
    setNewLabel(""); setNewLength(""); setNewQty("1");
    setError(""); setCalculated(false);
  };

  const removeItem = (id: string) => { setItems(p => p.filter(i => i.id !== id)); setCalculated(false); };

  const calculate = useCallback(() => {
    if (items.length === 0) { setError("Chưa có chi tiết nào!"); return; }
    const invalid = items.find(i => i.length > BAR_LENGTH);
    if (invalid) { setError(`"${invalid.label}" dài hơn thanh chuẩn ${BAR_LENGTH}mm!`); return; }
    setResults(runCSP(items));
    setCalculated(true);
    setError("");
  }, [items]);

  const reset = () => { setItems([]); setResults([]); setCalculated(false); setError(""); };

  const totalBars = results.length;
  const totalWaste = results.reduce((s, r) => s + r.waste, 0);
  const totalOffcut = results.reduce((s, r) => s + r.offcut, 0);
  const efficiency = totalBars > 0 ? ((1 - totalOffcut / (totalBars * BAR_LENGTH)) * 100).toFixed(1) : "0";

  return (
    <div className="min-h-full bg-[#030508] text-gray-200 flex flex-col">
      {/* Đầu trang */}
      <div className="pt-10 pb-4 px-5 bg-linear-to-b from-cyan-900/30 to-[#030508] sticky top-0 z-20">
        <h1 className="text-xl font-bold text-gray-100 flex items-center">
          <Scissors className="w-6 h-6 mr-2 text-cyan-400" /> Tối Ưu Cắt 1D-CSP
        </h1>
        <p className="text-[11px] text-gray-500 mt-1">Thuật toán First Fit Decreasing · Kerf {BLADE_KERF}mm · Thanh {BAR_LENGTH}mm</p>
        {/* Tab chức năng */}
        <div className="flex mt-3 p-1 bg-[#12141a] rounded-xl border border-white/5">
          <button onClick={() => setActiveTab("simulator")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === "simulator" ? "bg-cyan-600 text-white" : "text-gray-400"}`}>
            Mô Phỏng Cắt
          </button>
          <button onClick={() => setActiveTab("prices")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === "prices" ? "bg-amber-500 text-white" : "text-gray-400"}`}>
            Bảng Giá TT
          </button>
        </div>
      </div>

      {/* ─── TAB: MÔ PHỎNG ─── */}
      {activeTab === "simulator" && (
        <div className="px-4 pb-8 space-y-4 flex-1">

          {/* Input danh sách chi tiết */}
          <div className="bg-[#12141a] rounded-2xl p-4 border border-white/5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center">
              <Plus className="w-3.5 h-3.5 mr-1.5 text-cyan-400" /> Danh Sách Chi Tiết Cần Cắt
            </h3>

            {/* Form thêm */}
            <div className="grid grid-cols-5 gap-2 mb-3">
              <input
                value={newLabel}
                onChange={e => { setNewLabel(e.target.value); setError(""); }}
                placeholder="Tên (VD: Cột)"
                className="col-span-2 bg-[#030508] border border-white/10 rounded-lg px-2 py-2 text-xs text-white focus:border-cyan-500 outline-none"
              />
              <input
                type="number"
                value={newLength}
                onChange={e => { setNewLength(e.target.value); setError(""); }}
                placeholder="mm"
                className="bg-[#030508] border border-white/10 rounded-lg px-2 py-2 text-xs text-white focus:border-cyan-500 outline-none font-mono"
              />
              <input
                type="number"
                value={newQty}
                onChange={e => { setNewQty(e.target.value); setError(""); }}
                placeholder="SL"
                min="1"
                className="bg-[#030508] border border-white/10 rounded-lg px-2 py-2 text-xs text-white focus:border-cyan-500 outline-none text-center"
              />
              <button
                onClick={addItem}
                className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg flex items-center justify-center transition-colors"
                aria-label="Thêm chi tiết"
                title="Thêm chi tiết"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="flex items-center text-red-400 text-xs mb-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5 shrink-0" /> {error}
              </div>
            )}

            {/* Danh sách chi tiết nhập */}
            {items.length === 0 ? (
              <p className="text-center text-gray-600 text-xs py-4">Chưa có chi tiết. Nhập ở trên.</p>
            ) : (
              <div className="space-y-1.5">
                {items.map((item, idx) => (
                  <div key={item.id} className="flex items-center justify-between bg-white/3 rounded-lg px-3 py-2">
                    <span className={`w-2 h-2 rounded-full mr-2 shrink-0 ${COLORS[idx % COLORS.length]}`} />
                    <span className="flex-1 text-xs text-gray-300 font-medium">{item.label}</span>
                    <span className="font-mono text-xs text-cyan-400 mr-3">{item.length}mm</span>
                    <span className="text-xs text-gray-500 mr-3">×{item.qty}</span>
                    <button onClick={() => removeItem(item.id)} className="text-gray-600 hover:text-red-400 transition-colors" aria-label="Xóa" title="Xóa">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Nút thao tác */}
            <div className="flex space-x-2 mt-4">
              <button onClick={reset} className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400" aria-label="Đặt lại" title="Đặt lại">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={calculate}
                disabled={items.length === 0}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all py-2.5"
              >
                <Zap className="w-4 h-4 mr-2" /> Tính Tối Ưu CSP
              </button>
            </div>
          </div>

          {/* KẾT QUẢ */}
          {calculated && results.length > 0 && (
            <>
              {/* Tổng kết */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#12141a] rounded-xl p-3 border border-white/5 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Số Thanh</p>
                  <p className="text-xl font-bold text-white">{totalBars}</p>
                </div>
                <div className="bg-[#12141a] rounded-xl p-3 border border-white/5 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Hiệu Suất</p>
                  <p className={`text-xl font-bold ${Number(efficiency) >= 85 ? "text-emerald-400" : "text-amber-400"}`}>{efficiency}%</p>
                </div>
                <div className="bg-[#12141a] rounded-xl p-3 border border-white/5 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Phần Dư</p>
                  <p className={`text-xl font-bold ${totalOffcut > 0 ? "text-amber-400" : "text-emerald-400"}`}>{totalOffcut}mm</p>
                </div>
              </div>

              {Number(efficiency) >= 90 && (
                <div className="flex items-center bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-xs text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 mr-2 shrink-0" />
                  <span><strong>Rất tốt!</strong> Hiệu suất {efficiency}% — phương án này tối ưu vật liệu.</span>
                </div>
              )}

              {/* Từng thanh */}
              {results.map(bar => (
                <div key={bar.barIndex} className="bg-[#12141a] rounded-2xl p-4 border border-white/5">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-xs font-bold text-gray-300">Thanh #{bar.barIndex}</p>
                    <div className="flex items-center space-x-3 text-[10px]">
                      <span className="text-gray-500">Dùng: <span className="text-gray-300 font-mono">{bar.used}mm</span></span>
                      <span className={bar.offcut < MIN_OFFCUT ? "text-red-400" : "text-amber-400"}>
                        Dư: <span className="font-mono">{bar.offcut}mm</span>
                        {bar.offcut < MIN_OFFCUT && bar.offcut > 0 && " ⚠ phế"}
                      </span>
                    </div>
                  </div>

                  {/* Sơ đồ cắt trực quan */}
                  <div className="w-full h-10 rounded-lg overflow-hidden border border-white/10 bg-black/20">
                    <svg
                      width="100%"
                      height="100%"
                      viewBox={`0 0 ${BAR_LENGTH} 10`}
                      preserveAspectRatio="none"
                      role="img"
                      aria-label={`Sơ đồ cắt thanh #${bar.barIndex}`}
                    >
                      {(() => {
                        let x = 0;
                        const rects = bar.cuts.map((cut, i) => {
                          const rect = (
                            <g key={i}>
                              <title>{`${cut.label}: ${cut.length}mm`}</title>
                              <rect x={x} y={0} width={cut.length} height={10} fill="rgba(6,182,212,0.65)" />
                              <rect x={Math.max(0, x + cut.length - 6)} y={0} width={3} height={10} fill="rgba(0,0,0,0.6)" />
                            </g>
                          );
                          x += cut.length;
                          return rect;
                        });
                        if (bar.offcut > 0) {
                          rects.push(
                            <g key="offcut">
                              <title>{`Phần dư: ${bar.offcut}mm`}</title>
                              <rect
                                x={x}
                                y={0}
                                width={Math.max(0, BAR_LENGTH - x)}
                                height={10}
                                fill={bar.offcut < MIN_OFFCUT ? "rgba(127,29,29,0.5)" : "rgba(55,65,81,0.6)"}
                              />
                            </g>,
                          );
                        }
                        return rects;
                      })()}
                    </svg>
                  </div>

                  {/* Chú giải */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {bar.cuts.map((cut, i) => (
                      <span key={i} className="flex items-center text-[10px] text-gray-400">
                        <span className={`inline-block w-2 h-2 rounded-sm mr-1 ${cut.color}`} />
                        {cut.label}: {cut.length}mm
                      </span>
                    ))}
                  </div>

                  {/* Thống kê thanh */}
                  <div className="mt-3 pt-3 border-t border-white/5 flex justify-between text-[10px] text-gray-600">
                    <span>🔪 {bar.cuts.length} nhát · Hao lưỡi: {bar.waste}mm</span>
                    <span>Hiệu suất: {((bar.used / BAR_LENGTH) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              ))}

              {/* Tóm tắt cuối */}
              <div className="bg-[#0a0a0c] rounded-2xl p-4 border border-cyan-500/10">
                <h4 className="text-xs font-bold text-cyan-400 mb-2 uppercase tracking-wider">Tóm Tắt Vật Liệu</h4>
                <div className="space-y-1 text-xs text-gray-400">
                  <div className="flex justify-between">
                    <span>Tổng thanh cần mua:</span>
                    <span className="font-bold text-white">{totalBars} thanh 6m</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tổng hao hụt lưỡi cưa:</span>
                    <span className="font-mono text-red-400">{totalWaste}mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phần dư có thể tái sử dụng:</span>
                    <span className={`font-mono ${totalOffcut >= MIN_OFFCUT ? "text-emerald-400" : "text-gray-500"}`}>
                      {totalOffcut}mm {totalOffcut < MIN_OFFCUT * totalBars && "(phế liệu)"}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── TAB: BẢNG GIÁ ─── */}
      {activeTab === "prices" && (
        <div className="px-4 pb-8 space-y-4 flex-1">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-start text-xs text-amber-300">
            <Info className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
            <span>Giá tham khảo thị trường. Giá bán chính thức do chủ xưởng quyết định và cập nhật.</span>
          </div>

          <div className="bg-[#12141a] rounded-2xl border border-white/5 overflow-hidden">
            <div className="p-3 border-b border-white/5 bg-white/2 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-amber-400" />
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Bảng Giá Vật Liệu Tham Khảo</h3>
            </div>

            <div className="divide-y divide-white/5">
              {MARKET_PRICES.map(item => (
                <div key={item.code} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{item.name}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{item.brand} · {item.unit}</p>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <p className="text-sm font-bold text-amber-400 font-mono">
                      {item.price.toLocaleString("vi-VN")}đ
                    </p>
                    <p className="text-[10px] text-gray-600">/{item.unit}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-white/5 bg-white/1">
              <p className="text-[10px] text-gray-600 text-center">Cập nhật: Tháng 4/2026 · Giá chưa bao gồm vận chuyển</p>
            </div>
          </div>

          {/* Giá nhân công */}
          <div className="bg-[#12141a] rounded-2xl border border-white/5 overflow-hidden">
            <div className="p-3 border-b border-white/5 bg-white/2">
              <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Đơn Giá Nhân Công</h3>
            </div>
            <div className="divide-y divide-white/5">
              {[
                { name: "Gia công cắt + khoan", price: "20.000đ/kg" },
                { name: "Lắp đặt tại công trình", price: "85.000đ/m²" },
                { name: "Uốn vòm (bending)", price: "150.000đ/m" },
              ].map(item => (
                <div key={item.name} className="px-4 py-3 flex justify-between items-center">
                  <span className="text-xs text-gray-300">{item.name}</span>
                  <span className="text-xs font-bold text-emerald-400">{item.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
