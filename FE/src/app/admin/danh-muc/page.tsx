"use client";

import { Plus, Search, Edit2, Trash2, Layers } from "lucide-react";
import { useState } from "react";

const BOCK_CATEGORIES = [
  { id: 1, code: "CAT-N-XF", name: "Nhôm Xingfa Việt Nam", type: "NHOM", desc: "Các biên dạng Xingfa sản xuất tại VN" },
  { id: 2, code: "CAT-N-GD", name: "Nhôm Topal Gấp Trượt", type: "NHOM", desc: "Hệ nhôm gấp trượt Topal" },
  { id: 3, code: "CAT-K-CL", name: "Kính Cường Lực", type: "KINH", desc: "Kính cường lực các loại độ dày" },
  { id: 4, code: "CAT-K-AT", name: "Kính An Toàn 2 Lớp", type: "KINH", desc: "Kính dán an toàn chống vỡ" },
  { id: 5, code: "CAT-P-KL", name: "Phụ kiện Kinlong", type: "PHU_KIEN", desc: "Bản lề, tay nắm, khóa Kinlong nhập khẩu" },
];

export default function CategoryPage() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-[#0a0a0c] p-6 rounded-2xl border border-white/5 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center">
            <Layers className="w-6 h-6 mr-3 text-purple-500" />
            Cây Danh Mục Vật Tư
          </h1>
          <p className="text-gray-400 text-sm mt-1 ml-9">Quản lý cách phân nhóm vật tư trong hệ thống.</p>
        </div>
        
        <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg flex items-center font-medium transition-colors shadow-[0_0_15px_-3px_rgba(37,99,235,0.4)]">
          <Plus className="w-5 h-5 mr-2" />
          Tạo Danh Mục Mới
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            type="text"
            placeholder="Tìm theo tên hoặc mã danh mục..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
        <select className="bg-[#0a0a0c] border border-white/10 text-gray-300 text-sm rounded-lg px-4 py-2.5 outline-none focus:border-blue-500">
          <option value="ALL">Tất cả phân loại</option>
          <option value="NHOM">Nhôm</option>
          <option value="KINH">Kính</option>
          <option value="PHU_KIEN">Phụ Kiện</option>
        </select>
      </div>

      {/* Data Table */}
      <div className="bg-[#0a0a0c] rounded-2xl border border-white/5 overflow-hidden shadow-lg">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
              <th className="p-4 font-semibold w-16 text-center">STT</th>
              <th className="p-4 font-semibold">Mã Nhóm</th>
              <th className="p-4 font-semibold">Tên Gọi</th>
              <th className="p-4 font-semibold w-32">Phân Loại</th>
              <th className="p-4 font-semibold">Ghi Chủ</th>
              <th className="p-4 font-semibold w-24 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {BOCK_CATEGORIES.map((cat, idx) => (
              <tr key={cat.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="p-4 text-center text-sm text-gray-500 font-mono">{idx + 1}</td>
                <td className="p-4 text-sm font-mono text-gray-300">{cat.code}</td>
                <td className="p-4 text-sm font-semibold text-gray-200">{cat.name}</td>
                <td className="p-4">
                  <span className={`inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide border ${
                    cat.type === 'NHOM' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                    cat.type === 'KINH' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 
                    'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {cat.type}
                  </span>
                </td>
                <td className="p-4 text-sm text-gray-500 truncate max-w-[200px]">{cat.desc}</td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Pagination mock */}
        <div className="p-4 border-t border-white/5 flex items-center justify-between text-sm text-gray-500">
          <span>Hiển thị 1 đến 5 trong số 5 danh mục</span>
          <div className="flex space-x-1">
            <button className="px-3 py-1 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-colors disabled:opacity-50" disabled>Trước</button>
            <button className="px-3 py-1 bg-blue-600 text-white border border-blue-500 rounded hover:bg-blue-500 transition-colors">1</button>
            <button className="px-3 py-1 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-colors disabled:opacity-50" disabled>Sau</button>
          </div>
        </div>
      </div>

    </div>
  );
}
