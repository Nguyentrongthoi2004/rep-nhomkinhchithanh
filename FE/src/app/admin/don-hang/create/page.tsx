"use client";

import { useState } from "react";
import { User, Target, Calculator, FileDown, Receipt, Save, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CreateOrderBOMPage() {
  // Input States
  const router = useRouter();
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [doorType, setDoorType] = useState("CUA_DI_2_CANH");
  const [width, setWidth] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quotation States
  const [margin, setMargin] = useState(15); 
  const [laborCost, setLaborCost] = useState(350000);

  // Derived BOM Calculations (Hardcoded Logic for Xingfa 55 Double Door Open)
  // W: Width of hole, H: Height of hole
  const calculateBOM = (w: number, h: number) => {
    if (!w || !h) return null;
    
    // Khung bao cửa đi XF55
    const kb_ngang = w;
    const kb_doc = h;
    
    // Cánh cửa đi XF55 (Công thức chuẩn)
    const canh_ngang = (w - 87) / 2;
    const canh_doc = h - 46;

    // Kính (Trừ nẹp)
    const kinh_ngang = canh_ngang - 120; // Giả lập trừ nẹp
    const kinh_doc = canh_doc - 120; // Giả lập trừ nẹp

    return {
      phoiNhom: [
        { code: "XF55-C3328", name: "Khung bao đứng", length: kb_doc, qty: 2, mavt: 24 },
        { code: "XF55-C3328", name: "Khung bao ngang", length: kb_ngang, qty: 1, mavt: 24 },
        { code: "XF55-C3303", name: "Cánh dọc", length: canh_doc, qty: 4, mavt: 27 },
        { code: "XF55-C3303", name: "Cánh ngang", length: canh_ngang, qty: 4, mavt: 27 },
      ],
      kinh: [
        { name: "Kính cường lực 8mm", w: kinh_ngang, h: kinh_doc, qty: 2, mavt: 12 }
      ],
      sqm: (w/1000) * (h/1000)
    };
  };

  const bom = (typeof width === 'number' && typeof height === 'number') 
    ? calculateBOM(width, height) 
    : null;

  // Mock Price
  const baseMaterialCost = bom ? Math.round(bom.sqm * 1200000) : 0; // Giá vật tư 1.2tr/m2
  const totalLabor = bom ? Math.round(bom.sqm * laborCost) : 0;
  const quotePrice = Math.round((baseMaterialCost + totalLabor) * (1 + margin/100));

  const handleSaveOrder = async () => {
    if (!customer || !phone) return alert("Vui lòng nhập tên và SĐT khách hàng!");
    if (!bom) return alert("Vui lòng nhập kích thước để bốc tách!");
    
    setIsSubmitting(true);
    try {
      const allItems = [...bom.phoiNhom, ...bom.kinh];
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
           customer,
           phone,
           totalCost: quotePrice,
           items: allItems
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert(`Khởi tạo thành công Đơn Hàng #${data.madh}`);
      router.push("/admin/don-hang");
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert("Lỗi lưu đơn hàng: " + err.message);
      } else {
        alert("Lỗi lưu đơn hàng: " + String(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-[#0a0a0c] p-4 lg:p-6 rounded-2xl border border-white/5 shadow-sm">
        <div className="flex items-center">
          <Link href="/admin/don-hang">
            <button className="p-2 hover:bg-white/10 rounded-lg mr-4 text-gray-400 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-100 flex items-center">
              Tạo Đơn & Bóc Tách Khối Lượng
            </h1>
            <p className="text-gray-400 text-xs lg:text-sm mt-1">Dựa trên kích thước thông thủy, Auto sinh BOM và Báo giá.</p>
          </div>
        </div>
        
        <button 
          onClick={handleSaveOrder}
          disabled={isSubmitting || !bom}
          className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-lg flex items-center font-bold transition-colors shadow-[0_0_20px_-3px_rgba(234,88,12,0.4)] disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
          Lưu Đơn Hàng
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full items-start">
        
        {/* LEFT COLUMN: INPUTS */}
        <div className="xl:col-span-5 space-y-6">
          
          {/* Customer Info */}
          <div className="bg-[#0a0a0c] p-6 rounded-2xl border border-white/5 shadow-lg">
            <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wider flex items-center mb-5">
              <User className="w-4 h-4 mr-2" /> 1. Thông tin Khách hàng
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Tên Khách Hàng / Công trình</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Anh Hoàng - Căn A12"
                  value={customer} onChange={(e) => setCustomer(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-orange-500 rounded-lg p-3 text-sm text-white outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Số điện thoại</label>
                  <input 
                    type="text" 
                    value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 focus:border-orange-500 rounded-lg p-3 text-sm text-white outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Hẹn giao (Dự kiến)</label>
                  <input 
                    type="date" 
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Door Specs (DOWES style Builder) */}
          <div className="bg-[#0a0a0c] p-6 rounded-2xl border border-white/5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full"></div>
            <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wider flex items-center mb-5 relative z-10">
              <Target className="w-4 h-4 mr-2" /> 2. Kích thước Thông thủy
            </h3>
            
            <div className="space-y-5 relative z-10">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Chọn mẫu thiết kế (Hệ Nhôm)</label>
                <select 
                  value={doorType} onChange={(e) => setDoorType(e.target.value)}
                  className="w-full bg-[#111318] border border-white/10 focus:border-orange-500 rounded-lg p-3 text-sm outline-none font-semibold text-blue-400"
                >
                  <option value="CUA_DI_2_CANH">Cửa Đi Mở Quay 2 Cánh (Xingfa 55)</option>
                  <option value="CUA_SO_2_CANH">Cửa Sổ Mở Quay 2 Cánh (Xingfa 55)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-bold">Rộng (W) mm</label>
                  <input 
                    type="number" 
                    placeholder="VD: 1800"
                    value={width} onChange={(e) => setWidth(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-transparent border-b-2 border-white/10 focus:border-orange-500 p-2 text-2xl font-mono text-center text-white outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-bold">Cao (H) mm</label>
                  <input 
                    type="number" 
                    placeholder="VD: 2400"
                    value={height} onChange={(e) => setHeight(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-transparent border-b-2 border-white/10 focus:border-orange-500 p-2 text-2xl font-mono text-center text-white outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-center p-2">
                <ArrowRight className="w-6 h-6 text-orange-500/50" />
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: BOM & OUTPUT */}
        <div className="xl:col-span-7 space-y-6">
          
          {/* BOM Results (Calculated from inputs) */}
          <div className="bg-[#0a0a0c] p-6 rounded-2xl border border-white/5 shadow-[0_10px_30px_-15px_rgba(234,88,12,0.2)]">
            <div className="flex justify-between items-end mb-4">
              <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center">
                <Calculator className="w-4 h-4 mr-2 text-emerald-500" /> 
                3. Bốc Tách Sản Xuất (BOM)
              </h3>
              {bom && (
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full font-bold">
                  {bom.sqm.toFixed(2)} m²
                </span>
              )}
            </div>

            {!bom ? (
              <div className="p-10 border-2 border-dashed border-white/10 rounded-xl text-center text-gray-500">
                Nhập kích thước (W, H) để phần mềm tự động tính toán bóc tách nhôm.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Aluminum List */}
                <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                  <div className="bg-white/5 p-2 text-xs font-bold text-gray-400 px-4 border-b border-white/10">THÔNG SỐ CẮT NHÔM (XF55)</div>
                  <table className="w-full text-sm">
                    <tbody>
                      {bom.phoiNhom.map((item, idx) => (
                        <tr key={idx} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                          <td className="p-3 pl-4 font-mono text-blue-400 w-28">{item.code}</td>
                          <td className="p-3 text-gray-300">{item.name}</td>
                          <td className="p-3 text-right font-mono font-bold text-white"><span className="text-emerald-400">{item.length.toFixed(1)}</span> <span className="text-xs text-gray-500 font-sans">mm</span></td>
                          <td className="p-3 pr-4 text-right">x {item.qty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Glass List */}
                <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                  <div className="bg-white/5 p-2 text-xs font-bold text-gray-400 px-4 border-b border-white/10">BẢN LỌT LÒNG KÍNH</div>
                  <table className="w-full text-sm">
                    <tbody>
                      {bom.kinh.map((item, idx) => (
                        <tr key={idx} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                          <td className="p-3 pl-4 text-gray-300">{item.name}</td>
                          <td className="p-3 text-right font-mono text-cyan-400">
                            {item.w.toFixed(1)} <span className="text-xs text-gray-500 font-sans">x</span> {item.h.toFixed(1)} <span className="text-xs text-gray-500 font-sans">mm</span>
                          </td>
                          <td className="p-3 pr-4 text-right">x {item.qty} tấm</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-2">
                  <button className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center">
                    <FileDown className="w-4 h-4 mr-2" /> Tải File Máy Cắt (.CSV)
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quotation Panel (ANV style) */}
          <div className="bg-linear-to-br from-blue-900/20 to-slate-900 border border-blue-500/20 p-6 rounded-2xl shadow-lg relative">
            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center mb-5">
              <Receipt className="w-4 h-4 mr-2" /> 4. Cấu Hình Báo Giá
            </h3>

            <div className="grid grid-cols-2 gap-6 items-center">
               <div className="space-y-4">
                  <div>
                    <label className="flex justify-between text-xs text-gray-400 mb-1.5">
                      Đơn giá gia công (VNĐ/m²)
                    </label>
                    <input 
                      type="number" 
                      value={laborCost} onChange={(e) => setLaborCost(Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 focus:border-blue-500 rounded-lg p-2.5 text-sm text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="flex justify-between text-xs text-gray-400 mb-1.5">
                      <span>Biên lợi nhuận kỳ vọng</span>
                      <span className="text-blue-400 font-bold">{margin}%</span>
                    </label>
                    <input 
                      type="range" min="0" max="50" step="5"
                      value={margin} onChange={(e) => setMargin(Number(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                  </div>
               </div>

               <div className="bg-black/50 p-5 rounded-xl border border-white/10 text-center flex flex-col justify-center h-full">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2">Giá Bán Đề Xuất</p>
                  <p className="text-3xl font-bold text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-indigo-400 font-mono">
                    {quotePrice.toLocaleString('vi-VN')} <span className="text-lg text-gray-500">đ</span>
                  </p>
                  <button disabled={!bom} className="mt-4 w-full bg-blue-600 hover:bg-blue-500 disabled:bg-white/5 disabled:text-gray-600 text-white py-2 rounded-lg text-sm font-bold transition-colors">
                    Xuất PDF Gửi Khách
                  </button>
               </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
