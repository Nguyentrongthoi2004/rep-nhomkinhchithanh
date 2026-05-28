"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Gauge,
  Info,
  ListChecks,
  Loader2,
  PackagePlus,
  Play,
  RefreshCw,
  Ruler,
  Scissors,
  TrendingUp,
  X,
} from "lucide-react";
import { apiData } from "@/lib/api";
import { calculateCuttingPlanMetrics } from "@/lib/cuttingMetrics";

type BomRow = {
  mactdh: number;
  mota: string | null;
  chieudaicat: number | null;
  soluong: number | null;
  vattu: { tenvt: string | null; mau?: string | null; donvitinh?: string | null } | null;
};

type AssignmentRow = {
  mapc: number;
  trangthai: string | null;
  ngayphancong?: string | null;
  ngaytao?: string | null;
  created_at?: string | null;
  donhang: {
    madh: number;
    trangthai?: string | null;
    khachhang: { hoten: string | null } | null;
    chitietdh?: BomRow[] | null;
  } | null;
  nguoidung: { hoten: string | null } | null;
};

type CutDetail = {
  mactc: number;
  thutucat: number;
  chieudaicat: number;
  trangthai: string;
  chitietdh: {
    mactdh?: number;
    mota: string | null;
    vattu: { tenvt: string | null; mau?: string | null } | null;
  } | null;
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
    trangthai?: string;
    vattu: { tenvt: string | null } | null;
  } | null;
  chitietcat: CutDetail[];
};

type StockShortage = {
  mavt: number;
  tenvt: string;
  requiredSegments: number[];
  availableStock: number;
  suggestedStockLength: number;
  neededBars: number;
};

type ShortageDetails = {
  message?: string;
  shortages?: StockShortage[];
};

type SupplementDraft = {
  [mavt: number]: {
    quantity: number;
    length: number;
  };
};

type CuttingPlanMetrics = {
  totalRequiredLength?: number;
  totalKerfLoss?: number;
  totalStockLength?: number;
  totalReusableRemainder?: number;
  totalScrapLength?: number;
  productUtilizationRate?: number;
  materialUsageRate?: number;
  selectedReasons?: string[];
};

type CreatePlanResponse =
  | CuttingPlan[]
  | {
      plans?: CuttingPlan[];
      metrics?: CuttingPlanMetrics;
      warnings?: string[];
      shortages?: StockShortage[];
    };

function assignmentStatusLabel(status?: string | null) {
  switch ((status || "").toUpperCase()) {
    case "CHO_NHAN":
    case "CHO_THUC_HIEN":
      return "Chờ nhận";
    case "DANG_LAM":
    case "DANG_THUC_HIEN":
    case "DANG_CAT":
      return "Đang làm";
    case "HOAN_THANH":
    case "DA_XONG":
      return "Hoàn thành";
    case "TU_CHOI":
      return "Từ chối";
    case "CHO_DUYET":
      return "Chờ duyệt";
    default:
      return status || "Chưa rõ";
  }
}

function planStatusLabel(status?: string | null) {
  switch ((status || "").toUpperCase()) {
    case "CHO_DUYET":
      return "Chờ duyệt";
    case "DANG_CAT":
      return "Đang cắt";
    case "HOAN_THANH":
      return "Hoàn thành";
    case "DA_CAT":
      return "Đã cắt";
    case "HUY":
      return "Đã hủy";
    default:
      return status || "Chưa rõ";
  }
}

function planStatusClass(status?: string | null) {
  const normalized = (status || "").toUpperCase();
  if (["HOAN_THANH", "DA_CAT"].includes(normalized)) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }
  if (normalized === "DANG_CAT") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }
  if (normalized === "HUY") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  }
  return "border-sky-500/30 bg-sky-500/10 text-sky-300";
}

function cutStatusLabel(status?: string | null) {
  switch ((status || "").toUpperCase()) {
    case "CHO_CAT":
      return "Chờ cắt";
    case "DANG_CAT":
      return "Đang cắt";
    case "DA_CAT":
      return "Đã cắt";
    case "LOI":
      return "Lỗi";
    default:
      return status || "Chưa rõ";
  }
}

function stockSourceLabel(status?: string | null) {
  switch ((status || "").toUpperCase()) {
    case "CON_DU":
      return "Tái sử dụng phôi dư";
    case "MOI":
      return "Thanh nguyên mới";
    case "BO_DI":
      return "Phôi bỏ đi";
    default:
      return "Nguồn phôi chưa rõ";
  }
}

function stockSourceClass(status?: string | null) {
  switch ((status || "").toUpperCase()) {
    case "CON_DU":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "MOI":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "BO_DI":
      return "border-rose-500/30 bg-rose-500/10 text-rose-300";
    default:
      return "border-zinc-700 bg-zinc-900 text-zinc-300";
  }
}

function formatMm(value?: number | null) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return `${Math.round(number).toLocaleString("vi-VN")} mm`;
}

function formatPercent(value?: number | null) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return `${number.toFixed(number % 1 === 0 ? 0 : 1)}%`;
}

function toPositiveInt(value: unknown, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.ceil(number);
}

function getShortageDetails(error: unknown): ShortageDetails | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as {
    details?: ShortageDetails;
    cause?: { details?: ShortageDetails };
  };
  return candidate.details || candidate.cause?.details || null;
}

function getPlanMetrics(plan: CuttingPlan) {
  const cuts = plan.chitietcat || [];
  const metrics = calculateCuttingPlanMetrics(plan);

  return {
    used: metrics.usedLength,
    inputLength: metrics.inputLength,
    remainder: metrics.remainder,
    utilization: metrics.usageRate,
    cutsCount: cuts.length,
  };
}

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "good" | "warn";
}) {
  const valueClass =
    tone === "good" ? "text-emerald-300" : tone === "warn" ? "text-amber-300" : "text-white";
  return (
    <div className="rounded-xl border border-zinc-800 bg-black/30 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 text-base font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

// Ngưỡng mặc định dùng khi FE không nhận được config từ API.
// Giá trị thật do Admin cấu hình trong bảng quytac (BLADE_KERF, SAFE_MARGIN, MIN_SCRAP, MIN_REUSABLE_LENGTH).
const DEFAULT_MIN_SCRAP = 100;
const DEFAULT_MIN_REUSABLE_LENGTH = 1500;

function evaluateBarRemainder(remainder: number, sourceStatus?: string | null) {
  const scrapThreshold = DEFAULT_MIN_SCRAP;
  const minReusableLength = DEFAULT_MIN_REUSABLE_LENGTH;

  let scoreEstimate = 0;
  const reasons: string[] = [];

  if (remainder < scrapThreshold) {
    scoreEstimate = 1200 - remainder * 0.02;
    reasons.push("Phần dư rất ngắn, tối ưu hóa triệt để thanh phôi.");
  } else if (remainder >= minReusableLength) {
    scoreEstimate = 700 + Math.min(remainder / 25, 350);
    reasons.push("Phần dư đủ dài để đưa vào kho tái sử dụng (>= 1.5m).");
  } else {
    const middle = Math.max(1, minReusableLength - scrapThreshold);
    const awkwardRatio = (remainder - scrapThreshold) / middle;
    scoreEstimate = -850 - awkwardRatio * 450;
    reasons.push("Cảnh báo: Tạo ra phần dư lỡ cỡ khó tái sử dụng, gây lãng phí.");
  }

  if (sourceStatus === "CON_DU") {
    scoreEstimate += 120;
    reasons.push("Ưu tiên sử dụng phôi dư để dọn kho.");
  }

  return {
    score: Math.round(scoreEstimate),
    reasons
  };
}

export default function CuttingOptimizationDetailPage() {
  const params = useParams<{ mapc: string }>();
  const mapc = useMemo(() => Number(params.mapc), [params.mapc]);

  const [assignment, setAssignment] = useState<AssignmentRow | null>(null);
  const [plans, setPlans] = useState<CuttingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [shortages, setShortages] = useState<StockShortage[]>([]);
  const [supplementDraft, setSupplementDraft] = useState<SupplementDraft>({});
  const [errorMsg, setErrorMsg] = useState("");
  const [planMetrics, setPlanMetrics] = useState<CuttingPlanMetrics | null>(null);
  const [expandedPlans, setExpandedPlans] = useState<Set<number>>(new Set());
  const [isBomExpanded, setIsBomExpanded] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(mapc) || mapc <= 0) {
      setError("Mã phân công không hợp lệ.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [assignmentRows, planRows] = await Promise.all([
        apiData<AssignmentRow[]>("/api/admin/assignments"),
        apiData<CuttingPlan[]>(`/api/admin/cutting-plans/assignment/${mapc}`),
      ]);
      setAssignment(assignmentRows.find((item) => item.mapc === mapc) || null);
      setPlans(planRows);
      setPlanMetrics(null);
      if (!assignmentRows.some((item) => item.mapc === mapc)) {
        setError(`Không tìm thấy phân công PC-${mapc}.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu phân công.");
    } finally {
      setLoading(false);
    }
  }, [mapc]);

  useEffect(() => {
    void load();
  }, [load]);

  const togglePlan = useCallback((masdc: number) => {
    setExpandedPlans((current) => {
      const next = new Set(current);
      if (next.has(masdc)) {
        next.delete(masdc);
      } else {
        next.add(masdc);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const draft: SupplementDraft = {};
    shortages.forEach((item) => {
      draft[item.mavt] = {
        quantity: toPositiveInt(item.neededBars, 1),
        length: toPositiveInt(item.suggestedStockLength, 6000),
      };
    });
    setSupplementDraft(draft);
  }, [shortages]);

  const bomRows = assignment?.donhang?.chitietdh || [];

  const bomStats = useMemo(() => {
    let totalQty = 0;
    let totalLen = 0;
    bomRows.forEach((row) => {
      const q = Number(row.soluong || 0);
      const l = Number(row.chieudaicat || 0);
      totalQty += q;
      totalLen += q * l;
    });
    return { totalQty, totalLen };
  }, [bomRows]);

  useEffect(() => {
    if (bomRows.length > 0 && isBomExpanded === null) {
      setIsBomExpanded(bomRows.length <= 4);
    }
  }, [bomRows, isBomExpanded]);

  const warnings = useMemo(() => {
    const items: string[] = [];
    if (!plans.length) items.push("Phân công này chưa có sơ đồ cắt.");
    if ((assignment?.trangthai || "").toUpperCase() === "HOAN_THANH") {
      items.push("Phân công đã hoàn thành, cần cân nhắc trước khi tạo lại sơ đồ.");
    }
    if (plans.some((plan) => (plan.trangthai || "").toUpperCase() === "CHO_DUYET")) {
      items.push("Có sơ đồ đang ở trạng thái chờ duyệt.");
    }
    if (plans.some((plan) => (plan.trangthai || "").toUpperCase() === "DANG_CAT" || plan.coSuCoMo)) {
      items.push("Có sơ đồ đang cắt hoặc có sự cố mở, không nên tạo lại khi chưa xử lý xong.");
    }
    if (plans.some((plan) => (plan.trangthai || "").toUpperCase() === "HOAN_THANH")) {
      items.push("Có sơ đồ đã hoàn thành, việc tạo lại có thể gây lệch dữ liệu sản xuất.");
    }
    return items;
  }, [assignment?.trangthai, plans]);

  const generate = async () => {
    if (!mapc) return;
    setGenerating(true);
    setShortages([]);
    setErrorMsg("");
    setPlanMetrics(null);
    try {
      const response = await apiData<CreatePlanResponse>("/api/admin/cutting-plans", {
        method: "POST",
        body: JSON.stringify({ mapc }),
      });
      const nextPlans = Array.isArray(response) ? response : response.plans || [];
      setPlans(nextPlans);
      setPlanMetrics(Array.isArray(response) ? null : response.metrics || null);
    } catch (err) {
      const details = getShortageDetails(err);
      if (details?.shortages?.length) {
        setShortages(details.shortages);
        setErrorMsg(details.message || "Không đủ phôi phù hợp để tạo sơ đồ cắt.");
      } else {
        setErrorMsg(err instanceof Error ? err.message : "Không tạo được sơ đồ cắt.");
      }
    } finally {
      setGenerating(false);
    }
  };

  const importSupplementStock = async () => {
    if (!shortages.length) return;
    setImporting(true);
    setErrorMsg("");
    try {
      await Promise.all(
        shortages.map((item) => {
          const draft = supplementDraft[item.mavt] || {
            quantity: item.neededBars,
            length: item.suggestedStockLength,
          };
          return apiData("/api/admin/raw-stock", {
            method: "POST",
            body: JSON.stringify({
              mavt: item.mavt,
              soluong: toPositiveInt(draft.quantity, 1),
              chieudai: toPositiveInt(draft.length, item.suggestedStockLength || 6000),
            }),
          });
        }),
      );
      setShortages([]);
      setSupplementDraft({});
      await generate();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Không nhập bổ sung được phôi.");
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        Đang tải chi tiết phân công...
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/toi-uu-cat"
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-300 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
        </Link>
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-100">
          {error || "Không tìm thấy phân công."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <Link
              href="/admin/toi-uu-cat"
              className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-white">
                  PC-{assignment.mapc} /{" "}
                  {assignment.donhang?.madh ? `DH-${assignment.donhang.madh}` : "Chưa có đơn"}
                </h1>
                <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-bold text-zinc-300">
                  {assignmentStatusLabel(assignment.trangthai)}
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-400">
                {assignment.donhang?.khachhang?.hoten || "Chưa có khách hàng"} ·{" "}
                {assignment.nguoidung?.hoten || "Chưa có worker"}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500"
            >
              <RefreshCw className="h-4 w-4" />
              Tải lại
            </button>
            <button
              type="button"
              disabled={generating}
              onClick={() => void generate()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-rose-950/30 transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Tạo sơ đồ cắt
            </button>
          </div>
        </div>
      </section>

      {warnings.length > 0 && (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-300" />
            <div>
              <p className="font-bold text-amber-100">Cảnh báo nghiệp vụ</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-100/80">
                {warnings.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {errorMsg && (
        <section className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-100">
          {errorMsg}
        </section>
      )}

      {shortages.length > 0 && (
        <section className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-100">
                <PackagePlus className="h-5 w-5" />
                <h2 className="text-lg font-bold">Đề xuất nhập bổ sung vật tư</h2>
              </div>
              <p className="mt-1 text-sm text-amber-100/75">
                Kho hiện tại chưa đủ phôi phù hợp. Admin xác nhận nhập bổ sung rồi hệ thống sẽ chạy lại tối ưu.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShortages([])}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 text-amber-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-amber-500/30">
            <table className="min-w-full divide-y divide-amber-500/20 text-sm">
              <thead className="bg-black/20 text-left text-xs uppercase text-amber-100/70">
                <tr>
                  <th className="px-4 py-3">Vật tư thiếu</th>
                  <th className="px-4 py-3">Đoạn cần cắt</th>
                  <th className="px-4 py-3">Phôi hiện có</th>
                  <th className="px-4 py-3">Cần nhập</th>
                  <th className="px-4 py-3">Chiều dài đề xuất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-500/15">
                {shortages.map((item) => (
                  <tr key={item.mavt}>
                    <td className="px-4 py-3">
                      <p className="font-bold text-white">{item.tenvt}</p>
                      <p className="text-xs text-amber-100/60">VT-{item.mavt}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-200">
                      {item.requiredSegments.map((segment) => formatMm(segment)).join(", ")}
                    </td>
                    <td className="px-4 py-3 text-zinc-200">{item.availableStock} phôi</td>
                    <td className="px-4 py-3">
                      <input
                        value={supplementDraft[item.mavt]?.quantity ?? item.neededBars}
                        onChange={(event) =>
                          setSupplementDraft((current) => ({
                            ...current,
                            [item.mavt]: {
                              quantity: toPositiveInt(event.target.value, 1),
                              length:
                                current[item.mavt]?.length ||
                                toPositiveInt(item.suggestedStockLength, 6000),
                            },
                          }))
                        }
                        className="w-24 rounded-lg border border-amber-500/30 bg-black/30 px-3 py-2 text-white"
                        inputMode="numeric"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        value={supplementDraft[item.mavt]?.length ?? item.suggestedStockLength}
                        onChange={(event) =>
                          setSupplementDraft((current) => ({
                            ...current,
                            [item.mavt]: {
                              quantity:
                                current[item.mavt]?.quantity || toPositiveInt(item.neededBars, 1),
                              length: toPositiveInt(event.target.value, 6000),
                            },
                          }))
                        }
                        className="w-32 rounded-lg border border-amber-500/30 bg-black/30 px-3 py-2 text-white"
                        inputMode="numeric"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              disabled={importing}
              onClick={() => void importSupplementStock()}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
              Nhập bổ sung
            </button>
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <ListChecks className="h-5 w-5 text-cyan-300" />
              Thông tin phân công
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Mã phân công</dt>
                <dd className="font-semibold text-white">PC-{assignment.mapc}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Đơn hàng</dt>
                <dd className="font-semibold text-white">
                  {assignment.donhang?.madh ? `DH-${assignment.donhang.madh}` : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Khách hàng</dt>
                <dd className="text-right font-semibold text-white">
                  {assignment.donhang?.khachhang?.hoten || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Worker</dt>
                <dd className="text-right font-semibold text-white">{assignment.nguoidung?.hoten || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Trạng thái</dt>
                <dd className="font-semibold text-white">{assignmentStatusLabel(assignment.trangthai)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Gauge className="h-5 w-5 text-amber-300" />
              Tiêu chí tối ưu
            </h2>
            <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
              <p className="font-bold text-amber-100">Cân bằng mặc định</p>
              <p className="mt-2 text-sm leading-6 text-amber-100/75">
                Hệ thống đang dùng heuristic mặc định: giảm hao hụt, ưu tiên phôi dư, tránh dư lỡ cỡ
                và giữ cây dài khi cần.
              </p>
            </div>
          </section>

          {planMetrics && (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <TrendingUp className="h-5 w-5 text-emerald-300" />
                Metrics lần tạo gần nhất
              </h2>
              <div className="mt-4 grid gap-3">
                <Metric label="Tổng chiều dài cần cắt" value={formatMm(planMetrics.totalRequiredLength)} />
                <Metric label="Hao hụt kerf" value={formatMm(planMetrics.totalKerfLoss)} tone="warn" />
                <Metric
                  label="Phần dư tái sử dụng"
                  value={formatMm(planMetrics.totalReusableRemainder)}
                  tone="good"
                />
                <Metric label="Phế liệu" value={formatMm(planMetrics.totalScrapLength)} tone="warn" />
                <Metric
                  label="Tỷ lệ thành phẩm"
                  value={formatPercent(planMetrics.productUtilizationRate)}
                  tone="good"
                />
                <Metric label="Tỷ lệ tiêu hao" value={formatPercent(planMetrics.materialUsageRate)} />
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <Ruler className="h-5 w-5 text-cyan-300" />
                BOM cần cắt
              </h2>
              {bomRows.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsBomExpanded(!isBomExpanded)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-xs font-semibold text-zinc-400 transition hover:border-zinc-700 hover:text-white"
                >
                  {isBomExpanded ? "Thu gọn BOM" : "Xem BOM cần cắt"}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isBomExpanded ? "rotate-180" : ""}`} />
                </button>
              )}
            </div>

            {bomRows.length > 0 ? (
              <div className="space-y-4">
                {/* Summary bar - always visible */}
                <div className="mt-4 p-4 rounded-xl border border-zinc-800 bg-black/20 text-sm text-zinc-400 flex flex-wrap gap-x-6 gap-y-2">
                  <div>Dòng BOM: <strong className="text-white">{bomRows.length}</strong></div>
                  <div>Tổng số lượng: <strong className="text-white">{bomStats.totalQty}</strong> thanh</div>
                  <div>Tổng chiều dài: <strong className="text-cyan-300">{formatMm(bomStats.totalLen)}</strong></div>
                </div>

                {isBomExpanded && (
                  <div className="overflow-x-auto rounded-xl border border-zinc-800 animate-in fade-in slide-in-from-top-1 duration-200">
                    <table className="min-w-full divide-y divide-zinc-800 text-sm">
                      <thead className="bg-zinc-900/70 text-left text-xs uppercase text-zinc-500">
                        <tr>
                          <th className="px-4 py-3">Mã CT</th>
                          <th className="px-4 py-3">Vật tư</th>
                          <th className="px-4 py-3">Mô tả</th>
                          <th className="px-4 py-3">Chiều dài</th>
                          <th className="px-4 py-3">SL</th>
                          <th className="px-4 py-3">Tổng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900">
                        {bomRows.map((row) => {
                          const quantity = Number(row.soluong || 0);
                          const length = Number(row.chieudaicat || 0);
                          return (
                            <tr key={row.mactdh}>
                              <td className="px-4 py-3 font-semibold text-cyan-200">CT-{row.mactdh}</td>
                              <td className="px-4 py-3 text-white font-medium">
                                {row.vattu?.tenvt || "—"}
                                {row.vattu?.donvitinh ? (
                                  <span className="mt-1 block text-xs text-zinc-500 font-normal">Đơn vị: {row.vattu.donvitinh}</span>
                                ) : null}
                              </td>
                              <td className="px-4 py-3 text-zinc-400">{row.mota || "—"}</td>
                              <td className="px-4 py-3 text-zinc-200">{formatMm(length)}</td>
                              <td className="px-4 py-3 text-zinc-200">{quantity || "—"}</td>
                              <td className="px-4 py-3 font-semibold text-white">
                                {quantity && length ? formatMm(quantity * length) : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-zinc-800 bg-black/20 p-6 text-center text-sm text-zinc-500">
                Đơn hàng này chưa có chi tiết BOM.
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                  <Scissors className="h-5 w-5 text-cyan-300" />
                  Sơ đồ đã lưu
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Worker sẽ thấy các sơ đồ này ở màn hình Máy cắt.
                </p>
              </div>
              <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs font-bold text-zinc-300">
                {plans.length} sơ đồ
              </span>
            </div>

            {plans.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-zinc-800 bg-black/20 p-10 text-center text-zinc-500">
                Chưa có sơ đồ cắt cho phân công này.
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                {plans.map((plan) => {
                  const metrics = getPlanMetrics(plan);
                  const usedPercent =
                    metrics.utilization == null
                      ? 0
                      : Math.max(0, Math.min(100, metrics.utilization));
                  const remainderPercent = metrics.utilization == null ? 0 : Math.max(0, 100 - usedPercent);
                  const isExpanded = expandedPlans.has(plan.masdc);

                  return (
                    <article key={plan.masdc} className="rounded-2xl border border-zinc-800 bg-black/25 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold text-white">SDC-{plan.masdc}</h3>
                            <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-bold text-amber-300">
                              UID-{plan.khothanhphoi?.maphoi || "—"}
                            </span>
                            <span
                              className={`rounded-lg border px-2 py-1 text-xs font-bold ${stockSourceClass(
                                plan.khothanhphoi?.trangthai,
                              )}`}
                            >
                              {stockSourceLabel(plan.khothanhphoi?.trangthai)}
                            </span>
                          </div>
                          <p className="mt-2 font-semibold text-white">
                            {plan.khothanhphoi?.vattu?.tenvt || "Chưa rõ vật tư"}
                          </p>
                          <p className="mt-1 text-sm text-zinc-500">Mã phân công PC-{plan.mapc}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`w-fit rounded-xl border px-3 py-2 text-xs font-bold ${planStatusClass(
                              plan.trangthai,
                            )}`}
                          >
                            {planStatusLabel(plan.trangthai)}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePlan(plan.masdc)}
                            aria-expanded={isExpanded}
                            className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-200 transition hover:border-cyan-500/60 hover:text-cyan-200"
                          >
                            {isExpanded ? "Thu gọn" : "Xem chi tiết"}
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            />
                          </button>
                        </div>
                      </div>

                      {!isExpanded ? (
                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-400">
                          <span className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                            Đã dùng <strong className="text-emerald-300">{formatMm(metrics.used)}</strong>
                          </span>
                          <span className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                            Dư <strong className="text-amber-300">{formatMm(metrics.remainder)}</strong>
                          </span>
                          <span className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                            {metrics.cutsCount} nhát cắt
                          </span>
                          <span className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                            Tỷ lệ <strong className="text-cyan-300">{formatPercent(metrics.utilization)}</strong>
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                            <Metric label="Chiều dài đầu vào" value={formatMm(metrics.inputLength)} />
                            <Metric label="Chiều dài gốc" value={formatMm(plan.khothanhphoi?.chieudaibandau)} />
                            <Metric label="Đã sử dụng" value={formatMm(metrics.used)} tone="good" />
                            <Metric label="Phần dư sau cắt" value={formatMm(metrics.remainder)} tone="warn" />
                            <Metric label="Số nhát cắt" value={`${metrics.cutsCount}`} />
                            <Metric label="Tỷ lệ dùng" value={formatPercent(metrics.utilization)} tone="good" />
                          </div>

                          <div className="mt-4">
                            <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
                              <span>Thanh biểu diễn sơ đồ cắt</span>
                              <span>
                                Dùng {formatMm(metrics.used)} / {formatMm(metrics.inputLength)}
                              </span>
                            </div>
                            <div className="flex h-16 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                              {plan.chitietcat.map((cut, index) => {
                                const width = metrics.inputLength
                                  ? Math.max(7, (Number(cut.chieudaicat || 0) / metrics.inputLength) * 100)
                                  : 0;
                                return (
                                  <div
                                    key={cut.mactc}
                                    className="flex items-center justify-center border-r border-black/30 bg-cyan-700 text-center text-[11px] font-bold text-white odd:bg-emerald-700"
                                    style={{ width: `${width}%` }}
                                    title={`${cut.chitietdh?.mota || "Nhát cắt"} - ${formatMm(cut.chieudaicat)}`}
                                  >
                                    #{index + 1}
                                    <br />
                                    {Math.round(cut.chieudaicat).toLocaleString("vi-VN")}
                                  </div>
                                );
                              })}
                              <div
                                className="flex min-w-12 items-center justify-center bg-amber-900/70 px-2 text-center text-[11px] font-bold text-amber-100"
                                style={{ width: `${remainderPercent}%` }}
                                title={`Phần dư sau cắt ${formatMm(metrics.remainder)}`}
                              >
                                Dư {metrics.remainder == null ? "—" : Math.round(metrics.remainder).toLocaleString("vi-VN")}
                              </div>
                            </div>
                          </div>

                          {/* Bar Optimization Score Explainer */}
                          {(() => {
                            const remainderVal = metrics.remainder ?? 0;
                            const barEval = evaluateBarRemainder(remainderVal, plan.khothanhphoi?.trangthai);
                            const isAwkward = remainderVal >= DEFAULT_MIN_SCRAP && remainderVal < DEFAULT_MIN_REUSABLE_LENGTH;
                            return (
                              <div className={`mt-4 p-4 border rounded-xl bg-zinc-950/40 text-xs space-y-2 ${
                                isAwkward 
                                  ? "border-amber-500/20 text-amber-200" 
                                  : "border-emerald-500/20 text-emerald-200"
                              }`}>
                                <div className="flex items-center justify-between font-bold">
                                  <span className="flex items-center gap-1.5">
                                    <Info className="w-3.5 h-3.5" />
                                    Đánh giá tham khảo: {isAwkward ? "Cần lưu ý phần dư lỡ cỡ" : "Tối ưu tốt"}
                                  </span>
                                  <span>Điểm tham khảo: {barEval.score}</span>
                                </div>
                                <ul className="list-disc pl-4 space-y-1 opacity-90">
                                  {barEval.reasons.map((r, i) => (
                                    <li key={i}>{r}</li>
                                  ))}
                                </ul>
                                <div className="text-[10px] opacity-50 italic pt-1 border-t border-white/5">
                                  * Đánh giá tham khảo dựa trên ngưỡng mặc định. Ngưỡng thực tế do Admin cấu hình.
                                </div>
                              </div>
                            );
                          })()}

                          <details className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/70">
                            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-bold text-white">
                              <span className="inline-flex items-center gap-2">
                                <ListChecks className="h-4 w-4 text-cyan-300" />
                                Chi tiết nhát cắt
                              </span>
                              <ChevronDown className="h-4 w-4 text-zinc-500" />
                            </summary>
                            <div className="divide-y divide-zinc-900">
                              {plan.chitietcat.map((cut) => (
                                <div key={cut.mactc} className="grid gap-3 px-4 py-3 text-sm md:grid-cols-[80px_1fr_130px_130px]">
                                  <div className="font-bold text-cyan-200">#{cut.thutucat}</div>
                                  <div>
                                    <p className="font-semibold text-white">{cut.chitietdh?.mota || "Nhát cắt"}</p>
                                    <p className="mt-1 text-xs text-zinc-500">
                                      {cut.chitietdh?.vattu?.tenvt || plan.khothanhphoi?.vattu?.tenvt || "—"}
                                    </p>
                                  </div>
                                  <div className="font-semibold text-zinc-200">{formatMm(cut.chieudaicat)}</div>
                                  <div className="text-zinc-400">{cutStatusLabel(cut.trangthai)}</div>
                                </div>
                              ))}
                            </div>
                          </details>
                        </>
                      )}
                    </article>
                  );
                })}
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Worker sẽ thấy các sơ đồ này ở màn hình Máy cắt.
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

    </div>
  );
}
