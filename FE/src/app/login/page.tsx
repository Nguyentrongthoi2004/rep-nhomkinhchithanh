"use client";

import { useState } from "react";
import { Loader2, Box, Eye, EyeOff, Send, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { apiData, apiJson } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestMsg, setRequestMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [requestForm, setRequestForm] = useState({
    hoten: "",
    sdt: "",
    tendangnhap: "",
    vaitro: "WORKER",
    ghichu: "",
  });

  // Xử lý đăng nhập: Supabase Auth xác thực → ensure-profile cho quản trị viên gốc → lấy vai trò → chuyển sang trang quản trị viên/thợ.
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      const msg = "Vui lòng nhập tài khoản và mật khẩu";
      setError(msg);
      alert(msg);
      return;
    }

    setLoading(true);
    try {
      // Nếu có chữ @ thì giữ nguyên dạng Email, nếu không thì gắn đuôi @minierp.local cho nhân viên
      const loginIdentifier = username.trim().toLowerCase();
      const email = loginIdentifier.includes('@') ? loginIdentifier : `${loginIdentifier}@minierp.local`;
      
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        const msg = `Lỗi đăng nhập: Sai tài khoản hoặc mật khẩu.`;
        setError(msg);
        alert(msg);
        setLoading(false);
        return;
      }

      // Nếu người dùng đăng nhập bằng Gmail quản trị viên gốc, máy chủ sẽ tự tạo hồ sơ nghiệp vụ (nguoidung) 1 lần.
      // Chỉ gọi khi người dùng nhập email đúng MASTER_ADMIN_EMAIL để tránh cảnh báo lặp cho worker.
      const masterAdminEmail = (process.env.NEXT_PUBLIC_MASTER_ADMIN_EMAIL || "").trim().toLowerCase();
      if (masterAdminEmail && email === masterAdminEmail) {
        try {
          await apiJson("/api/auth/ensure-profile", { method: "POST" });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn("ensure-profile failed:", msg);
        }
      }

      let profile;
      try {
        profile = await apiData<{ vaitro: string }>("/api/auth/me");
      } catch (e: unknown) {
        const msg = `Lỗi gọi API /auth/me: ${e instanceof Error ? e.message : String(e)}`;
        setError(msg);
        alert(msg);
        setLoading(false);
        return;
      }

      // Chuyển trang theo vai trò nghiệp vụ
      if (profile?.vaitro === "ADMIN") {
        router.push("/admin/vat-tu");
      } else {
        router.push("/worker");
      }
    } catch (e: unknown) {
      const msg = `Lỗi hệ thống: ${e instanceof Error ? e.message : String(e)}`;
      setError(msg);
      alert(msg);
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full login-metal-bg text-white font-sans overflow-hidden antialiased relative">
      <div className="admin-metal-glow" />
      {/* Khung trái - Form đăng nhập */}
      <div className="w-full lg:w-[45%] flex flex-col p-6 sm:p-10 lg:p-14 relative z-10 admin-metal-panel">
        <div className="admin-metal-shine" />
        
        {/* Đầu trang trên cùng */}
        <div className="flex justify-between items-center w-full max-w-[420px] mx-auto mb-8">
          <div className="flex items-center gap-2.5">
            <div className="brand-icon flex items-center justify-center">
              <Box className="w-5 h-5 text-slate-100 drop-shadow-[0_0_18px_rgba(255,255,255,0.18)]" />
            </div>
            <span className="brand-name text-xl">Nhôm Kính Chí Thành</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-300 bg-white/5 hover:bg-white/10 cursor-pointer px-4 py-2 rounded-full border border-white/5 transition-colors">
            <span>Tiếng Việt</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>

        {/* Form chính ở giữa */}
        <div className="w-full max-w-[380px] mx-auto flex-1 flex flex-col justify-center">
          <div className="space-y-3 mb-10 text-center sm:text-left">
            <h1 className="text-[2.5rem] font-semibold tracking-tight text-slate-100 leading-none">Xin chào!</h1>
            <p className="text-zinc-400 text-base">Đăng nhập để vào không gian quản lý</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            
            <div className="flex items-center gap-4 py-1">
              <div className="flex-1 h-px bg-linear-to-r from-transparent to-white/10" />
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">đăng nhập</span>
              <div className="flex-1 h-px bg-linear-to-l from-transparent to-white/10" />
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg text-center font-medium animate-in slide-in-from-top-1">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300 ml-1">
                  Tài khoản
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="nhomkinh_admin"
                  className="w-full h-[52px] bg-[#121214] border border-white/10 rounded-xl px-4 text-slate-200 focus:outline-none focus:border-slate-500/50 focus:bg-[#18181b] focus:ring-1 focus:ring-slate-500/50 transition-all placeholder:text-zinc-600 shadow-inner shadow-black/50"
                  autoComplete="username"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-sm font-medium text-zinc-300">
                    Mật khẩu
                  </label>
                  <a href="#" className="text-xs text-slate-400 hover:text-slate-300 transition-colors">Quên mật khẩu?</a>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-[52px] bg-[#121214] border border-white/10 rounded-xl pl-4 pr-12 text-slate-200 text-lg tracking-widest focus:outline-none focus:border-slate-500/50 focus:bg-[#18181b] focus:ring-1 focus:ring-slate-500/50 transition-all placeholder:text-zinc-600 placeholder:tracking-normal placeholder:text-sm cursor-text shadow-inner shadow-black/50"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-slate-300 p-2 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[52px] mt-2 bg-linear-to-b from-slate-200 to-slate-400 hover:from-white hover:to-slate-300 shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-[0.98] focus:ring-4 focus:ring-white/20 text-black font-bold tracking-wide rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 text-black animate-spin" />
              ) : (
                "Đăng nhập"
              )}
            </button>
          </form>
          
          <div className="mt-8 text-center text-sm text-zinc-500 flex justify-center gap-1">
            Không có tài khoản?{" "}
            <button
              type="button"
              onClick={() => {
                setRequestMsg(null);
                setIsRequestOpen(true);
              }}
              className="text-slate-200 hover:text-white underline underline-offset-4"
            >
              Xin cấp quyền
            </button>
          </div>
        </div>

        {/* Chân trang dưới cùng */}
        <div className="w-full max-w-[420px] mx-auto mt-8 text-xs text-zinc-600 flex justify-between">
          <span>&copy; MiniERP.</span>
          <span className="flex gap-4">
            <a href="#" className="hover:text-zinc-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-zinc-400 transition-colors">Terms</a>
          </span>
        </div>
      </div>

      {/* Hộp thoại yêu cầu cấp quyền */}
      {isRequestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative">
            <div className="admin-metal-shine" />
            <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center bg-[#0a0a0c] relative z-10">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <ShieldCheck className="w-5 h-5 mr-2 text-slate-300" />
                Xin cấp quyền tài khoản
              </h3>
              <button
                onClick={() => setIsRequestOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-md transition-colors"
                aria-label="Đóng"
                title="Đóng"
              >
                &times;
              </button>
            </div>

            <form
              className="p-6 space-y-4 relative z-10"
              onSubmit={async (e) => {
                e.preventDefault();
                setRequestMsg(null);
                if (!requestForm.hoten.trim() || !requestForm.tendangnhap.trim()) {
                  setRequestMsg({ type: "err", text: "Vui lòng nhập Họ tên và Tên đăng nhập." });
                  return;
                }
                setRequestLoading(true);
                try {
                  await apiJson("/api/auth/request-access", {
                    method: "POST",
                    body: JSON.stringify({
                      hoten: requestForm.hoten.trim(),
                      sdt: requestForm.sdt.trim() || null,
                      tendangnhap: requestForm.tendangnhap.trim(),
                      vaitro: requestForm.vaitro,
                      ghichu: requestForm.ghichu.trim() || null,
                    }),
                  });
                  setRequestMsg({ type: "ok", text: "Đã gửi yêu cầu. Vui lòng chờ Admin duyệt và cấp mật khẩu." });
                  setRequestForm({ hoten: "", sdt: "", tendangnhap: "", vaitro: "WORKER", ghichu: "" });
                } catch (err: unknown) {
                  setRequestMsg({ type: "err", text: err instanceof Error ? err.message : String(err) });
                } finally {
                  setRequestLoading(false);
                }
              }}
            >
              {requestMsg && (
                <div
                  className={`text-sm font-medium rounded-lg px-4 py-3 border ${
                    requestMsg.type === "ok"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                      : "bg-red-500/10 border-red-500/20 text-red-300"
                  }`}
                >
                  {requestMsg.text}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400 font-medium">
                    Họ tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={requestForm.hoten}
                    onChange={(e) => setRequestForm((p) => ({ ...p, hoten: e.target.value }))}
                    className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-4 py-3 text-gray-200 focus:outline-none focus:border-slate-500/60"
                    placeholder="Nguyễn Văn A"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400 font-medium">SĐT</label>
                  <input
                    value={requestForm.sdt}
                    onChange={(e) => setRequestForm((p) => ({ ...p, sdt: e.target.value }))}
                    className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-4 py-3 text-gray-200 focus:outline-none focus:border-slate-500/60"
                    placeholder="09..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400 font-medium">
                    Tên đăng nhập <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={requestForm.tendangnhap}
                    onChange={(e) => setRequestForm((p) => ({ ...p, tendangnhap: e.target.value }))}
                    className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-4 py-3 text-gray-200 focus:outline-none focus:border-slate-500/60 font-mono"
                    placeholder="vd: tho_cat_01"
                    required
                  />
                  <p className="text-[11px] text-gray-500">Sẽ dùng để tạo email dạng `{`tenDangNhap@minierp.local`}`.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400 font-medium">Vai trò mong muốn</label>
                  <select
                    value={requestForm.vaitro}
                    onChange={(e) => setRequestForm((p) => ({ ...p, vaitro: e.target.value }))}
                    className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-4 py-3 text-gray-200 focus:outline-none focus:border-slate-500/60"
                    aria-label="Vai trò"
                  >
                    <option value="WORKER">WORKER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400 font-medium">Ghi chú</label>
                <textarea
                  value={requestForm.ghichu}
                  onChange={(e) => setRequestForm((p) => ({ ...p, ghichu: e.target.value }))}
                  className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-4 py-3 text-gray-200 focus:outline-none focus:border-slate-500/60 min-h-[90px]"
                  placeholder="VD: xin cấp quyền quản lý kho..."
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRequestOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-300 hover:bg-white/5 border border-white/10 transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={requestLoading}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-linear-to-b from-slate-200 to-slate-400 hover:from-white hover:to-slate-300 text-black transition-colors disabled:opacity-70 flex items-center"
                >
                  {requestLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-black" /> : <Send className="w-4 h-4 mr-2" />}
                  Gửi yêu cầu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Khung phải - Hình minh họa thương hiệu */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center bg-[#050505] overflow-hidden border-l border-white/10">
        {/* Hiệu ứng sáng nhẹ theo tông kim loại */}
        <div className="absolute inset-0 bg-linear-to-tr from-slate-800/20 via-transparent to-transparent z-10 mix-blend-screen pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-linear-to-t from-[#050505] via-black/80 to-transparent z-10 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-32 bg-linear-to-b from-[#050505] to-transparent z-10 pointer-events-none" />
        
        {/* Ảnh nền theo chủ đề nhôm kính */}
        <Image
          src="/hero_bg.png"
          alt="Aluminum and Glass Architecture"
          fill
          sizes="55vw"
          className="absolute inset-0 w-full h-full object-cover opacity-90 contrast-125 grayscale-20"
          priority
        />

        {/* Nội dung khung phải */}
        <div className="relative z-20 w-full px-16 xl:px-24 flex flex-col h-full justify-between py-14">
          <div className="flex flex-col items-end w-full text-right">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 border border-slate-500/30 backdrop-blur-md mb-6 animate-in fade-in slide-in-from-top-4 duration-700 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
               <span className="flex w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
               <span className="text-sm font-medium text-slate-200">Hệ thống đang hoạt động</span>
            </div>
            
            <h2 className="text-4xl xl:text-5xl font-medium tracking-tight text-white max-w-lg leading-[1.15] animate-in fade-in slide-in-from-top-6 duration-1000 drop-shadow-2xl">
              Quy trình chuẩn hóa.
              <span className="block mt-2 font-bold bg-linear-to-r from-slate-200 via-slate-400 to-slate-500 text-transparent bg-clip-text">
                Không sai số.
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-8 max-w-lg ml-auto animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="p-6 rounded-2xl bg-black/60 backdrop-blur-xl border border-slate-500/20 shadow-2xl overflow-hidden relative group">
              <div className="absolute inset-0 bg-linear-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="text-3xl font-extrabold text-slate-200 mb-2">1D-CSP</div>
              <div className="text-sm text-slate-400 leading-relaxed font-medium">Thuật toán tối ưu hóa cắt phôi nhôm độc quyền</div>
            </div>
            <div className="p-6 rounded-2xl bg-black/60 backdrop-blur-xl border border-slate-500/20 shadow-2xl overflow-hidden relative group">
              <div className="absolute inset-0 bg-linear-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="text-3xl font-extrabold text-slate-200 mb-2">100%</div>
              <div className="text-sm text-slate-400 leading-relaxed font-medium">Truy xuất nguồn gốc từng thanh phôi qua Immutable ID</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
