"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function WorkerCaNhanPage() {
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!password || password.length < 6) {
      setMsg({ type: "err", text: "Mật khẩu phải từ 6 ký tự trở lên." });
      return;
    }
    if (password !== password2) {
      setMsg({ type: "err", text: "Mật khẩu nhập lại không khớp." });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setMsg({ type: "err", text: `Đổi mật khẩu thất bại: ${error.message}` });
      return;
    }

    setPassword("");
    setPassword2("");
    setMsg({ type: "ok", text: "Đổi mật khẩu thành công." });
  };

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#111318] border border-white/10 rounded-2xl p-5">
        <h2 className="text-lg font-bold text-white">Cá nhân</h2>
        <p className="text-sm text-gray-400 mt-1">Đổi mật khẩu sau khi nhận tài khoản từ Admin.</p>
      </div>

      <form onSubmit={handleChangePassword} className="bg-[#0a0a0c] border border-white/10 rounded-2xl p-5 space-y-4">
        {msg && (
          <div
            className={`text-sm font-medium rounded-lg px-4 py-3 border ${
              msg.type === "ok"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                : "bg-red-500/10 border-red-500/20 text-red-300"
            }`}
          >
            {msg.text}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm text-gray-300 font-medium">Mật khẩu mới</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#111318] border border-white/10 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Nhập mật khẩu mới"
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-300 font-medium">Nhập lại mật khẩu</label>
          <input
            type="password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            className="w-full bg-[#111318] border border-white/10 rounded-lg px-4 py-2.5 text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Nhập lại mật khẩu"
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-70 text-white font-bold py-3 rounded-xl border border-blue-500/40 transition-colors"
        >
          {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
        </button>
      </form>

      <button
        onClick={handleLogout}
        disabled={loading}
        className="w-full bg-white/5 hover:bg-white/10 disabled:opacity-70 text-white font-semibold py-3 rounded-xl border border-white/10 transition-colors"
      >
        Đăng xuất
      </button>
    </div>
  );
}

