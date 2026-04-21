"use client";

import { useState } from "react";
import { Ruler, Save, ShieldAlert, Cpu } from "lucide-react";

export default function ConfigPage() {
  const [kerf, setKerf] = useState(4);
  const [safeMargin, setSafeMargin] = useState(20);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      // alert or toast can be added here
    }, 1000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center">
            <Cpu className="w-6 h-6 mr-3 text-blue-500" />
            Cấu Hình Thuật Toán Cắt (1D-CSP)
          </h1>
          <p className="text-gray-400 text-sm mt-1 ml-9">Thiết lập các hằng số vật lý của máy cắt tại xưởng để phần mềm tính toán tối ưu.</p>
        </div>
        
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg flex items-center font-medium transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Đang lưu..." : "Lưu Cấu Hình"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        
        {/* Kerf Configuration */}
        <div className="bg-[#0a0a0c] border border-white/10 rounded-2xl p-6 shadow-lg">
          <div className="flex items-start mb-6">
            <div className="p-3 bg-blue-500/10 rounded-xl mr-4 border border-blue-500/20">
              <Ruler className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-200">Độ Hở Lưỡi Cưa (Blade Kerf)</h3>
              <p className="text-sm text-gray-400 mt-1">Phần nhôm bị hóa mùn cưa sau mỗi nhát cắt. Thường là 4mm đối với lưỡi nhôm hệ.</p>
            </div>
          </div>
          
          <div className="relative">
            {/* EdgeTools/axe in this project expects explicit accessible names. */}
            <input 
              type="number" 
              title="Độ hở lưỡi cưa (mm)"
              aria-label="Độ hở lưỡi cưa (mm)"
              placeholder="VD: 4"
              value={kerf}
              onChange={(e) => setKerf(Number(e.target.value))}
              className="bg-white/5 border border-white/10 text-3xl font-bold text-white rounded-xl w-full p-4 pl-6 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              min="0"
              max="10"
              step="0.5"
            />
            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-500">mm</span>
          </div>

          <div className="mt-6 pt-6 border-t border-white/5">
            <input 
              type="range" 
              title="Chỉnh độ hở lưỡi cưa"
              aria-label="Chỉnh độ hở lưỡi cưa"
              min="2" max="10" step="0.5" 
              value={kerf} 
              onChange={(e) => setKerf(Number(e.target.value))}
              className="w-full accent-blue-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2 font-medium">
              <span>2mm (Lưỡi mỏng)</span>
              <span>10mm (Lưỡi công nghiệp)</span>
            </div>
          </div>
        </div>

        {/* Safe Margin Configuration */}
        <div className="bg-[#0a0a0c] border border-white/10 rounded-2xl p-6 shadow-lg">
          <div className="flex items-start mb-6">
            <div className="p-3 bg-red-500/10 rounded-xl mr-4 border border-red-500/20">
              <ShieldAlert className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-200">Lề An Toàn Biên (Safe Margin)</h3>
              <p className="text-sm text-gray-400 mt-1">Khoảng cách trừ hao ở hai đầu thanh phôi nguyên bản để tránh móp méo lúc bốc vác.</p>
            </div>
          </div>
          
          <div className="relative">
            <input 
              type="number" 
              title="Lề an toàn biên (mm)"
              aria-label="Lề an toàn biên (mm)"
              placeholder="VD: 20"
              value={safeMargin}
              onChange={(e) => setSafeMargin(Number(e.target.value))}
              className="bg-white/5 border border-white/10 text-3xl font-bold text-white rounded-xl w-full p-4 pl-6 focus:ring-2 focus:ring-red-500 outline-none transition-all"
              min="0"
              max="100"
              step="5"
            />
            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-500">mm</span>
          </div>

          <div className="mt-6 pt-6 border-t border-white/5">
            <input 
              type="range" 
              title="Chỉnh lề an toàn biên"
              aria-label="Chỉnh lề an toàn biên"
              min="0" max="50" step="5" 
              value={safeMargin} 
              onChange={(e) => setSafeMargin(Number(e.target.value))}
              className="w-full accent-red-500 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2 font-medium">
              <span>0mm (Không gọt đầu)</span>
              <span>50mm (Gọt sâu)</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
