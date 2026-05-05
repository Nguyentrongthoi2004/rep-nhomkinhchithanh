"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ClipboardCheck, Loader2, Package, Play, RefreshCw, Ruler } from "lucide-react";
import { apiData, apiJson } from "@/lib/api";

type Task = {
  mapc: number;
  madh: number;
  trangthai: "CHO_THUC_HIEN" | "DANG_THUC_HIEN" | "HOAN_THANH";
  donhang: {
    madh: number;
    ngaytao: string;
    trangthai: string;
    khachhang: { hoten: string } | null;
    chitietdh: {
      mactdh: number;
      mota: string | null;
      chieudaicat: number | null;
      soluong: number;
      vattu: { tenvt: string; donvitinh: string } | null;
    }[];
  } | null;
};

type TabKey = "CHO_THUC_HIEN" | "DANG_THUC_HIEN" | "HOAN_THANH";

export default function WorkerTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [tab, setTab] = useState<TabKey>("CHO_THUC_HIEN");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      setTasks(await apiData<Task[]>("/api/worker/tasks"));
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const buckets = useMemo(() => ({
    CHO_THUC_HIEN: tasks.filter((t) => t.trangthai === "CHO_THUC_HIEN"),
    DANG_THUC_HIEN: tasks.filter((t) => t.trangthai === "DANG_THUC_HIEN"),
    HOAN_THANH: tasks.filter((t) => t.trangthai === "HOAN_THANH"),
  }), [tasks]);

  const updateStatus = async (mapc: number, trangthai: Task["trangthai"]) => {
    setBusyId(mapc);
    try {
      await apiJson(`/api/worker/tasks/${mapc}`, {
        method: "PATCH",
        body: JSON.stringify({ trangthai }),
      });
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const current = buckets[tab];

  return (
    <div className="space-y-4 pb-6 px-5 pt-6">
      <section className="relative overflow-hidden rounded-3xl admin-metal-panel border border-white/10 px-5 py-5">
        <div className="admin-metal-shine" />
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 flex items-center gap-1.5">
              <ClipboardCheck className="w-3.5 h-3.5 text-amber-300" /> Nhiệm vụ
            </div>
            <h2 className="text-xl font-extrabold brand-name mt-1 leading-tight">Công việc của bạn</h2>
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

      <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0a0a0c] border border-white/10 rounded-2xl">
        <TabButton active={tab === "CHO_THUC_HIEN"} onClick={() => setTab("CHO_THUC_HIEN")} label="Chờ" count={buckets.CHO_THUC_HIEN.length} />
        <TabButton active={tab === "DANG_THUC_HIEN"} onClick={() => setTab("DANG_THUC_HIEN")} label="Đang làm" count={buckets.DANG_THUC_HIEN.length} />
        <TabButton active={tab === "HOAN_THANH"} onClick={() => setTab("HOAN_THANH")} label="Xong" count={buckets.HOAN_THANH.length} />
      </div>

      {errorMsg && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300">{errorMsg}</div>}

      <div className="space-y-3">
        {loading ? (
          <div className="py-14 flex justify-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : current.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/2 px-5 py-10 text-center text-sm text-slate-500">
            Không có việc trong nhóm này.
          </div>
        ) : (
          current.map((task) => (
            <div key={task.mapc} className="rounded-2xl border border-white/10 bg-[#10131a]/85 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-400 bg-black/40 px-2 py-0.5 rounded-md border border-white/5">PC-{task.mapc}</span>
                    <span className="text-[11px] font-mono text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20">DH-{task.donhang?.madh ?? task.madh}</span>
                  </div>
                  <h3 className="text-slate-100 font-bold text-[15px] mt-2">{task.donhang?.khachhang?.hoten || "Khách hàng"}</h3>
                  <p className="text-xs text-slate-500 mt-1">{task.donhang?.chitietdh?.length || 0} hạng mục BOM</p>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-1 rounded border bg-sky-500/15 text-sky-300 border-sky-500/30">{task.trangthai}</span>
              </div>

              {expanded === task.mapc && (
                <div className="mt-4 border-t border-white/5 pt-3 space-y-2">
                  {task.donhang?.chitietdh.map((item, index) => (
                    <div key={item.mactdh} className="text-xs text-slate-300 bg-black/20 rounded-lg px-3 py-2 flex items-center justify-between">
                      <span>{index + 1}. {item.mota || item.vattu?.tenvt || "Chi tiết"}</span>
                      <span className="font-mono text-sky-300 inline-flex items-center">
                        {item.chieudaicat && <><Ruler className="w-3 h-3 mr-1" />{item.chieudaicat}mm</>}
                        <span className="ml-2 text-slate-500">x{item.soluong}</span>
                      </span>
                    </div>
                  ))}
                  {(task.donhang?.chitietdh.length || 0) === 0 && <div className="text-xs text-slate-500">Đơn này chưa có BOM.</div>}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button onClick={() => setExpanded(expanded === task.mapc ? null : task.mapc)} className="h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/10">
                  <Package className="w-4 h-4 inline mr-2" /> BOM
                </button>
                {task.trangthai === "CHO_THUC_HIEN" && (
                  <button onClick={() => updateStatus(task.mapc, "DANG_THUC_HIEN")} disabled={busyId === task.mapc} className="flex-1 h-11 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm flex items-center justify-center">
                    {busyId === task.mapc ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />} Bắt đầu
                  </button>
                )}
                {task.trangthai !== "HOAN_THANH" && (
                  <button onClick={() => updateStatus(task.mapc, "HOAN_THANH")} disabled={busyId === task.mapc} className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center">
                    {busyId === task.mapc ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />} Hoàn thành
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-bold border transition-colors ${
        active ? "bg-sky-500/15 text-sky-200 border-sky-500/40" : "border-transparent text-slate-400 hover:bg-white/5"
      }`}
    >
      {label}
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${active ? "bg-white/10" : "bg-white/5"}`}>{count}</span>
    </button>
  );
}
