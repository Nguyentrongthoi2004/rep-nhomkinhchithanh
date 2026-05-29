"use client";

import { Plus, Search, Edit2, Trash2, Layers, Loader2, ChevronLeft, ChevronRight, Info, BookOpen, Eye } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { apiData, apiJson } from "@/lib/api";
import Link from "next/link";

interface DanhMuc {
  madm: number;
  tendm: string;
  mota: string;
  trangthai: string;
}

// Hàm giải nghĩa nghiệp vụ động cho danh mục vật tư
function getCategoryRole(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("nhôm") || normalized.includes("nhom")) {
    return {
      role: "Tối ưu hóa cắt nhôm (1D-CSP)",
      desc: "thanh nhôm chịu lực, liên kết kho phôi thanh và thuật toán tối ưu cắt 1D-CSP.",
      example: "Nhôm Xingfa hệ 55, nhôm PMA, thanh nhôm 6m."
    };
  }
  if (normalized.includes("kính") || normalized.includes("kinh")) {
    return {
      role: "Quản lý diện tích & Tấm khổ",
      desc: "thường quản lý theo tấm/diện tích, dùng cho BOM và báo giá, không tham gia tối ưu cắt thanh nhôm 1D-CSP.",
      example: "Kính cường lực 8mm, kính hộp, kính dán an toàn."
    };
  }
  if (
    normalized.includes("phụ kiện") || 
    normalized.includes("phu kien") || 
    normalized.includes("ốc") || 
    normalized.includes("oc") || 
    normalized.includes("vit") || 
    normalized.includes("vít") || 
    normalized.includes("bản lề") || 
    normalized.includes("ban le") || 
    normalized.includes("khóa") ||
    normalized.includes("khoa")
  ) {
    return {
      role: "Quản lý số lượng đơn chiếc",
      desc: "khóa, ray, tay nắm, bản lề dùng hoàn thiện sản phẩm.",
      example: "Bản lề 3D, tay nắm cửa Xingfa, khóa đa điểm."
    };
  }
  if (
    normalized.includes("nhân công") || 
    normalized.includes("nhan cong") || 
    normalized.includes("lắp đặt") || 
    normalized.includes("lap dat") || 
    normalized.includes("gia công") ||
    normalized.includes("gia cong")
  ) {
    return {
      role: "Nhân công & Dịch vụ",
      desc: "Nhân công là nhóm hạng mục chi phí dùng trong báo giá/BOM, không phải vật tư tồn kho.",
      example: "Công cắt góc, công lắp đặt hoàn thiện."
    };
  }
  return {
    role: "Vật tư phụ / Khác",
    desc: "keo silicone, vít tự khoan, gioăng cao su dùng trong thi công/lắp đặt.",
    example: "Keo Silicone A500, gioăng cao su, vít tự khoan."
  };
}

export default function CategoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<DanhMuc[]>([]);

  // Đếm số lượng SKU thực tế
  const [materialCounts, setMaterialCounts] = useState<Record<string, number>>({});
  const [countsLoading, setCountsLoading] = useState(true);

  // Hộp thoại thêm/sửa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<DanhMuc | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ tendm: "", mota: "", trangthai: "HOAT_DONG" });

  // Tính toán tóm tắt thông tin các danh mục
  const stats = useMemo(() => {
    const totalCats = items.length;
    const activeCats = items.filter(i => i.trangthai === 'HOAT_DONG').length;
    const hasCounts = Object.keys(materialCounts).length > 0;
    const totalSKUs = hasCounts ? Object.values(materialCounts).reduce((a, b) => a + b, 0) : 0;
    
    let maxSkuCat = "";
    let maxSkuVal = 0;
    if (hasCounts) {
      for (const cat of items) {
        const cnt = materialCounts[cat.tendm] || 0;
        if (cnt > maxSkuVal) {
          maxSkuVal = cnt;
          maxSkuCat = cat.tendm;
        }
      }
    }
    
    return {
      totalCats,
      activeCats,
      totalSKUs,
      maxSkuCat: maxSkuCat ? `${maxSkuCat} (${maxSkuVal} SKU)` : "Chưa có",
      hasCounts
    };
  }, [items, materialCounts]);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const qs = new URLSearchParams();
      qs.set("page", String(page));
      qs.set("pageSize", String(pageSize));
      if (searchTerm.trim()) qs.set("q", searchTerm.trim());
      const data = await apiData<{ items: DanhMuc[]; total: number; page: number; pageSize: number }>(`/api/admin/categories/paged?${qs.toString()}`);
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchTerm]);

  // Tải thống kê vật tư thực tế để đếm SKU
  const fetchMaterialStats = async () => {
    setCountsLoading(true);
    try {
      type MaterialOptionShort = {
        mavt: number;
        danhmuc?: { tendm?: string } | null;
      };
      const mats = await apiData<MaterialOptionShort[]>("/api/admin/materials-options");
      const counts: Record<string, number> = {};
      for (const m of mats) {
        const catName = m.danhmuc?.tendm;
        if (catName) {
          counts[catName] = (counts[catName] || 0) + 1;
        }
      }
      setMaterialCounts(counts);
    } catch (err) {
      console.error("Lỗi khi tải thống kê vật tư:", err);
    } finally {
      setCountsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchMaterialStats();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const openAddModal = () => {
    setEditing(null);
    setFormData({ tendm: "", mota: "", trangthai: "HOAT_DONG" });
    setIsModalOpen(true);
  };

  const openEditModal = (cat: DanhMuc) => {
    setEditing(cat);
    setFormData({ tendm: cat.tendm || "", mota: cat.mota || "", trangthai: cat.trangthai || "HOAT_DONG" });
    setIsModalOpen(true);
  };

  const handleDelete = async (cat: DanhMuc) => {
    if (!confirm(`Chỉ xóa nhóm khi không còn vật tư liên kết để tránh ảnh hưởng BOM/báo giá. Bạn có chắc chắn muốn xóa danh mục "${cat.tendm}"?`)) return;
    try {
      await apiJson(`/api/admin/categories/${cat.madm}`, { method: "DELETE" });
      fetchCategories();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tendm.trim()) return alert("Vui lòng nhập tên danh mục");

    setIsSubmitting(true);
    try {
      const url = editing ? `/api/admin/categories/${editing.madm}` : "/api/admin/categories";
      const method = editing ? "PATCH" : "POST";
      await apiJson(url, {
        method,
        body: JSON.stringify({
          tendm: formData.tendm.trim(),
          mota: formData.mota?.trim() || null,
          trangthai: formData.trangthai,
        }),
      });
      setIsModalOpen(false);
      fetchCategories();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Đầu trang */}
      <div className="flex justify-between items-center bg-[#0a0a0c] p-6 rounded-2xl border border-white/5 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center">
            <Layers className="w-6 h-6 mr-3 text-purple-500" />
            Danh mục nhóm vật tư
          </h1>
          <p className="text-gray-400 text-sm mt-1 ml-9">
            Dùng để phân nhóm vật tư trong BOM, báo giá, kho phôi, thống kê và dashboard.
          </p>
        </div>
        
        <button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg flex items-center font-medium transition-colors shadow-[0_0_15px_-3px_rgba(37,99,235,0.4)]"
        >
          <Plus className="w-5 h-5 mr-2" />
          Tạo Danh Mục Mới
        </button>
      </div>

      {/* Thẻ tóm tắt số liệu */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-4 flex flex-col justify-between shadow-inner">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Tổng số danh mục</span>
          <span className="text-2xl font-bold text-gray-200 mt-2">{stats.totalCats} nhóm</span>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-4 flex flex-col justify-between shadow-inner">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Đang hoạt động</span>
          <span className="text-2xl font-bold text-emerald-400 mt-2">{stats.activeCats} nhóm</span>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-4 flex flex-col justify-between shadow-inner">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Tổng vật tư đã phân nhóm</span>
          <span className="text-2xl font-bold text-purple-400 mt-2">
            {stats.hasCounts ? `${stats.totalSKUs} SKU` : "Đang tải..."}
          </span>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-4 flex flex-col justify-between shadow-inner">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Nhóm nhiều vật tư nhất</span>
          <span className="text-sm font-bold text-blue-400 mt-2 truncate" title={stats.maxSkuCat}>
            {stats.hasCounts ? stats.maxSkuCat : "Đang tải..."}
          </span>
        </div>
      </div>

      {/* Help card: Danh mục dùng để làm gì? */}
      <div className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-purple-400" />
          Danh mục dùng để làm gì?
        </h2>
        <p className="text-xs text-gray-400 mb-4 leading-relaxed">
          Danh mục là các nhóm phân loại cấp cao quản lý vật tư trong hệ thống. Việc thiết lập đúng danh mục hỗ trợ tự động hóa các nghiệp vụ:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="p-3.5 rounded-xl border border-blue-500/10 bg-blue-500/[0.02]">
            <h3 className="text-xs font-bold text-blue-300 mb-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              1. Lập BOM
            </h3>
            <p className="text-[11px] text-gray-400 leading-normal">
              Phân loại rõ ràng vật tư để bóc tách định mức kỹ thuật chi tiết theo thiết kế cửa.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-500/10 bg-amber-500/[0.02]">
            <h3 className="text-xs font-bold text-amber-300 mb-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              2. Báo giá nhanh
            </h3>
            <p className="text-[11px] text-gray-400 leading-normal">
              Gom nhóm chi phí vật liệu (Nhôm, Kính, Phụ kiện) để tự động tính toán giá vốn và giá bán.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-purple-500/10 bg-purple-500/[0.02]">
            <h3 className="text-xs font-bold text-purple-300 mb-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
              3. Phân loại kho
            </h3>
            <p className="text-[11px] text-gray-400 leading-normal">
              Xử lý tồn kho đặc thù: Nhôm theo thanh/phôi dư, Kính theo diện tích m², Phụ kiện theo bộ/chiếc.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-cyan-500/10 bg-cyan-500/[0.02]">
            <h3 className="text-xs font-bold text-cyan-300 mb-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
              4. Tối ưu cắt
            </h3>
            <p className="text-[11px] text-gray-400 leading-normal">
              Xác định nhóm **Nhôm** để đưa vào thuật toán tối ưu hóa cắt phôi 1D-CSP giảm thiểu hao hụt.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-indigo-500/10 bg-indigo-500/[0.02]">
            <h3 className="text-xs font-bold text-indigo-300 mb-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              5. Dashboard
            </h3>
            <p className="text-[11px] text-gray-400 leading-normal">
              Tạo biểu đồ phân bổ mã vật tư và tóm tắt hiện trạng nguồn vốn trên bảng quản trị.
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Thanh công cụ */}
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
        <div className="text-xs text-gray-500 bg-white/5 px-3 py-2 rounded-lg border border-white/5 flex items-center gap-2">
          <Info className="h-4 w-4 text-purple-400" />
          Đọc dữ liệu vật tư thật để đếm số lượng SKU liên kết
        </div>
      </div>

      {/* Bảng dữ liệu */}
      <div className="bg-[#0a0a0c] rounded-2xl border border-white/5 overflow-hidden shadow-lg relative">
        {loading ? (
           <div className="p-10 flex justify-center text-gray-400"><Loader2 className="animate-spin w-8 h-8" /></div>
        ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
              <th className="p-4 font-semibold w-16 text-center">STT</th>
              <th className="p-4 font-semibold w-28">Mã Nội Bộ</th>
              <th className="p-4 font-semibold w-52">Tên Gọi & SKU</th>
              <th className="p-4 font-semibold">Vai Trò Nghiệp Vụ & Ví dụ</th>
              <th className="p-4 font-semibold w-32">Trạng Thái</th>
              <th className="p-4 font-semibold">Mô Tả</th>
              <th className="p-4 font-semibold w-44 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {items.map((cat, idx) => {
              const roleInfo = getCategoryRole(cat.tendm);
              const skuCount = materialCounts[cat.tendm];
              
              return (
              <tr key={cat.madm} className="hover:bg-white/2 transition-colors group">
                <td className="p-4 text-center text-sm text-gray-500 font-mono">{(page - 1) * pageSize + idx + 1}</td>
                <td className="p-4 text-sm font-mono text-gray-300">DM-{cat.madm.toString().padStart(3, '0')}</td>
                <td className="p-4 text-sm">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-gray-200 group-hover:text-white transition-colors">{cat.tendm}</span>
                    {countsLoading ? (
                      <span className="text-[10px] text-gray-500">Đang quét SKU...</span>
                    ) : skuCount !== undefined ? (
                      <span className="inline-flex self-start px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20 shadow-sm">
                        {skuCount} vật tư (SKU)
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-500">Chưa có liên kết vật tư</span>
                    )}
                  </div>
                </td>
                <td className="p-4 text-xs">
                  <div className="space-y-1 max-w-sm">
                    <div className="font-semibold text-gray-300 flex items-center gap-1">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400" />
                      {roleInfo.role}
                    </div>
                    <div className="text-gray-500 leading-normal">{roleInfo.desc}</div>
                    <div className="text-[10px] text-gray-400 italic">Ví dụ: {roleInfo.example}</div>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide border ${
                    cat.trangthai === 'HOAT_DONG' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                    'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {cat.trangthai}
                  </span>
                </td>
                <td className="p-4 text-sm text-gray-500 truncate max-w-[150px]">{cat.mota || "Chưa có mô tả"}</td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <Link
                      href={`/admin/vat-tu?madm=${cat.madm}`}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/30 rounded-md transition-all inline-flex items-center gap-1 whitespace-nowrap"
                      title={`Xem danh sách vật tư thuộc nhóm ${cat.tendm}`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem vật tư</span>
                    </Link>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(cat)}
                        className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors"
                        title="Sửa danh mục"
                        aria-label="Sửa danh mục"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                        title="Xóa danh mục"
                        aria-label="Xóa danh mục"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            );
            })}
            {items.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-gray-500">Chưa có danh mục nào</td></tr>
            )}
          </tbody>
        </table>
        )}
        
        <div className="p-4 border-t border-white/5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-gray-500">
          <div className="flex items-center gap-3">
            <span>
              Hiển thị{" "}
              <strong className="text-gray-300">
                {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
              </strong>{" "}
              trong <strong className="text-gray-300">{total}</strong> mục
            </span>
            <label className="inline-flex items-center gap-2">
              <span className="sr-only">Số dòng mỗi trang</span>
              <select
                value={String(pageSize)}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-gray-200"
                aria-label="Số dòng mỗi trang"
              >
                <option value="10">10 / trang</option>
                <option value="15">15 / trang</option>
                <option value="25">25 / trang</option>
                <option value="50">50 / trang</option>
              </select>
            </label>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-2 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" /> Trước
            </button>
            <span className="px-2 text-gray-400">
              Trang <strong className="text-gray-200">{Math.min(page, totalPages)}</strong>/{totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-2 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              Sau <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Hộp thoại thêm/sửa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-[#0a0a0c]">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <Layers className="w-5 h-5 mr-2 text-purple-400" />
                {editing ? "Sửa Danh Mục" : "Tạo Danh Mục"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white p-1 rounded-md transition-colors">
                &times;
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400 font-medium">
                  Tên danh mục <span className="text-red-500">*</span>
                </label>
                <input
                  value={formData.tendm}
                  onChange={(e) => setFormData((p) => ({ ...p, tendm: e.target.value }))}
                  className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-blue-500"
                  placeholder="VD: Nhôm, Kính, Phụ kiện..."
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400 font-medium">Mô tả</label>
                <textarea
                  value={formData.mota}
                  onChange={(e) => setFormData((p) => ({ ...p, mota: e.target.value }))}
                  className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-blue-500 min-h-[90px]"
                  placeholder="Ghi chú ngắn..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400 font-medium">Trạng thái</label>
                <select
                  value={formData.trangthai}
                  onChange={(e) => setFormData((p) => ({ ...p, trangthai: e.target.value }))}
                  className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-blue-500"
                  aria-label="Trạng thái danh mục"
                >
                  <option value="HOAT_DONG">HOAT_DONG</option>
                  <option value="NGUNG">NGUNG</option>
                </select>
              </div>

              <div className="pt-4 mt-6 border-t border-white/5 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors">
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 flex items-center"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  {editing ? "Lưu cập nhật" : "Tạo mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
