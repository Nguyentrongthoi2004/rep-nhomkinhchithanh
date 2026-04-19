"use client";

import { Bell } from "lucide-react";

export default function WorkerHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#0a0a0c]/90 backdrop-blur-md border-b border-white/10 z-50 flex items-center justify-between px-4">
      {/* Title / Logo Area */}
      <div className="flex flex-col">
        <h1 className="text-xl font-bold text-gray-100 tracking-tight">MiniERP</h1>
        <span className="text-[10px] text-blue-400 font-medium uppercase tracking-wider">Phân xưởng</span>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center space-x-2">
        <button className="relative p-2.5 bg-white/5 border border-white/10 rounded-full text-gray-300 hover:bg-white/10 active:scale-95 transition-all">
          <Bell className="w-6 h-6" />
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-[#0a0a0c] animate-pulse"></span>
        </button>
      </div>
    </header>
  );
}
