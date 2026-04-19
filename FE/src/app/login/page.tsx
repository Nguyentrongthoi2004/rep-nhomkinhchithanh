"use client";

import { useState } from "react";
import { Loader2, Box, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Vui lòng nhập tài khoản và mật khẩu");
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
        setError(`Lỗi đăng nhập: Sai tài khoản hoặc mật khẩu.`);
        setLoading(false);
        return;
      }

      // Nếu user đăng nhập bằng Gmail Master Admin, server sẽ tự tạo hồ sơ nghiệp vụ (nguoidung) 1 lần.
      // (Route này dùng Service Role key nhưng có kiểm chứng session qua cookie)
      try {
        await fetch("/api/auth/ensure-profile", { method: "POST" });
      } catch {}

      // Vừa đăng nhập hệ thống bảo mật xong, truy xuất sang bảng Nghiệp vụ (nguoidung) lấy vai trò.
      const { data: profile } = await supabase
        .from("nguoidung")
        .select("vaitro")
        .eq("tendangnhap", loginIdentifier)
        // Nếu không tìm thấy bằng identifier thường, có thể là do email đầy đủ.
        // Thực chất tendangnhap của Master Admin là đủ luôn email:
        // Do đó .eq() ở trên sẽ trúng nhomkinhchithanh2026@gmail.com
        .single();

      // Redirect based on role
      if (profile?.vaitro === "ADMIN") {
        router.push("/admin/vat-tu"); // Đi thẳng vào kho vật tư
      } else {
        router.push("/worker");
      }
    } catch {
      setError("Lỗi kết nối máy chủ");
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#050505] text-white font-sans overflow-hidden antialiased">
      {/* Left Pane - Form */}
      <div className="w-full lg:w-[45%] flex flex-col p-6 sm:p-10 lg:p-14 relative z-10 bg-[#0a0a0c]">
        
        {/* Top Header */}
        <div className="flex justify-between items-center w-full max-w-[420px] mx-auto mb-8">
          <div className="flex items-center gap-2.5">
            <div className="bg-slate-400/10 p-2 rounded-xl border border-slate-500/20">
              <Box className="w-6 h-6 text-slate-300" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-100">MiniERP<span className="text-slate-500">.</span></span>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-300 bg-white/5 hover:bg-white/10 cursor-pointer px-4 py-2 rounded-full border border-white/5 transition-colors">
            <span>Tiếng Việt</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>

        {/* Center Form */}
        <div className="w-full max-w-[380px] mx-auto flex-1 flex flex-col justify-center">
          <div className="space-y-3 mb-10 text-center sm:text-left">
            <h1 className="text-[2.5rem] font-semibold tracking-tight text-slate-100 leading-none">Xin chào!</h1>
            <p className="text-zinc-400 text-base">Đăng nhập để vào không gian quản lý</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            
            {/* Third party logins (Mock aesthetic) */}
            <div className="flex gap-3">
              <button type="button" className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl h-12 flex items-center justify-center transition-colors text-sm font-medium text-zinc-300 shadow-inner shadow-white/5">
                Quét mã RFID
              </button>
              <button type="button" className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl h-12 flex items-center justify-center transition-colors text-sm font-medium text-zinc-300 shadow-inner shadow-white/5">
                Quét vân tay
              </button>
            </div>

            <div className="flex items-center gap-4 py-2">
              <div className="flex-1 h-px bg-linear-to-r from-transparent to-white/10" />
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">hoặc bằng tài khoản</span>
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
            Không có tài khoản? <span className="text-slate-300 hover:underline cursor-pointer">Xin cấp quyền</span>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="w-full max-w-[420px] mx-auto mt-8 text-xs text-zinc-600 flex justify-between">
          <span>&copy; {new Date().getFullYear()} MiniERP.</span>
          <span className="flex gap-4">
            <a href="#" className="hover:text-zinc-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-zinc-400 transition-colors">Terms</a>
          </span>
        </div>
      </div>

      {/* Right Pane - Image Hero */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center bg-[#050505] overflow-hidden border-l border-white/10">
        {/* Glow effect matching the silver theme */}
        <div className="absolute inset-0 bg-linear-to-tr from-slate-800/20 via-transparent to-transparent z-10 mix-blend-screen pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-linear-to-t from-[#050505] via-black/80 to-transparent z-10 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-32 bg-linear-to-b from-[#050505] to-transparent z-10 pointer-events-none" />
        
        {/* Background Image (Silver/Aluminum Glass Theme) */}
        <img 
          src="/hero_bg.png" 
          alt="Aluminum and Glass Architecture" 
          className="absolute inset-0 w-full h-full object-cover opacity-90 contrast-125 grayscale-20"
        />

        {/* Right Pane Content */}
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
