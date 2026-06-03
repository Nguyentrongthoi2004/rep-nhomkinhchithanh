/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useState, useContext } from "react";
import type { FormEvent } from "react";
import { AlertTriangle, Camera, Check, ClipboardCheck, Loader2, Package, Play, RefreshCw, Ruler, X, XCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { apiData, apiJson } from "@/lib/api";
import { fileToCompressedImage } from "@/lib/image-upload";
import { WorkerViewContext } from "../context";

type TaskStatus = "CHO_THUC_HIEN" | "DANG_THUC_HIEN" | "HOAN_THANH";

type CuttingProgress = {
  total: number;
  completed: number;
  withCutPhotos: number;
  missingCount: number;
  missingMasdcs: number[];
  readyForCompletion: boolean;
  hasCompletionPhoto: boolean;
};

type Task = {
  mapc: number;
  madh: number;
  trangthai: TaskStatus;
  cuttingProgress?: CuttingProgress;
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

type TabKey = TaskStatus;

const REJECT_REASONS = [
  { value: "DANG_BAN", label: "Đang bận việc khác" },
  { value: "KHONG_PHU_HOP_TAY_NGHE", label: "Tay nghề chưa khớp" },
  { value: "KHONG_THUAN_TIEN_THAO_TAC", label: "Thiếu thiết bị lắp đặt" },
  { value: "THIEU_THONG_TIN_SO_DO_CAT", label: "Sơ đồ cắt bị lỗi/thiếu" },
  { value: "LY_DO_KHAC", label: "Lý do khác" },
] as const;

const NOTE_CHIPS = [
  "Đã gia công hoàn thiện, lắp ráp hoàn chỉnh.",
  "Khách đã nghiệm thu và ký biên bản nhận hàng.",
  "Đã giao toàn bộ đơn hàng cho bên vận chuyển.",
  "Mọi chi tiết lắp ráp khớp hoàn toàn.",
];

const STATUS_LABEL: Record<TaskStatus, string> = {
  CHO_THUC_HIEN: "Chờ nhận",
  DANG_THUC_HIEN: "Đang làm",
  HOAN_THANH: "Đã xong",
};

export default function WorkerTasksPage() {
  const { viewMode } = useContext(WorkerViewContext);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [tab, setTab] = useState<TabKey>("CHO_THUC_HIEN");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [rejectTask, setRejectTask] = useState<Task | null>(null);
  const [completionTask, setCompletionTask] = useState<Task | null>(null);
  const [completionBlob, setCompletionBlob] = useState<Blob | null>(null);
  const [completionPreview, setCompletionPreview] = useState("");
  const [completionNote, setCompletionNote] = useState("");
  const [rejectReason, setRejectReason] = useState<(typeof REJECT_REASONS)[number]["value"]>("DANG_BAN");
  const [rejectNote, setRejectNote] = useState("");
  const [focusMapc, setFocusMapc] = useState<number | null>(null);

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mapc = Number(params.get("mapc") || 0);
    setFocusMapc(Number.isFinite(mapc) && mapc > 0 ? mapc : null);
  }, []);

  const buckets = useMemo(() => ({
    CHO_THUC_HIEN: tasks.filter((t) => t.trangthai === "CHO_THUC_HIEN"),
    DANG_THUC_HIEN: tasks.filter((t) => t.trangthai === "DANG_THUC_HIEN"),
    HOAN_THANH: tasks.filter((t) => t.trangthai === "HOAN_THANH"),
  }), [tasks]);

  useEffect(() => {
    if (!focusMapc || tasks.length === 0) return;
    const focusedTask = tasks.find((task) => task.mapc === focusMapc);
    if (!focusedTask) return;
    setTab(focusedTask.trangthai);
    setExpanded(focusedTask.mapc);
  }, [focusMapc, tasks]);

  const updateStatus = async (mapc: number, trangthai: TaskStatus) => {
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

  const openReject = (task: Task) => {
    setRejectTask(task);
    setRejectReason("DANG_BAN");
    setRejectNote("");
  };

  const openCompletionPhoto = (task: Task) => {
    if (!task.cuttingProgress?.readyForCompletion) {
      const missingCount = task.cuttingProgress?.missingCount ?? 0;
      setErrorMsg(`Còn ${missingCount} phôi/sơ đồ chưa có ảnh xác nhận cắt. Vui lòng hoàn tất trước khi xác nhận công trình.`);
      return;
    }
    setCompletionTask(task);
    setCompletionBlob(null);
    setCompletionPreview("");
    setCompletionNote("");
  };

  const handleCompletionFile = async (file?: File | null) => {
    if (!file) return;
    try {
      const image = await fileToCompressedImage(file);
      setCompletionBlob(image.blob);
      setCompletionPreview(image.dataUrl);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const submitCompletionPhoto = async (event: FormEvent) => {
    event.preventDefault();
    if (!completionTask || !completionBlob) return;
    const uploadController = new AbortController();
    const uploadTimer = window.setTimeout(() => uploadController.abort(), 45000);
    let submitStage: "upload" | "complete" = "upload";
    setBusyId(completionTask.mapc);
    try {
      const formData = new FormData();
      formData.set("image", completionBlob, `pc-${completionTask.mapc}.jpg`);
      formData.set("loaianh", "HOAN_THANH_CONG_TRINH");
      formData.set("madh", String(completionTask.donhang?.madh ?? completionTask.madh));
      formData.set("mapc", String(completionTask.mapc));
      formData.set("mota", completionNote.trim() || `Ảnh hoàn thành công trình DH-${completionTask.donhang?.madh ?? completionTask.madh}`);

      await apiJson("/api/worker/images/upload-file", {
        method: "POST",
        signal: uploadController.signal,
        body: formData,
      });
      if (completionTask.trangthai !== "HOAN_THANH") {
        submitStage = "complete";
        await apiJson(`/api/worker/tasks/${completionTask.mapc}`, {
          method: "PATCH",
          body: JSON.stringify({ trangthai: "HOAN_THANH" }),
        });
      }
      setCompletionTask(null);
      setCompletionBlob(null);
      setCompletionPreview("");
      setCompletionNote("");
      await load();
    } catch (err: unknown) {
      const friendlyMessage =
        err instanceof DOMException && err.name === "AbortError"
          ? "Upload ảnh quá lâu. Hãy kiểm tra kết nối mạng."
          : err instanceof Error
            ? err.message
            : String(err);
      setErrorMsg(
        submitStage === "complete"
          ? `Ảnh đã gửi được nhưng chưa cập nhật hoàn thành: ${friendlyMessage}`
          : `Gửi ảnh thất bại: ${friendlyMessage}`,
      );
    } finally {
      window.clearTimeout(uploadTimer);
      setBusyId(null);
    }
  };

  const submitReject = async (event: FormEvent) => {
    event.preventDefault();
    if (!rejectTask) return;
    setBusyId(rejectTask.mapc);
    try {
      await apiJson(`/api/worker/tasks/${rejectTask.mapc}/reject`, {
        method: "POST",
        body: JSON.stringify({ lydo: rejectReason, ghichu: rejectNote }),
      });
      setRejectTask(null);
      setRejectNote("");
      setTab("CHO_THUC_HIEN");
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const current = buckets[tab];
  const priorityTask = buckets.DANG_THUC_HIEN[0] || buckets.CHO_THUC_HIEN[0] || null;

  return (
    <div className={`mx-auto pb-28 ${viewMode === "pc" ? "w-full max-w-[1120px] px-6 pt-7" : "w-full max-w-md px-4 pt-5"}`}>
      <section className={`relative overflow-hidden border border-slate-800 bg-[#0d1118] shadow-sm mb-5 ${viewMode === "pc" ? "rounded-2xl px-5 py-4" : "rounded-3xl px-5 py-4"}`}>
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
              <ClipboardCheck className="w-4 h-4 text-blue-400" /> Phân Công Công Việc
            </div>
            <h2 className={`${viewMode === "pc" ? "text-2xl" : "text-xl"} font-black text-white mt-1 leading-tight tracking-tight`}>Nhiệm vụ của bạn</h2>
          </div>
          <button
            onClick={load}
            className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-gray-300 transition-colors"
            title="Tải lại"
            aria-label="Tải lại"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </section>

      {/* Tabs Switcher */}
      <div className={`grid grid-cols-3 gap-1.5 border border-slate-800 bg-[#0b0e13] mb-5 ${viewMode === "pc" ? "max-w-xl rounded-xl p-1" : "rounded-2xl p-1.5"}`}>
        <TabButton active={tab === "CHO_THUC_HIEN"} onClick={() => setTab("CHO_THUC_HIEN")} label="Chờ nhận" count={buckets.CHO_THUC_HIEN.length} />
        <TabButton active={tab === "DANG_THUC_HIEN"} onClick={() => setTab("DANG_THUC_HIEN")} label="Đang làm" count={buckets.DANG_THUC_HIEN.length} />
        <TabButton active={tab === "HOAN_THANH"} onClick={() => setTab("HOAN_THANH")} label="Đã hoàn thành" count={buckets.HOAN_THANH.length} />
      </div>

      {viewMode === "pc" && (
        <div className="mb-5 grid grid-cols-12 gap-4">
          <div className="col-span-12 rounded-2xl border border-cyan-400/20 bg-linear-to-br from-cyan-500/10 via-[#0d1118] to-[#0d1118] p-4 lg:col-span-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-cyan-300">Ưu tiên thao tác</p>
            <h3 className="mt-1 text-lg font-black text-white">
              {priorityTask ? `PC-${priorityTask.mapc} · DH-${priorityTask.donhang?.madh ?? priorityTask.madh}` : "Chưa có nhiệm vụ cần xử lý"}
            </h3>
            <p className="mt-1 truncate text-xs text-slate-400">
              {priorityTask?.donhang?.khachhang?.hoten || "Danh sách đang trống hoặc đã hoàn tất."}
            </p>
            {priorityTask && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/worker/tasks?mapc=${priorityTask.mapc}`} className="inline-flex h-10 items-center rounded-xl bg-cyan-500 px-4 text-xs font-black text-white hover:bg-cyan-400">
                  Mở nhiệm vụ
                </Link>
                {priorityTask.trangthai !== "CHO_THUC_HIEN" && (
                  <Link href={`/worker/cat?mapc=${priorityTask.mapc}`} className="inline-flex h-10 items-center rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 text-xs font-black text-amber-200 hover:bg-amber-400/15">
                    Sơ đồ cắt
                  </Link>
                )}
              </div>
            )}
          </div>
          <TaskCountCard label="Chờ nhận" value={buckets.CHO_THUC_HIEN.length} tone="amber" />
          <TaskCountCard label="Đang làm" value={buckets.DANG_THUC_HIEN.length} tone="cyan" />
          <TaskCountCard label="Đã xong" value={buckets.HOAN_THANH.length} tone="emerald" />
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-300 mb-6 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Task List Grid/List View */}
      {loading ? (
        <div className="py-20 flex justify-center text-slate-500"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : current.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/5 bg-[#12141a]/20 px-5 py-14 text-center text-xs text-slate-500">
          <Package className="w-8 h-8 text-gray-700 mx-auto mb-2" />
          Không tìm thấy nhiệm vụ nào trong danh sách này.
        </div>
      ) : (
        <div className={`grid gap-4 ${viewMode === "pc" ? "grid-cols-2 2xl:grid-cols-3" : "grid-cols-1"}`}>
          {current.map((task) => {
            const isPending = task.trangthai === "CHO_THUC_HIEN";
            const isDoing = task.trangthai === "DANG_THUC_HIEN";
            const isDone = task.trangthai === "HOAN_THANH";
            const progress = task.cuttingProgress;
            const missingCount = progress?.missingCount ?? 0;
            const totalCount = progress?.total ?? 0;
            const confirmedCount = progress ? Math.max(0, totalCount - missingCount) : 0;
            const pct = totalCount > 0 ? (confirmedCount / totalCount) * 100 : 0;
            const canComplete = Boolean(progress?.readyForCompletion);

            const statusClass = isDone
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : isDoing
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20";

            return (
              <div key={task.mapc} className={`flex flex-col border border-slate-800 bg-[#0d1118] shadow-sm hover:border-cyan-500/25 transition-all ${viewMode === "pc" ? "min-h-[250px] rounded-2xl p-4" : "min-h-[260px] rounded-3xl p-5"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-gray-400 bg-black/40 px-2 py-0.5 rounded-md border border-white/5">PC-{task.mapc}</span>
                      <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-500/5 px-2 py-0.5 rounded-md border border-sky-500/15">DH-{task.donhang?.madh ?? task.madh}</span>
                    </div>
                    <h3 className="text-white font-extrabold text-base mt-2.5 truncate">{task.donhang?.khachhang?.hoten || "Không tên khách"}</h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">{task.donhang?.chitietdh?.length || 0} chi tiết B.O.M</p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-extrabold px-2.5 py-1 rounded-lg border uppercase tracking-wider ${statusClass}`}>{STATUS_LABEL[task.trangthai]}</span>
                </div>

                {/* Sơ đồ tiến độ cắt */}
                {progress && totalCount > 0 && (
                  <div className="mt-4 bg-black/30 rounded-2xl p-3 border border-white/[0.03]">
                    <div className="flex justify-between items-center text-[10px] mb-1.5 font-bold">
                      <span className="text-gray-400">Tiến độ cắt thanh:</span>
                      <span className={pct === 100 ? "text-emerald-400" : "text-blue-400"}>{confirmedCount}/{totalCount} ({Math.round(pct)}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-emerald-500" : "bg-blue-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/5 text-[9px] text-gray-500">
                      <div>Đã hoàn tất: <span className="text-gray-300 font-bold">{progress.completed}</span></div>
                      <div>Cần chụp ảnh: <span className="text-gray-300 font-bold">{progress.withCutPhotos}/{totalCount}</span></div>
                    </div>
                  </div>
                )}

                {/* Collapsible BOM (Blueprint) */}
                {expanded === task.mapc && (
                  <div className="mt-4 border-t border-white/5 pt-3 space-y-1.5 bg-slate-950/40 rounded-2xl p-3 border border-blue-500/10">
                    <div className="text-[9px] font-extrabold uppercase tracking-widest text-blue-400 mb-1 flex items-center gap-1">
                      <Ruler className="w-3.5 h-3.5 text-blue-400" /> Kích Thước Bản Vẽ BOM
                    </div>
                    {task.donhang?.chitietdh.map((item, index) => (
                      <div key={item.mactdh} className="text-[11px] text-slate-300 bg-white/[0.01] rounded-xl px-3 py-2 flex items-center justify-between border border-white/5">
                        <span className="truncate pr-2 font-medium">{index + 1}. {item.mota || item.vattu?.tenvt || "Vật liệu"}</span>
                        <span className="font-mono text-cyan-400 shrink-0 font-bold flex items-center gap-1">
                          {item.chieudaicat ? `${item.chieudaicat}mm` : ""}
                          <span className="text-slate-500 text-[10px]">×{item.soluong}</span>
                        </span>
                      </div>
                    ))}
                    {(task.donhang?.chitietdh.length || 0) === 0 && <div className="text-[10px] text-gray-500">Chưa tải được bảng vẽ.</div>}
                  </div>
                )}

                <div className="mt-auto pt-4 space-y-3">
                  {isDoing && !canComplete && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[10px] text-amber-200/90 leading-relaxed flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>Còn {missingCount} phôi chưa chụp xác nhận ảnh. Hãy hoàn tất hết.</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {!isPending && (
                      <button
                        onClick={() => setExpanded(expanded === task.mapc ? null : task.mapc)}
                        className="h-10 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-xs font-bold hover:bg-white/10 flex items-center justify-center transition-colors"
                      >
                        <Package className="w-4 h-4 mr-1.5 text-gray-400" /> BOM {expanded === task.mapc ? "▲" : "▼"}
                      </button>
                    )}
                    {isPending && (
                      <button
                        onClick={() => updateStatus(task.mapc, "DANG_THUC_HIEN")}
                        disabled={busyId === task.mapc}
                        className="col-span-2 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-extrabold text-xs flex items-center justify-center disabled:opacity-60 shadow-md shadow-blue-500/10 active:scale-98 transition-transform"
                      >
                        {busyId === task.mapc ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Play className="w-4 h-4 mr-1.5" />} Bắt đầu công việc
                      </button>
                    )}
                    {isPending && (
                      <button
                        onClick={() => openReject(task)}
                        disabled={busyId === task.mapc}
                        className="col-span-2 h-11 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 border border-rose-500/25 font-bold text-xs flex items-center justify-center disabled:opacity-60 active:scale-98 transition-transform"
                      >
                        <XCircle className="w-4 h-4 mr-1.5 text-rose-400" /> Từ chối
                      </button>
                    )}
                    {(isDoing || isDone) && (
                      <Link
                        href={`/worker/cat?mapc=${task.mapc}`}
                        className="h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold hover:bg-amber-500/25 inline-flex items-center justify-center transition-colors"
                      >
                        <Ruler className="w-4 h-4 mr-1.5 text-amber-400" /> Sơ đồ cắt
                      </Link>
                    )}
                    {isDoing && (
                      <Link
                        href={`/worker/cat?mapc=${task.mapc}&tab=de-xuat`}
                        className="h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-bold hover:bg-cyan-500/25 inline-flex items-center justify-center transition-colors"
                      >
                        <ClipboardCheck className="w-4 h-4 mr-1.5 text-cyan-400" /> Đề xuất
                      </Link>
                    )}
                    {isDoing && (
                      <Link
                        href="/worker/simulator"
                        className="h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold hover:bg-emerald-500/20 inline-flex items-center justify-center transition-colors"
                      >
                        <Package className="w-4 h-4 mr-1.5 text-emerald-400" /> Trợ lý phôi
                      </Link>
                    )}
                    {isDoing && (
                      <Link
                        href={`/worker/cat?mapc=${task.mapc}&report=1`}
                        className="h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-bold hover:bg-rose-500/20 inline-flex items-center justify-center transition-colors col-span-2"
                      >
                        <AlertTriangle className="w-4 h-4 mr-1.5 text-rose-400" /> Báo cáo sự cố thanh nhôm
                      </Link>
                    )}
                    {isDoing && (
                      <button
                        onClick={() => openCompletionPhoto(task)}
                        disabled={busyId === task.mapc || !canComplete}
                        className="col-span-2 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center disabled:opacity-40 disabled:hover:bg-emerald-600 transition-colors shadow-md shadow-emerald-500/10"
                      >
                        <Camera className="w-4 h-4 mr-1.5" /> Chụp hoàn thành đơn hàng
                      </button>
                    )}
                    {isDone && (
                      <button
                        onClick={() => openCompletionPhoto(task)}
                        disabled={busyId === task.mapc || !canComplete}
                        className="col-span-2 h-11 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 font-bold text-xs flex items-center justify-center disabled:opacity-40 transition-colors"
                      >
                        <Camera className="w-4 h-4 mr-1.5 text-emerald-400" /> {progress?.hasCompletionPhoto ? "Chụp bổ sung ảnh" : "Chụp ảnh nghiệm thu"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completion Modal */}
      {completionTask && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end justify-center p-3 pb-[84px] sm:items-center sm:pb-3">
          <form onSubmit={submitCompletionPhoto} className="w-full max-w-md max-h-[calc(100dvh-110px)] bg-[#12141a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-white/5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-extrabold text-white text-base">Xác nhận hoàn thành</h3>
                <p className="text-[11px] text-gray-400 mt-1 truncate">
                  DH-{completionTask.donhang?.madh ?? completionTask.madh} · PC-{completionTask.mapc}
                </p>
              </div>
              <button type="button" onClick={() => setCompletionTask(null)} className="text-gray-500 hover:text-white p-1" title="Đóng" aria-label="Đóng">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto no-scrollbar">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300 leading-relaxed">
                <div className="font-extrabold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Đủ điều kiện nghiệm thu</div>
                <div className="mt-1 opacity-90">Hãy tải lên ảnh chụp sản phẩm nhôm hoàn thiện làm bằng chứng cho quản đốc.</div>
              </div>

              <label className="block rounded-2xl border border-dashed border-emerald-500/35 bg-emerald-500/5 px-4 py-6 text-center cursor-pointer hover:bg-emerald-500/10 transition-colors">
                <Camera className="mx-auto h-8 w-8 text-emerald-400" />
                <div className="mt-2 text-xs font-extrabold text-white">Chụp ảnh tổng thể sau khi lắp ráp</div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(event) => handleCompletionFile(event.target.files?.[0])}
                />
              </label>

              {completionPreview ? (
                <img src={completionPreview} alt="Ảnh sản phẩm" className="h-44 w-full rounded-2xl border border-white/5 object-cover" />
              ) : (
                <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 px-3 py-2 text-[10px] text-amber-300 text-center">
                  Vui lòng tải ảnh bằng chứng trước khi đóng nhiệm vụ.
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block" htmlFor="completion-photo-note">Ghi chú ảnh (Gõ nhanh):</label>
                <textarea
                  id="completion-photo-note"
                  value={completionNote}
                  onChange={(event) => setCompletionNote(event.target.value)}
                  rows={2}
                  className="w-full bg-black/45 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-emerald-500 resize-none font-sans"
                  placeholder="Ví dụ: đã lắp ráp xong..."
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {NOTE_CHIPS.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCompletionNote(chip)}
                      className="text-[9px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 transition-colors"
                    >
                      {chip.slice(0, 24)}...
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-white/5 grid grid-cols-2 gap-2 bg-black/20">
              <button type="button" onClick={() => setCompletionTask(null)} className="h-11 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold">
                Hủy
              </button>
              <button
                disabled={busyId === completionTask.mapc || !completionBlob}
                className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center disabled:opacity-40 disabled:hover:bg-emerald-600 transition-colors shadow-md shadow-emerald-500/10"
              >
                {busyId === completionTask.mapc ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                {completionTask.trangthai === "HOAN_THANH" ? "Gửi ảnh" : "Hoàn thành"}
              </button>
            </div>
          </form>
        </div>
      )}

      {rejectTask && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end justify-center p-3 pb-[84px] sm:items-center sm:pb-3">
          <form onSubmit={submitReject} className="w-full max-w-md max-h-[calc(100dvh-110px)] bg-[#12141a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-white/5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-extrabold text-white text-base">Từ chối nhiệm vụ</h3>
                <p className="text-[11px] text-gray-400 mt-1 truncate">Nhiệm vụ PC-{rejectTask.mapc}</p>
              </div>
              <button type="button" onClick={() => setRejectTask(null)} className="text-gray-500 hover:text-white p-1" title="Đóng" aria-label="Đóng">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto no-scrollbar">
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-xs text-rose-300 leading-relaxed">
                Nhiệm vụ sẽ chuyển trả về admin để phân công lại cho thợ khác phù hợp hơn.
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 block" htmlFor="reject-reason">Chọn lý do từ chối nhanh:</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {REJECT_REASONS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRejectReason(r.value)}
                      className={`px-3 py-2 rounded-xl text-left text-xs border font-medium transition-all ${
                        rejectReason === r.value
                          ? "bg-rose-500/10 border-rose-500/40 text-rose-300 font-extrabold shadow-[0_0_10px_rgba(239,68,68,0.05)]"
                          : "bg-black/20 border-white/5 text-gray-400 hover:bg-white/5"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block" htmlFor="reject-note">Ghi chú chi tiết gửi Admin:</label>
                <textarea
                  id="reject-note"
                  value={rejectNote}
                  onChange={(event) => setRejectNote(event.target.value)}
                  rows={2}
                  className="w-full bg-black/45 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-rose-500 resize-none font-sans"
                  placeholder="Điền thêm thông tin phản hồi cho quản đốc..."
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-white/5 grid grid-cols-2 gap-2 bg-black/20">
              <button type="button" onClick={() => setRejectTask(null)} className="h-11 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold">
                Hủy
              </button>
              <button
                disabled={busyId === rejectTask.mapc}
                className="h-11 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center justify-center disabled:opacity-60 transition-colors shadow-md shadow-rose-500/10"
              >
                {busyId === rejectTask.mapc ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
                Xác nhận từ chối
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-bold border transition-all ${
        active
          ? "bg-blue-500/10 text-blue-300 border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.04)] font-black"
          : "border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300"
      }`}
    >
      {label}
      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold ${active ? "bg-blue-500/20 text-blue-200" : "bg-white/5 text-gray-500"}`}>{count}</span>
    </button>
  );
}

function TaskCountCard({ label, value, tone }: { label: string; value: number; tone: "amber" | "cyan" | "emerald" }) {
  const style = {
    amber: "border-amber-400/20 bg-amber-400/5 text-amber-300",
    cyan: "border-cyan-400/20 bg-cyan-400/5 text-cyan-300",
    emerald: "border-emerald-400/20 bg-emerald-400/5 text-emerald-300",
  }[tone];

  return (
    <div className={`col-span-4 rounded-2xl border p-4 lg:col-span-2 ${style}`}>
      <div className="text-[10px] font-black uppercase tracking-widest opacity-80">{label}</div>
      <div className="mt-2 text-3xl font-black text-white tabular-nums">{value}</div>
    </div>
  );
}
