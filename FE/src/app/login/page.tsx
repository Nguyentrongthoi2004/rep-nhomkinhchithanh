"use client";

import { useState } from "react";
import { Loader2, Eye, EyeOff, Send, ShieldCheck, Cpu, Fingerprint } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { apiData, apiJson } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

// Component vẽ Logo CT 3D Isometric cao cấp bằng SVG
const LogoCT = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="logo-silver-left" x1="25" y1="15" x2="35" y2="85" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#cbd5e1" />
        <stop offset="50%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#475569" />
      </linearGradient>
      <linearGradient id="logo-silver-right" x1="55" y1="15" x2="68" y2="85" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="50%" stopColor="#e2e8f0" />
        <stop offset="100%" stopColor="#cbd5e1" />
      </linearGradient>
      <filter id="logo-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#ffffff" floodOpacity="0.12" />
      </filter>
    </defs>
    <g filter="url(#logo-shadow)">
      {/* Cực trái: Khối C 3D trong hệ trục isometric - tông thép titan */}
      <path
        d="M25 25 L45 15 L45 27 L35 31 L35 69 L45 73 L45 85 L25 75 Z"
        fill="url(#logo-silver-left)"
        stroke="#cbd5e1"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Cực phải: Khối T 3D trong hệ trục isometric - tông chrome bạc sáng */}
      <path
        d="M55 25 L75 15 L75 27 L68 30.5 L68 78.5 L58 83.5 L58 35.5 L55 37 Z"
        fill="url(#logo-silver-right)"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </g>
  </svg>
);

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
      <div className="w-full lg:w-[45%] flex flex-col p-6 sm:p-10 lg:p-14 relative z-10 admin-metal-panel overflow-hidden">
        {/* Ánh sáng bạc chiếu nền — z-0 nên không tác động vào hộp đen */}
        <div className="absolute top-[15%] left-[20%] w-[400px] h-[400px] bg-slate-300/20 rounded-full blur-[120px] pointer-events-none z-0 animate-pulse" />
        <div className="absolute bottom-[20%] right-[15%] w-[450px] h-[450px] bg-zinc-400/15 rounded-full blur-[130px] pointer-events-none z-0" style={{ animation: 'login-glow-shift 18s ease-in-out infinite' }} />
        <div className="absolute top-0 left-0 w-[350px] h-[350px] bg-slate-200/12 rounded-full blur-[90px] pointer-events-none z-0" />
        {/* Tia sáng bạc chéo từ góc trên phải chiếu xuống */}
        <div className="absolute -top-[10%] right-0 w-[200px] h-[600px] bg-gradient-to-b from-white/[0.07] via-slate-300/[0.04] to-transparent rotate-[25deg] blur-[2px] pointer-events-none z-0" />

        {/* Ảnh nền cấu trúc bên trái */}
        <div className="absolute inset-0 w-full h-full z-0 pointer-events-none overflow-hidden">
          <Image
            src="/login_bg_structure.png"
            alt="Nhôm Kính Chí Thành 3D Facade Background"
            fill
            sizes="45vw"
            className="object-cover opacity-35 contrast-[1.05] brightness-[0.75] saturate-50"
            priority
          />
          {/* Lớp gradient mờ tăng tương phản cho form đăng nhập */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/60 z-0" />
        </div>
        <div className="admin-metal-shine z-10 pointer-events-none" />

        {/* Scan line effect — vạch sáng quét dọc */}
        <div className="login-scan-effect" />

        {/* Floating silver particles — hạt bạc bay lên */}
        {[
          { left: '12%', bottom: '8%', size: 2, opacity: 0.6, delay: '0s', dur: '12s' },
          { left: '35%', bottom: '4%', size: 3, opacity: 0.7, delay: '2.5s', dur: '14s' },
          { left: '55%', bottom: '14%', size: 1.5, opacity: 0.5, delay: '5s', dur: '10s' },
          { left: '72%', bottom: '6%', size: 2.5, opacity: 0.65, delay: '1.2s', dur: '16s' },
          { left: '25%', bottom: '18%', size: 1.5, opacity: 0.55, delay: '7s', dur: '11s' },
          { left: '82%', bottom: '10%', size: 2, opacity: 0.6, delay: '3.8s', dur: '13s' },
        ].map((p, i) => (
          <div
            key={`particle-${i}`}
            className="login-particle"
            style={{
              left: p.left,
              bottom: p.bottom,
              width: p.size,
              height: p.size,
              background: `rgba(203, 213, 225, ${p.opacity})`,
              boxShadow: `0 0 ${p.size * 3}px rgba(203, 213, 225, 0.4)`,
              animation: `login-particle-rise ${p.dur} ${p.delay} linear infinite`,
            }}
          />
        ))}

        {/* Grid overlay — lưới mờ trang trí */}
        <div className="absolute inset-0 login-grid-bg z-[1] pointer-events-none opacity-50" />
        
        {/* Đầu trang trên cùng - Logo nằm sát góc + hiệu ứng shimmer */}
        <div className="absolute top-8 left-8 z-20">
          <div className="flex items-center gap-3 group/logo">
            <div className="relative">
              {/* Vòng sáng bạc nhấp nháy phía sau logo */}
              <div className="absolute inset-0 bg-slate-200/25 blur-2xl rounded-full scale-[2] animate-pulse pointer-events-none" />
              <div className="absolute inset-0 rounded-full border border-white/10 scale-[2.5] pointer-events-none" style={{ animation: 'login-corner-pulse 4s ease-in-out infinite' }} />
              <LogoCT className="w-12 h-12 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] relative z-10 group-hover/logo:drop-shadow-[0_0_25px_rgba(255,255,255,0.5)] transition-all duration-500" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] tracking-[0.2em] font-extrabold text-slate-400 uppercase">NHÔM KÍNH</span>
              <span className="text-xl font-black text-white tracking-tight uppercase brand-name">Chí Thành</span>
            </div>
          </div>
        </div>

        {/* Khung chứa dịch chuyển card xuống thấp 1 tí */}
        <div className="w-full max-w-[420px] mx-auto my-auto translate-y-12 relative z-10">
          {/* Khung đăng nhập — tĩnh, không animation */}
          <div className="w-full p-8 rounded-2xl bg-[#090a0f]/95 backdrop-blur-xl border border-white/[0.08] relative shadow-[0_30px_70px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)] select-none">
            
            {/* Corner brackets */}
            <div className="absolute top-3.5 left-3.5 w-3 h-3 border-t border-l border-white/20 rounded-tl-sm pointer-events-none z-10" />
            <div className="absolute top-3.5 right-3.5 w-3 h-3 border-t border-r border-white/20 rounded-tr-sm pointer-events-none z-10" />
            <div className="absolute bottom-3.5 left-3.5 w-3 h-3 border-b border-l border-white/20 rounded-bl-sm pointer-events-none z-10" />
            <div className="absolute bottom-3.5 right-3.5 w-3 h-3 border-b border-r border-white/20 rounded-br-sm pointer-events-none z-10" />

            {/* Nội dung bên trong khung */}
            <div className="relative z-10 flex flex-col">
              {/* Logo nội bộ của thẻ */}
              <div className="flex flex-col items-center mb-6">
                <div className="w-14 h-14 rounded-xl bg-zinc-950/80 border border-white/10 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.5)] mb-3 group hover:border-slate-500/30 transition-colors duration-300">
                  <LogoCT className="w-9 h-9 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] group-hover:scale-105 transition-transform duration-300" />
                </div>
                <span className="text-[10px] tracking-[0.16em] font-extrabold text-slate-400 uppercase">NHÔM KÍNH</span>
                <span className="text-base font-black text-white tracking-tight uppercase">Chí Thành</span>
              </div>

              <div className="text-center mb-6">
                <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2 leading-none">Xin chào!</h1>
                <p className="text-zinc-400 text-sm">Đăng nhập để vào không gian quản lý</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div className="flex items-center gap-4 py-1">
                  <div className="flex-1 h-px bg-linear-to-r from-transparent to-white/10" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">đăng nhập</span>
                  <div className="flex-1 h-px bg-linear-to-l from-transparent to-white/10" />
                </div>

                {error && (
                  <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-lg text-center font-medium animate-in slide-in-from-top-1">
                    {error}
                  </div>
                )}

                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400 ml-1 uppercase tracking-wider">
                      Tài khoản
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="nhomkinh_admin"
                      className="w-full h-12 bg-zinc-950/80 border border-white/10 rounded-xl px-4 text-slate-200 text-sm focus:outline-none focus:border-slate-400/50 focus:ring-1 focus:ring-slate-400/50 transition-all placeholder:text-zinc-600 shadow-inner shadow-black/40"
                      autoComplete="username"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        Mật khẩu
                      </label>
                      <a href="#" className="text-[11px] text-slate-400 hover:text-white transition-colors">Quên mật khẩu?</a>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-12 bg-zinc-950/80 border border-white/10 rounded-xl pl-4 pr-12 text-slate-200 text-base tracking-widest focus:outline-none focus:border-slate-400/50 focus:ring-1 focus:ring-slate-400/50 transition-all placeholder:text-zinc-600 placeholder:tracking-normal placeholder:text-xs cursor-text shadow-inner shadow-black/40"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-slate-300 p-1.5 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 mt-2 bg-white hover:bg-zinc-200 text-black font-bold text-sm tracking-wide rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(255,255,255,0.15)]"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 text-black animate-spin" />
                  ) : (
                    "Đăng nhập"
                  )}
                </button>
              </form>
              
              <div className="mt-6 text-center text-xs text-zinc-500 flex justify-center gap-1">
                Không có tài khoản?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setRequestMsg(null);
                    setIsRequestOpen(true);
                  }}
                  className="text-slate-300 hover:text-white underline underline-offset-4 font-semibold"
                >
                  Xin cấp quyền
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Chân trang dưới cùng */}
        <div className="w-full max-w-[480px] mx-auto mt-auto pt-8 text-[11px] text-zinc-500 flex justify-between items-center relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-950 border border-white/5 flex items-center justify-center shadow-md">
              <span className="text-white font-black text-xs font-mono">N</span>
            </div>
            <span>&copy; MiniERP.</span>
          </div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-zinc-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-zinc-300 transition-colors">Terms</a>
          </div>
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
      <div className="hidden lg:flex flex-1 relative items-center justify-center bg-[#050505] overflow-hidden border-l border-white/10">
        {/* Hiệu ứng sáng nhẹ theo tông kim loại */}
        <div className="absolute inset-0 bg-linear-to-tr from-slate-900/40 via-transparent to-transparent z-10 mix-blend-screen pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-linear-to-t from-[#050505] via-black/90 to-transparent z-10 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-32 bg-linear-to-b from-[#050505] to-transparent z-10 pointer-events-none" />

        {/* Silver ambient glow orbs — ánh bạc trôi chậm bên phải */}
        <div className="absolute top-[10%] right-[20%] w-[300px] h-[300px] bg-slate-400/10 rounded-full blur-[100px] pointer-events-none z-[5]" style={{ animation: 'login-orb-drift-a 16s ease-in-out infinite' }} />
        <div className="absolute bottom-[15%] left-[10%] w-[250px] h-[250px] bg-zinc-400/8 rounded-full blur-[90px] pointer-events-none z-[5]" style={{ animation: 'login-orb-drift-b 20s ease-in-out infinite' }} />

        {/* Scan line quét ngang bên phải */}
        <div className="login-scan-effect z-[15]" />
        
        {/* Ảnh nền theo chủ đề nhôm kính */}
        <Image
          src="/hero_bg.png"
          alt="Aluminum and Glass Architecture"
          fill
          sizes="55vw"
          className="absolute inset-0 w-full h-full object-cover opacity-80 contrast-[1.1] brightness-[0.75] saturate-75 z-0"
          priority
        />

        {/* Nội dung khung phải */}
        <div className="relative z-20 w-full px-16 xl:px-24 flex flex-col h-full justify-between py-14">
          <div className="flex flex-col items-end w-full text-right">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 border border-slate-500/30 backdrop-blur-md mb-6 shadow-[0_0_15px_rgba(255,255,255,0.05)] login-animate-fade-up">
               <span className="flex w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
               <span className="text-xs font-bold uppercase tracking-wider text-slate-200">HỆ THỐNG ĐANG HOẠT ĐỘNG</span>
            </div>
            
            <h2 className="text-[2.75rem] xl:text-[3.25rem] font-bold tracking-tight text-white max-w-lg leading-[1.2] font-sans drop-shadow-2xl login-animate-fade-up login-delay-100">
              Chuẩn hóa quy trình.
              <span className="block mt-1 font-extrabold bg-gradient-to-r from-slate-100 via-slate-300 to-slate-400 text-transparent bg-clip-text">
                Tối ưu vật tư.
              </span>
            </h2>
          </div>

          {/* Blueprint Card — Premium */}
          <div className="w-full max-w-[460px] ml-auto p-0 rounded-2xl bg-gradient-to-br from-[#0c0e14] via-[#0a0c12] to-[#080a0f] backdrop-blur-xl border border-white/[0.08] shadow-[0_25px_60px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)] relative overflow-hidden group login-animate-fade-up login-delay-200">
            {/* Animated background effects */}
            <div className="absolute inset-0 pointer-events-none z-0">
              {/* Subtle moving gradient mesh */}
              <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-cyan-500/[0.04] rounded-full blur-[80px]" style={{ animation: 'login-orb-drift-a 20s ease-in-out infinite' }} />
              <div className="absolute bottom-0 left-0 w-[180px] h-[180px] bg-emerald-500/[0.03] rounded-full blur-[70px]" style={{ animation: 'login-orb-drift-b 24s ease-in-out infinite' }} />
              {/* Dot grid pattern */}
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
              {/* Scan line inside card */}
              <div className="login-scan-effect" />
            </div>
            {/* Metallic shimmer sweep */}
            <div className="admin-metal-shine" />
            {/* Top highlight edge */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-400/40 to-transparent" />
            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-500/15 to-transparent" />
            {/* Left accent line */}
            <div className="absolute top-4 left-0 w-[2px] h-12 bg-gradient-to-b from-cyan-400/40 via-cyan-400/20 to-transparent rounded-full" />

            {/* Card content */}
            <div className="relative z-10 p-6">
              <div className="flex justify-between items-center mb-4 border-b border-white/[0.06] pb-3">
                <div>
                  <span className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">1D-CSP OPTIMIZATION BLUEPRINT</span>
                  <h3 className="text-sm font-bold text-white mt-1 tracking-tight">Sơ đồ phân rã thanh nhôm tối ưu</h3>
                </div>
                {/* Status dot */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">LIVE</span>
                </div>
              </div>

              {/* Spec details */}
              <div className="flex justify-between items-center text-xs mb-4 font-mono text-zinc-400">
                <div>
                  MÃ PHÔI: <span className="text-white font-bold">XINGFA_A_6000MM</span>
                </div>
                <div className="flex items-center gap-1.5">
                  Hiệu suất cắt: <span className="text-emerald-400 font-extrabold text-sm drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]">98.5%</span>
                </div>
              </div>

              {/* Segment Bar — với glow và shadow */}
              <div className="relative w-full h-11 rounded-xl overflow-hidden border border-white/[0.08] flex text-[11px] font-bold font-mono select-none mb-4 bg-zinc-950/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
                {/* Cut 1: 2100mm */}
                <div className="h-full bg-gradient-to-b from-cyan-500/80 to-cyan-700/70 border-r border-white/15 flex flex-col items-center justify-center text-white relative" style={{ width: '35%' }}>
                  <span className="leading-none text-[10px] font-extrabold drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">2100mm</span>
                  <span className="text-[7px] opacity-70 font-sans mt-0.5 leading-none">Cánh đi (C1)</span>
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/[0.08] pointer-events-none" />
                </div>
                {/* Cut 2: 1500mm */}
                <div className="h-full bg-gradient-to-b from-blue-500/70 to-blue-700/60 border-r border-white/15 flex flex-col items-center justify-center text-white relative" style={{ width: '25%' }}>
                  <span className="leading-none text-[10px] font-extrabold drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">1500mm</span>
                  <span className="text-[7px] opacity-70 font-sans mt-0.5 leading-none">Khung bao (K1)</span>
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/[0.08] pointer-events-none" />
                </div>
                {/* Cut 3: 1200mm */}
                <div className="h-full bg-gradient-to-b from-slate-500/60 to-slate-700/50 border-r border-white/15 flex flex-col items-center justify-center text-white relative" style={{ width: '20%' }}>
                  <span className="leading-none text-[10px] font-extrabold drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">1200mm</span>
                  <span className="text-[7px] opacity-70 font-sans mt-0.5 leading-none">Đố ngang (D1)</span>
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/[0.08] pointer-events-none" />
                </div>
                {/* Reusable Offcut: 1160mm */}
                <div className="h-full bg-gradient-to-b from-emerald-500/55 to-emerald-700/45 border-r border-white/15 flex flex-col items-center justify-center text-emerald-100 relative" style={{ width: '19.33%' }}>
                  <span className="leading-none text-[10px] font-extrabold drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">Dư 1160mm</span>
                  <span className="text-[7px] opacity-70 text-emerald-200 font-sans mt-0.5 leading-none">Tái sử dụng</span>
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/[0.06] pointer-events-none" />
                </div>
                {/* Scrap/Kerf: 40mm */}
                <div className="h-full bg-gradient-to-b from-red-500/60 to-red-800/50 flex items-center justify-center text-red-200 relative group/seg" style={{ width: '0.67%' }}>
                  <span className="absolute hidden group-hover/seg:block bg-black/90 text-white text-[9px] p-1.5 rounded -top-8 z-50 whitespace-nowrap border border-white/10">Hao lưỡi: 40mm</span>
                </div>
              </div>

              {/* Legend */}
              <div className="grid grid-cols-3 gap-3 text-[10px] border-t border-white/[0.06] pt-3">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0 shadow-[0_0_6px_rgba(34,211,238,0.4)]" />
                  <span>Yêu cầu: 3 thành phẩm</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_6px_rgba(52,211,153,0.4)]" />
                  <span>Phôi tái sử dụng (≥1m)</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 shadow-[0_0_6px_rgba(239,68,68,0.4)]" />
                  <span>Phế liệu vụn (&lt;1m)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 max-w-lg ml-auto">
            <div className="p-5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/[0.08] shadow-2xl relative group overflow-hidden login-animate-fade-up login-delay-300 hover:border-slate-500/25 hover:scale-[1.03] hover:shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(148,163,184,0.08)] transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="admin-metal-shine" />
              <div className="flex items-center gap-3 mb-2 relative z-10">
                <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 group-hover:border-slate-400/30 group-hover:shadow-[0_0_12px_rgba(148,163,184,0.15)] transition-all duration-300">
                  <Cpu className="w-4.5 h-4.5 group-hover:text-white transition-colors duration-300" />
                </div>
                <div className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors duration-300">1D-CSP</div>
              </div>
              <div className="text-[11px] text-slate-400 leading-normal font-medium relative z-10">Tối ưu sơ đồ cắt phôi nhôm</div>
            </div>
            
            <div className="p-5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/[0.08] shadow-2xl relative group overflow-hidden login-animate-fade-up login-delay-400 hover:border-slate-500/25 hover:scale-[1.03] hover:shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_30px_rgba(148,163,184,0.08)] transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="admin-metal-shine" />
              <div className="flex items-center gap-3 mb-2 relative z-10">
                <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 group-hover:border-slate-400/30 group-hover:shadow-[0_0_12px_rgba(148,163,184,0.15)] transition-all duration-300">
                  <Fingerprint className="w-4.5 h-4.5 group-hover:text-white transition-colors duration-300" />
                </div>
                <div className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors duration-300">Truy xuất</div>
              </div>
              <div className="text-[11px] text-slate-400 leading-normal font-medium relative z-10">Theo dõi từng thanh phôi qua mã định danh</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
