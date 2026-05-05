"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  User2,
  ShieldCheck,
  LogOut,
  Lock,
  Mail,
  Phone,
  KeyRound,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";

type Profile = {
  hoten?: string;
  email?: string;
  sdt?: string;
  vaitro?: string;
};

export default function WorkerCaNhanPage() {
  const supabase = useMemo(() => createClient(), []);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [profile, setProfile] = useState<Profile>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      const meta = (data.user?.user_metadata as Record<string, unknown>) || {};
      setProfile({
        hoten:
          (meta["hoten"] as string) ||
          (meta["hoTen"] as string) ||
          (meta["full_name"] as string) ||
          data.user?.email?.split("@")[0] ||
          "Công nhân",
        email: data.user?.email || "",
        sdt: (meta["sdt"] as string) || (meta["phone"] as string) || "",
        vaitro: (meta["vaitro"] as string) || (meta["vaiTro"] as string) || "WORKER",
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const strength = useMemo(() => {
    if (!password) return { label: "", score: 0, color: "bg-white/10" };
    let s = 0;
    if (password.length >= 6) s++;
    if (password.length >= 10) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    const map = [
      { label: "Yếu", color: "bg-rose-500" },
      { label: "Yếu", color: "bg-rose-500" },
      { label: "Trung bình", color: "bg-amber-500" },
      { label: "Khá", color: "bg-sky-500" },
      { label: "Mạnh", color: "bg-emerald-500" },
      { label: "Rất mạnh", color: "bg-emerald-400" },
    ];
    return { label: map[s].label, score: s, color: map[s].color };
  }, [password]);

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
    setLoggingOut(true);
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const initials = (profile.hoten || "CN")
    .split(" ")
    .slice(-2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-4 pb-4 px-5 pt-6">
      {/* Profile Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#12141a] to-[#0a0a0c] border border-white/10 px-5 py-6 shadow-xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="relative shrink-0 w-16 h-16 rounded-2xl bg-linear-to-br from-sky-400/30 to-sky-700/30 border border-sky-400/30 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_30px_-16px_rgba(56,189,248,0.4)]">
            <span className="text-xl font-extrabold text-white">{initials}</span>
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#0a0a0c] flex items-center justify-center">
              <ShieldCheck className="w-3 h-3 text-white" />
            </span>
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-300" /> Hồ sơ cá nhân
            </div>
            <h2 className="text-xl font-extrabold brand-name mt-1 leading-tight truncate">
              {profile.hoten}
            </h2>
            <div className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-sky-200 bg-sky-500/15 px-2 py-0.5 rounded-md border border-sky-400/30">
              <User2 className="w-3 h-3" /> {profile.vaitro}
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-5 pt-4 border-t border-white/5 space-y-2.5">
          <InfoRow icon={<Mail className="w-4 h-4 text-sky-300" />} label="Email" value={profile.email || "—"} />
          <InfoRow icon={<Phone className="w-4 h-4 text-emerald-300" />} label="Số điện thoại" value={profile.sdt || "Chưa cập nhật"} />
        </div>
      </section>

      {/* Change password */}
      <section className="rounded-3xl border border-white/10 bg-[#0c0d11]/85 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-300/25 flex items-center justify-center">
            <KeyRound className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Đổi mật khẩu</h3>
            <p className="text-[11px] text-slate-500">Dùng mật khẩu mạnh để bảo vệ tài khoản.</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          {msg && (
            <div
              className={`text-sm font-medium rounded-xl px-4 py-3 border flex items-start gap-2 ${
                msg.type === "ok"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                  : "bg-red-500/10 border-red-500/20 text-red-300"
              }`}
            >
              {msg.type === "ok" ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              )}
              <span>{msg.text}</span>
            </div>
          )}

          <PasswordField
            label="Mật khẩu mới"
            value={password}
            onChange={setPassword}
            show={showPw}
            onToggle={() => setShowPw((v) => !v)}
          />

          {password && (
            <div>
              <div className="flex items-center gap-1 mb-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      i < strength.score ? strength.color : "bg-white/5"
                    }`}
                  />
                ))}
              </div>
              <div className="text-[11px] text-slate-400">Độ mạnh: <span className="font-bold text-slate-200">{strength.label}</span></div>
            </div>
          )}

          <PasswordField
            label="Nhập lại mật khẩu"
            value={password2}
            onChange={setPassword2}
            show={showPw}
            onToggle={() => setShowPw((v) => !v)}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-2xl bg-linear-to-br from-sky-500 to-sky-700 hover:from-sky-400 hover:to-sky-600 disabled:opacity-60 text-white font-bold transition-colors flex items-center justify-center gap-2 shadow-[0_10px_30px_-10px_rgba(14,165,233,0.55)]"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Lock className="w-4 h-4" /> Đổi mật khẩu
              </>
            )}
          </button>
        </form>
      </section>

      {/* Logout */}
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="w-full h-12 rounded-2xl bg-rose-500/10 hover:bg-rose-500/15 disabled:opacity-60 text-rose-300 font-semibold border border-rose-500/20 transition-colors flex items-center justify-center gap-2"
      >
        {loggingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-4 h-4" />}
        Đăng xuất
      </button>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-white/3 border border-white/10 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
          <div className="text-sm text-slate-100 truncate">{value}</div>
        </div>
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-slate-300 font-medium">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-4 pr-11 py-3 text-slate-100 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 transition"
          placeholder="••••••"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/5"
          title={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
