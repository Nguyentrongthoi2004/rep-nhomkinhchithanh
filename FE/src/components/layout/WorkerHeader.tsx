"use client";

import { Bell, Hexagon } from "lucide-react";

export default function WorkerHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 admin-metal-panel/75 backdrop-blur-md border-b border-white/10 z-50 flex items-center justify-between px-4 overflow-hidden">
      <div className="admin-metal-shine" />

      {/* Thương hiệu / Tiêu đề */}
      <div className="relative z-10 flex items-center gap-2.5 min-w-0">
        <div className="brand-icon flex items-center justify-center shrink-0">
          <Hexagon className="w-4 h-4 text-slate-100 drop-shadow-[0_0_18px_rgba(255,255,255,0.18)]" />
        </div>
        <div className="flex flex-col leading-tight min-w-0">
          <h1 className="text-[14px] font-extrabold tracking-tight brand-name leading-tight truncate">
            Nhôm Kính Chí Thành
          </h1>
          <span className="text-[10px] text-sky-300 font-semibold uppercase tracking-wider">
            Phân xưởng · Worker
          </span>
        </div>
      </div>

      {/* Thao tác nhanh */}
      <div className="flex items-center gap-2 relative z-10">
        <button
          className="relative p-2.5 bg-white/5 border border-white/10 rounded-full text-slate-300 hover:bg-white/10 active:scale-95 transition-all"
          title="Thông báo"
          aria-label="Thông báo"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border border-[#0a0a0c] animate-pulse" />
        </button>
      </div>
    </header>
  );
}
