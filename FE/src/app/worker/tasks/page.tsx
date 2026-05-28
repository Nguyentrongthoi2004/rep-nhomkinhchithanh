/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AlertTriangle, Camera, Check, ClipboardCheck, Loader2, Package, Play, RefreshCw, Ruler, X, XCircle } from "lucide-react";
import Link from "next/link";
import { apiData, apiJson } from "@/lib/api";
import { fileToCompressedImage } from "@/lib/image-upload";

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
  { value: "KHONG_PHU_HOP_TAY_NGHE", label: "Không phù hợp tay nghề" },
  { value: "KHONG_THUAN_TIEN_THAO_TAC", label: "Không thuận tiện thao tác" },
  { value: "THIEU_THONG_TIN_SO_DO_CAT", label: "Thiếu thông tin/sơ đồ cắt" },
  { value: "LY_DO_KHAC", label: "Lý do khác" },
] as const;

const STATUS_LABEL: Record<TaskStatus, string> = {
  CHO_THUC_HIEN: "Chờ nhận",
  DANG_THUC_HIEN: "Đang làm",
  HOAN_THANH: "Đã xong",
};

export default function WorkerTasksPage() {
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
          ? "Upload ảnh quá lâu. Ảnh đã được nén nhẹ hơn, hãy thử gửi lại hoặc kiểm tra Wi-Fi."
          : err instanceof Error
            ? err.message
            : String(err);
      setErrorMsg(
        submitStage === "complete"
          ? `Ảnh đã gửi được nhưng chưa cập nhật hoàn thành công việc: ${friendlyMessage}`
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

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 pt-5 pb-28">
      <section className="relative overflow-hidden rounded-3xl admin-metal-panel border border-white/10 px-5 py-4">
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
          current.map((task) => {
            const isPending = task.trangthai === "CHO_THUC_HIEN";
            const isDoing = task.trangthai === "DANG_THUC_HIEN";
            const isDone = task.trangthai === "HOAN_THANH";
            const progress = task.cuttingProgress;
            const missingCount = progress?.missingCount ?? 0;
            const confirmedCount = progress ? Math.max(0, progress.total - progress.missingCount) : 0;
            const canComplete = Boolean(progress?.readyForCompletion);
            const statusClass = isDone
              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
              : isDoing
                ? "bg-amber-500/15 text-amber-200 border-amber-500/30"
                : "bg-sky-500/15 text-sky-300 border-sky-500/30";
            return (
            <div key={task.mapc} className="flex min-h-[220px] flex-col rounded-2xl border border-white/10 bg-[#10131a]/90 p-4 shadow-[0_12px_30px_-22px_rgba(0,0,0,0.9)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-400 bg-black/40 px-2 py-0.5 rounded-md border border-white/5">PC-{task.mapc}</span>
                    <span className="text-[11px] font-mono text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20">DH-{task.donhang?.madh ?? task.madh}</span>
                  </div>
                  <h3 className="text-slate-100 font-bold text-base mt-2 truncate">{task.donhang?.khachhang?.hoten || "Khách hàng"}</h3>
                  <p className="text-xs text-slate-400 mt-1">{task.donhang?.chitietdh?.length || 0} hạng mục BOM</p>
                </div>
                <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${statusClass}`}>{STATUS_LABEL[task.trangthai]}</span>
              </div>

              {expanded === task.mapc && (
                <div className="mt-4 border-t border-white/5 pt-3 space-y-2">
                  {task.donhang?.chitietdh.map((item, index) => (
                    <div key={item.mactdh} className="text-xs text-slate-300 bg-black/20 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                      <span className="min-w-0">{index + 1}. {item.mota || item.vattu?.tenvt || "Chi tiết"}</span>
                      <span className="font-mono text-sky-300 inline-flex items-center shrink-0">
                        {item.chieudaicat && <><Ruler className="w-3 h-3 mr-1" />{item.chieudaicat}mm</>}
                        <span className="ml-2 text-slate-500">x{item.soluong}</span>
                      </span>
                    </div>
                  ))}
                  {(task.donhang?.chitietdh.length || 0) === 0 && <div className="text-xs text-slate-500">Đơn này chưa có BOM.</div>}
                </div>
              )}

              <div className="mt-auto pt-4">
                {isDoing && !canComplete && (
                  <div className="mb-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-100">
                    Còn {missingCount} phôi/sơ đồ chưa có ảnh xác nhận cắt. Vui lòng hoàn tất trước khi xác nhận công trình.
                  </div>
                )}
                {progress && progress.total > 0 && (
                  <div className="mb-2 space-y-2">
                    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-slate-100">
                      Đã xác nhận {confirmedCount}/{progress.total} phôi · Còn thiếu {missingCount} phôi/sơ đồ
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
                        <div className="text-slate-500">Sơ đồ</div>
                        <div className="font-bold text-slate-100">{progress.total}</div>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
                        <div className="text-slate-500">Đã cắt</div>
                        <div className="font-bold text-emerald-300">{progress.completed}</div>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
                        <div className="text-slate-500">Có ảnh</div>
                        <div className="font-bold text-sky-300">{progress.withCutPhotos}</div>
                      </div>
                    </div>
                  </div>
                )}
              <div className="grid grid-cols-2 gap-2">
                {!isPending && (
                  <button onClick={() => setExpanded(expanded === task.mapc ? null : task.mapc)} className="h-12 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/10 flex items-center justify-center">
                    <Package className="w-4 h-4 mr-2" /> BOM
                  </button>
                )}
                {isPending && (
                  <button onClick={() => updateStatus(task.mapc, "DANG_THUC_HIEN")} disabled={busyId === task.mapc} className="col-span-2 h-12 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-sm flex items-center justify-center disabled:opacity-60">
                    {busyId === task.mapc ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />} Bắt đầu
                  </button>
                )}
                {isPending && (
                  <button onClick={() => openReject(task)} disabled={busyId === task.mapc} className="col-span-2 h-12 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 font-bold text-sm flex items-center justify-center disabled:opacity-60">
                    <XCircle className="w-4 h-4 mr-2" /> Từ chối
                  </button>
                )}
                {(isDoing || isDone) && (
                <Link
                  href={`/worker/cat?mapc=${task.mapc}`}
                  className="h-12 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-200 text-sm font-bold hover:bg-amber-400/20 inline-flex items-center justify-center"
                  title="Mở sơ đồ cắt"
                  aria-label="Mở sơ đồ cắt"
                >
                  <Ruler className="w-4 h-4 mr-2" /> Sơ đồ cắt
                </Link>
                )}
                {isDoing && (
                  <Link
                    href={`/worker/cat?mapc=${task.mapc}&tab=de-xuat`}
                    className="h-12 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 border border-cyan-500/20 text-sm font-bold inline-flex items-center justify-center"
                    title="Đề xuất phương án cắt"
                    aria-label="Đề xuất phương án cắt"
                  >
                    <ClipboardCheck className="w-4 h-4 mr-2" /> Đề xuất
                  </Link>
                )}
                {isDoing && (
                  <Link
                    href={`/worker/cat?mapc=${task.mapc}&report=1`}
                    className="h-12 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 text-sm font-bold inline-flex items-center justify-center"
                    title="Báo sự cố từ sơ đồ cắt của nhiệm vụ"
                    aria-label="Báo sự cố từ sơ đồ cắt của nhiệm vụ"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" /> Báo sự cố
                  </Link>
                )}
                {isDoing && (
                  <button onClick={() => openCompletionPhoto(task)} disabled={busyId === task.mapc || !canComplete} className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center disabled:opacity-50 disabled:hover:bg-emerald-600">
                    <Camera className="w-4 h-4 mr-2" /> Chụp hoàn thành
                  </button>
                )}
                {isDone && (
                  <button onClick={() => openCompletionPhoto(task)} disabled={busyId === task.mapc || !canComplete} className="col-span-2 h-12 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 border border-emerald-500/25 font-bold text-sm flex items-center justify-center disabled:opacity-50 disabled:hover:bg-emerald-500/10">
                    <Camera className="w-4 h-4 mr-2" /> {progress?.hasCompletionPhoto ? "Chụp bổ sung" : "Chụp hoàn thành"}
                  </button>
                )}
              </div>
              </div>
            </div>
          );
        })
        )}
      </div>

      {completionTask && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center p-3 pb-[84px] sm:items-center sm:pb-3">
          <form onSubmit={submitCompletionPhoto} className="w-full max-w-md max-h-[calc(100dvh-110px)] bg-[#12141a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-white/10 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-white">Xác nhận hoàn thành công trình</h3>
                <p className="text-xs text-slate-400 mt-1 truncate">
                  DH-{completionTask.donhang?.madh ?? completionTask.madh} · PC-{completionTask.mapc} · {completionTask.donhang?.khachhang?.hoten || "Khách hàng"}
                </p>
              </div>
              <button type="button" onClick={() => setCompletionTask(null)} className="text-slate-400 hover:text-white" title="Đóng" aria-label="Đóng">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
                <div>Tất cả phôi/sơ đồ đã được xác nhận cắt.</div>
                <div className="mt-1">Vui lòng chụp hoặc tải ảnh hoàn thiện công trình để hoàn tất.</div>
              </div>
              <label className="block rounded-2xl border border-dashed border-emerald-400/40 bg-emerald-500/10 px-4 py-5 text-center">
                <Camera className="mx-auto h-8 w-8 text-emerald-300" />
                <div className="mt-2 text-sm font-bold text-white">Chụp ảnh tổng thể sau khi hoàn thành</div>
                <div className="mt-1 text-xs text-slate-400">Ảnh này dùng làm bằng chứng nghiệm thu công trình cho Admin.</div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(event) => handleCompletionFile(event.target.files?.[0])}
                />
              </label>

              {completionPreview ? (
                <img src={completionPreview} alt="Ảnh hoàn thành công trình" className="h-56 w-full rounded-2xl border border-white/10 object-cover" />
              ) : (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                  Cần có ảnh hoàn thành trước khi đóng nhiệm vụ.
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-2 block" htmlFor="completion-photo-note">Ghi chú ảnh</label>
                <textarea
                  id="completion-photo-note"
                  value={completionNote}
                  onChange={(event) => setCompletionNote(event.target.value)}
                  rows={2}
                  className="w-full bg-[#030508] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400 resize-none"
                  placeholder="Ví dụ: đã lắp xong cửa chính, khách kiểm tra..."
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-white/10 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setCompletionTask(null)} className="h-12 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-bold">
                Hủy
              </button>
              <button disabled={busyId === completionTask.mapc || !completionBlob} className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center disabled:opacity-60">
                {busyId === completionTask.mapc ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                {completionTask.trangthai === "HOAN_THANH" ? "Gửi ảnh" : "Gửi & hoàn thành"}
              </button>
            </div>
          </form>
        </div>
      )}

      {rejectTask && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center p-3 pb-[84px] sm:items-center sm:pb-3">
          <form onSubmit={submitReject} className="w-full max-w-md max-h-[calc(100dvh-110px)] bg-[#12141a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-white/10 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-white">Từ chối nhiệm vụ PC-{rejectTask.mapc}</h3>
                <p className="text-xs text-slate-400 mt-1 truncate">DH-{rejectTask.donhang?.madh ?? rejectTask.madh} · {rejectTask.donhang?.khachhang?.hoten || "Khách hàng"}</p>
              </div>
              <button type="button" onClick={() => setRejectTask(null)} className="text-slate-400 hover:text-white" title="Đóng" aria-label="Đóng">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                Sau khi từ chối, nhiệm vụ sẽ rời khỏi danh sách việc đang nhận và Admin sẽ nhận thông báo để phân công lại.
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-2 block" htmlFor="reject-reason">Lý do từ chối</label>
                <select
                  id="reject-reason"
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value as typeof rejectReason)}
                  className="h-12 w-full bg-[#030508] border border-white/10 rounded-xl px-3 text-sm text-white outline-none focus:border-red-400"
                >
                  {REJECT_REASONS.map((reason) => (
                    <option key={reason.value} value={reason.value}>{reason.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-2 block" htmlFor="reject-note">Ghi chú thêm</label>
                <textarea
                  id="reject-note"
                  value={rejectNote}
                  onChange={(event) => setRejectNote(event.target.value)}
                  rows={3}
                  className="w-full bg-[#030508] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-red-400 resize-none"
                  placeholder="Ví dụ: đang kẹt việc ở đơn khác, thiếu bản vẽ chi tiết..."
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-white/10 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setRejectTask(null)} className="h-12 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-bold">
                Hủy
              </button>
              <button disabled={busyId === rejectTask.mapc} className="h-12 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold flex items-center justify-center disabled:opacity-60">
                {busyId === rejectTask.mapc ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                Xác nhận
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
      className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl text-[12px] font-bold border transition-colors ${
        active ? "bg-sky-500/15 text-sky-200 border-sky-500/40" : "border-transparent text-slate-400 hover:bg-white/5"
      }`}
    >
      {label}
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${active ? "bg-white/10" : "bg-white/5"}`}>{count}</span>
    </button>
  );
}
