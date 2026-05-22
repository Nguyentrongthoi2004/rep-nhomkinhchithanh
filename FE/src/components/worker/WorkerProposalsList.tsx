/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { workerListCuttingProposals } from "@/lib/api";

type Proposal = {
  madxc: number;
  mapc: number;
  trangthai: string;
  ngaytao: string;
  lydodexuat: string | null;
  admin_ghichu: string | null;
  tonghaohut_moi: number;
  tiletandung_moi: number;
};

export default function WorkerProposalsList({ mapc }: { mapc?: number }) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await workerListCuttingProposals(mapc);
      setProposals(data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [mapc]);

  useEffect(() => {
    load();
  }, [load]);

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "CHO_DUYET": return <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-1 rounded-md text-[10px] font-bold">Chờ duyệt</span>;
      case "DA_DUYET": return <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded-md text-[10px] font-bold">Đã duyệt</span>;
      case "TU_CHOI": return <span className="bg-red-500/15 text-red-300 border border-red-500/30 px-2 py-1 rounded-md text-[10px] font-bold">Từ chối</span>;
      case "HET_HIEU_LUC": return <span className="bg-gray-500/15 text-gray-400 border border-gray-500/30 px-2 py-1 rounded-md text-[10px] font-bold">Hết hiệu lực</span>;
      default: return <span className="text-gray-400 text-[10px]">{st}</span>;
    }
  };

  if (loading) {
    return <div className="py-10 flex justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  if (proposals.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/2 px-5 py-10 text-center text-sm text-slate-500">
        Bạn chưa gửi đề xuất nào.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {proposals.map((p) => (
        <div key={p.madxc} className="bg-black/30 border border-white/5 rounded-2xl p-4 transition-all hover:bg-black/40">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-[11px] font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                  #{p.madxc}
                </span>
                <span className="text-[11px] text-slate-400">{new Date(p.ngaytao).toLocaleString("vi-VN")}</span>
              </div>
            </div>
            {getStatusBadge(p.trangthai)}
          </div>
          
          <div className="mt-3 rounded-lg bg-black/30 p-2.5 text-xs text-slate-300">
            <span className="text-slate-500 block mb-0.5 font-bold">Lý do gửi:</span>
            {p.lydodexuat || <span className="italic opacity-50">Không có lý do</span>}
          </div>

          {p.trangthai === "TU_CHOI" && p.admin_ghichu && (
            <div className="mt-2 rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-200">
              <span className="font-bold flex items-center mb-1"><AlertTriangle className="w-3 h-3 mr-1" /> Admin phản hồi:</span>
              {p.admin_ghichu}
            </div>
          )}

          {p.trangthai === "HET_HIEU_LUC" && (
            <div className="mt-2 rounded-lg bg-gray-500/10 border border-gray-500/20 p-2.5 text-xs text-gray-400">
              Đề xuất này không còn hợp lệ vì sơ đồ gốc đã bị thay đổi.
            </div>
          )}
          
          <div className="mt-3 flex gap-4 text-xs font-mono bg-black/40 p-2 rounded-lg border border-white/5">
            <span className="text-emerald-400">Tận dụng: {p.tiletandung_moi != null ? `${Number(p.tiletandung_moi).toFixed(1)}%` : "—"}</span>
            <span className="text-amber-400">Hao hụt: {p.tonghaohut_moi != null ? `${Math.round(p.tonghaohut_moi)} mm` : "—"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
