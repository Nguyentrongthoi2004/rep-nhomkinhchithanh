"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Play, RefreshCw, Ruler, Scissors } from "lucide-react";
import { apiData } from "@/lib/api";

type AssignmentRow = {
  mapc: number;
  trangthai: string;
  donhang: { madh: number; khachhang: { hoten: string } | null; trangthai: string } | null;
  nguoidung: { hoten: string } | null;
};

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
  chitietcat: CutDetail[];
};

export default function CuttingOptimizationPage() {
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [plans, setPlans] = useState<CuttingPlan[]>([]);
  const [selectedMapc, setSelectedMapc] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [assignmentRows, planRows] = await Promise.all([
        apiData<AssignmentRow[]>("/api/admin/assignments"),
        apiData<CuttingPlan[]>("/api/admin/cutting-plans"),
      ]);
      setAssignments(assignmentRows);
      setPlans(planRows);
      setSelectedMapc((p) => p || assignmentRows[0]?.mapc || 0);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedPlans = useMemo(() => plans.filter((plan) => plan.mapc === selectedMapc), [plans, selectedMapc]);

  const generate = async () => {
    if (!selectedMapc) return;
    setGenerating(true);
    try {
      const created = await apiData<CuttingPlan[]>("/api/admin/cutting-plans", {
        method: "POST",
        body: JSON.stringify({ mapc: selectedMapc }),
      });
      setPlans((current) => [...current.filter((plan) => plan.mapc !== selectedMapc), ...created]);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="admin-metal-panel border border-white/10 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="admin-metal-shine" />
        <div className="relative z-10">
          <h1 className="text-xl md:text-2xl font-bold text-gray-100 flex items-center">
            <Scissors className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 text-red-400" /> Toi uu cat vat tu
          </h1>
          <p className="text-xs md:text-sm text-gray-400 mt-1 ml-7 md:ml-9">Lay BOM tu don da phan cong va kho phoi that, sau do luu vao sodocat/chitietcat.</p>
        </div>
        <button onClick={load} className="relative z-10 p-2 md:p-3 self-end md:self-auto -mt-12 md:mt-0 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10" title="Tai lai" aria-label="Tai lai">
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {errorMsg && <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-sm">{errorMsg}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        <section className="xl:col-span-1 bg-[#0a0a0c] border border-white/5 rounded-2xl p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-4">Phan cong</h2>
          {loading ? (
            <div className="py-10 flex justify-center text-gray-400"><Loader2 className="w-7 h-7 animate-spin" /></div>
          ) : (
            <div className="space-y-2">
              {assignments.map((item) => (
                <button
                  key={item.mapc}
                  onClick={() => setSelectedMapc(item.mapc)}
                  className={`w-full text-left rounded-xl border p-3 transition-colors ${selectedMapc === item.mapc ? "border-red-400/40 bg-red-500/10" : "border-white/10 bg-white/3 hover:bg-white/5"}`}
                >
                  <div className="text-sm font-bold text-gray-100">PC-{item.mapc} / DH-{item.donhang?.madh}</div>
                  <div className="text-xs text-gray-400 mt-1">{item.donhang?.khachhang?.hoten || "Khach hang"} - {item.nguoidung?.hoten || "Tho"}</div>
                  <div className="text-[10px] text-gray-500 mt-1">{item.trangthai}</div>
                </button>
              ))}
              {assignments.length === 0 && <div className="text-sm text-gray-500 text-center py-8">Chua co phan cong.</div>}
            </div>
          )}

          <button
            onClick={generate}
            disabled={!selectedMapc || generating}
            className="mt-5 w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl py-3 font-bold flex items-center justify-center"
          >
            {generating ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Play className="w-5 h-5 mr-2" />} Tao so do cat
          </button>
        </section>

        <section className="xl:col-span-3 bg-[#0a0a0c] border border-white/5 rounded-2xl p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center mb-6">
            <Ruler className="w-4 h-4 mr-2 text-blue-300" /> So do da luu
          </h2>

          {selectedPlans.length === 0 ? (
            <div className="h-40 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-gray-500">
              Chua co so do cat cho phan cong nay.
            </div>
          ) : (
            <div className="space-y-5">
              {selectedPlans.map((plan) => {
                const stockLength = plan.khothanhphoi?.chieudaihientai || plan.khothanhphoi?.chieudaibandau || 1;
                const used = plan.chitietcat.reduce((sum, cut) => sum + cut.chieudaicat, 0);
                return (
                  <div key={plan.masdc} className="rounded-2xl border border-white/10 bg-white/3 p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="text-sm font-bold text-gray-100">SDC-{plan.masdc} / UID-{plan.khothanhphoi?.maphoi}</div>
                        <div className="text-xs text-gray-400 mt-1">{plan.khothanhphoi?.vattu?.tenvt || "Vat tu"} - con {stockLength}mm</div>
                      </div>
                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${plan.trangthai === "HOAN_THANH" ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-blue-500/10 text-blue-300 border-blue-500/20"}`}>
                        {plan.trangthai}
                      </span>
                    </div>
                    <div className="h-14 bg-[#15171d] rounded-xl border border-white/10 overflow-x-auto overflow-y-hidden flex">
                      {plan.chitietcat.map((cut) => (
                        <div
                          key={cut.mactc}
                          /* webhint-disable no-inline-styles */
                          style={{ width: `${Math.max(2, (cut.chieudaicat / stockLength) * 100)}%` }}
                          className="h-full bg-blue-500/70 border-r border-black/40 flex items-center justify-center text-[10px] font-bold text-white min-w-[28px]"
                          title={`${cut.chitietdh?.mota || cut.chitietdh?.vattu?.tenvt || "Chi tiet"} - ${cut.chieudaicat}mm`}
                        >
                          {cut.chieudaicat}
                        </div>
                      ))}
                      <div className="flex-1 bg-amber-500/20 text-[10px] text-amber-200 flex items-center justify-center">
                        du {Math.max(0, stockLength - used)}mm
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {plan.chitietcat.map((cut) => (
                        <div key={cut.mactc} className="text-xs text-gray-300 bg-black/20 rounded-lg px-3 py-2 flex items-center justify-between">
                          <span>{cut.thutucat}. {cut.chitietdh?.mota || cut.chitietdh?.vattu?.tenvt || "Chi tiet"}</span>
                          <span className="font-mono text-blue-300">{cut.chieudaicat}mm</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedPlans.length > 0 && (
            <div className="mt-6 text-sm text-emerald-300 flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2" /> Worker se thay cac so do nay o man hinh May cat.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
