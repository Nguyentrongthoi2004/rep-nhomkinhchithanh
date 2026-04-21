"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Scissors,
  Loader2,
  ClipboardCheck,
  ArrowRight,
  Play,
  Check,
  RefreshCw,
  User2,
  Calendar,
  Sparkles,
} from "lucide-react";
import { apiJson } from "@/lib/api";

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

type TabKey = "PENDING" | "DOING" | "DONE";

export default function WorkerCatPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [tab, setTab] = useState<TabKey>("PENDING");

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const json = await apiJson<TaskRow[]>("/api/worker/tasks");
      setTasks(json.data || []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const updateStatus = async (mapc: number, trangthai: string) => {
    setActionLoading(mapc);
    try {
      await apiJson(`/api/worker/tasks/${mapc}`, {
        method: "PATCH",
        body: JSON.stringify({ trangthai }),
      });
      fetchTasks();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(null);
    }
  };

  const buckets = useMemo(() => {
    return {
      PENDING: tasks.filter((t) => t.trangthai === "CHO_THUC_HIEN"),
      DOING: tasks.filter((t) => t.trangthai === "DANG_THUC_HIEN"),
      DONE: tasks.filter((t) => t.trangthai === "HOAN_THANH"),
    };
  }, [tasks]);

  const current = buckets[tab];

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl admin-metal-panel border border-white/10 px-5 py-5">
        <div className="admin-metal-shine" />
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Khu vực máy cắt
            </div>
            <h2 className="text-xl font-extrabold brand-name mt-1 leading-tight">Công việc của bạn</h2>
            <p className="text-xs text-slate-400 mt-1">
              Bắt đầu / hoàn thành các phân công được giao.
            </p>
          </div>
          <button
            onClick={fetchTasks}
            className="shrink-0 w-11 h-11 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-200 hover:bg-amber-400/25 active:scale-95 transition"
            title="Làm mới"
            aria-label="Làm mới"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </section>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0a0a0c] border border-white/10 rounded-2xl">
        <TabButton active={tab === "PENDING"} onClick={() => setTab("PENDING")} label="Chờ" count={buckets.PENDING.length} tone="sky" />
        <TabButton active={tab === "DOING"} onClick={() => setTab("DOING")} label="Đang làm" count={buckets.DOING.length} tone="amber" />
        <TabButton active={tab === "DONE"} onClick={() => setTab("DONE")} label="Xong" count={buckets.DONE.length} tone="emerald" />
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300">
          {errorMsg}
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-14 flex justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : current.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/2 px-5 py-10 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-slate-400" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-300">
              {tab === "PENDING" && "Chưa có việc nào đang chờ."}
              {tab === "DOING" && "Bạn chưa bắt đầu việc nào."}
              {tab === "DONE" && "Chưa có việc nào hoàn thành."}
            </p>
          </div>
        ) : (
          current.map((t) => (
            <TaskCard
              key={t.mapc}
              task={t}
              loading={actionLoading === t.mapc}
              onStart={() => updateStatus(t.mapc, "DANG_THUC_HIEN")}
              onDone={() => updateStatus(t.mapc, "HOAN_THANH")}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  tone: "sky" | "emerald" | "amber";
}) {
  const activeCls = {
    sky: "bg-sky-500/15 text-sky-200 border-sky-500/40",
    emerald: "bg-emerald-500/15 text-emerald-200 border-emerald-500/40",
    amber: "bg-amber-500/15 text-amber-200 border-amber-500/40",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-bold border transition-colors ${
        active ? activeCls : "border-transparent text-slate-400 hover:bg-white/5"
      }`}
    >
      {label}
      <span
        className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
          active ? "bg-white/10" : "bg-white/5"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function TaskCard({
  task,
  loading,
  onStart,
  onDone,
}: {
  task: TaskRow;
  loading: boolean;
  onStart: () => void;
  onDone: () => void;
}) {
  const isDoing = task.trangthai === "DANG_THUC_HIEN";
  const isDone = task.trangthai === "HOAN_THANH";
  const date = task.donhang?.ngaytao ? new Date(task.donhang.ngaytao) : null;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 shadow-lg ${
        isDone
          ? "border-emerald-500/20 bg-emerald-500/4"
          : isDoing
          ? "border-amber-500/25 bg-amber-500/4"
          : "border-white/10 bg-[#10131a]/85"
      }`}
    >
      {/* Header strip */}
      <div
        className={`absolute top-0 left-0 h-1 w-full ${
          isDone ? "bg-emerald-400" : isDoing ? "bg-amber-400" : "bg-sky-500/60"
        }`}
        aria-hidden
      />

      <div className="flex items-start justify-between gap-3 pt-1">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 bg-black/40 px-2 py-0.5 rounded-md border border-white/5">
              PC-{task.mapc}
            </span>
            <span className="text-[11px] font-mono text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20">
              DH-{task.donhang?.madh ?? "?"}
            </span>
          </div>
          <h4 className="text-slate-100 font-bold text-[15px] mt-2 truncate flex items-center gap-1.5">
            <User2 className="w-4 h-4 text-slate-400 shrink-0" />
            {task.donhang?.khachhang?.hoten || "Khách lẻ"}
          </h4>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
            {date && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {date.toLocaleDateString("vi-VN")}
              </span>
            )}
            <span>
              ĐH: <span className="text-slate-300 font-semibold">{task.donhang?.trangthai || "—"}</span>
            </span>
          </div>
        </div>
        <StatusTag status={task.trangthai} />
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        {loading ? (
          <div className="flex-1 flex justify-center py-2.5 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <>
            {!isDoing && !isDone && (
              <button
                onClick={onStart}
                className="flex-1 h-11 rounded-xl bg-linear-to-br from-sky-500 to-sky-700 hover:from-sky-400 hover:to-sky-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[0_8px_24px_-10px_rgba(14,165,233,0.55)] transition-all active:scale-[0.98]"
              >
                <Play className="w-4 h-4" /> Bắt đầu
              </button>
            )}
            {isDoing && (
              <button
                onClick={onStart}
                className="h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/10 active:scale-[0.98]"
              >
                Đang làm...
              </button>
            )}
            {!isDone && (
              <button
                onClick={onDone}
                className="flex-1 h-11 rounded-xl bg-linear-to-br from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[0_8px_24px_-10px_rgba(16,185,129,0.55)] transition-all active:scale-[0.98]"
              >
                <Check className="w-4 h-4" /> Hoàn thành
              </button>
            )}
            {isDone && (
              <div className="flex-1 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm font-bold flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> Đã hoàn thành
              </div>
            )}
            <button
              className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 text-slate-300 flex items-center justify-center hover:bg-white/10 active:scale-95"
              title="Mở chi tiết"
              aria-label="Mở chi tiết"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function StatusTag({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; Icon: typeof Scissors }> = {
    CHO_THUC_HIEN: { label: "Chờ", cls: "bg-sky-500/15 text-sky-300 border-sky-500/30", Icon: ClipboardCheck },
    DANG_THUC_HIEN: { label: "Đang làm", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30", Icon: Scissors },
    HOAN_THANH: { label: "Xong", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", Icon: Check },
  };
  const m = map[status] || { label: status, cls: "bg-white/5 text-slate-300 border-white/10", Icon: ClipboardCheck };
  const Icon = m.Icon;
  return (
    <span
      className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${m.cls}`}
    >
      <Icon className="w-3 h-3" /> {m.label}
    </span>
  );
}
