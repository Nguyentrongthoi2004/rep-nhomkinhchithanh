"use client";

import { Plus, Search, Edit2, Trash2, Layers, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { apiData, apiJson } from "@/lib/api";

interface DanhMuc {
  madm: number;
  tendm: string;
  mota: string;
  trangthai: string;
}

export default function CategoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<DanhMuc[]>([]);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<DanhMuc | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ tendm: "", mota: "", trangthai: "HOAT_DONG" });

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

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

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
    if (!confirm(`Xóa danh mục "${cat.tendm}"?`)) return;
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
      
      {/* Header */}
      <div className="flex justify-between items-center bg-[#0a0a0c] p-6 rounded-2xl border border-white/5 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center">
            <Layers className="w-6 h-6 mr-3 text-purple-500" />
            Cây Danh Mục Vật Tư
          </h1>
          <p className="text-gray-400 text-sm mt-1 ml-9">Quản lý cách phân nhóm vật tư trong hệ thống.</p>
        </div>
        
        <button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg flex items-center font-medium transition-colors shadow-[0_0_15px_-3px_rgba(37,99,235,0.4)]"
        >
          <Plus className="w-5 h-5 mr-2" />
          Tạo Danh Mục Mới
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300">
          {errorMsg}
        </div>
      )}

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
        <select
          aria-label="Lọc danh mục"
          className="bg-[#0a0a0c] border border-white/10 text-gray-300 text-sm rounded-lg px-4 py-2.5 outline-none focus:border-blue-500"
        >
          <option value="ALL">Tất cả phân loại</option>
          <option value="NHOM">Nhôm</option>
          <option value="KINH">Kính</option>
          <option value="PHU_KIEN">Phụ Kiện</option>
        </select>
      </div>

      {/* Data Table */}
      <div className="bg-[#0a0a0c] rounded-2xl border border-white/5 overflow-hidden shadow-lg relative">
        {loading ? (
           <div className="p-10 flex justify-center text-gray-400"><Loader2 className="animate-spin w-8 h-8" /></div>
        ) : (
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
              <th className="p-4 font-semibold w-16 text-center">STT</th>
              <th className="p-4 font-semibold w-32">Mã Nội Bộ</th>
              <th className="p-4 font-semibold">Tên Gọi</th>
              <th className="p-4 font-semibold w-40">Trạng Thái</th>
              <th className="p-4 font-semibold">Ghi Chủ</th>
              <th className="p-4 font-semibold w-24 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {items.map((cat, idx) => (
              <tr key={cat.madm} className="hover:bg-white/2 transition-colors group">
                <td className="p-4 text-center text-sm text-gray-500 font-mono">{(page - 1) * pageSize + idx + 1}</td>
                <td className="p-4 text-sm font-mono text-gray-300">DM-{cat.madm.toString().padStart(3, '0')}</td>
                <td className="p-4 text-sm font-semibold text-gray-200 group-hover:text-white transition-colors">{cat.tendm}</td>
                <td className="p-4">
                  <span className={`inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide border ${
                    cat.trangthai === 'HOAT_DONG' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                    'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {cat.trangthai}
                  </span>
                </td>
                <td className="p-4 text-sm text-gray-500 truncate max-w-[200px]">{cat.mota || "Chưa có mô tả"}</td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-gray-500">Chưa có danh mục nào</td></tr>
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

      {/* ADD / EDIT MODAL */}
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
