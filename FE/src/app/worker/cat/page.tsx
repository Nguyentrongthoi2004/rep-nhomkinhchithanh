/* eslint-disable @next/next/no-img-element */
"use client";

import { Suspense, useCallback, useContext, useEffect, useMemo, useState, useRef } from "react";
import type { FormEvent } from "react";
import { AlertTriangle, ArrowLeft, Camera, Check, Eye, Gauge, ImageIcon, Loader2, QrCode, RefreshCw, Ruler, Scissors, X, Zap } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiData, apiJson, imageDisplayUrl } from "@/lib/api";
import { fileToCompressedImage } from "@/lib/image-upload";
import { calculateCuttingPlanMetrics } from "@/lib/cuttingMetrics";
import WorkerProposalsList from "@/components/worker/WorkerProposalsList";
import ProposalSubmitModal from "@/components/worker/ProposalSubmitModal";
import { WorkerViewContext } from "../context";

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
  const { viewMode } = useContext(WorkerViewContext);
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
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [manualUidInput, setManualUidInput] = useState("");
  interface ScannerType {
    isScanning: boolean;
    stop: () => Promise<void>;
    start: (
      cameraSource: string | { facingMode: string } | Record<string, never>,
      config: {
        fps: number;
        qrbox: (width: number, height: number) => { width: number; height: number };
      },
      successCallback: (decodedText: string) => void,
      errorCallback: (errorMessage: string) => void
    ) => Promise<unknown>;
  }

  const scannerRef = useRef<ScannerType | null>(null);

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

  const locatePlanByPhoi = (maphoiId: number) => {
    const found = plans.find((p) => p.khothanhphoi?.maphoi === maphoiId);
    if (found) {
      const element = document.getElementById(`plan-card-${found.masdc}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("ring-2", "ring-cyan-400", "animate-pulse");
        setTimeout(() => {
          element.classList.remove("ring-2", "ring-cyan-400", "animate-pulse");
        }, 3000);
      }

      if (found.trangthai !== "HOAN_THANH" && found.khothanhphoi?.trangthai !== "BO_DI" && !found.coSuCoMo) {
        openCutPhoto(found);
      } else {
        alert(`Đã tìm thấy phôi UID-${maphoiId.toString().padStart(5, "0")} (Mã SDC-${found.masdc}). Trạng thái: ${found.trangthai === "HOAN_THANH" ? "Đã cắt" : found.trangthai}`);
      }
    } else {
      alert(`Không tìm thấy sơ đồ cắt nào tương ứng với phôi UID-${maphoiId.toString().padStart(5, "0")} trong phân công được giao.`);
    }
  };

  const handleScanSuccess = async (
    text: string,
    scannerInstance: { isScanning: boolean; stop: () => Promise<void> },
  ) => {
    if (scannerInstance && scannerInstance.isScanning) {
      try {
        await scannerInstance.stop();
      } catch (e) {
        console.error("Không dừng được scanner:", e);
      }
    }
    setIsScannerOpen(false);

    const trimmed = text.trim();
    const match = trimmed.match(/UID-(\d+)/i) || trimmed.match(/^(\d+)$/);
    if (!match) {
      alert(`Mã QR không đúng định dạng phôi: "${trimmed}". Cần có định dạng UID-xxxxx.`);
      return;
    }

    const maphoiId = parseInt(match[1], 10);
    locatePlanByPhoi(maphoiId);
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const val = manualUidInput.trim();
    if (!val) return;

    const match = val.match(/UID-(\d+)/i) || val.match(/^(\d+)$/);
    if (!match) {
      alert("Vui lòng nhập đúng định dạng mã, ví dụ: UID-00012 hoặc số 12");
      return;
    }

    const maphoiId = parseInt(match[1], 10);
    setIsScannerOpen(false);
    setManualUidInput("");
    locatePlanByPhoi(maphoiId);
  };

  useEffect(() => {
    if (!isScannerOpen) {
      setCameras([]);
      setActiveCameraId(null);
      setScannerError(null);

      const stopScanner = async () => {
        if (scannerRef.current) {
          if (scannerRef.current.isScanning) {
            try {
              await scannerRef.current.stop();
            } catch (e) {
              console.warn("Lỗi dừng scanner:", e);
            }
          }
          scannerRef.current = null;
        }
      };
      void stopScanner();
      return;
    }

    let isMounted = true;
    let scannerInstance: ScannerType | null = null;

    /** Helper: liệt kê camera mà KHÔNG chiếm luồng phần cứng */
    const listCamerasSafe = async (): Promise<Array<{ id: string; label: string }>> => {
      try {
        const raw = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = raw
          .filter((d) => d.kind === "videoinput" && d.deviceId)
          .map((d) => ({ id: d.deviceId, label: d.label || "" }));
        if (videoDevices.length > 0 && videoDevices[0].label) return videoDevices;

        // Nếu label trống → chưa được cấp quyền, xin quyền rồi thử lại
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Giải phóng luồng ngay lập tức để camera không bị khóa
        tempStream.getTracks().forEach((t) => t.stop());
        // Chờ phần cứng thực sự giải phóng
        await new Promise((r) => setTimeout(r, 300));

        const raw2 = await navigator.mediaDevices.enumerateDevices();
        return raw2
          .filter((d) => d.kind === "videoinput" && d.deviceId)
          .map((d) => ({ id: d.deviceId, label: d.label || "" }));
      } catch {
        return [];
      }
    };

    /** Helper: thử start scanner với 1 nguồn, trả true nếu thành công */
    let lastErrorName = "";
    const tryStart = async (
      scanner: ScannerType,
      source: string | { facingMode: string },
    ): Promise<boolean> => {
      try {
        // Đảm bảo scanner đã dừng trước khi start
        if (scanner.isScanning) {
          try { await scanner.stop(); } catch { /* ignore */ }
          await new Promise((r) => setTimeout(r, 200));
        }
        if (!isMounted) return false;

        await scanner.start(
          source,
          {
            fps: 10,
            qrbox: (width: number, height: number) => {
              const size = Math.min(width, height) * 0.75;
              return { width: size, height: size };
            },
          },
          (decodedText: string) => {
            void handleScanSuccess(decodedText, scanner);
          },
          () => {},
        );
        return true;
      } catch (e) {
        console.warn("tryStart fail:", source, e);
        const errStr = String(e);
        if (errStr.includes("NotReadableError")) lastErrorName = "NotReadableError";
        else if (errStr.includes("NotAllowedError")) lastErrorName = "NotAllowedError";
        else if (errStr.includes("NotFoundError")) lastErrorName = "NotFoundError";
        else lastErrorName = errStr.substring(0, 60);
        return false;
      }
    };

    const initAndStart = async () => {
      // Settle delay — React Strict Mode double-render
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (!isMounted) return;

      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!isMounted) return;

        // 1. Tạo hoặc tái sử dụng scanner instance
        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode("qr-reader-target") as unknown as ScannerType;
        }
        scannerInstance = scannerRef.current;

        // 2. Nếu đang chạy, dừng trước
        if (scannerInstance.isScanning) {
          try { await scannerInstance.stop(); } catch { /* ignore */ }
          await new Promise((r) => setTimeout(r, 200));
        }
        if (!isMounted) return;

        // 3. Liệt kê camera an toàn (không chiếm luồng)
        const devices = await listCamerasSafe();
        if (!isMounted) return;

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent,
        );

        // 4. Xây dựng danh sách nguồn thử theo thứ tự ưu tiên
        const sources: Array<string | { facingMode: string }> = [];

        if (activeCameraId) {
          // Người dùng đã chọn camera cụ thể
          sources.push(activeCameraId);
        } else if (devices.length > 0) {
          if (isMobile) {
            // Ưu tiên camera sau trên mobile
            const backCam = devices.find(
              (d) => d.label && /back|rear|sau|environment/i.test(d.label),
            );
            if (backCam) {
              sources.push(backCam.id);
            } else {
              sources.push({ facingMode: "environment" });
            }
            // Fallback: camera trước
            const frontCam = devices.find(
              (d) => d.label && /front|user|trước/i.test(d.label),
            );
            if (frontCam) sources.push(frontCam.id);
            else sources.push({ facingMode: "user" });
          } else {
            // PC: dùng device ID trực tiếp — luôn hoạt động
            for (const d of devices) {
              sources.push(d.id);
            }
          }
        } else {
          // Không liệt kê được → thử facingMode cuối cùng
          if (isMobile) {
            sources.push({ facingMode: "environment" });
            sources.push({ facingMode: "user" });
          } else {
            sources.push({ facingMode: "user" });
            sources.push({ facingMode: "environment" });
          }
        }

        // 5. Thử từng nguồn cho đến khi thành công
        let started = false;
        for (const src of sources) {
          if (!isMounted) return;
          started = await tryStart(scannerInstance, src);
          if (started) break;
          // Chờ camera release trước khi thử nguồn tiếp theo
          await new Promise((r) => setTimeout(r, 300));
        }

        // 6. Kiểm tra kết quả
        if (!isMounted) {
          if (scannerInstance.isScanning) {
            try { await scannerInstance.stop(); } catch { /* ignore */ }
          }
          return;
        }

        if (!started) {
          if (lastErrorName === "NotReadableError") {
            setScannerError(
              "Camera đang bị chiếm bởi ứng dụng khác hoặc driver camera bị lỗi (NotReadableError). " +
              "Hãy thử: (1) Đóng các ứng dụng dùng camera (Zoom, Teams, OBS...), " +
              "(2) Vào Device Manager → Camera → Click phải → Disable rồi Enable lại, " +
              "(3) Khởi động lại máy tính.",
            );
          } else if (lastErrorName === "NotAllowedError") {
            setScannerError(
              "Trình duyệt bị chặn quyền camera. Nhấp vào biểu tượng ổ khóa 🔒 trên thanh địa chỉ → Cho phép Camera → Tải lại trang.",
            );
          } else if (lastErrorName === "NotFoundError") {
            setScannerError(
              "Không tìm thấy camera trên thiết bị này. Vui lòng kiểm tra xem webcam đã được kết nối và bật chưa.",
            );
          } else {
            setScannerError(
              `Không thể kết nối camera (${lastErrorName || "unknown"}). Vui lòng kiểm tra kết nối thiết bị và đảm bảo trình duyệt có quyền camera.`,
            );
          }
          return;
        }

        setScannerError(null);

        // 7. Cập nhật danh sách camera cho dropdown chọn
        if (devices.length > 0) {
          setCameras(devices);
        } else {
          // Thử lại sau khi đã được cấp quyền
          try {
            const devicesAfter = await listCamerasSafe();
            if (isMounted && devicesAfter.length > 0) {
              setCameras(devicesAfter);
            }
          } catch { /* ignore */ }
        }

      } catch (err: unknown) {
        if (!isMounted) return;
        console.warn("Lỗi không xử lý được khi khởi tạo scanner:", err);
        setScannerError(
          "Không thể kết nối camera. Vui lòng kiểm tra kết nối thiết bị và đảm bảo trình duyệt có quyền camera.",
        );
      }
    };

    void initAndStart();

    return () => {
      isMounted = false;
      if (scannerInstance) {
        const stopOnCleanup = async () => {
          if (scannerInstance && scannerInstance.isScanning) {
            try {
              await scannerInstance.stop();
            } catch (e) {
              console.warn("Lỗi dừng camera trong cleanup:", e);
            }
          }
        };
        void stopOnCleanup();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScannerOpen, activeCameraId]);

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
    <div className={`mx-auto space-y-4 pb-28 ${viewMode === "pc" ? "w-full max-w-[1120px] px-6 pt-7" : "max-w-md px-4 pt-5"}`}>
      <section className={`relative overflow-hidden border border-slate-800 bg-[#0d1118] px-5 py-4 shadow-sm ${viewMode === "pc" ? "rounded-2xl" : "rounded-3xl"}`}>
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
            <h2 className={`${viewMode === "pc" ? "text-2xl text-white" : "text-xl brand-name"} font-extrabold mt-1 leading-tight`}>Sơ đồ cắt được giao</h2>
            <p className="text-xs text-slate-400 mt-1">Chọn đúng UID phôi, cắt theo thứ tự và báo sự cố ngay khi thấy lỗi.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-200"
              title="Quét QR Phôi"
              aria-label="Quét QR Phôi"
            >
              <QrCode className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={load}
              className="w-11 h-11 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-200"
              title="Tải lại"
              aria-label="Tải lại"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
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
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600"
            >
              <Camera className="mr-2 h-4 w-4" />
              <span className="whitespace-nowrap">Chụp ảnh</span>
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {completionImages.map((image) => {
              const viewUrl = imageDisplayUrl(image);
              return (
                <button
                  key={image.maha}
                  type="button"
                  onClick={() => setSelectedImage(image)}
                  className="group overflow-hidden rounded-2xl border border-emerald-500/20 bg-[#081512] text-left transition-colors hover:border-emerald-400/40"
                >
                  <div className="relative aspect-video overflow-hidden bg-black">
                    {viewUrl ? (
                      <img src={viewUrl} alt={image.mota || "Ảnh hoàn thành công trình"} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-black/40 px-3 text-center text-[11px] font-semibold text-slate-500">Ảnh không tải được</div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 to-transparent p-3">
                      <div className="text-xs font-black text-white">{IMAGE_TYPE_LABEL[image.loaianh]}</div>
                      <div className="mt-0.5 truncate text-[10px] text-emerald-100/80">{formatDateTime(image.thoigian)}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className={`grid grid-cols-2 gap-1.5 border border-slate-800 bg-[#0b0e13] ${viewMode === "pc" ? "max-w-xl rounded-xl p-1" : "rounded-2xl p-1"}`}>
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

      <div className={tab === "SO_DO" && viewMode === "pc" ? "grid grid-cols-2 gap-4 2xl:grid-cols-3" : "space-y-3"}>
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
              <div key={plan.masdc} id={`plan-card-${plan.masdc}`} className={`rounded-2xl border p-4 transition-all duration-300 ${isScrap ? "border-red-500/30 bg-red-500/5" : isDone ? "border-emerald-500/20 bg-emerald-500/5" : "border-slate-800 bg-[#0d1118]"}`}>
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
        {isScannerOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
            <style>{`
              @keyframes scan {
                0% { top: 5%; }
                50% { top: 95%; }
                100% { top: 5%; }
              }
              .scan-line {
                position: absolute;
                left: 0;
                right: 0;
                height: 2px;
                background-color: rgba(34, 211, 238, 0.8);
                box-shadow: 0 0 8px rgba(34, 211, 238, 0.8);
                animation: scan 2.5s linear infinite;
              }
            `}</style>
            <div className="flex max-h-[95vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121214] shadow-2xl pb-20 sm:pb-0">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 bg-[#0a0a0c] px-5 py-4">
                <div className="flex items-center space-x-2 text-cyan-300">
                  <QrCode className="h-5 w-5 animate-pulse" />
                  <h3 className="text-lg font-bold text-white">Quét QR Tìm Phôi Được Giao</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(false)}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Đóng máy quét"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Main Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                
                {/* Error/Notice Banner */}
                {scannerError ? (
                  <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-300 leading-relaxed space-y-2">
                    <div>{scannerError}</div>
                    <button
                      type="button"
                      onClick={() => {
                        setScannerError(null);
                        setActiveCameraId(null);
                        setIsScannerOpen(false);
                        setTimeout(() => setIsScannerOpen(true), 400);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/20 border border-red-500/30 px-3 py-1.5 text-[11px] font-bold text-red-200 hover:bg-red-500/30 transition-colors"
                    >
                      🔄 Thử lại
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center">
                    Cấp quyền camera và đưa mã QR của phôi nhôm (UID-xxxxx) vào trung tâm khung hình.
                  </p>
                )}

                {/* Scanner Camera View */}
                <div className="relative mx-auto w-full aspect-square max-w-[280px] overflow-hidden rounded-xl border border-white/10 bg-black">
                  <div id="qr-reader-target" className="h-full w-full" />
                  
                  {/* Overlay decorative corners for scanner */}
                  <div className="pointer-events-none absolute inset-0 border-[3px] border-transparent">
                    <div className="absolute top-4 left-4 h-6 w-6 border-t-[3px] border-l-[3px] border-cyan-400 rounded-tl-md"></div>
                    <div className="absolute top-4 right-4 h-6 w-6 border-t-[3px] border-r-[3px] border-cyan-400 rounded-tr-md"></div>
                    <div className="absolute bottom-4 left-4 h-6 w-6 border-b-[3px] border-l-[3px] border-cyan-400 rounded-bl-md"></div>
                    <div className="absolute bottom-4 right-4 h-6 w-6 border-b-[3px] border-r-[3px] border-cyan-400 rounded-br-md"></div>
                  </div>
                  
                  {/* Scanning scan line animation */}
                  {!scannerError && (
                    <div className="scan-line"></div>
                  )}
                </div>

                {/* Camera Selection */}
                {cameras.length > 1 && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Chọn Camera</label>
                    <select
                      value={activeCameraId || ""}
                      onChange={(e) => setActiveCameraId(e.target.value || null)}
                      className="w-full bg-[#0a0a0c] border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">Camera Mặc định (Ưu tiên camera sau)</option>
                      {cameras.map((cam) => (
                        <option key={cam.id} value={cam.id}>
                          {cam.label || `Camera ${cameras.indexOf(cam) + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Divider */}
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-white/5"></div>
                  <span className="flex-shrink mx-4 text-[10px] text-gray-500 font-bold uppercase tracking-widest">Hoặc Nhập Thủ Công</span>
                  <div className="flex-grow border-t border-white/5"></div>
                </div>

                {/* Fallback Manual Input form */}
                <form onSubmit={handleManualSearch} className="flex gap-2">
                  <input
                    type="text"
                    value={manualUidInput}
                    onChange={(e) => setManualUidInput(e.target.value)}
                    placeholder="Ví dụ: UID-00012 hoặc 12"
                    className="flex-1 bg-[#0a0a0c] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <button
                    type="submit"
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    Tìm
                  </button>
                </form>

              </div>
              
              {/* Footer */}
              <div className="bg-[#0a0a0c] border-t border-white/5 px-5 py-3.5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(false)}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-medium px-4 py-2 rounded-lg text-xs transition-colors"
                >
                  Đóng
                </button>
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
