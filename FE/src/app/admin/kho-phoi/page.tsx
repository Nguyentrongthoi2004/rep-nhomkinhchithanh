"use client";

import { QrCode, Search, Inbox, Filter, BarChart2 } from "lucide-react";
import { useState } from "react";

const MOCK_INVENTORY = [
  { id: "XF55-C3328-001", name: "Khung bao đứng Xingfa 55", length: 5800, color: "XÁM ĐEN", status: "NGUYÊN TEM", importedAt: "10/04/2026" },
  { id: "XF55-C3328-002", name: "Khung bao đứng Xingfa 55", length: 5800, color: "XÁM ĐEN", status: "NGUYÊN TEM", importedAt: "10/04/2026" },
  { id: "XF55-C3303-089", name: "Cánh cửa đi mở quay XF55", length: 2150, color: "XÁM ĐEN", status: "ĐỀ-XÊ (DƯ)", importedAt: "08/04/2026" },
  { id: "PMA-55-9012-014", name: "Thanh Khung PMA", length: 1400, color: "TRẮNG SỨ", status: "ĐỀ-XÊ (DƯ)", importedAt: "05/04/2026" },
  { id: "XF93-D1541-005", name: "Khung lùa Xingfa 93", length: 6000, color: "XÁM ĐEN", status: "ĐANG CẮT", importedAt: "11/04/2026" },
];

export default function RawMaterialInventoryPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'NGUYÊN TEM': return <span className="px-2 py-1 text-[10px] font-bold tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded">NGUYÊN TEM (6M)</span>;
      case 'ĐỀ-XÊ (DƯ)': return <span className="px-2 py-1 text-[10px] font-bold tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded">ĐỀ XÊ KHO</span>;
      case 'ĐANG CẮT': return <span className="px-2 py-1 text-[10px] font-bold tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded">TRÊN MÁY TỬ</span>;
      default: return null;
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-[#0a0a0c] p-6 rounded-2xl border border-white/5 shadow-sm">
        <div>
           <h1 className="text-2xl font-bold text-gray-100 flex items-center">
            <Inbox className="w-6 h-6 mr-3 text-cyan-500" />
            Quản Lý Lô Phôi & Đề-Xê
          </h1>
          <p className="text-gray-400 text-sm mt-1 ml-9">Định danh từng thanh nhôm nguyên liệu trong xưởng.</p>
        </div>
        
        <div className="flex space-x-3">
           <button className="bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 px-4 py-2.5 rounded-lg flex items-center font-medium transition-colors">
            <QrCode className="w-4 h-4 mr-2" />
            Quét Nhập Kho
          </button>
          <button className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2.5 rounded-lg flex items-center font-bold transition-colors shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)]">
            + Nhập Lô Phôi Mới
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="bg-[#0a0a0c] border border-white/5 p-5 rounded-2xl flex items-center shadow-lg">
            <div className="p-3 bg-emerald-500/10 rounded-full mr-4 border border-emerald-500/20"><BarChart2 className="text-emerald-400 w-6 h-6"/></div>
            <div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Tổng Tồn Kho</p>
              <p className="text-2xl font-bold text-gray-100">842 <span className="text-sm font-normal text-gray-500">thanh</span></p>
            </div>
          </div>
          <div className="bg-[#0a0a0c] border border-white/5 p-5 rounded-2xl flex items-center shadow-lg">
            <div className="p-3 bg-amber-500/10 rounded-full mr-4 border border-amber-500/20"><Inbox className="text-amber-400 w-6 h-6"/></div>
            <div>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Phôi Đề-Xê Có Thể Tái Chế</p>
              <p className="text-2xl font-bold text-gray-100">156 <span className="text-sm font-normal text-gray-500">đoạn</span></p>
            </div>
          </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text"
            placeholder="Quét mã vạch ID thanh nhôm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
          />
        </div>
        <button className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {/* Inventory Table */}
      <div className="bg-[#0a0a0c] rounded-2xl border border-white/5 overflow-hidden shadow-lg">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-white/10 text-[11px] uppercase tracking-wider text-gray-400">
              <th className="p-4 font-semibold w-40">Mã Định Danh (UID)</th>
              <th className="p-4 font-semibold">Tên Vật Tư (Hệ Nhôm)</th>
              <th className="p-4 font-semibold text-center w-28">Chiều Trọng Khối</th>
              <th className="p-4 font-semibold text-center w-28">Màu Sắc</th>
              <th className="p-4 font-semibold text-center w-32">Trạng Thái</th>
              <th className="p-4 font-semibold w-32 text-right">Ngày Nhập</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {MOCK_INVENTORY.map((item) => (
              <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="p-4 text-sm font-bold text-cyan-400 font-mono flex items-center">
                  <QrCode className="w-3.5 h-3.5 mr-2 text-gray-500" />
                  {item.id}
                </td>
                <td className="p-4 text-sm font-medium text-gray-300">{item.name}</td>
                <td className="p-4 text-center text-sm font-mono font-bold text-gray-200">
                  {item.length} <span className="text-xs text-gray-500 font-sans">mm</span>
                </td>
                <td className="p-4 text-center text-sm font-semibold text-gray-400">{item.color}</td>
                <td className="p-4 text-center">
                  {getStatusBadge(item.status)}
                </td>
                <td className="p-4 text-right text-sm text-gray-500">{item.importedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
