"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Gauge, Loader2, RefreshCw, Ruler, Scissors, X } from "lucide-react";
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
  coSuCoMo?: boolean;
  khothanhphoi: {
    maphoi: number;
    chieudaibandau: number;
    chieudaihientai: number;
    trangthai: string;
    vattu: { tenvt: string } | null;
  } | null;
  phancong: {
    donhang: { madh: number; khachhang: { hoten: string } | null } | null;
  } | null;
  chitietcat: CutDetail[];
};

const ISSUE_TYPES = [
  { value: "CAT_SAI_KICH_THUOC", label: "Cắt sai kích thước" },
  { value: "PHOI_CONG_VENH", label: "Phôi cong/vênh" },
  { value: "GAY_PHOI", label: "Gãy phôi" },
  { value: "THIEU_VAT_TU", label: "Thiếu vật tư" },
  { value: "LOI_KHAC", label: "Lỗi khác" },
] as const;

function formatMm(value: number) {
  return `${Math.max(0, Math.round(value)).toLocaleString("vi-VN")}mm`;
}

function stockSourceLabel(status?: string) {
  if (status === "CON_DU") return "Phôi dư";
  if (status === "MOI") return "Thanh mới";
  if (status === "BO_DI") return "Phôi lỗi";
  return "Không rõ";
}

function stockSourceClass(status?: string) {
  if (status === "CON_DU") return "text-emerald-200 bg-emerald-500/10 border-emerald-500/20";
  if (status === "BO_DI") return "text-red-200 bg-red-500/10 border-red-500/20";
  return "text-amber-200 bg-amber-500/10 border-amber-500/20";
}

function getPlanMetrics(plan: CuttingPlan) {
  const currentLength = Number(plan.khothanhphoi?.chieudaihientai ?? 0);
  const usedLength = plan.chitietcat.reduce((sum, cut) => sum + Number(cut.chieudaicat || 0), 0);
  const inputLength =
    plan.trangthai === "HOAN_THANH" || (currentLength > 0 && currentLength < usedLength)
      ? Math.max(usedLength + currentLength, usedLength, currentLength, 1)
      : Math.max(currentLength, usedLength, 1);
  const remainder = Math.max(0, inputLength - usedLength);
  const usageRate = inputLength > 0 ? Math.min(100, Math.round((usedLength / inputLength) * 100)) : 0;

  return { inputLength, usedLength, remainder, usageRate };
}

// Trang cắt phôi của thợ: hiển thị sơ đồ cắt được giao, xác nhận hoàn thành từng sơ đồ, báo sự cố cắt hỏng.
// Thiết kế ưu tiên điện thoại cho thợ dùng tại xưởng.
function WorkerCatPageInner() {
  const searchParams = useSearchParams();
  const mapcFilter = Number(searchParams.get("mapc") || "0");
  const reportIntent = searchParams.get("report") === "1";
  const [plans, setPlans] = useState<CuttingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [reportPlan, setReportPlan] = useState<CuttingPlan | null>(null);
  const [issueType, setIssueType] = useState<(typeof ISSUE_TYPES)[number]["value"]>("CAT_SAI_KICH_THUOC");
  const [note, setNote] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [autoReportOpened, setAutoReportOpened] = useState(false);

  const visiblePlans = useMemo(
    () => plans.filter((plan) => (mapcFilter ? plan.mapc === mapcFilter : true)),
    [plans, mapcFilter],
  );

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

  // Thợ xác nhận hoàn thành cắt: gọi API → trừ chiều dài phôi + ghi nhật ký + tự động hoàn thành phân công.
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

  const openReport = useCallback((plan: CuttingPlan) => {
    setReportPlan(plan);
    setIssueType("CAT_SAI_KICH_THUOC");
    setNote("");
  }, []);

  useEffect(() => {
    setAutoReportOpened(false);
  }, [mapcFilter, reportIntent]);

  useEffect(() => {
    if (!reportIntent || autoReportOpened || loading || reportPlan) return;
    const candidate = visiblePlans.find(
      (plan) => plan.trangthai !== "HOAN_THANH" && plan.trangthai !== "DANG_CAT" && plan.khothanhphoi?.trangthai !== "BO_DI",
    );
    if (candidate) openReport(candidate);
    setAutoReportOpened(true);
  }, [autoReportOpened, loading, openReport, reportIntent, reportPlan, visiblePlans]);

  // Thợ gửi báo cáo sự cố cắt hỏng: chọn loại sự cố + mô tả → gửi API → quản trị viên xử lý.
  const report = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reportPlan || !note.trim()) return;
    setBusyId(reportPlan.masdc);
    try {
      await apiJson(`/api/worker/cutting-plans/${reportPlan.masdc}/report`, {
        method: "POST",
        body: JSON.stringify({ loaiSuCo: issueType, mota: note }),
      });
      setReportPlan(null);
      setIssueType("CAT_SAI_KICH_THUOC");
      setNote("");
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 pt-5 pb-28">
      <section className="relative overflow-hidden rounded-3xl admin-metal-panel border border-white/10 px-5 py-4">
        <div className="admin-metal-shine" />
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-amber-300" /> Máy cắt
            </div>
            <h2 className="text-xl font-extrabold brand-name mt-1 leading-tight">Sơ đồ cắt được giao</h2>
            <p className="text-xs text-slate-400 mt-1">Chọn đúng UID phôi, cắt theo thứ tự và báo sự cố ngay khi thấy lỗi.</p>
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
        ) : visiblePlans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/2 px-5 py-10 text-center text-sm text-slate-500">
            {mapcFilter ? `Chưa có sơ đồ cắt cho PC-${mapcFilter}.` : "Chưa có sơ đồ cắt nào được giao."}
          </div>
        ) : (
          visiblePlans.map((plan) => {
            const metrics = getPlanMetrics(plan);
            const isDone = plan.trangthai === "HOAN_THANH";
            const isScrap = plan.khothanhphoi?.trangthai === "BO_DI";
            const hasOpenIssue = plan.trangthai === "DANG_CAT" || Boolean(plan.coSuCoMo);
            const isBlocked = isScrap || hasOpenIssue;
            return (
              <div key={plan.masdc} className={`rounded-2xl border p-4 ${isScrap ? "border-red-500/30 bg-red-500/5" : isDone ? "border-emerald-500/20 bg-emerald-500/5" : "border-white/10 bg-[#10131a]/90"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[11px] font-mono text-sky-300 bg-sky-500/10 border border-sky-500/20 rounded-md px-2 py-0.5">SDC-{plan.masdc}</span>
                      <span className="text-[11px] font-mono text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-md px-2 py-0.5">UID-{plan.khothanhphoi?.maphoi}</span>
                      <span className="text-[11px] font-mono text-slate-300 bg-white/5 border border-white/10 rounded-md px-2 py-0.5">PC-{plan.mapc}</span>
                      <span className={`text-[11px] font-bold border rounded-md px-2 py-0.5 ${stockSourceClass(plan.khothanhphoi?.trangthai)}`}>
                        {stockSourceLabel(plan.khothanhphoi?.trangthai)}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-100 mt-2 truncate">
                      DH-{plan.phancong?.donhang?.madh} · {plan.phancong?.donhang?.khachhang?.hoten || "Khách hàng"}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">{plan.khothanhphoi?.vattu?.tenvt || "Vật tư"} · đầu vào {formatMm(metrics.inputLength)} · dư {formatMm(metrics.remainder)}</p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg border ${isScrap ? "bg-red-500/15 text-red-300 border-red-500/30" : hasOpenIssue ? "bg-amber-500/15 text-amber-200 border-amber-500/30" : isDone ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-sky-500/15 text-sky-300 border-sky-500/30"}`}>
                    {isScrap ? "Phôi lỗi" : hasOpenIssue ? "Chờ xử lý lỗi" : isDone ? "Đã cắt" : "Chờ cắt"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
                  <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
                    <div className="text-slate-500">Đã dùng</div>
                    <div className="font-bold text-emerald-300">{formatMm(metrics.usedLength)}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
                    <div className="text-slate-500">Phần dư</div>
                    <div className="font-bold text-amber-300">{formatMm(metrics.remainder)}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
                    <div className="text-slate-500">Tỷ lệ</div>
                    <div className="font-bold text-sky-300 inline-flex items-center"><Gauge className="w-3 h-3 mr-1" />{metrics.usageRate}%</div>
                  </div>
                </div>

                <div className="mt-3 h-14 bg-[#15171d] rounded-xl border border-white/10 overflow-hidden flex">
                  {plan.chitietcat.map((cut) => (
                    <div
                      key={cut.mactc}
                      style={{ width: `${Math.max(7, (cut.chieudaicat / metrics.inputLength) * 100)}%` }}
                      className={`h-full border-r border-black/40 flex min-w-[44px] flex-col items-center justify-center text-[10px] font-bold text-white ${cut.trangthai === "DA_CAT" ? "bg-emerald-500/70" : "bg-blue-500/70"}`}
                    >
                      <span>#{cut.thutucat}</span>
                      <span>{formatMm(cut.chieudaicat).replace("mm", "")}</span>
                    </div>
                  ))}
                  <div className="flex-1 min-w-[48px] bg-amber-500/20 text-[10px] text-amber-200 flex items-center justify-center">
                    dư {formatMm(metrics.remainder).replace("mm", "")}
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {plan.chitietcat.map((cut) => (
                    <div key={cut.mactc} className="text-xs text-slate-300 bg-black/20 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                      <span className="min-w-0">{cut.thutucat}. {cut.chitietdh?.mota || cut.chitietdh?.vattu?.tenvt || "Chi tiết"}</span>
                      <span className="font-mono text-sky-300 inline-flex items-center shrink-0"><Ruler className="w-3 h-3 mr-1" />{formatMm(cut.chieudaicat)}</span>
                    </div>
                  ))}
                </div>

                {isScrap && (
                  <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    Phôi này đã bị Admin đánh dấu lỗi/bỏ đi. Không được tiếp tục cắt, hãy chờ sơ đồ thay thế.
                  </div>
                )}
                {hasOpenIssue && !isScrap && (
                  <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    Phôi này đang có sự cố chờ Admin xử lý. Không xác nhận hoàn thành cho đến khi Admin cắt bỏ đoạn lỗi hoặc thay phôi khác.
                  </div>
                )}

                {!isDone && !isBlocked && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button onClick={() => complete(plan.masdc)} disabled={busyId === plan.masdc} className="h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center justify-center disabled:opacity-60">
                      {busyId === plan.masdc ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />} Hoàn thành
                    </button>
                    <button onClick={() => openReport(plan)} className="h-12 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 rounded-xl text-sm font-bold flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 mr-2" /> Báo sự cố
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {reportPlan && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center p-3 pb-[84px] sm:items-center sm:pb-3">
          <form onSubmit={report} className="w-full max-w-md max-h-[calc(100dvh-110px)] bg-[#12141a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-white/10 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-white">Báo cáo sự cố cắt hỏng</h3>
                <p className="text-xs text-slate-400 mt-1">
                  SDC-{reportPlan.masdc} · PC-{reportPlan.mapc} · UID-{reportPlan.khothanhphoi?.maphoi ?? "chưa có"}
                </p>
              </div>
              <button type="button" onClick={() => setReportPlan(null)} className="text-slate-400 hover:text-white" title="Đóng" aria-label="Đóng"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <div className="text-slate-500">Vật tư</div>
                  <div className="text-slate-100 font-semibold mt-1 leading-snug">{reportPlan.khothanhphoi?.vattu?.tenvt || "Chưa rõ"}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <div className="text-slate-500">Chiều dài phôi</div>
                  <div className="text-slate-100 font-semibold mt-1">{reportPlan.khothanhphoi?.chieudaihientai ?? reportPlan.khothanhphoi?.chieudaibandau ?? 0} mm</div>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-2 block" htmlFor="issue-type">Loại sự cố</label>
                <select
                  id="issue-type"
                  value={issueType}
                  onChange={(event) => setIssueType(event.target.value as typeof issueType)}
                  className="h-12 w-full bg-[#030508] border border-white/10 rounded-xl px-3 text-sm text-white outline-none focus:border-red-400"
                >
                  {ISSUE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-2 block" htmlFor="issue-note">Mô tả chi tiết</label>
                <textarea
                  id="issue-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                  className="w-full bg-[#030508] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-red-400 resize-none"
                  placeholder="Ví dụ: phôi cong ở giữa, cắt sai 20mm, gãy đầu phôi..."
                  required
                />
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                Admin sẽ thấy sự cố này trong màn Tối ưu cắt, kèm UID phôi để quyết định giữ lại hoặc bỏ phôi.
              </div>
            </div>

            <div className="px-5 py-4 border-t border-white/10 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setReportPlan(null)} className="h-12 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-bold">
                Hủy
              </button>
              <button disabled={busyId === reportPlan.masdc} className="h-12 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold flex items-center justify-center disabled:opacity-60">
                {busyId === reportPlan.masdc ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <AlertTriangle className="w-4 h-4 mr-2" />} Gửi báo cáo
              </button>
            </div>
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
