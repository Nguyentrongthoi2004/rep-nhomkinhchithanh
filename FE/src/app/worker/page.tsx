"use client";

import { QrCode, ClipboardCheck, ArrowRight, AlertTriangle, FileText, CheckCircle2, TrendingUp, XCircle } from "lucide-react";

export default function WorkerDashboard() {
  return (
    <div className="space-y-6 relative z-10">
      
      {/* Hello Section */}
      <div className="bg-gradient-to-br from-blue-900/40 to-slate-900/80 p-5 rounded-2xl border border-blue-500/20 backdrop-blur-sm shadow-lg">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-100">Xin chào, Văn A</h2>
            <p className="text-gray-400 mt-1 text-sm">Hôm nay bạn có <strong className="text-blue-400">3</strong> nhiệm vụ cần cắt.</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-blue-300 bg-blue-900/50 px-2 py-1 rounded-md border border-blue-500/30">Ca Sáng</span>
          </div>
        </div>

        {/* Worker Mini Stats */}
        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-white/5">
          <div className="text-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Đã cắt</p>
            <p className="text-lg font-bold text-white">45 <span className="text-xs text-gray-500 font-normal">phôi</span></p>
          </div>
          <div className="text-center border-l border-white/5">
            <TrendingUp className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Năng suất</p>
            <p className="text-lg font-bold text-white">92<span className="text-xs text-gray-500 font-normal">%</span></p>
          </div>
          <div className="text-center border-l border-white/5">
            <XCircle className="w-5 h-5 text-red-400 mx-auto mb-1" />
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Cắt hỏng</p>
            <p className="text-lg font-bold text-white">0 <span className="text-xs text-gray-500 font-normal">phôi</span></p>
          </div>
        </div>
      </div>

      {/* Primary Action Button (Extra Large for Dirty Hands) */}
      <button className="w-full bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 active:scale-[0.98] transition-all duration-300 rounded-3xl p-6 shadow-[0_10px_40px_-10px_rgba(37,99,235,0.6)] border border-blue-400/50 flex flex-col justify-center items-center group relative overflow-hidden">
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out"></div>

        <div className="bg-white/20 p-4 rounded-2xl mb-3 shadow-inner">
          <QrCode className="w-12 h-12 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-1 tracking-tight">Quét Tem Khung</h3>
        <p className="text-blue-100 text-sm font-medium">Bấm để dùng Camera</p>
      </button>

      {/* Ongoing Tasks */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-200 flex items-center">
            <ClipboardCheck className="w-5 h-5 mr-2 text-emerald-400" />
            Đơn đang đợi gia công
          </h3>
          <span className="text-sm font-bold text-white bg-blue-500 px-2.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]">3</span>
        </div>

        <div className="space-y-4">
          {/* Task 1 */}
          <div className="bg-[#111318] border border-white/10 rounded-2xl p-4 active:bg-white/5 transition-colors relative overflow-hidden shadow-lg">
            {/* Progress Bar Background */}
            <div className="absolute top-0 left-0 h-1 bg-white/5 w-full">
              <div className="h-full bg-emerald-500 w-[60%]"></div>
            </div>

            <div className="flex justify-between items-start mb-3 pt-1">
              <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[inset_0_0_8px_rgba(59,130,246,0.2)]">
                {/* SVG Silhouette Phôi Nhôm Cắt Ngang */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400">
                  <path d="M4 4h16v4H4zM10 8v8M14 8v8M4 16h16v4H4z"/>
                </svg>
                Hệ 55 (DH-0012)
              </span>
              <span className="text-xs font-bold text-gray-400 bg-black/50 px-2 py-1 rounded-md border border-white/5">Hạn: 16:30</span>
            </div>
            
            <h4 className="text-gray-100 font-bold text-lg leading-tight">Cửa sổ 2 cánh mở quay</h4>
            
            <div className="flex justify-between items-end mt-2">
              <p className="text-gray-400 text-sm">Đã cắt: <strong className="text-emerald-400">3</strong> / 5 nhát</p>
              <p className="text-gray-500 text-xs font-mono">TL: 2 thanh</p>
            </div>
            
            <button className="w-full mt-4 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-bold py-3.5 rounded-xl flex items-center justify-center transition-colors border border-white/10 shadow-sm">
              Tiếp tục cắt <ArrowRight className="w-5 h-5 ml-2 text-emerald-400" />
            </button>
          </div>

          {/* Task 2 */}
          <div className="bg-[#111318] border border-white/5 rounded-2xl p-4 opacity-75">
             <div className="flex justify-between items-start mb-2">
              <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                <AlertTriangle className="w-3.5 h-3.5" /> DH-0010
              </span>
            </div>
            <h4 className="text-gray-300 font-bold text-lg leading-tight mb-1">Vách kính cố định 10mm cường lực</h4>
            <div className="flex items-center text-sm text-gray-500 mt-2">
              <div className="w-2 h-2 rounded-full bg-orange-500 mr-2"></div> Đang chờ vật tư Kính về kho
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
