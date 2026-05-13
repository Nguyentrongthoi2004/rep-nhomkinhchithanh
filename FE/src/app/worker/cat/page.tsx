"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2, RefreshCw, Ruler, Scissors, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { apiData, apiJson } from "@/lib/api";

type CutDetail = {
  mactc: number;
  thutucat: number;
  chieudaicat: number;
  trangthai: string;
  chitietdh: { mota: string | null; vattu: { tenvt: string } | null } | null;
};

type CuttingPlan = {
  masdc: number;
  mapc: number;
  trangthai: string;
  khothanhphoi: {
    maphoi: number;
    chieudaibandau: number;
    chieudaihientai: number;
    vattu: { tenvt: string } | null;
  } | null;
  phancong: {
    donhang: { madh: number; khachhang: { hoten: string } | null } | null;
  } | null;
  chitietcat: CutDetail[];
};

function WorkerCatPageInner() {
  const searchParams = useSearchParams();
  const mapcFilter = Number(searchParams.get("mapc") || "0");
  const [plans, setPlans] = useState<CuttingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [reportPlan, setReportPlan] = useState<CuttingPlan | null>(null);
  const [note, setNote] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      setPlans(await apiData<CuttingPlan[]>("/api/worker/cutting-plans"));
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const complete = async (id: number) => {
    if (!confirm(`Xác nhận hoàn thành SDC-${id}? Kho phôi sẽ được trừ chiều dài thật.`)) return;
    setBusyId(id);
    try {
      await apiJson(`/api/worker/cutting-plans/${id}/complete`, { method: "POST" });
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const report = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reportPlan || !note.trim()) return;
    setBusyId(reportPlan.masdc);
    try {
      await apiJson(`/api/worker/cutting-plans/${reportPlan.masdc}/report`, {
        method: "POST",
        body: JSON.stringify({ ghichu: note }),
      });
      setReportPlan(null);
      setNote("");
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4 pb-6 px-5 pt-6">
      <section className="relative overflow-hidden rounded-3xl admin-metal-panel border border-white/10 px-5 py-5">
        <div className="admin-metal-shine" />
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-amber-300" /> Máy cắt
            </div>
            <h2 className="text-xl font-extrabold brand-name mt-1 leading-tight">Sơ đồ cắt được giao</h2>
            <p className="text-xs text-slate-400 mt-1">Cắt theo từng UID. Hoàn thành sẽ cập nhật kho phôi và nhật ký gia công.</p>
          </div>
          <button
            onClick={load}
            className="w-11 h-11 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-200"
            title="Tải lại"
            aria-label="Tải lại"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </section>

      {errorMsg && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300">{errorMsg}</div>}

      <div className="space-y-3">
        {loading ? (
          <div className="py-14 flex justify-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : plans.filter((p) => (mapcFilter ? p.mapc === mapcFilter : true)).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/2 px-5 py-10 text-center text-sm text-slate-500">
            {mapcFilter ? `Chưa có sơ đồ cắt cho PC-${mapcFilter}.` : "Chưa có sơ đồ cắt nào được giao."}
          </div>
        ) : (
          plans
            .filter((plan) => (mapcFilter ? plan.mapc === mapcFilter : true))
            .map((plan) => {
            const stockLength = plan.khothanhphoi?.chieudaihientai || plan.khothanhphoi?.chieudaibandau || 1;
            const used = plan.chitietcat.reduce((sum, cut) => sum + cut.chieudaicat, 0);
            const isDone = plan.trangthai === "HOAN_THANH";
            return (
              <div key={plan.masdc} className={`rounded-2xl border p-4 ${isDone ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/10 bg-[#10131a]/85"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-mono text-sky-300">SDC-{plan.masdc} / UID-{plan.khothanhphoi?.maphoi}</div>
                    <h3 className="text-sm font-bold text-slate-100 mt-1">DH-{plan.phancong?.donhang?.madh} - {plan.phancong?.donhang?.khachhang?.hoten || "Khách hàng"}</h3>
                    <p className="text-xs text-slate-400 mt-1">{plan.khothanhphoi?.vattu?.tenvt || "Vật tư"} - còn {stockLength}mm</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${isDone ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-sky-500/15 text-sky-300 border-sky-500/30"}`}>
                    {plan.trangthai}
                  </span>
                </div>

                <div className="mt-4 h-14 bg-[#15171d] rounded-xl border border-white/10 overflow-hidden flex">
                  {plan.chitietcat.map((cut) => (
                    <div
                      key={cut.mactc}
                      style={{ width: `${Math.max(4, (cut.chieudaicat / stockLength) * 100)}%` }}
                      className={`h-full border-r border-black/40 flex items-center justify-center text-[10px] font-bold text-white min-w-[34px] ${cut.trangthai === "DA_CAT" ? "bg-emerald-500/70" : "bg-blue-500/70"}`}
                    >
                      {cut.chieudaicat}
                    </div>
                  ))}
                  <div className="flex-1 bg-amber-500/20 text-[10px] text-amber-200 flex items-center justify-center">
                    dư {Math.max(0, stockLength - used)}mm
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {plan.chitietcat.map((cut) => (
                    <div key={cut.mactc} className="text-xs text-slate-300 bg-black/20 rounded-lg px-3 py-2 flex items-center justify-between">
                      <span>{cut.thutucat}. {cut.chitietdh?.mota || cut.chitietdh?.vattu?.tenvt || "Chi tiết"}</span>
                      <span className="font-mono text-sky-300 inline-flex items-center"><Ruler className="w-3 h-3 mr-1" />{cut.chieudaicat}mm</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex gap-2">
                  {!isDone && (
                    <button onClick={() => complete(plan.masdc)} disabled={busyId === plan.masdc} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-2.5 text-sm font-bold flex items-center justify-center disabled:opacity-60">
                      {busyId === plan.masdc ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />} Hoàn thành cắt
                    </button>
                  )}
                  {!isDone && (
                    <button onClick={() => setReportPlan(plan)} className="px-4 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 rounded-xl text-sm font-bold flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-2" /> Sự cố
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {reportPlan && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center p-4 pb-[80px]">
          <form onSubmit={report} className="w-full max-w-sm bg-[#12141a] border border-white/10 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">Báo cáo sự cố SDC-{reportPlan.masdc}</h3>
              <button type="button" onClick={() => setReportPlan(null)} className="text-slate-400" title="Đóng" aria-label="Đóng"><X className="w-5 h-5" /></button>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              className="w-full bg-[#030508] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-red-400 resize-none"
              placeholder="Mô tả lỗi: phôi cong, cắt sai kích thước, gãy kính..."
              required
            />
            <button disabled={busyId === reportPlan.masdc} className="mt-4 w-full bg-red-600 hover:bg-red-500 text-white rounded-xl py-2.5 font-bold flex items-center justify-center">
              {busyId === reportPlan.masdc ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <AlertTriangle className="w-4 h-4 mr-2" />} Gửi báo cáo
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function WorkerCatPage() {
  return (
    <Suspense fallback={null}>
      <WorkerCatPageInner />
    </Suspense>
  );
}
