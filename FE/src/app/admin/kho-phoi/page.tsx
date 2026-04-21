"use client";

import { QrCode, Search, Inbox, Filter, BarChart2, Loader2, Plus, Edit2, Trash2, Save } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { apiData, apiJson } from "@/lib/api";

interface KhoPhoiType {
  maphoi: number;
  khothanhphoi_uid: string;
  chieudaibandau: number;
  chieudaihientai: number;
  trangthai: string;
  vattu: {
    tenvt: string;
    donvitinh: string;
  };
  lonhap: {
    ngaynhap: string;
    nhacungcap?: string | null;
  };
}

interface VatTuOption {
  mavt: number;
  tenvt: string;
  chieudaimacdinh: number | null;
}

export default function RawMaterialInventoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [inventory, setInventory] = useState<KhoPhoiType[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [materials, setMaterials] = useState<VatTuOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    mavt: 0,
    quantity: 1,
    chieudaibandau: 6000,
    nhacungcap: "",
  });

  // Edit modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState<KhoPhoiType | null>(null);
  const [editForm, setEditForm] = useState({ chieudaihientai: 0, trangthai: "MOI" });

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const rows = await apiData<KhoPhoiType[]>("/api/admin/raw-stock");
      setInventory((rows || []).map((x) => ({ ...x, khothanhphoi_uid: "" })));
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMaterials = useCallback(async () => {
    try {
      const list = await apiData<VatTuOption[]>("/api/admin/materials-options");
      setMaterials(list);
      setCreateForm((p) => ({
        ...p,
        mavt: p.mavt || (list[0]?.mavt ?? 0),
        chieudaibandau: p.chieudaibandau || (list[0]?.chieudaimacdinh ?? 6000),
      }));
    } catch (err: unknown) {
      // keep silent; page still works without create
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const filtered = inventory.filter((item) => {
      const searchLow = searchTerm.toLowerCase();
      const uidStr = `UID-${item.maphoi.toString().padStart(5, '0')}`;
      return (
        uidStr.toLowerCase().includes(searchLow) ||
        item.vattu?.tenvt?.toLowerCase().includes(searchLow)
      );
    });
  
    const getStatusBadge = (status: string) => {
      switch(status) {
        case 'MOI': return <span className="px-2 py-1 text-[10px] font-bold tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded">NGUYÊN TEM (MỚI)</span>;
        case 'CON_DU': return <span className="px-2 py-1 text-[10px] font-bold tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded">KHÚC ĐỀ-XÊ DƯ</span>;
        case 'BO_DI': return <span className="px-2 py-1 text-[10px] font-bold tracking-wider text-red-500 bg-red-500/10 border border-red-500/20 rounded">BỎ ĐI</span>;
        default: return <span className="px-2 py-1 text-[10px] font-bold tracking-wider text-gray-400 bg-gray-500/10 rounded">{status}</span>;
      }
    }

    const openCreate = () => {
      setIsCreateOpen(true);
    };

    const openEdit = (item: KhoPhoiType) => {
      setEditing(item);
      setEditForm({ chieudaihientai: item.chieudaihientai, trangthai: item.trangthai });
      setIsEditOpen(true);
    };

    const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!createForm.mavt) return alert("Vui lòng chọn vật tư");
      if (createForm.quantity <= 0) return alert("Số lượng không hợp lệ");
      if (createForm.chieudaibandau <= 0) return alert("Chiều dài không hợp lệ");
      setIsSubmitting(true);
      try {
        await apiJson("/api/admin/raw-stock", {
          method: "POST",
          body: JSON.stringify({
            nhacungcap: createForm.nhacungcap || null,
            items: [{
              mavt: createForm.mavt,
              quantity: createForm.quantity,
              chieudaibandau: createForm.chieudaibandau,
            }],
          }),
        });
        setIsCreateOpen(false);
        fetchInventory();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : String(err));
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editing) return;
      setIsSubmitting(true);
      try {
        await apiJson(`/api/admin/raw-stock/${editing.maphoi}`, {
          method: "PATCH",
          body: JSON.stringify({
            chieudaihientai: editForm.chieudaihientai,
            trangthai: editForm.trangthai,
          }),
        });
        setIsEditOpen(false);
        fetchInventory();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : String(err));
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleDelete = async (item: KhoPhoiType) => {
      if (!confirm(`Xóa UID-${item.maphoi.toString().padStart(5, "0")}?`)) return;
      setIsSubmitting(true);
      try {
        await apiJson(`/api/admin/raw-stock/${item.maphoi}`, { method: "DELETE" });
        fetchInventory();
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
              <Inbox className="w-6 h-6 mr-3 text-cyan-500" />
              Quản Lý Lô Phôi & Đề-Xê
            </h1>
            <p className="text-gray-400 text-sm mt-1 ml-9">Định danh từng thanh nhôm nguyên liệu trong xưởng.</p>
          </div>
          
          <div className="flex space-x-3">
            <button
              title="Quét nhập kho"
              aria-label="Quét nhập kho"
              className="bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 px-4 py-2.5 rounded-lg flex items-center font-medium transition-colors"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Quét Nhập Kho
            </button>
            <button
              onClick={openCreate}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2.5 rounded-lg flex items-center font-bold transition-colors shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)]"
            >
              <Plus className="w-4 h-4 mr-2" /> Nhập Lô Phôi Mới
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300">{errorMsg}</div>
        )}
  
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div className="bg-[#0a0a0c] border border-white/5 p-5 rounded-2xl flex items-center shadow-lg">
              <div className="p-3 bg-emerald-500/10 rounded-full mr-4 border border-emerald-500/20"><BarChart2 className="text-emerald-400 w-6 h-6"/></div>
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Tổng Tồn Kho Thực Tế</p>
                <p className="text-2xl font-bold text-gray-100">{inventory.length} <span className="text-sm font-normal text-gray-500">thanh</span></p>
              </div>
            </div>
            <div className="bg-[#0a0a0c] border border-white/5 p-5 rounded-2xl flex items-center shadow-lg">
              <div className="p-3 bg-amber-500/10 rounded-full mr-4 border border-amber-500/20"><Inbox className="text-amber-400 w-6 h-6"/></div>
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Phôi Đề-Xê Có Thể Tái Chế</p>
                <p className="text-2xl font-bold text-gray-100">{inventory.filter(i => i.trangthai === 'CON_DU').length} <span className="text-sm font-normal text-gray-500">đoạn</span></p>
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
        <button
          title="Bộ lọc"
          aria-label="Bộ lọc"
          className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
        >
          <Filter className="w-5 h-5" />
        </button>
      </div>

        {/* Inventory Table */}
        <div className="bg-[#0a0a0c] rounded-2xl border border-white/5 overflow-hidden shadow-lg">
          {loading ? (
             <div className="flex justify-center items-center py-20 text-gray-400"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-[11px] uppercase tracking-wider text-gray-400">
                <th className="p-4 font-semibold w-40">Mã Định Danh (UID)</th>
                <th className="p-4 font-semibold">Tên Vật Tư (Hệ Nhôm)</th>
                <th className="p-4 font-semibold text-center w-36">Chiều Dài Hiện Tại</th>
                <th className="p-4 font-semibold text-center w-32">Trạng Thái</th>
                <th className="p-4 font-semibold w-32 text-right">Ngày Nhập</th>
                <th className="p-4 font-semibold w-24 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((item) => (
                <tr key={item.maphoi} className="hover:bg-white/2 transition-colors group">
                  <td className="p-4 text-sm font-bold text-cyan-400 font-mono flex items-center">
                    <QrCode className="w-3.5 h-3.5 mr-2 text-gray-500" />
                    UID-{item.maphoi.toString().padStart(5, '0')}
                  </td>
                  <td className="p-4 text-sm font-medium text-gray-300">{item.vattu?.tenvt}</td>
                  <td className="p-4 text-center text-sm font-mono font-bold text-gray-200">
                    {item.chieudaihientai} <span className="text-xs text-gray-500 font-sans">mm</span>
                    {item.chieudaihientai !== item.chieudaibandau && (
                      <div className="text-[10px] text-gray-500 font-sans mt-0.5">Khoản đầu: {item.chieudaibandau}mm</div>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {getStatusBadge(item.trangthai)}
                  </td>
                  <td className="p-4 text-right text-sm text-gray-500">
                    {item.lonhap?.ngaynhap ? new Date(item.lonhap.ngaynhap).toLocaleDateString('vi-VN') : 'N/A'}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors"
                        title="Sửa"
                        aria-label="Sửa phôi"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                        title="Xóa"
                        aria-label="Xóa phôi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-gray-500">Không tìm thấy mã vạch nào</td></tr>
              )}
            </tbody>
          </table>
          )}
        </div>

        {/* CREATE MODAL */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-[#0a0a0c]">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <Inbox className="w-5 h-5 mr-2 text-cyan-400" /> Nhập kho lô phôi
                </h3>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-md transition-colors"
                  aria-label="Đóng"
                  title="Đóng"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400 font-medium">Chọn vật tư (nhôm thanh)</label>
                  <select
                    value={createForm.mavt}
                    onChange={(e) => {
                      const mavt = Number(e.target.value);
                      const picked = materials.find((m) => m.mavt === mavt);
                      setCreateForm((p) => ({
                        ...p,
                        mavt,
                        chieudaibandau: picked?.chieudaimacdinh ?? p.chieudaibandau,
                      }));
                    }}
                    className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-cyan-500"
                    aria-label="Chọn vật tư"
                  >
                    {materials.map((m) => (
                      <option key={m.mavt} value={m.mavt}>
                        VT-{m.mavt} — {m.tenvt} {m.chieudaimacdinh ? `(${m.chieudaimacdinh}mm)` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400 font-medium">Số lượng thanh</label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={createForm.quantity}
                      onChange={(e) => setCreateForm((p) => ({ ...p, quantity: Number(e.target.value) }))}
                      className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-cyan-500"
                      aria-label="Số lượng thanh"
                      placeholder="Số lượng"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400 font-medium">Chiều dài ban đầu (mm)</label>
                    <input
                      type="number"
                      min={1}
                      value={createForm.chieudaibandau}
                      onChange={(e) => setCreateForm((p) => ({ ...p, chieudaibandau: Number(e.target.value) }))}
                      className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-cyan-500"
                      aria-label="Chiều dài ban đầu"
                      placeholder="Chiều dài (mm)"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-400 font-medium">Nhà cung cấp (tuỳ chọn)</label>
                  <input
                    value={createForm.nhacungcap}
                    onChange={(e) => setCreateForm((p) => ({ ...p, nhacungcap: e.target.value }))}
                    className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-cyan-500"
                    placeholder="VD: Xingfa chính hãng..."
                    aria-label="Nhà cung cấp"
                  />
                </div>

                <div className="pt-4 mt-6 border-t border-white/5 flex justify-end space-x-3">
                  <button type="button" onClick={() => setIsCreateOpen(false)} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors">
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-lg text-sm font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50 flex items-center"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Nhập kho
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT MODAL */}
        {isEditOpen && editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-[#0a0a0c]">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <Edit2 className="w-5 h-5 mr-2 text-blue-400" /> Cập nhật UID-{editing.maphoi.toString().padStart(5, "0")}
                </h3>
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-md transition-colors"
                  aria-label="Đóng"
                  title="Đóng"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                <div className="bg-white/5 border border-white/10 p-3 rounded-lg text-sm text-gray-300">
                  Vật tư: <strong className="text-white">{editing.vattu?.tenvt}</strong>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400 font-medium">Chiều dài hiện tại (mm)</label>
                    <input
                      type="number"
                      min={0}
                      value={editForm.chieudaihientai}
                      onChange={(e) => setEditForm((p) => ({ ...p, chieudaihientai: Number(e.target.value) }))}
                      className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-blue-500"
                      aria-label="Chiều dài hiện tại"
                      placeholder="Chiều dài (mm)"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400 font-medium">Trạng thái</label>
                    <select
                      value={editForm.trangthai}
                      onChange={(e) => setEditForm((p) => ({ ...p, trangthai: e.target.value }))}
                      className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-blue-500"
                      aria-label="Trạng thái phôi"
                    >
                      <option value="MOI">MOI</option>
                      <option value="CON_DU">CON_DU</option>
                      <option value="BO_DI">BO_DI</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 mt-6 border-t border-white/5 flex justify-end space-x-3">
                  <button type="button" onClick={() => setIsEditOpen(false)} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors">
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 flex items-center"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Lưu
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

    </div>
  );
}
