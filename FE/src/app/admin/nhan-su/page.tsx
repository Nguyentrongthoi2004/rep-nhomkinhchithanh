"use client";

import { useState, useEffect } from "react";
import { Plus, UserPlus, Users, Edit2, ShieldAlert, KeyRound, Loader2, Ban } from "lucide-react";

interface Employee {
  mand: number;
  tendangnhap: string;
  hoten: string;
  vaitro: string;
  sdt: string;
  trangthai: string;
}

export default function NhanSuPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Employee | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [formData, setFormData] = useState({
    tenDangNhap: "",
    matKhau: "",
    hoTen: "",
    sdt: "",
    vaiTro: "WORKER"
  });

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const json = await res.json();
      if (json.data) {
        setEmployees(json.data);
      }
    } catch (err) {
      console.error("Lỗi kéo nhân sự:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    if (!formData.tenDangNhap || !formData.matKhau || !formData.hoTen) {
      setErrorMsg("Vui lòng điền đủ Tên đăng nhập, Mật khẩu và Họ tên!");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setErrorMsg(data.error || "Có lỗi xảy ra khi tạo tài khoản");
      } else {
        setSuccessMsg(data.message);
        setFormData({ tenDangNhap: "", matKhau: "", hoTen: "", sdt: "", vaiTro: "WORKER" });
        fetchEmployees(); // Tải lại bảng sau khi user đã tạo thành công
        setTimeout(() => setIsModalOpen(false), 2000);
      }
    } catch {
      setErrorMsg("Lỗi kêt nối Server!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUserStatus = async (mand: number, currentStatus: string) => {
    const newStatus = currentStatus === "DANG_LAM" ? "NGHI_VIEC" : "DANG_LAM";
    if (!confirm(`Bạn có chắc chắn muốn ${newStatus === 'NGHI_VIEC' ? 'khóa thẻ' : 'mở khóa thẻ'} nhân viên này?`)) return;
    
    setActionLoading(mand);
    try {
      const res = await fetch(`/api/admin/users/${mand}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CHANGE_STATUS", payload: { trangthai: newStatus } })
      });
      const data = await res.json();
      if (!res.ok) alert(data.error);
      else fetchEmployees();
    } catch {
      alert("Lỗi kết nối");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;
    if (newPassword.length < 6) return setErrorMsg("Mật khẩu phải từ 6 ký tự");

    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.mand}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CHANGE_PASSWORD", payload: { newPassword } })
      });
      const data = await res.json();
      if (!res.ok) setErrorMsg(data.error);
      else {
        setSuccessMsg("Đổi mật khẩu thành công!");
        setNewPassword("");
        setTimeout(() => setIsPasswordModalOpen(false), 2000);
      }
    } catch {
      setErrorMsg("Lỗi kết nối Server");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-[#0a0a0c] p-6 rounded-2xl border border-white/5 shadow-sm relative overflow-hidden">
        {/* Glow effect at background */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-gray-100 flex items-center">
            <Users className="w-6 h-6 mr-3 text-blue-500" />
            Cơ Cấu Nhân Sự (HR)
          </h1>
          <p className="text-gray-400 text-sm mt-1 ml-9">Khu vực độc quyền của Master Admin để sinh mã tài khoản cho xưởng.</p>
        </div>
        
        <div className="flex space-x-3 relative z-10">
          <button 
            onClick={() => {
              setIsModalOpen(true);
              setSuccessMsg("");
              setErrorMsg("");
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg flex items-center font-medium transition-colors shadow-[0_0_15px_-3px_rgba(59,130,246,0.4)]"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Cấp Tài Khoản Mới
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-[#0a0a0c] rounded-2xl border border-white/5 overflow-hidden shadow-lg">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
            <p className="text-gray-400">Đang đồng bộ danh sách nhân sự...</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-[11px] uppercase tracking-wider text-gray-400">
                <th className="p-4 font-semibold w-16 text-center">ID</th>
                <th className="p-4 font-semibold w-1/4">Tư Cách (Vai Trò)</th>
                <th className="p-4 font-semibold">Tên Gọi / Định Danh</th>
                <th className="p-4 font-semibold">Tài Khoản Đăng Nhập</th>
                <th className="p-4 font-semibold text-center">Trạng Thái</th>
                <th className="p-4 font-semibold w-24 text-right">Quản Trị</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Chưa có nhân sự nào trong hệ thống.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.mand} className="hover:bg-white/2 transition-colors group">
                    <td className="p-4 text-center text-sm text-gray-500 font-mono">#{emp.mand}</td>
                    <td className="p-4">
                      {emp.vaitro === "ADMIN" ? (
                        <span className="inline-flex items-center px-2 py-1 bg-red-400/10 border border-red-500/20 text-red-400 text-xs rounded-md uppercase font-bold tracking-wider">
                          <ShieldAlert className="w-3 h-3 mr-1" /> Master / Quản Lý
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 bg-blue-400/10 border border-blue-500/20 text-blue-400 text-xs rounded-md uppercase font-bold tracking-wider">
                          Thợ Sản Xuất
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-bold text-gray-200">{emp.hoten}</p>
                      <p className="text-xs text-gray-500">{emp.sdt || "Chưa cập nhật SĐT"}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center text-sm font-medium text-gray-300">
                        <KeyRound className="w-4 h-4 mr-2 text-gray-500" />
                        {emp.tendangnhap}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {emp.trangthai === "DANG_LAM" ? (
                        <span className="inline-flex items-center px-2 py-1 bg-green-400/10 border border-green-500/20 text-green-400 text-xs rounded-full font-medium">
                           Hoạt Động
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 bg-gray-500/10 border border-gray-500/20 text-gray-400 text-xs rounded-full font-medium">
                           Đã Nghỉ Việc
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {actionLoading === emp.mand ? (
                         <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-500" />
                      ) : (
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => {
                              setSelectedUser(emp);
                              setNewPassword("");
                              setErrorMsg("");
                              setSuccessMsg("");
                              setIsPasswordModalOpen(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-orange-400 hover:bg-orange-400/10 rounded-md transition-colors" title="Đổi mật khẩu"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => toggleUserStatus(emp.mand, emp.trangthai)}
                            className={`p-1.5 text-gray-400 rounded-md transition-colors ${emp.trangthai === 'DANG_LAM' ? 'hover:text-red-400 hover:bg-red-400/10' : 'hover:text-green-400 hover:bg-green-400/10'}`} 
                            title={emp.trangthai === 'DANG_LAM' ? "Khóa thẻ (Nghỉ việc)" : "Mở khóa thẻ"}
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal / Popup Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            
            {/* Header Modal */}
            <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-[#0a0a0c]">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <UserPlus className="w-5 h-5 mr-2 text-blue-400" />
                Cấp Tài Khoản Nhân Viên
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-md transition-colors"
              >
                &times; {/* Hoặc dùng icon X */}
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              
              {successMsg && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm font-medium">
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm text-gray-400 font-medium">Tên Đăng Nhập (Định danh thẻ rỗng)<span className="text-red-500 ml-1">*</span></label>
                <input 
                  type="text" 
                  value={formData.tenDangNhap}
                  onChange={e => setFormData({...formData, tenDangNhap: e.target.value})}
                  className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-gray-600"
                  placeholder="VD: nv_nguyenvana_01, tho_cat_02"
                />
                <p className="text-[11px] text-gray-500 mt-1">Gợi ý: Dùng mã thẻ NV hoặc tên viết liền không dấu.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400 font-medium">Mật khẩu Khởi tạo<span className="text-red-500 ml-1">*</span></label>
                <input 
                  type="password" 
                  value={formData.matKhau}
                  onChange={e => setFormData({...formData, matKhau: e.target.value})}
                  className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Khởi tạo mật khẩu cấp sẵn (VD: 123456)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400 font-medium">Tên Thật / Họ Tên<span className="text-red-500 ml-1">*</span></label>
                  <input 
                    type="text" 
                    value={formData.hoTen}
                    onChange={e => setFormData({...formData, hoTen: e.target.value})}
                    className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400 font-medium">Số Điện Thoại</label>
                  <input 
                    type="tel" 
                    value={formData.sdt}
                    onChange={e => setFormData({...formData, sdt: e.target.value})}
                    className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-blue-500"
                    placeholder="09..."
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-sm text-gray-400 font-medium">Cấp Bậc Nhân Sự</label>
                <div className="flex bg-[#0a0a0c] border border-white/10 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, vaiTro: "WORKER"})}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${formData.vaiTro === 'WORKER' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Thợ Sản Xuất
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, vaiTro: "ADMIN"})}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${formData.vaiTro === 'ADMIN' ? 'bg-red-600/20 text-red-400 border border-red-500/20' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Trưởng Bộ Phận
                  </button>
                </div>
              </div>

              {/* Actions Modal */}
              <div className="pt-4 mt-6 border-t border-white/5 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 flex items-center shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)]"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Bấm Nút Khởi Tạo Thẻ
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-[#0a0a0c]">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <KeyRound className="w-5 h-5 mr-2 text-orange-400" />
                Đổi Mật Khẩu
              </h3>
              <button onClick={() => setIsPasswordModalOpen(false)} className="text-gray-400 hover:text-white p-1 rounded-md transition-colors">&times;</button>
            </div>
            
            <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
              <div className="bg-white/5 border border-white/10 p-3 rounded-lg text-sm text-gray-300">
                Tài khoản: <strong className="text-white">{selectedUser?.tendangnhap}</strong>
              </div>

              {successMsg && <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm font-medium">{successMsg}</div>}
              {errorMsg && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm font-medium">{errorMsg}</div>}

              <div className="space-y-2">
                <label className="text-sm text-gray-400 font-medium">Mật khẩu Mới<span className="text-red-500 ml-1">*</span></label>
                <input 
                  type="password" 
                  value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  placeholder="Nhập ít nhất 6 ký tự"
                />
              </div>

              <div className="pt-4 mt-6 border-t border-white/5 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors">
                  Hủy Bỏ
                </button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 rounded-lg text-sm font-bold bg-orange-600 hover:bg-orange-500 text-white transition-colors disabled:opacity-50 flex items-center shadow-[0_0_15px_-3px_rgba(234,88,12,0.3)]">
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Edit2 className="w-4 h-4 mr-2" />}
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
