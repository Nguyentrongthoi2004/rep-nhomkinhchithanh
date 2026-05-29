"use client";

import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Box,
  ArrowDownToLine,
  Loader2,
  Save,
  ChevronLeft,
  ChevronRight,
  ArrowDownUp,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { apiData, apiJson } from "@/lib/api";
import { ConfirmDialog, InlineNotice, type NoticeState } from "@/components/admin/Feedback";
import { useSearchParams } from "next/navigation";

interface VatTu {
  mavt: number;
  tenvt: string;
  donvitinh: string;
  chieudaimacdinh: number | null;
  dongianhap: number;
  madm?: number;
  danhmuc: { tendm: string } | null;
  /** Số thanh/tấm trong Kho phôi (MOI + CON_DU), khớp màn Kho phôi */
  tonKhoThanh?: number;
  /** Tổng chiều dài còn lại (mm) trên các thanh đó */
  tonKhoTongMm?: number;
}

interface DanhMuc {
  madm: number;
  tendm: string;
}

interface MaterialsPaged {
  items: VatTu[];
  total: number;
  page: number;
  pageSize: number;
}

type MaterialsSortKey = "mavt" | "tenvt" | "dongianhap" | "madm" | "chieudaimacdinh";

function MaterialPageInner() {
  const [searchInput, setSearchInput] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<number | "">("");
  const [sortBy, setSortBy] = useState<MaterialsSortKey>("mavt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const searchParams = useSearchParams();
  const urlMadm = searchParams.get("madm");

  useEffect(() => {
    if (urlMadm) {
      const parsed = parseInt(urlMadm, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        setCategoryFilter(parsed);
      }
    }
  }, [urlMadm]);
  const [pageSize, setPageSize] = useState(15);
  const [total, setTotal] = useState(0);

  const [materials, setMaterials] = useState<VatTu[]>([]);
  const [categories, setCategories] = useState<DanhMuc[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const fetchMaterialsSeq = useRef(0);

  // Trạng thái hộp thoại
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VatTu | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VatTu | null>(null);
  
  const [formData, setFormData] = useState({
    tenvt: "",
    madm: 0,
    donvitinh: "Thanh",
    chieudaimacdinh: "" as number | string,
    dongianhap: 0,
  });

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchInput.trim()), 320);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced]);

  const fetchMaterialList = useCallback(async () => {
    const seq = ++fetchMaterialsSeq.current;
    setLoading(true);
    setErrorMsg("");
    try {
      const p = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sortBy,
        order: sortOrder,
      });
      if (categoryFilter !== "") {
        if (Number.isFinite(categoryFilter) && categoryFilter > 0) {
          p.set("madm", String(categoryFilter));
        }
      }
      if (searchDebounced) {
        p.set("q", searchDebounced);
      }
      const body = await apiData<MaterialsPaged | VatTu[]>(`/api/admin/materials?${p.toString()}`);
      if (seq !== fetchMaterialsSeq.current) {
        return;
      }
      if (Array.isArray(body)) {
        setMaterials(body);
        setTotal(body.length);
      } else {
        setMaterials(body.items ?? []);
        setTotal(body.total ?? 0);
      }
    } catch (err: unknown) {
      if (seq !== fetchMaterialsSeq.current) {
        return;
      }
      const detail = err instanceof Error ? err.message : String(err);
      setErrorMsg(
        `Không tải được danh sách (${detail}). Kiểm tra backend đã chạy (mặc định :4000) và file .env của BE trùng Supabase chỗ bạn đã INSERT SQL.`,
      );
      console.error("Exception fetching materials:", err);
    } finally {
      if (seq === fetchMaterialsSeq.current) {
        setLoading(false);
      }
    }
  }, [page, pageSize, sortBy, sortOrder, categoryFilter, searchDebounced]);

  const fetchCategoriesList = useCallback(async () => {
    try {
      const dmData = await apiData<DanhMuc[]>("/api/admin/categories");
      if (dmData) {
        setCategories([...dmData].sort((a, b) => a.madm - b.madm));
        setFormData(prev => prev.madm === 0 && dmData.length > 0 ? { ...prev, madm: dmData[0].madm } : prev); 
      }
    } catch (err: unknown) {
      console.error("Exception fetching categories:", err);
    }
  }, []);

  useEffect(() => {
    void fetchCategoriesList();
  }, [fetchCategoriesList]);

  useEffect(() => {
    void fetchMaterialList();
  }, [fetchMaterialList]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      tenvt: "",
      madm: categories.length > 0 ? categories[0].madm : 0,
      donvitinh: "Thanh",
      chieudaimacdinh: "",
      dongianhap: 0,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: VatTu) => {
    setEditingItem(item);
    setFormData({
      tenvt: item.tenvt,
      madm: item.madm || (categories.length > 0 ? categories[0].madm : 0),
      donvitinh: item.donvitinh,
      chieudaimacdinh: item.chieudaimacdinh || "",
      dongianhap: item.dongianhap,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number, name: string) => {
    try {
      await apiJson(`/api/admin/materials/${id}`, { method: "DELETE" });
      setNotice({ tone: "ok", text: `Đã xóa vật tư ${name}.` });
      fetchMaterialList();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setNotice({ tone: "error", text: "Lỗi khi xóa: " + err.message });
      } else {
        setNotice({ tone: "error", text: "Lỗi khi xóa: " + String(err) });
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tenvt || !formData.madm || formData.dongianhap < 0) {
      setNotice({ tone: "warn", text: "Vui lòng điền thông tin hợp lệ." });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        tenvt: formData.tenvt,
        madm: formData.madm,
        donvitinh: formData.donvitinh,
        chieudaimacdinh: formData.chieudaimacdinh ? Number(formData.chieudaimacdinh) : null,
        dongianhap: formData.dongianhap,
      };

      if (editingItem) {
        await apiJson(`/api/admin/materials/${editingItem.mavt}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiJson("/api/admin/materials", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setIsModalOpen(false);
      setNotice({ tone: "ok", text: editingItem ? "Đã cập nhật vật tư." : "Đã thêm vật tư mới." });
      fetchMaterialList();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setNotice({ tone: "error", text: "Lỗi lưu dữ liệu: " + err.message });
      } else {
        setNotice({ tone: "error", text: "Lỗi lưu dữ liệu: " + String(err) });
      }
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
            <Box className="w-6 h-6 mr-3 text-emerald-500" />
            Vật tư & Hạng mục chi phí
          </h1>
          <p className="text-gray-400 text-sm mt-1 ml-9">
            Quản lý mã vật tư, phụ kiện và các hạng mục chi phí dùng trong BOM/báo giá. Chỉ nhóm Nhôm liên kết trực tiếp với kho phôi.
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button className="bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 px-4 py-2.5 rounded-lg flex items-center font-medium transition-colors">
            <ArrowDownToLine className="w-4 h-4 mr-2" />
            Nhập Excel
          </button>
          <button 
            onClick={openAddModal}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg flex items-center font-medium transition-colors shadow-[0_0_15px_-3px_rgba(5,150,105,0.4)]"
          >
            <Plus className="w-5 h-5 mr-2" />
            Thêm Mới
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-200">
          {errorMsg}
        </div>
      )}
      <InlineNotice notice={notice} onClose={() => setNotice(null)} />

      {/* Thanh công cụ */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative max-w-md w-full min-w-[200px]">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc mã (VD: VT-12)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-gray-200 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-400 whitespace-nowrap">
            <span className="hidden sm:inline">Danh mục</span>
            <select
              title="Lọc theo danh mục"
              aria-label="Lọc theo danh mục"
              value={categoryFilter === "" ? "" : String(categoryFilter)}
              onChange={(e) => {
                setCategoryFilter(e.target.value === "" ? "" : Number(e.target.value));
                setPage(1);
              }}
              className="bg-[#0a0a0c] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-emerald-500 min-w-[160px]"
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((c) => (
                <option key={c.madm} value={String(c.madm)}>
                  {c.tendm}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-400 whitespace-nowrap">
            <ArrowDownUp className="w-4 h-4 text-emerald-500/80 shrink-0" aria-hidden />
            <select
              title="Sắp xếp"
              aria-label="Tiêu chí sắp xếp"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as MaterialsSortKey);
                setPage(1);
              }}
              className="bg-[#0a0a0c] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-emerald-500 min-w-[180px]"
            >
              <option value="tenvt">Tên</option>
              <option value="mavt">Mã vật tư</option>
              <option value="madm">Theo danh mục (mã DM)</option>
              <option value="dongianhap">Giá nhập</option>
              <option value="chieudaimacdinh">Chiều dài mặc định</option>
            </select>
          </label>
          <button
            type="button"
            title={sortOrder === "asc" ? "Đang tăng dần — bấm để giảm" : "Đang giảm dần — bấm để tăng"}
            onClick={() => {
              setPage(1);
              setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
            }}
            className="px-3 py-2.5 rounded-lg text-sm border border-white/10 bg-white/5 text-gray-200 hover:bg-white/10 transition-colors whitespace-nowrap"
          >
            {sortOrder === "asc" ? "↑ Tăng dần" : "↓ Giảm dần"}
          </button>
          <label className="flex items-center gap-2 text-sm text-gray-400 whitespace-nowrap">
            <span className="hidden sm:inline">Hiển thị</span>
            <select
              title="Số dòng mỗi trang"
              aria-label="Số dòng mỗi trang"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="bg-[#0a0a0c] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-emerald-500"
            >
              <option value={10}>10 / trang</option>
              <option value={15}>15 / trang</option>
              <option value={20}>20 / trang</option>
              <option value={25}>25 / trang</option>
            </select>
          </label>
        </div>

        <div className="text-sm text-gray-400 whitespace-nowrap">
          Tìm được:{" "}
          <strong className="text-gray-200">
            {total} mã · Trang {page}/{totalPages}
          </strong>
        </div>
      </div>

      {/* Bảng dữ liệu */}
      {!loading && (
        <div className="space-y-3 md:hidden">
          {materials.map((item, idx) => {
            const tonThanh = Math.max(0, Math.round(Number(item.tonKhoThanh ?? 0)));
            const tonMm = Math.max(0, Math.round(Number(item.tonKhoTongMm ?? 0)));
            const tendm = item.danhmuc?.tendm || "";
            const normalizedDm = tendm.toLowerCase().trim();
            const isNhanCong = normalizedDm.includes("nhân công") || normalizedDm.includes("nhan cong");
            const isNhom = normalizedDm.includes("nhôm") || normalizedDm.includes("nhom");

            return (
              <div key={item.mavt} className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-bold text-emerald-300">VT-{item.mavt}</p>
                    <p className="mt-1 text-base font-bold text-gray-100">{item.tenvt}</p>
                    <div className="flex flex-wrap gap-1.5 items-center mt-1">
                      <span className="text-xs text-gray-500">{tendm || "Chưa phân loại"}</span>
                      {isNhanCong && (
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Chi phí nhân công
                        </span>
                      )}
                      {isNhom && (
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          Liên kết kho phôi / tối ưu cắt
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300">
                    #{(page - 1) * pageSize + idx + 1}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Đơn giá</p>
                    <p className="font-mono font-bold text-gray-100">{formatCurrency(item.dongianhap)}</p>
                    <p className="text-xs text-gray-500">/{item.donvitinh}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Tồn kho</p>
                    {isNhanCong ? (
                      <p className="text-xs text-gray-500 font-medium italic">Không quản lý tồn</p>
                    ) : isNhom ? (
                      tonThanh > 0 ? (
                        <>
                          <p className="font-mono font-bold text-emerald-300">{tonThanh} thanh phôi</p>
                          {tonMm > 0 && <p className="text-xs text-gray-500">{tonMm.toLocaleString("vi-VN")} mm</p>}
                        </>
                      ) : (
                        <p className="font-mono font-bold text-gray-500">0 thanh phôi</p>
                      )
                    ) : (
                      <p className="text-xs text-gray-500 font-medium italic">Chưa có kho riêng</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => openEditModal(item)} className="rounded-lg bg-blue-500/10 px-3 py-2 text-sm font-bold text-blue-200">
                    Sửa
                  </button>
                  <button type="button" onClick={() => setDeleteTarget(item)} className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-bold text-red-200">
                    Xóa
                  </button>
                </div>
              </div>
            );
          })}
          {materials.length === 0 && <div className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-8 text-center text-sm text-gray-500">Không tìm thấy vật tư phù hợp.</div>}
        </div>
      )}
      <div className="hidden bg-[#0a0a0c] rounded-2xl border border-white/5 overflow-hidden shadow-lg md:block">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
            <p className="text-gray-400">Đang tải dữ liệu vật tư từ Supabase...</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-[11px] uppercase tracking-wider text-gray-400">
                <th className="p-4 font-semibold w-16 text-center">STT</th>
                <th className="p-4 font-semibold w-24">Mã Hàng</th>
                <th className="p-4 font-semibold">Tên Gọi Kỹ Thuật</th>
                <th className="p-4 font-semibold">Thuộc Danh Mục</th>
                <th className="p-4 font-semibold text-center w-24">Chiều dài</th>
                <th className="p-4 font-semibold text-right w-36">Đơn Giá Nhập</th>
                <th
                  className="p-4 font-semibold text-right w-36"
                  title="Tồn kho phôi đối với Nhôm, hoặc trạng thái kho riêng đối với Kính, Phụ kiện, Vật tư phụ."
                >
                  Tồn kho
                </th>
                <th className="p-4 font-semibold w-24 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {materials.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    Không tìm thấy dữ liệu phù hợp.
                  </td>
                </tr>
              ) : (
                materials.map((item, idx) => {
                  const tonThanh = Math.max(0, Math.round(Number(item.tonKhoThanh ?? 0)));
                  const tonMm = Math.max(0, Math.round(Number(item.tonKhoTongMm ?? 0)));
                  const tendm = item.danhmuc?.tendm || "";
                  const normalizedDm = tendm.toLowerCase().trim();
                  const isNhanCong = normalizedDm.includes("nhân công") || normalizedDm.includes("nhan cong");
                  const isNhom = normalizedDm.includes("nhôm") || normalizedDm.includes("nhom");

                  return (
                  <tr key={item.mavt} className="hover:bg-white/5 transition-colors group">
                    <td className="p-4 text-center text-sm text-gray-500 font-mono">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="p-4 text-sm font-bold text-gray-200 tracking-tight">VT-{item.mavt}</td>
                    <td className="p-4 text-sm font-medium text-gray-300">
                      <div className="flex flex-col">
                        <span>{item.tenvt}</span>
                        {isNhanCong && (
                          <span className="inline-flex self-start mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Chi phí nhân công
                          </span>
                        )}
                        {isNhom && (
                          <span className="inline-flex self-start mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Liên kết kho phôi / tối ưu cắt
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-500">{tendm || "Chưa phân loại"}</td>
                    <td className="p-4 text-center text-sm text-emerald-400 font-mono">
                      {item.chieudaimacdinh ? `${item.chieudaimacdinh}mm` : '-'}
                    </td>
                    <td className="p-4 text-right text-sm text-gray-300 font-mono">
                      {formatCurrency(item.dongianhap)}<span className="text-gray-500 ml-1 text-xs">/{item.donvitinh}</span>
                    </td>
                    <td className="p-4 text-right text-sm align-top">
                      {isNhanCong ? (
                        <span className="text-gray-500 italic text-xs">Không quản lý tồn</span>
                      ) : isNhom ? (
                        tonThanh > 0 ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <span>
                              <span className="font-mono font-bold text-emerald-300">{tonThanh}</span>
                              <span className="text-gray-500 ml-1 text-xs">thanh phôi</span>
                            </span>
                            {item.chieudaimacdinh != null && tonMm > 0 ? (
                              <span
                                className="text-[10px] text-gray-500 font-mono max-w-[10rem] leading-tight"
                                title="Tổng mm còn lại trên các thanh (nhôm / thanh có chiều dài)"
                              >
                                Σ {tonMm.toLocaleString("vi-VN")} mm
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-gray-500 font-mono">0 thanh phôi</span>
                        )
                      ) : (
                        <span className="text-gray-500 italic text-xs">Chưa có kho riêng</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          title={`Sửa vật tư ${item.tenvt}`}
                          aria-label={`Sửa vật tư ${item.tenvt}`}
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title={`Xoá vật tư ${item.tenvt}`}
                          aria-label={`Xoá vật tư ${item.tenvt}`}
                          onClick={() => setDeleteTarget(item)}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {!loading && total > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
          <p className="text-sm text-gray-500">
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} trong tổng {total} mã
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-gray-200 disabled:opacity-40 disabled:pointer-events-none hover:bg-white/10"
            >
              <ChevronLeft className="w-4 h-4" />
              Trước
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-gray-200 disabled:opacity-40 disabled:pointer-events-none hover:bg-white/10"
            >
              Sau
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Hộp thoại thêm/sửa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            
            <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-[#0a0a0c]">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <Box className="w-5 h-5 mr-2 text-emerald-500" />
                {editingItem ? "Sửa Mã Vật Tư" : "Thêm Vật Tư Cửa"}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-md transition-colors"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400 font-medium">Tên loại vật tư<span className="text-red-500 ml-1">*</span></label>
                <input 
                  type="text" required
                  value={formData.tenvt} onChange={e => setFormData({...formData, tenvt: e.target.value})}
                  className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-emerald-500"
                  placeholder="VD: Khung bao Xingfa 55"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400 font-medium">Danh mục<span className="text-red-500 ml-1">*</span></label>
                  <select 
                    title="Chọn danh mục vật tư"
                    aria-label="Chọn danh mục vật tư"
                    value={formData.madm} onChange={e => setFormData({...formData, madm: Number(e.target.value)})}
                    className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-emerald-500"
                  >
                    {categories.map(c => <option key={c.madm} value={c.madm}>{c.tendm}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400 font-medium">Đơn vị tính<span className="text-red-500 ml-1">*</span></label>
                  <input 
                    type="text" required
                    value={formData.donvitinh} onChange={e => setFormData({...formData, donvitinh: e.target.value})}
                    className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-emerald-500"
                    placeholder="Thanh / m2 / Bộ"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400 font-medium">Giá nhập cư bản (VNĐ)<span className="text-red-500 ml-1">*</span></label>
                  <input 
                    type="number" required min="0"
                    title="Giá nhập cơ bản"
                    aria-label="Giá nhập cơ bản"
                    placeholder="VD: 120000"
                    value={formData.dongianhap} onChange={e => setFormData({...formData, dongianhap: Number(e.target.value)})}
                    className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400 font-medium">Chiều dài mặc định (mm)</label>
                  <input 
                    type="number" 
                    value={formData.chieudaimacdinh} onChange={e => setFormData({...formData, chieudaimacdinh: e.target.value})}
                    className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-emerald-500 placeholder-gray-600"
                    placeholder="Để rỗng nếu không phải Nhôm"
                  />
                </div>
              </div>

              <div className="pt-4 mt-6 border-t border-white/5 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors">
                  Hủy Bỏ
                </button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 flex items-center shadow-[0_0_15px_-3px_rgba(5,150,105,0.4)]">
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {editingItem ? "Lưu Cập Nhật" : "Lưu Vật Tư Mới"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={deleteTarget ? `Xóa vật tư VT-${deleteTarget.mavt}` : ""}
        description="Chỉ xóa khi chắc chắn vật tư này không còn dùng trong BOM, kho phôi hoặc dữ liệu lịch sử. Với vật tư đã phát sinh nghiệp vụ, nên ngưng sử dụng thay vì xóa."
        confirmLabel="Xóa vật tư"
        tone="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          const item = deleteTarget;
          if (!item) return;
          await handleDelete(item.mavt, item.tenvt);
          setDeleteTarget(null);
        }}
      />

    </div>
  );
}

export default function MaterialPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20 bg-[#0a0a0c] border border-white/5 rounded-2xl">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
        <p className="text-gray-400">Đang tải bộ lọc vật tư...</p>
      </div>
    }>
      <MaterialPageInner />
    </Suspense>
  );
}
