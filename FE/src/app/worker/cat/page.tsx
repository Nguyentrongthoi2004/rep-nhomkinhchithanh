/* eslint-disable @next/next/no-img-element */
"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AlertTriangle, ArrowLeft, Camera, Check, Eye, Gauge, ImageIcon, Loader2, RefreshCw, Ruler, Scissors, X, Zap } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiData, apiJson, imageDisplayUrl } from "@/lib/api";
import { fileToCompressedImage } from "@/lib/image-upload";
import { calculateCuttingPlanMetrics } from "@/lib/cuttingMetrics";
import WorkerProposalsList from "@/components/worker/WorkerProposalsList";
import ProposalSubmitModal from "@/components/worker/ProposalSubmitModal";

type CutDetail = {
  mactc: number;
  mactdh: number;
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

type CuttingImage = {
  maha: number;
  madh: number;
  duongdan: string;
  url?: string | null;
  mota: string | null;
  loaianh: "CAT_PHOI" | "HOAN_THANH_CONG_TRINH" | "BAO_CAO_SU_CO" | "KHAC";
  mapc: number | null;
  masdc: number | null;
  maphoi: number | null;
  thoigian: string | null;
  nguoichup: number | null;
  nguoidung?: { hoten: string | null } | null;
};

const ISSUE_TYPES = [
  { value: "CAT_SAI_KICH_THUOC", label: "Cắt sai kích thước" },
  { value: "PHOI_CONG_VENH", label: "Phôi cong/vênh" },
  { value: "GAY_PHOI", label: "Gãy phôi" },
  { value: "THIEU_VAT_TU", label: "Thiếu vật tư" },
  { value: "LOI_KHAC", label: "Lỗi khác" },
] as const;

const IMAGE_TYPE_LABEL: Record<CuttingImage["loaianh"], string> = {
  CAT_PHOI: "Xác nhận cắt phôi",
  HOAN_THANH_CONG_TRINH: "Hoàn thành công trình",
  BAO_CAO_SU_CO: "Báo cáo sự cố",
  KHAC: "Khác",
};

const ISSUE_SEVERITIES = [
  { value: "NHE", label: "Nhẹ" },
  { value: "TRUNG_BINH", label: "Trung bình" },
  { value: "NGHIEM_TRONG", label: "Nghiêm trọng" },
] as const;

function formatMm(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return `${Math.round(Number(value)).toLocaleString("vi-VN")} mm`;
}

function formatPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return `${Number(value).toFixed(Number(value) % 1 === 0 ? 0 : 1)}%`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Chưa rõ thời gian";
  return new Date(value).toLocaleString("vi-VN");
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
  const metrics = calculateCuttingPlanMetrics(plan);
  return {
    inputLength: metrics.inputLength,
    usedLength: metrics.usedLength,
    remainder: metrics.remainder,
    usageRate: metrics.usageRate,
  };
}

// Trang cắt phôi của thợ: hiển thị sơ đồ cắt được giao, xác nhận hoàn thành từng sơ đồ, báo sự cố cắt hỏng.
// Thiết kế ưu tiên điện thoại cho thợ dùng tại xưởng.
function WorkerCatPageInner() {
  const searchParams = useSearchParams();
  const mapcFilter = Number(searchParams.get("mapc") || "0");
  const reportIntent = searchParams.get("report") === "1";
  const proposalIntent = searchParams.get("tab") === "de-xuat";
  const [plans, setPlans] = useState<CuttingPlan[]>([]);
  const [images, setImages] = useState<CuttingImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [reportPlan, setReportPlan] = useState<CuttingPlan | null>(null);
  const [photoPlan, setPhotoPlan] = useState<CuttingPlan | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoNote, setPhotoNote] = useState("");
  const [issueType, setIssueType] = useState<(typeof ISSUE_TYPES)[number]["value"]>("CAT_SAI_KICH_THUOC");
  const [issueSeverity, setIssueSeverity] = useState<(typeof ISSUE_SEVERITIES)[number]["value"]>("NHE");
  const [issueSuggestion, setIssueSuggestion] = useState("");
  const [note, setNote] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [autoReportOpened, setAutoReportOpened] = useState(false);
  const [tab, setTab] = useState<"SO_DO" | "DE_XUAT">("SO_DO");
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<CuttingImage | null>(null);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [completionBlob, setCompletionBlob] = useState<Blob | null>(null);
  const [completionPreview, setCompletionPreview] = useState("");
  const [completionNote, setCompletionNote] = useState("");

  const visiblePlans = useMemo(
    () => plans.filter((plan) => (mapcFilter ? plan.mapc === mapcFilter : true)),
    [plans, mapcFilter],
  );

  const cutImagesByMasdc = useMemo(() => {
    const grouped = new Map<number, CuttingImage[]>();
    for (const image of images) {
      if (image.loaianh !== "CAT_PHOI" || !image.masdc) continue;
      const rows = grouped.get(image.masdc) ?? [];
      rows.push(image);
      grouped.set(image.masdc, rows);
    }
    return grouped;
  }, [images]);

  const completionImages = useMemo(
    () => images.filter((image) => image.loaianh === "HOAN_THANH_CONG_TRINH"),
    [images],
  );

  const cuttingProgress = useMemo(() => {
    const total = visiblePlans.length;
    const confirmed = visiblePlans.filter(
      (plan) => plan.trangthai === "HOAN_THANH" && Boolean(cutImagesByMasdc.get(plan.masdc)?.length),
    ).length;
    return {
      total,
      confirmed,
      missing: Math.max(0, total - confirmed),
      ready: total > 0 && confirmed === total,
    };
  }, [cutImagesByMasdc, visiblePlans]);

  const sortedVisiblePlans = useMemo(() => {
    return [...visiblePlans].sort((left, right) => {
      const leftConfirmed = left.trangthai === "HOAN_THANH" && Boolean(cutImagesByMasdc.get(left.masdc)?.length);
      const rightConfirmed = right.trangthai === "HOAN_THANH" && Boolean(cutImagesByMasdc.get(right.masdc)?.length);
      if (leftConfirmed !== rightConfirmed) return leftConfirmed ? 1 : -1;
      return left.masdc - right.masdc || (left.khothanhphoi?.maphoi ?? 0) - (right.khothanhphoi?.maphoi ?? 0);
    });
  }, [cutImagesByMasdc, visiblePlans]);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [planRows, imageRows] = await Promise.all([
        apiData<CuttingPlan[]>("/api/worker/cutting-plans"),
        mapcFilter ? apiData<CuttingImage[]>(`/api/worker/images/assignment/${mapcFilter}`).catch(() => []) : Promise.resolve([]),
      ]);
      setPlans(planRows);
      setImages(imageRows);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [mapcFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (proposalIntent) setTab("DE_XUAT");
  }, [proposalIntent]);

  // Thợ xác nhận hoàn thành cắt: gọi API → trừ chiều dài phôi + ghi nhật ký + tự động hoàn thành phân công.
  const openCutPhoto = (plan: CuttingPlan) => {
    setPhotoPlan(plan);
    setPhotoBlob(null);
    setPhotoPreview("");
    setPhotoNote("");
  };

  const handlePhotoFile = async (file?: File | null) => {
    if (!file) return;
    try {
      const image = await fileToCompressedImage(file);
      setPhotoBlob(image.blob);
      setPhotoPreview(image.dataUrl);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  // Thợ chụp ảnh xác nhận cắt rồi mới hoàn thành sơ đồ để Admin có bằng chứng theo UID phôi.
  const openCompletionPhoto = () => {
    if (!cuttingProgress.ready) {
      setErrorMsg(`Còn thiếu ${cuttingProgress.missing} phôi/sơ đồ chưa có ảnh xác nhận cắt. Vui lòng hoàn tất trước khi xác nhận công trình.`);
      return;
    }
    setCompletionOpen(true);
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
    if (!completionBlob || !mapcFilter) return;
    const firstPlan = visiblePlans[0];
    const madh = firstPlan?.phancong?.donhang?.madh;
    if (!madh) {
      setErrorMsg("Không xác định được đơn hàng để gắn ảnh hoàn thành công trình.");
      return;
    }

    const uploadController = new AbortController();
    const uploadTimer = window.setTimeout(() => uploadController.abort(), 45000);
    let submitStage: "upload" | "complete" = "upload";
    setBusyId(mapcFilter);
    try {
      const formData = new FormData();
      formData.set("image", completionBlob, `pc-${mapcFilter}.jpg`);
      formData.set("loaianh", "HOAN_THANH_CONG_TRINH");
      formData.set("madh", String(madh));
      formData.set("mapc", String(mapcFilter));
      formData.set("mota", completionNote.trim() || `Ảnh hoàn thành công trình PC-${mapcFilter}`);

      await apiJson("/api/worker/images/upload-file", {
        method: "POST",
        signal: uploadController.signal,
        body: formData,
      });
      submitStage = "complete";
      await apiJson(`/api/worker/tasks/${mapcFilter}`, {
        method: "PATCH",
        body: JSON.stringify({ trangthai: "HOAN_THANH" }),
      });
      setCompletionOpen(false);
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
          ? `Ảnh hoàn thành đã gửi được nhưng chưa đóng phân công: ${friendlyMessage}`
          : `Gửi ảnh hoàn thành thất bại: ${friendlyMessage}`,
      );
    } finally {
      window.clearTimeout(uploadTimer);
      setBusyId(null);
    }
  };

  const submitCutPhoto = async (event: FormEvent) => {
    event.preventDefault();
    if (!photoPlan || !photoBlob) return;
    const id = photoPlan.masdc;
    const uploadController = new AbortController();
    const uploadTimer = window.setTimeout(() => uploadController.abort(), 45000);
    let submitStage: "upload" | "complete" = "upload";
    setBusyId(id);
    try {
      const formData = new FormData();
      formData.set("image", photoBlob, `sdc-${photoPlan.masdc}.jpg`);
      formData.set("loaianh", "CAT_PHOI");
      formData.set("mapc", String(photoPlan.mapc));
      formData.set("masdc", String(photoPlan.masdc));
      if (photoPlan.phancong?.donhang?.madh) formData.set("madh", String(photoPlan.phancong.donhang.madh));
      if (photoPlan.khothanhphoi?.maphoi) formData.set("maphoi", String(photoPlan.khothanhphoi.maphoi));
      formData.set("mota", photoNote.trim() || `Ảnh xác nhận cắt SDC-${photoPlan.masdc}`);

      await apiJson("/api/worker/images/upload-file", {
        method: "POST",
        signal: uploadController.signal,
        body: formData,
      });
      submitStage = "complete";
      await apiJson(`/api/worker/cutting-plans/${id}/complete`, { method: "POST" });
      setPhotoPlan(null);
      setPhotoBlob(null);
      setPhotoPreview("");
      setPhotoNote("");
      load();
    } catch (err: unknown) {
      const friendlyMessage =
        err instanceof DOMException && err.name === "AbortError"
          ? "Upload ảnh quá lâu. Ảnh đã được nén nhẹ hơn, hãy thử gửi lại hoặc kiểm tra Wi-Fi."
          : err instanceof Error
            ? err.message
            : String(err);
      setErrorMsg(
        submitStage === "complete"
          ? `Ảnh đã gửi được nhưng chưa xác nhận cắt SDC: ${friendlyMessage}`
          : `Gửi ảnh thất bại: ${friendlyMessage}`,
      );
    } finally {
      window.clearTimeout(uploadTimer);
      setBusyId(null);
    }
  };

  const openReport = useCallback((plan: CuttingPlan) => {
    setReportPlan(plan);
    setIssueType("CAT_SAI_KICH_THUOC");
    setIssueSeverity("NHE");
    setIssueSuggestion("");
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
      const severityLabel =
        ISSUE_SEVERITIES.find((severity) => severity.value === issueSeverity)?.label || "Nhẹ";
      const detail = [
        `Mức độ: ${severityLabel}`,
        `Mô tả chi tiết: ${note.trim()}`,
        issueSuggestion.trim() ? `Đề xuất xử lý: ${issueSuggestion.trim()}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      await apiJson(`/api/worker/cutting-plans/${reportPlan.masdc}/report`, {
        method: "POST",
        body: JSON.stringify({ loaiSuCo: issueType, mota: detail }),
      });
      setReportPlan(null);
      setIssueType("CAT_SAI_KICH_THUOC");
      setIssueSeverity("NHE");
      setIssueSuggestion("");
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
            <Link
              href="/worker/tasks"
              className="mb-3 inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-slate-200 hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Nhiệm vụ
            </Link>
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

      {mapcFilter > 0 && cuttingProgress.total > 0 && (
        <section className={`rounded-2xl border px-4 py-3 ${cuttingProgress.ready ? "border-emerald-500/25 bg-emerald-500/10" : "border-amber-500/25 bg-amber-500/10"}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-extrabold text-white">
                Đã xác nhận {cuttingProgress.confirmed}/{cuttingProgress.total} phôi · Còn thiếu {cuttingProgress.missing} phôi/sơ đồ
              </div>
              {!cuttingProgress.ready ? (
                <p className="mt-1 text-xs leading-relaxed text-amber-100">
                  Còn thiếu {cuttingProgress.missing} phôi/sơ đồ chưa có ảnh xác nhận cắt. Vui lòng hoàn tất trước khi xác nhận công trình.
                </p>
              ) : (
                <p className="mt-1 text-xs leading-relaxed text-emerald-100">
                  Tất cả phôi/sơ đồ đã được xác nhận cắt. Có thể chụp ảnh hoàn thành công trình.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={openCompletionPhoto}
              disabled={!cuttingProgress.ready || busyId === mapcFilter}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600"
            >
              <Camera className="mr-2 h-4 w-4" /> Chụp hoàn thành
            </button>
          </div>
        </section>
      )}

      {completionImages.length > 0 && (
        <section className="rounded-2xl border border-emerald-500/20 bg-[#10131a]/90 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="text-sm font-extrabold text-white">Ảnh hoàn thành công trình</div>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-200">
              {completionImages.length} ảnh
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {completionImages.map((image) => {
              const viewUrl = imageDisplayUrl(image);
              return (
                <button
                  key={image.maha}
                  type="button"
                  onClick={() => setSelectedImage(image)}
                  className="overflow-hidden rounded-xl border border-white/10 bg-black/20 text-left"
                >
                  {viewUrl ? (
                    <img src={viewUrl} alt={image.mota || "Ảnh hoàn thành công trình"} className="h-24 w-full object-cover" />
                  ) : (
                    <div className="flex h-24 items-center justify-center bg-black/40 px-3 text-center text-[11px] font-semibold text-slate-500">Ảnh không tải được</div>
                  )}
                  <div className="p-2 text-[11px] text-slate-300">
                    <div className="font-bold text-emerald-200">{IMAGE_TYPE_LABEL[image.loaianh]}</div>
                    <div className="mt-1 truncate">{formatDateTime(image.thoigian)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#0a0a0c] border border-white/10 rounded-2xl">
        <button
          onClick={() => setTab("SO_DO")}
          className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl text-[12px] font-bold border transition-colors ${
            tab === "SO_DO" ? "bg-sky-500/15 text-sky-200 border-sky-500/40" : "border-transparent text-slate-400 hover:bg-white/5"
          }`}
        >
          Sơ đồ cắt
        </button>
        <button
          onClick={() => setTab("DE_XUAT")}
          className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl text-[12px] font-bold border transition-colors ${
            tab === "DE_XUAT" ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/40" : "border-transparent text-slate-400 hover:bg-white/5"
          }`}
        >
          Đề xuất phương án
        </button>
      </div>

      {errorMsg && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300">{errorMsg}</div>}

      <div className="space-y-3">
        {tab === "DE_XUAT" ? (
          <>
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-xs leading-relaxed text-cyan-100 mb-3">
              Worker nhập phương án cắt thực tế dựa trên quan sát tại xưởng và gửi Admin duyệt. Đề xuất không thay đổi sơ đồ chính thức cho đến khi Admin xác nhận.
            </div>
            {mapcFilter ? (
              <button
                onClick={() => setShowProposalModal(true)}
                className="w-full h-12 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-bold flex items-center justify-center mb-4 transition-colors"
              >
                <Zap className="w-4 h-4 mr-2" />
                Tạo đề xuất điều chỉnh cho PC-{mapcFilter}
              </button>
            ) : (
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-xs text-cyan-200 mb-4">
                Vui lòng vào màn hình Nhiệm vụ, chọn một Phân công cụ thể để nhập phương án cắt thực tế và gửi Admin duyệt.
              </div>
            )}
            <WorkerProposalsList mapc={mapcFilter || undefined} />
          </>
        ) : loading ? (
          <div className="py-14 flex justify-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : visiblePlans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/2 px-5 py-10 text-center text-sm text-slate-500">
            {mapcFilter ? `Chưa có sơ đồ cắt cho PC-${mapcFilter}.` : "Chưa có sơ đồ cắt nào được giao."}
          </div>
        ) : (
          sortedVisiblePlans.map((plan) => {
            const metrics = getPlanMetrics(plan);
            const isDone = plan.trangthai === "HOAN_THANH";
            const isScrap = plan.khothanhphoi?.trangthai === "BO_DI";
            const hasOpenIssue = plan.trangthai === "DANG_CAT" || Boolean(plan.coSuCoMo);
            const isBlocked = isScrap || hasOpenIssue;
            const planCutImages = cutImagesByMasdc.get(plan.masdc) ?? [];
            const latestCutImage = planCutImages[0];
            const isConfirmed = isDone && planCutImages.length > 0;
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
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg border ${isScrap ? "bg-red-500/15 text-red-300 border-red-500/30" : hasOpenIssue ? "bg-amber-500/15 text-amber-200 border-amber-500/30" : isConfirmed ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : isDone ? "bg-amber-500/15 text-amber-200 border-amber-500/30" : "bg-sky-500/15 text-sky-300 border-sky-500/30"}`}>
                    {isScrap ? "Phôi lỗi" : hasOpenIssue ? "Chờ xử lý lỗi" : isConfirmed ? "Đã xác nhận" : isDone ? "Thiếu ảnh" : "Chờ cắt"}
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
                    <div className="font-bold text-sky-300 inline-flex items-center"><Gauge className="w-3 h-3 mr-1" />{formatPercent(metrics.usageRate)}</div>
                  </div>
                </div>

                <div className="mt-3 h-14 bg-[#15171d] rounded-xl border border-white/10 overflow-hidden flex">
                  {plan.chitietcat.map((cut) => (
                    <div
                      key={cut.mactc}
                      style={{ width: `${metrics.inputLength ? Math.max(7, (cut.chieudaicat / metrics.inputLength) * 100) : 0}%` }}
                      className={`h-full border-r border-black/40 flex min-w-[44px] flex-col items-center justify-center text-[10px] font-bold text-white ${cut.trangthai === "DA_CAT" ? "bg-emerald-500/70" : "bg-blue-500/70"}`}
                    >
                      <span>#{cut.thutucat}</span>
                      <span>{formatMm(cut.chieudaicat).replace("mm", "")}</span>
                    </div>
                  ))}
                  <div className="flex-1 min-w-[48px] bg-amber-500/20 text-[10px] text-amber-200 flex items-center justify-center">
                    dư {formatMm(metrics.remainder).replace(" mm", "")}
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

                {latestCutImage && (
                  <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2">
                    <button
                      type="button"
                      onClick={() => setSelectedImage(latestCutImage)}
                      className="flex w-full items-center gap-3 text-left"
                    >
                      {imageDisplayUrl(latestCutImage) ? (
                        <img
                          src={imageDisplayUrl(latestCutImage) || ""}
                          alt={latestCutImage.mota || "Ảnh xác nhận cắt phôi"}
                          className="h-16 w-16 shrink-0 rounded-lg border border-white/10 object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/30 px-2 text-center text-[10px] font-semibold text-slate-500">
                          Ảnh không tải được
                        </div>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-100">
                          <ImageIcon className="h-3.5 w-3.5" />
                          Ảnh xác nhận cắt phôi
                        </span>
                        <span className="mt-1 block truncate text-[11px] text-slate-300">
                          SDC-{latestCutImage.masdc} · UID-{latestCutImage.maphoi ?? plan.khothanhphoi?.maphoi ?? "chưa có"} · {formatDateTime(latestCutImage.thoigian)}
                        </span>
                      </span>
                      <Eye className="h-4 w-4 shrink-0 text-emerald-200" />
                    </button>
                  </div>
                )}

                {!isDone && !isBlocked && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button onClick={() => openCutPhoto(plan)} disabled={busyId === plan.masdc} className="h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center justify-center disabled:opacity-60">
                      <Camera className="w-4 h-4 mr-2" /> Chụp xác nhận
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

      {showProposalModal && mapcFilter && (
        <ProposalSubmitModal
          mapc={mapcFilter}
          currentPlans={visiblePlans}
          onClose={() => setShowProposalModal(false)}
          onSuccess={() => {
            setShowProposalModal(false);
            setTab("DE_XUAT");
            // Tab will auto reload when unmounted and remounted inside its own effect.
          }}
        />
      )}

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
                <label className="text-xs font-semibold text-slate-300 mb-2 block" htmlFor="issue-severity">Mức độ</label>
                <select
                  id="issue-severity"
                  value={issueSeverity}
                  onChange={(event) => setIssueSeverity(event.target.value as typeof issueSeverity)}
                  className="h-12 w-full bg-[#030508] border border-white/10 rounded-xl px-3 text-sm text-white outline-none focus:border-red-400"
                >
                  {ISSUE_SEVERITIES.map((severity) => (
                    <option key={severity.value} value={severity.value}>{severity.label}</option>
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
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-2 block" htmlFor="issue-suggestion">Đề xuất xử lý</label>
                <textarea
                  id="issue-suggestion"
                  value={issueSuggestion}
                  onChange={(event) => setIssueSuggestion(event.target.value)}
                  rows={2}
                  className="w-full bg-[#030508] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-red-400 resize-none"
                  placeholder="Ví dụ: cắt bỏ đoạn lỗi 300mm hoặc đổi sang UID khác..."
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

      {photoPlan && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center p-3 pb-[84px] sm:items-center sm:pb-3">
          <form onSubmit={submitCutPhoto} className="w-full max-w-md max-h-[calc(100dvh-110px)] bg-[#12141a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-white/10 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-white">Chụp ảnh xác nhận cắt</h3>
                <p className="text-xs text-slate-400 mt-1">
                  SDC-{photoPlan.masdc} · PC-{photoPlan.mapc} · UID-{photoPlan.khothanhphoi?.maphoi ?? "chưa có"}
                </p>
              </div>
              <button type="button" onClick={() => setPhotoPlan(null)} className="text-slate-400 hover:text-white" title="Đóng" aria-label="Đóng"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <label className="block rounded-2xl border border-dashed border-emerald-400/40 bg-emerald-500/10 px-4 py-5 text-center">
                <Camera className="mx-auto h-8 w-8 text-emerald-300" />
                <div className="mt-2 text-sm font-bold text-white">Chụp hoặc chọn ảnh phôi đã cắt</div>
                <div className="mt-1 text-xs text-slate-400">Ảnh sẽ được nén trước khi gửi để thao tác nhanh trên điện thoại.</div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(event) => handlePhotoFile(event.target.files?.[0])}
                />
              </label>

              {photoPreview ? (
                <img src={photoPreview} alt="Ảnh xác nhận cắt" className="h-56 w-full rounded-2xl border border-white/10 object-cover" />
              ) : (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                  Cần có ảnh xác nhận trước khi đánh dấu SDC/phôi đã cắt.
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-2 block" htmlFor="cut-photo-note">Ghi chú ảnh</label>
                <textarea
                  id="cut-photo-note"
                  value={photoNote}
                  onChange={(event) => setPhotoNote(event.target.value)}
                  rows={2}
                  className="w-full bg-[#030508] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400 resize-none"
                  placeholder="Ví dụ: đã cắt xong, phần dư còn đúng UID..."
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-white/10 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setPhotoPlan(null)} className="h-12 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-bold">
                Hủy
              </button>
              <button disabled={busyId === photoPlan.masdc || !photoBlob} className="h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center disabled:opacity-60">
                {busyId === photoPlan.masdc ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />} Gửi xác nhận
              </button>
            </div>
          </form>
        </div>
      )}

      {completionOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center p-3 pb-[84px] sm:items-center sm:pb-3">
          <form onSubmit={submitCompletionPhoto} className="w-full max-w-md max-h-[calc(100dvh-110px)] bg-[#12141a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-white/10 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-white">Xác nhận hoàn thành công trình</h3>
                <p className="mt-1 text-xs text-slate-400">PC-{mapcFilter}</p>
              </div>
              <button type="button" onClick={() => setCompletionOpen(false)} className="text-slate-400 hover:text-white" title="Đóng" aria-label="Đóng"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
                <div>Tất cả phôi/sơ đồ đã được xác nhận cắt.</div>
                <div className="mt-1">Vui lòng chụp hoặc tải ảnh hoàn thiện công trình để hoàn tất.</div>
              </div>
              <label className="block rounded-2xl border border-dashed border-emerald-400/40 bg-emerald-500/10 px-4 py-5 text-center">
                <Camera className="mx-auto h-8 w-8 text-emerald-300" />
                <div className="mt-2 text-sm font-bold text-white">Chụp hoặc chọn ảnh hoàn thiện công trình</div>
                <div className="mt-1 text-xs text-slate-400">Ảnh này khác ảnh xác nhận từng phôi và dùng để đóng phân công.</div>
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
                  Cần có ảnh hoàn thành trước khi đóng phân công.
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-2 block" htmlFor="completion-photo-note-cat">Ghi chú ảnh</label>
                <textarea
                  id="completion-photo-note-cat"
                  value={completionNote}
                  onChange={(event) => setCompletionNote(event.target.value)}
                  rows={2}
                  className="w-full bg-[#030508] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400 resize-none"
                  placeholder="Ví dụ: đã hoàn thiện tổng thể công trình..."
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-white/10 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setCompletionOpen(false)} className="h-12 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-bold">
                Hủy
              </button>
              <button disabled={busyId === mapcFilter || !completionBlob} className="h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center disabled:opacity-60">
                {busyId === mapcFilter ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />} Gửi & hoàn thành
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-3 pb-[84px] sm:items-center sm:pb-3">
          <div className="w-full max-w-lg max-h-[calc(100dvh-110px)] overflow-hidden rounded-2xl border border-white/10 bg-[#12141a] shadow-2xl flex flex-col">
            <div className="px-5 py-4 border-b border-white/10 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-white">{IMAGE_TYPE_LABEL[selectedImage.loaianh]}</h3>
                <p className="mt-1 text-xs text-slate-400">
                  PC-{selectedImage.mapc ?? "—"} · SDC-{selectedImage.masdc ?? "—"} · UID-{selectedImage.maphoi ?? "—"}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedImage(null)} className="text-slate-400 hover:text-white" title="Đóng" aria-label="Đóng"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3">
              {imageDisplayUrl(selectedImage) ? (
                <img src={imageDisplayUrl(selectedImage) || ""} alt={selectedImage.mota || IMAGE_TYPE_LABEL[selectedImage.loaianh]} className="max-h-[58dvh] w-full rounded-xl border border-white/10 object-contain bg-black" />
              ) : (
                <div className="flex min-h-56 items-center justify-center rounded-xl border border-white/10 bg-black px-4 text-sm font-semibold text-slate-500">Ảnh không tải được</div>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <div className="text-slate-500">Thời gian</div>
                  <div className="mt-1 font-semibold text-slate-100">{formatDateTime(selectedImage.thoigian)}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  <div className="text-slate-500">Người chụp</div>
                  <div className="mt-1 font-semibold text-slate-100">{selectedImage.nguoidung?.hoten || selectedImage.nguoichup || "Chưa rõ"}</div>
                </div>
              </div>
              {selectedImage.mota && <p className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300">{selectedImage.mota}</p>}
            </div>
          </div>
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
