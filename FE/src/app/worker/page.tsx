"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  QrCode,
  ClipboardCheck,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Package,
  Scissors,
  Clock,
  Flame,
  Sparkles,
} from "lucide-react";
import { apiJson } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

type TaskRow = {
  mapc: number;
  trangthai: string;
  donhang: {
    madh: number;
    ngaytao: string;
    trangthai: string;
    khachhang: { hoten: string } | null;
  } | null;
};

type RawStock = {
  maphoi: number;
  chieudaihientai: number;
  chieudaibandau: number;
  trangthai: string;
  vattu: { tenvt: string; donvitinh: string } | null;
};

function greetingByHour(hour: number) {
  if (hour < 11) return { text: "Chào buổi sáng", shift: "Ca Sáng", icon: Sparkles };
  if (hour < 14) return { text: "Chúc bữa trưa ngon miệng", shift: "Giữa ca", icon: Flame };
  if (hour < 18) return { text: "Chào buổi chiều", shift: "Ca Chiều", icon: Flame };
  return { text: "Chào buổi tối", shift: "Ca Tối", icon: Sparkles };
}

export default function WorkerDashboard() {
  const supabase = useMemo(() => createClient(), []);
  const [fullName, setFullName] = useState<string>("Công nhân");
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [stocks, setStocks] = useState<RawStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<Date>(new Date());

  const loadProfile = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const meta = (data.user?.user_metadata as Record<string, unknown>) || {};
    const displayName =
      (meta["hoten"] as string) ||
      (meta["hoTen"] as string) ||
      (meta["full_name"] as string) ||
      data.user?.email?.split("@")[0] ||
      "Công nhân";
    setFullName(displayName);
  }, [supabase]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [taskRes, stockRes] = await Promise.all([
        apiJson<TaskRow[]>("/api/worker/tasks"),
        apiJson<RawStock[]>("/api/worker/raw-stock"),
      ]);
      setTasks(taskRes.data || []);
      setStocks(stockRes.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    loadAll();
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, [loadProfile, loadAll]);

  const pending = tasks.filter((t) => t.trangthai !== "HOAN_THANH");
  const doing = tasks.filter((t) => t.trangthai === "DANG_THUC_HIEN");
  const done = tasks.filter((t) => t.trangthai === "HOAN_THANH");
  const reusableStocks = stocks.filter((s) => s.trangthai !== "BO_DI" && s.chieudaihientai > 0);

  const greet = greetingByHour(now.getHours());
  const GreetIcon = greet.icon;

  return (
    <div className="space-y-5 relative z-10">
      {/* ===== Hero / Greeting ===== */}
      <section className="relative overflow-hidden rounded-3xl admin-metal-panel border border-white/10 px-5 py-5">
        <div className="admin-metal-shine" />
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              <GreetIcon className="w-3.5 h-3.5 text-sky-300" />
              {greet.text}
            </div>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight brand-name leading-tight truncate">
              {fullName}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Hôm nay có <strong className="text-sky-300">{pending.length}</strong> việc cần làm ·{" "}
              <span className="text-emerald-300">{done.length} đã xong</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-[10px] font-bold tracking-wider uppercase text-sky-200 bg-sky-500/15 px-2.5 py-1 rounded-full border border-sky-400/30">
              {greet.shift}
            </span>
            <span className="text-[11px] font-mono text-slate-400 bg-black/40 px-2 py-0.5 rounded-md border border-white/5">
              {now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>

        {/* Stat Row */}
        <div className="relative z-10 mt-5 grid grid-cols-3 gap-2 pt-4 border-t border-white/5">
          <Stat icon={<ClipboardCheck className="w-4 h-4" />} label="Đang chờ" value={pending.length} accent="sky" />
          <Stat icon={<Scissors className="w-4 h-4" />} label="Đang làm" value={doing.length} accent="amber" />
          <Stat icon={<CheckCircle2 className="w-4 h-4" />} label="Hoàn thành" value={done.length} accent="emerald" />
        </div>
      </section>

      {/* ===== Primary CTA: Quét Tem Khung ===== */}
      <button
        type="button"
        className="group relative w-full overflow-hidden rounded-3xl border border-sky-400/40 bg-linear-to-br from-sky-500 via-sky-600 to-blue-700 px-5 py-6 text-left shadow-[0_18px_50px_-20px_rgba(14,165,233,0.55)] transition-all active:scale-[0.985]"
        aria-label="Quét tem khung phôi"
      >
        <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/25 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1500 ease-in-out" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="shrink-0 w-16 h-16 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shadow-inner">
            <QrCode className="w-9 h-9 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.22em] text-sky-100/80 font-bold">
              Hành động nhanh
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight leading-tight">
              Quét tem khung
            </div>
            <div className="text-xs text-sky-100/80 mt-0.5">Dùng camera điện thoại để check-in phôi</div>
          </div>
          <ArrowRight className="w-6 h-6 text-white/90 group-hover:translate-x-1 transition-transform" />
        </div>
      </button>

      {/* ===== Quick Links ===== */}
      <section className="grid grid-cols-2 gap-3">
        <QuickLink
          href="/worker/kho"
          icon={<Package className="w-5 h-5 text-sky-300" />}
          title="Kho phôi"
          hint={`${reusableStocks.length} thanh dùng được`}
        />
        <QuickLink
          href="/worker/cat"
          icon={<Scissors className="w-5 h-5 text-amber-300" />}
          title="Máy cắt"
          hint={`${pending.length} việc đang chờ`}
        />
      </section>

      {/* ===== Ongoing Tasks ===== */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-emerald-400" />
              Việc đang gia công
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Ấn vào thẻ để mở chi tiết trong “Máy cắt”.</p>
          </div>
          <span className="text-xs font-bold text-white bg-sky-600 px-2.5 py-0.5 rounded-full shadow-[0_0_12px_rgba(14,165,233,0.55)]">
            {pending.length}
          </span>
        </div>

        <div className="space-y-3">
          {loading && (
            <div className="py-10 text-center text-sm text-slate-500">Đang tải việc...</div>
          )}

          {!loading && pending.length === 0 && (
            <EmptyState
              icon={<CheckCircle2 className="w-8 h-8 text-emerald-400" />}
              title="Hết việc rồi!"
              desc="Không có phân công nào đang chờ. Nghỉ ngơi hoặc hỗ trợ đồng nghiệp nhé."
            />
          )}

          {!loading &&
            pending.slice(0, 5).map((t) => {
              const isDoing = t.trangthai === "DANG_THUC_HIEN";
              return (
                <Link
                  href="/worker/cat"
                  key={t.mapc}
                  className="block relative overflow-hidden rounded-2xl border border-white/10 bg-[#0f1115]/85 backdrop-blur-sm p-4 active:bg-white/5 transition-colors shadow-lg"
                >
                  <div
                    className={`absolute top-0 left-0 h-1 w-full ${
                      isDoing ? "bg-amber-400/80" : "bg-sky-500/60"
                    }`}
                    aria-hidden
                  />
                  <div className="flex items-start justify-between gap-2 pt-1">
                    <span
                      className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-[11px] font-bold border ${
                        isDoing
                          ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                          : "bg-sky-500/15 text-sky-300 border-sky-500/30"
                      }`}
                    >
                      {isDoing ? <Flame className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      PC-{t.mapc}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 bg-black/40 px-2 py-0.5 rounded-md border border-white/5">
                      DH-{t.donhang?.madh ?? "?"}
                    </span>
                  </div>

                  <h4 className="text-slate-100 font-bold text-[15px] mt-2 leading-tight">
                    {t.donhang?.khachhang?.hoten || "Khách lẻ"}
                  </h4>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[12px] text-slate-500">
                      Trạng thái ĐH:{" "}
                      <span className="text-slate-300 font-semibold">{t.donhang?.trangthai || "—"}</span>
                    </p>
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                  </div>
                </Link>
              );
            })}
        </div>
      </section>

      {/* ===== Tip card ===== */}
      <section className="rounded-2xl border border-white/10 bg-linear-to-br from-slate-800/40 to-slate-900/60 p-4 flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-300/30 flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-amber-300" />
        </div>
        <div className="text-[12px] leading-relaxed text-slate-400">
          <strong className="text-slate-200">Lưu ý an toàn:</strong> luôn kiểm tra mã UID phôi trước khi cắt.
          Sai UID = sai vật tư = hỏng đơn hàng.
        </div>
      </section>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: "sky" | "emerald" | "amber";
}) {
  const palette = {
    sky: "text-sky-300",
    emerald: "text-emerald-300",
    amber: "text-amber-300",
  }[accent];
  return (
    <div className="relative rounded-xl border border-white/5 bg-white/2 px-3 py-2.5">
      <div className={`flex items-center gap-1.5 ${palette}`}>
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      </div>
      <div className="mt-1 text-xl font-extrabold text-white tabular-nums">{value}</div>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  title,
  hint,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#10131a]/80 backdrop-blur px-4 py-3.5 active:scale-[0.98] transition-transform"
    >
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl bg-white/4 border border-white/10 flex items-center justify-center">
          {icon}
        </div>
        <TrendingUp className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors" />
      </div>
      <div className="mt-2.5 text-sm font-bold text-slate-100">{title}</div>
      <div className="text-[11px] text-slate-500">{hint}</div>
    </Link>
  );
}

function EmptyState({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/2 px-5 py-8 text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
        {icon}
      </div>
      <h4 className="mt-3 text-sm font-bold text-slate-200">{title}</h4>
      <p className="mt-1 text-[12px] text-slate-500 max-w-xs mx-auto">{desc}</p>
    </div>
  );
}
