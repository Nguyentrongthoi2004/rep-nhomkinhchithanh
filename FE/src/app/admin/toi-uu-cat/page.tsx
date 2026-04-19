"use client";

import { Scissors, Play, Settings, Ruler, Archive, CheckCircle2 } from "lucide-react";
import { useState } from "react";

// Mock Data from BOM (Phase 3)
const MOCK_CUT_LIST = [
  { id: "C1", name: "Cánh dọc XF55", length: 2354, qty: 2, color: "bg-blue-500" },
  { id: "C2", name: "Cánh ngang XF55", length: 856.5, qty: 2, color: "bg-emerald-500" },
  { id: "C3", name: "Khung vách hông", length: 1450, qty: 1, color: "bg-purple-500" }
];

export default function CuttingOptimizationPage() {
  const [kerf] = useState(4); // 4mm mùn cưa
  const [safeMargin] = useState(20); // 20mm gọt mép
  const stockLength = 6000; // Cây nhôm gốc 6m
  
  const [isOptimized, setIsOptimized] = useState(false);

  // Giả lập kết quả nhét vừa vặn vào 1 thanh 6000mm
  // C1 (2354) + 4(Kerf) + C1(2354) + 4(Kerf) + C2(856.5) = 5572.5mm
  // Còn lại Đề-xê: 6000 - 40(Safemargin 2 đầu) - 5572.5 = 387.5mm
  const optimizedBar = [
    { type: 'safe', length: safeMargin, color: 'bg-red-500/20' },
    { type: 'cut', length: 2354, name: "Cánh dọc (C1)", color: 'bg-blue-500' },
    { type: 'kerf', length: kerf, color: 'bg-black' },
    { type: 'cut', length: 2354, name: "Cánh dọc (C1)", color: 'bg-blue-500' },
    { type: 'kerf', length: kerf, color: 'bg-black' },
    { type: 'cut', length: 856.5, name: "Cánh ngang (C2)", color: 'bg-emerald-500' },
    { type: 'kerf', length: kerf, color: 'bg-black' },
    { type: 'waste', length: 387.5, color: 'bg-amber-500/50 block-pattern' }, // Đề xê dư
    { type: 'safe', length: safeMargin, color: 'bg-red-500/20' },
  ];

  const handleOptimize = () => {
    setIsOptimized(true);
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-[#0a0a0c] p-6 rounded-2xl border border-white/5 shadow-sm">
        <div>
           <h1 className="text-2xl font-bold text-gray-100 flex items-center">
            <Scissors className="w-6 h-6 mr-3 text-red-400" />
            Giả Lập Cắt Phôi (1D-CSP)
          </h1>
          <p className="text-gray-400 text-sm mt-1 ml-9">Tính toán ghép các đoạn cắt vào cây nhôm 6m để giảm tối đa phôi vụn.</p>
        </div>
        
        <button 
          onClick={handleOptimize}
          disabled={isOptimized}
          className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-lg flex items-center font-bold transition-all shadow-[0_0_20px_-3px_rgba(220,38,38,0.4)] disabled:opacity-50 disabled:shadow-none"
        >
          {isOptimized ? <CheckCircle2 className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
          {isOptimized ? "Đã Xếp Tối Ưu Tự Động" : "RUN ALGORITHM"}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        
        {/* Left Col: BOM Input */}
        <div className="xl:col-span-1 bg-[#0a0a0c] border border-white/5 rounded-2xl p-5 shadow-lg">
          <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center justify-between mb-4 border-b border-white/10 pb-3">
            <span>Danh sách cắt (BOM)</span>
            <span className="bg-white/10 text-xs px-2 py-1 rounded">5 Lệnh</span>
          </h3>
          <div className="space-y-3">
            {MOCK_CUT_LIST.map(item => (
              <div key={item.id} className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${item.color} mr-3 shadow-[0_0_8px_rgba(255,255,255,0.2)]`}></div>
                  <div>
                    <p className="text-sm font-bold text-gray-200">{item.name}</p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{item.length.toFixed(1)} mm</p>
                  </div>
                </div>
                <div className="text-sm font-bold text-gray-400">x{item.qty}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Output Visualization */}
        <div className="xl:col-span-3 space-y-6">
          
          <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-6 shadow-[inset_0_4px_20px_rgba(0,0,0,0.5)]">
            <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center mb-6">
              <Ruler className="w-4 h-4 mr-2 text-blue-400" /> Thanh Phôi: XF55-C3303-001 (Dài: 6000mm)
            </h3>

            {isOptimized ? (
              <div className="space-y-4">
                {/* Visualizer Ruler */}
                <div className="w-full bg-[#1c1c22] border-2 border-dashed border-gray-700 h-28 rounded-xl flex overflow-hidden relative group">
                  
                  {/* Axis lines */}
                  <div className="absolute inset-x-0 bottom-0 h-4 border-t border-gray-600 bg-[#111] flex pointer-events-none opacity-50">
                    <div className="h-full border-r border-gray-600 absolute left-0"></div>
                    <div className="h-full border-r border-gray-600 absolute left-1/4"></div>
                    <div className="h-full border-r border-gray-600 absolute left-2/4"></div>
                    <div className="h-full border-r border-gray-600 absolute left-3/4"></div>
                    <div className="h-full border-r border-gray-600 absolute right-0"></div>
                  </div>

                  {optimizedBar.map((seg, idx) => {
                    // Calculate % width for flex basis
                    const pct = (seg.length / stockLength) * 100;
                    return (
                      <div 
                        key={idx} 
                        style={{ width: `${pct}%` }}
                        className={`h-full ${seg.color} border-r border-black/40 flex flex-col justify-center items-center transition-all hover:brightness-125 hover:z-10 relative`}
                        title={seg.type === 'kerf' ? `Hao hụt lưỡi cưa: ${seg.length}mm` : `${seg.name || 'Segment'}: ${seg.length}mm`}
                      >
                         {/* Show label only if segment is wide enough */}
                         {pct > 5 && seg.type === 'cut' && (
                           <>
                             <span className="text-white text-xs font-bold drop-shadow-md whitespace-nowrap px-1 overflow-hidden">{seg.length}</span>
                           </>
                         )}
                         {seg.type === 'waste' && pct > 3 && (
                            <span className="text-[#333] text-[10px] font-bold rotate-[-90deg] uppercase tracking-widest leading-none">ĐỂ-XÊ CÒN XÀI {seg.length}</span>
                         )}
                         {seg.type === 'kerf' && (
                           <div className="absolute -top-6 text-[8px] text-gray-500 font-bold whitespace-nowrap">4mm</div>
                         )}
                      </div>
                    )
                  })}
                </div>

                <div className="flex justify-between text-xs text-gray-500 font-mono mt-2">
                  <span>0mm</span>
                  <span>1500</span>
                  <span>3000 (3m)</span>
                  <span>4500</span>
                  <span>6000mm</span>
                </div>
              </div>
            ) : (
              <div className="w-full bg-[#13151a] border-2 border-white/5 h-28 rounded-xl flex items-center justify-center">
                <span className="text-gray-600 font-medium">Bấm RUN ALGORITHM để tính toán xếp phôi...</span>
              </div>
            )}
            
            <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/5">
              <div className="text-center">
                <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Hiệu suất cắn phôi</p>
                <p className="text-2xl font-bold text-emerald-400 font-mono">{isOptimized ? '92.9' : '0.0'}%</p>
              </div>
              <div className="text-center border-l border-white/5">
                <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Hao hụt lưỡi cắt</p>
                <p className="text-2xl font-bold text-red-400 font-mono">{isOptimized ? '12.0' : '0'} <span className="text-xs text-gray-500 font-sans">mm</span></p>
              </div>
              <div className="text-center border-l border-white/5">
                <p className="text-[10px] text-amber-500/70 font-bold uppercase mb-1">Đoạn dư thu hồi</p>
                <p className="text-2xl font-bold text-amber-400 font-mono">{isOptimized ? '387.5' : '0'} <span className="text-xs text-gray-500 font-sans">mm</span></p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
             <button disabled={!isOptimized} className="bg-white/5 border border-white/10 hover:bg-white/10 px-5 py-2.5 rounded-lg font-medium text-gray-300 disabled:opacity-50 transition-colors">Tính Lại (Tùy Chỉnh)</button>
             <button disabled={!isOptimized} className="bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-lg font-bold text-white shadow-lg disabled:opacity-50 transition-colors flex items-center">
                <Archive className="w-4 h-4 mr-2" /> Lưu & Xuất Phiếu Thợ Cắt
             </button>
          </div>

        </div>

      </div>

    </div>
  );
}
