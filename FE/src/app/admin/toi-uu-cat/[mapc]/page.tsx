"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  Gauge,
  Info,
  ListChecks,
  Loader2,
  PackagePlus,
  Pin,
  Play,
  RefreshCw,
  Ruler,
  Scissors,
  SlidersHorizontal,
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

type ManualCutDraft = {
  id: string;
  label: string;
  length: number;
  status: string;
  sourcePlanId: number;
  sourceCutId: number;
};

type ManualBarDraft = {
  id: string;
  label: string;
  inputLength: number;
  sourceStatus?: string | null;
  cuts: ManualCutDraft[];
};

type DraftMetrics = {
  bars: number;
  used: number;
  input: number;
  remainder: number;
  awkwardBars: number;
  reusableBars: number;
  utilization: number;
};

type DecisionWorkspaceTab = "overview" | "decision" | "manual" | "bom" | "plans";

type DecisionStrategy = "balanced" | "save-stock" | "reuse-offcut" | "site-fit";

type PlanSortMode = "pinned" | "utilization" | "remainder" | "cuts" | "uid";

type DecisionParams = {
  kerf: number;
  safeMargin: number;
  minScrap: number;
  minReusableLength: number;
  strategy: DecisionStrategy;
};

const DEFAULT_DECISION_PARAMS: DecisionParams = {
  kerf: 5,
  safeMargin: 0,
  minScrap: 100,
  minReusableLength: 1500,
  strategy: "balanced",
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

function toNonNegativeInt(value: unknown, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return fallback;
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

function evaluateInitialPlan(plans: CuttingPlan[], warnings: string[]) {
  if (!plans || plans.length === 0) {
    return {
      status: "CHUA_CO_SO_DO",
      colorClass: "border-zinc-800 bg-zinc-950/40 text-zinc-400",
      title: "Chưa có dữ liệu phương án",
      reasons: ["Chưa có dữ liệu phương án để đánh giá. Hãy tạo hoặc tải sơ đồ cắt trước."],
      utilizationRate: 0,
    };
  }

  const reasons: string[] = [];
  let status: "NEN_GIAO" | "CAN_XEM_XET" | "CO_RUI_RO" = "NEN_GIAO";

  let totalInput = 0;
  let totalUsed = 0;
  let awkwardCount = 0;
  let reusableCount = 0;
  let scrapCount = 0;
  let reusedCount = 0;

  plans.forEach((plan) => {
    const metrics = getPlanMetrics(plan);
    if (metrics.inputLength) {
      totalInput += metrics.inputLength;
    }
    totalUsed += metrics.used;

    const remainder = metrics.remainder ?? 0;
    if (remainder >= DEFAULT_MIN_REUSABLE_LENGTH) {
      reusableCount++;
    } else if (remainder < DEFAULT_MIN_SCRAP) {
      scrapCount++;
    } else {
      awkwardCount++;
    }

    if (plan.khothanhphoi?.trangthai === "CON_DU") {
      reusedCount++;
    }
  });

  const utilizationRate = totalInput > 0 ? (totalUsed / totalInput) * 100 : 0;

  reasons.push(`Tỷ lệ tận dụng vật tư trung bình đạt ${utilizationRate.toFixed(1)}%.`);

  if (reusedCount > 0) {
    reasons.push(`Đã dọn kho, tận dụng ${reusedCount} thanh phôi dư.`);
  }

  if (scrapCount > 0) {
    reasons.push(`Tối ưu hóa triệt để ở ${scrapCount} thanh phôi (phần thừa dưới 10cm).`);
  }

  if (reusableCount > 0) {
    reasons.push(`Tạo ra ${reusableCount} phần dư dài (>= 1.5m) có khả năng tái sử dụng.`);
  }

  if (awkwardCount > 0) {
    reasons.push(`Cảnh báo: Có ${awkwardCount} thanh phôi tạo phần dư lỡ cỡ (10cm - 1.5m) khó tái sử dụng.`);
  }

  // Phân tích warnings
  const hasSevereWarnings = warnings.some(w => 
    w.toLowerCase().includes("lệch dữ liệu") || 
    w.toLowerCase().includes("không nên tạo lại") || 
    w.toLowerCase().includes("chờ duyệt")
  );

  if (hasSevereWarnings || utilizationRate < 70) {
    status = "CO_RUI_RO";
  } else if (awkwardCount > 0 || utilizationRate < 82 || warnings.length > 0) {
    status = "CAN_XEM_XET";
  } else {
    status = "NEN_GIAO";
  }

  let colorClass = "";
  let title = "";

  if (status === "NEN_GIAO") {
    colorClass = "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    title = "Phương án tốt";
  } else if (status === "CO_RUI_RO") {
    colorClass = "border-rose-500/30 bg-rose-500/10 text-rose-300";
    title = "Có rủi ro";
  } else {
    colorClass = "border-amber-500/30 bg-amber-500/10 text-amber-300";
    title = "Cần xem xét";
  }

  return {
    status,
    colorClass,
    title,
    reasons: reasons.slice(0, 5),
    utilizationRate,
  };
}

function buildManualDraft(plans: CuttingPlan[]): ManualBarDraft[] {
  return plans.map((plan) => {
    const metrics = getPlanMetrics(plan);
    const inputLength = metrics.inputLength || plan.khothanhphoi?.chieudaihientai || 6000;
    return {
      id: `bar-${plan.masdc}`,
      label: `SDC-${plan.masdc}`,
      inputLength,
      sourceStatus: plan.khothanhphoi?.trangthai,
      cuts: [...(plan.chitietcat || [])]
        .sort((a, b) => Number(a.thutucat || 0) - Number(b.thutucat || 0))
        .map((cut) => ({
          id: `cut-${plan.masdc}-${cut.mactc}`,
          label: cut.chitietdh?.mota || cut.chitietdh?.vattu?.tenvt || `Nhát #${cut.thutucat}`,
          length: Number(cut.chieudaicat || 0),
          status: cut.trangthai,
          sourcePlanId: plan.masdc,
          sourceCutId: cut.mactc,
        })),
    };
  });
}

function getDraftBarUsed(bar: ManualBarDraft, params: DecisionParams = DEFAULT_DECISION_PARAMS) {
  const cutTotal = bar.cuts.reduce((sum, cut) => sum + Math.max(0, Number(cut.length || 0)), 0);
  const kerfLoss = Math.max(0, Number(params.kerf || 0)) * bar.cuts.length;
  return cutTotal + kerfLoss + Math.max(0, Number(params.safeMargin || 0));
}

function getDraftMetrics(
  draft: ManualBarDraft[],
  params: DecisionParams = DEFAULT_DECISION_PARAMS,
): DraftMetrics {
  const used = draft.reduce((total, bar) => total + getDraftBarUsed(bar, params), 0);
  const input = draft.reduce((total, bar) => total + Math.max(0, Number(bar.inputLength || 0)), 0);
  const remainder = Math.max(0, input - used);
  const awkwardBars = draft.filter((bar) => {
    const barUsed = getDraftBarUsed(bar, params);
    const barRemainder = Math.max(0, bar.inputLength - barUsed);
    return barRemainder >= params.minScrap && barRemainder < params.minReusableLength;
  }).length;
  const reusableBars = draft.filter((bar) => {
    const barUsed = getDraftBarUsed(bar, params);
    return Math.max(0, bar.inputLength - barUsed) >= params.minReusableLength;
  }).length;

  return {
    bars: draft.length,
    used,
    input,
    remainder,
    awkwardBars,
    reusableBars,
    utilization: input > 0 ? (used / input) * 100 : 0,
  };
}

function getPlanSummaryMetrics(plans: CuttingPlan[]): DraftMetrics {
  const draft = buildManualDraft(plans);
  return getDraftMetrics(draft);
}

function DecisionOptionCard({
  title,
  badge,
  description,
  bullets,
  tone,
}: {
  title: string;
  badge: string;
  description: string;
  bullets: string[];
  tone: "emerald" | "amber" | "cyan" | "rose";
}) {
  const style = {
    emerald: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-500/25 bg-amber-500/10 text-amber-200",
    cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-200",
    rose: "border-rose-500/25 bg-rose-500/10 text-rose-200",
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${style}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-white">{title}</h3>
        <span className="rounded-full border border-current/20 bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
          {badge}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 opacity-80">{description}</p>
      <ul className="mt-3 list-disc space-y-1 pl-4 text-xs opacity-90">
        {bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    </div>
  );
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
  const [manualDraft, setManualDraft] = useState<ManualBarDraft[]>([]);
  const [selectedCutId, setSelectedCutId] = useState<string | null>(null);
  const [workspaceTab, setWorkspaceTab] = useState<DecisionWorkspaceTab>("overview");
  const [decisionParams, setDecisionParams] = useState<DecisionParams>(DEFAULT_DECISION_PARAMS);
  const [planSort, setPlanSort] = useState<PlanSortMode>("pinned");
  const [pinnedPlanIds, setPinnedPlanIds] = useState<Set<number>>(new Set());

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
      setManualDraft(buildManualDraft(planRows));
      setSelectedCutId(null);
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

  const bomRows = useMemo(() => assignment?.donhang?.chitietdh || [], [assignment?.donhang?.chitietdh]);

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
      setManualDraft(buildManualDraft(nextPlans));
      setSelectedCutId(null);
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

  const currentSummaryMetrics = useMemo(() => getPlanSummaryMetrics(plans), [plans]);
  const manualSummaryMetrics = useMemo(
    () => getDraftMetrics(manualDraft, decisionParams),
    [manualDraft, decisionParams],
  );
  const sortedPlans = useMemo(() => {
    return [...plans].sort((a, b) => {
      const aPinned = pinnedPlanIds.has(a.masdc) ? 1 : 0;
      const bPinned = pinnedPlanIds.has(b.masdc) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;

      const aMetrics = getPlanMetrics(a);
      const bMetrics = getPlanMetrics(b);
      switch (planSort) {
        case "utilization":
          return Number(bMetrics.utilization || 0) - Number(aMetrics.utilization || 0);
        case "remainder":
          return Number(bMetrics.remainder || 0) - Number(aMetrics.remainder || 0);
        case "cuts":
          return Number(bMetrics.cutsCount || 0) - Number(aMetrics.cutsCount || 0);
        case "uid":
          return Number(a.khothanhphoi?.maphoi || 0) - Number(b.khothanhphoi?.maphoi || 0);
        case "pinned":
        default:
          return Number(a.masdc || 0) - Number(b.masdc || 0);
      }
    });
  }, [pinnedPlanIds, planSort, plans]);

  const moveSelectedCut = useCallback((targetBarId: string) => {
    if (!selectedCutId || !targetBarId) return;
    setManualDraft((current) => {
      let selectedCut: ManualCutDraft | null = null;
      const withoutCut = current.map((bar) => {
        const nextCuts = bar.cuts.filter((cut) => {
          if (cut.id === selectedCutId) {
            selectedCut = cut;
            return false;
          }
          return true;
        });
        return { ...bar, cuts: nextCuts };
      });
      if (!selectedCut) return current;
      return withoutCut.map((bar) => {
        if (bar.id !== targetBarId) return bar;
        return { ...bar, cuts: [...bar.cuts, selectedCut as ManualCutDraft] };
      });
    });
    setSelectedCutId(null);
  }, [selectedCutId]);

  const updateManualCutLength = useCallback((cutId: string, length: number) => {
    setManualDraft((current) =>
      current.map((bar) => ({
        ...bar,
        cuts: bar.cuts.map((cut) => (cut.id === cutId ? { ...cut, length } : cut)),
      })),
    );
  }, []);

  const togglePinnedPlan = useCallback((masdc: number) => {
    setPinnedPlanIds((current) => {
      const next = new Set(current);
      if (next.has(masdc)) {
        next.delete(masdc);
      } else {
        next.add(masdc);
      }
      return next;
    });
  }, []);

  const addManualBar = useCallback(() => {
    setManualDraft((current) => [
      ...current,
      {
        id: `draft-${Date.now()}`,
        label: `Nháp ${current.length + 1}`,
        inputLength: 6000,
        sourceStatus: "MOI",
        cuts: [],
      },
    ]);
  }, []);

  const removeManualBar = useCallback((barId: string) => {
    setManualDraft((current) => {
      const target = current.find((bar) => bar.id === barId);
      if (!target || target.cuts.length > 0 || current.length <= 1) return current;
      return current.filter((bar) => bar.id !== barId);
    });
  }, []);

  const resetManualDraft = useCallback(() => {
    setManualDraft(buildManualDraft(plans));
    setSelectedCutId(null);
  }, [plans]);

  const updateDecisionParam = useCallback(<K extends keyof DecisionParams>(key: K, value: DecisionParams[K]) => {
    setDecisionParams((current) => ({ ...current, [key]: value }));
  }, []);

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

      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-2 shadow-[0_18px_80px_rgba(0,0,0,0.22)]">
        <div className="grid gap-1 rounded-xl bg-black/25 p-1 md:grid-cols-5">
          {[
            { id: "overview", label: "Tổng quan", meta: `PC-${assignment.mapc}`, icon: ListChecks },
            { id: "decision", label: "Cảnh báo & quyết định", meta: `${warnings.length} cảnh báo`, icon: AlertTriangle },
            { id: "manual", label: "Mô phỏng chỉnh tay", meta: `${manualSummaryMetrics.bars} nháp`, icon: SlidersHorizontal },
            { id: "bom", label: "BOM cần cắt", meta: `${bomRows.length} dòng`, icon: Ruler },
            { id: "plans", label: "Sơ đồ đã lưu", meta: `${plans.length} sơ đồ`, icon: Scissors },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = workspaceTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setWorkspaceTab(tab.id as DecisionWorkspaceTab)}
                className={`flex min-h-[64px] items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                  active
                    ? "border-cyan-400/40 bg-zinc-800/80 text-white shadow-[0_0_24px_rgba(34,211,238,0.08)]"
                    : "border-transparent bg-transparent text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/70 hover:text-zinc-200"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-cyan-300" : "text-zinc-500"}`} />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-black">{tab.label}</span>
                  <span className="mt-1 block truncate text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    {tab.meta}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {warnings.length > 0 && (workspaceTab === "overview" || workspaceTab === "decision") && (
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

      {errorMsg && (workspaceTab === "overview" || workspaceTab === "decision") && (
        <section className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-semibold text-rose-100">
          {errorMsg}
        </section>
      )}

      {shortages.length > 0 && (workspaceTab === "overview" || workspaceTab === "decision") && (
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

      {workspaceTab === "overview" && planMetrics && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 shadow-[0_18px_80px_rgba(0,0,0,0.22)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <TrendingUp className="h-5 w-5 text-emerald-300" />
                Metrics lần tạo gần nhất
              </h2>
              <p className="mt-1 text-xs text-zinc-500">Dải KPI đọc nhanh để quyết định giữ, chỉnh tay hay tạo lại sơ đồ.</p>
            </div>
            <button
              type="button"
              onClick={() => setWorkspaceTab("manual")}
              className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-500/15"
            >
              Mở mô phỏng
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3 2xl:grid-cols-6">
            <Metric label="Tổng chiều dài cần cắt" value={formatMm(planMetrics.totalRequiredLength)} />
            <Metric label="Hao hụt kerf" value={formatMm(planMetrics.totalKerfLoss)} tone="warn" />
            <Metric label="Phôi dư tái dùng" value={formatMm(planMetrics.totalReusableRemainder)} tone="good" />
            <Metric label="Phế liệu" value={formatMm(planMetrics.totalScrapLength)} tone="warn" />
            <Metric label="Tỷ lệ thành phẩm" value={formatPercent(planMetrics.productUtilizationRate)} tone="good" />
            <Metric label="Tỷ lệ tiêu hao" value={formatPercent(planMetrics.materialUsageRate)} />
          </div>
        </section>
      )}

      <div className={workspaceTab === "overview" ? "grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]" : "space-y-6"}>
        {workspaceTab === "overview" && (
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

          {false && planMetrics && (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <TrendingUp className="h-5 w-5 text-emerald-300" />
                Metrics lần tạo gần nhất
              </h2>
              <div className="mt-4 grid gap-3">
                <Metric label="Tổng chiều dài cần cắt" value={formatMm(planMetrics!.totalRequiredLength)} />
                <Metric label="Hao hụt kerf" value={formatMm(planMetrics!.totalKerfLoss)} tone="warn" />
                <Metric
                  label="Phần dư tái sử dụng"
                  value={formatMm(planMetrics!.totalReusableRemainder)}
                  tone="good"
                />
                <Metric label="Phế liệu" value={formatMm(planMetrics!.totalScrapLength)} tone="warn" />
                <Metric
                  label="Tỷ lệ thành phẩm"
                  value={formatPercent(planMetrics!.productUtilizationRate)}
                  tone="good"
                />
                <Metric label="Tỷ lệ tiêu hao" value={formatPercent(planMetrics!.materialUsageRate)} />
              </div>
            </section>
          )}
        </div>
        )}

        <div className="space-y-6">
          {/* Decision Support Card */}
          {(workspaceTab === "overview" || workspaceTab === "decision") && (() => {
            const evalResult = evaluateInitialPlan(plans, warnings);
            return (
              <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 space-y-4">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                    <TrendingUp className="h-5 w-5 text-purple-400" />
                    Đánh giá phương án tối ưu
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Hệ thống phân tích các chỉ số cắt để hỗ trợ Admin xem xét trước khi giao cho Worker.
                  </p>
                </div>

                {plans.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-800 bg-black/25 p-6 text-center text-xs text-zinc-500">
                    Chưa có dữ liệu phương án để đánh giá. Hãy tạo hoặc tải sơ đồ cắt trước.
                  </div>
                ) : (
                  <>
                    <div className={`p-4 border rounded-xl space-y-3 ${evalResult.colorClass}`}>
                      <div className="flex items-center gap-2 font-bold text-sm">
                        {evalResult.status === "NEN_GIAO" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : evalResult.status === "CO_RUI_RO" ? (
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                        )}
                        <span>Khuyến nghị hệ thống: {evalResult.title}</span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs font-bold text-zinc-300 block">Phân tích chỉ số:</span>
                        <ul className="list-disc pl-5 space-y-1 text-xs opacity-90">
                          {evalResult.reasons.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Gợi ý hành động */}
                      <div className="space-y-1 pt-2.5 border-t border-white/5">
                        <span className="text-xs font-bold text-zinc-300 block">Gợi ý hành động:</span>
                        <ul className="list-disc pl-5 space-y-1 text-xs opacity-90">
                          {evalResult.status === "NEN_GIAO" ? (
                            <>
                              <li>Có thể giữ phương án hiện tại để Worker thực hiện theo sơ đồ đã lưu.</li>
                              <li>Kiểm tra nhanh BOM và sơ đồ đã lưu trước khi thi công.</li>
                            </>
                          ) : evalResult.status === "CO_RUI_RO" ? (
                            <>
                              <li className="text-rose-300 font-medium">Không nên giao ngay phương án này nếu chưa kiểm tra kỹ.</li>
                              <li>Xem lại cấu hình quy tắc tối ưu.</li>
                              <li>Kiểm tra các thanh có hao hụt lớn hoặc phôi dư lỡ cỡ.</li>
                              <li>Cân nhắc tạo lại sơ đồ cắt.</li>
                            </>
                          ) : (
                            <>
                              <li>Kiểm tra kỹ các phần phôi dư lỡ cỡ.</li>
                              <li>Xem lại cấu hình tối ưu để tối thiểu hóa hao hụt.</li>
                              <li>Cân nhắc tạo lại sơ đồ cắt nếu thông tin kho đã thay đổi.</li>
                            </>
                          )}
                        </ul>
                      </div>

                      {/* Nút hành động UI-only */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Link 
                          href="/admin/cau-hinh"
                          className="px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-zinc-200 transition-colors"
                        >
                          Cấu hình quy tắc
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById("saved-plans-section");
                            if (el) el.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="px-2.5 py-1.5 rounded bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-800/40 text-[10px] font-bold text-cyan-400 transition-colors"
                        >
                          Xem sơ đồ đã lưu
                        </button>
                        {(evalResult.status === "CO_RUI_RO" || evalResult.status === "CAN_XEM_XET") && (
                          <button
                            type="button"
                            onClick={() => {
                              const el = document.getElementById("saved-plans-section");
                              if (el) el.scrollIntoView({ behavior: "smooth" });
                            }}
                            className="px-2.5 py-1.5 rounded bg-amber-950/40 hover:bg-amber-900/40 border border-amber-800/40 text-[10px] font-bold text-amber-400 transition-colors"
                          >
                            Xem chi tiết rủi ro
                          </button>
                        )}
                      </div>

                      <div className="text-[10px] opacity-60 italic pt-1 border-t border-white/5 flex items-center justify-between gap-2">
                        <span>* Đánh giá tham khảo dựa trên thuật toán tối ưu phôi hiện tại.</span>
                        <Link href="/admin/cau-hinh" className="text-cyan-400 hover:underline">
                          Xem cấu hình quy tắc &rarr;
                        </Link>
                      </div>
                    </div>

                    <div className="text-[10px] text-zinc-500 italic">
                      * Đây là đánh giá hỗ trợ ra quyết định. Admin vẫn là người quyết định cuối cùng.
                    </div>
                  </>
                )}
              </section>
            );
          })()}

          {(workspaceTab === "overview" || workspaceTab === "decision") && plans.length > 0 && (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                    <SlidersHorizontal className="h-5 w-5 text-cyan-300" />
                    Trợ lý tối ưu nhanh
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Chọn một hướng xử lý để mở mô phỏng với bộ thông số phù hợp, không lưu DB.
                  </p>
                </div>
                <span className="rounded-full border border-zinc-800 bg-black/25 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                  UI draft
                </span>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-3">
                {[
                  {
                    title: "Giảm dư lỡ cỡ",
                    desc: "Tăng ngưỡng phôi tái dùng, ưu tiên gom phần dư thành đoạn dễ nhập kho.",
                    params: { ...DEFAULT_DECISION_PARAMS, safeMargin: 10, minScrap: 200, minReusableLength: 1800, strategy: "reuse-offcut" as DecisionStrategy },
                    tone: "border-amber-500/25 bg-amber-500/10 text-amber-100",
                  },
                  {
                    title: "Ép hiệu suất",
                    desc: "Giữ biên thấp, dùng để thử phương án cần tiết kiệm thanh nguồn tối đa.",
                    params: { ...DEFAULT_DECISION_PARAMS, safeMargin: 0, minScrap: 80, minReusableLength: 1200, strategy: "save-stock" as DecisionStrategy },
                    tone: "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
                  },
                  {
                    title: "Theo công trình",
                    desc: "Dành cho trường hợp cần nắn nhát cắt theo hướng lắp đặt hoặc tổ thi công.",
                    params: { ...DEFAULT_DECISION_PARAMS, safeMargin: 20, strategy: "site-fit" as DecisionStrategy },
                    tone: "border-cyan-500/25 bg-cyan-500/10 text-cyan-100",
                  },
                ].map((preset) => (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => {
                      setDecisionParams(preset.params);
                      setWorkspaceTab("manual");
                    }}
                    className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-white/20 ${preset.tone}`}
                  >
                    <div className="text-sm font-black text-white">{preset.title}</div>
                    <p className="mt-2 text-xs leading-5 opacity-80">{preset.desc}</p>
                    <div className="mt-3 text-[10px] font-black uppercase tracking-wider opacity-70">Mở mô phỏng</div>
                  </button>
                ))}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <Metric
                  label="Tận dụng hiện tại"
                  value={formatPercent(currentSummaryMetrics.utilization)}
                  tone={currentSummaryMetrics.utilization >= 70 ? "good" : "warn"}
                />
                <Metric
                  label="Thanh dư tái dùng"
                  value={`${currentSummaryMetrics.reusableBars}`}
                  tone={currentSummaryMetrics.reusableBars > 0 ? "good" : undefined}
                />
                <Metric
                  label="Dư lỡ cỡ"
                  value={`${currentSummaryMetrics.awkwardBars}`}
                  tone={currentSummaryMetrics.awkwardBars > 0 ? "warn" : "good"}
                />
                <Metric
                  label="Cảnh báo"
                  value={`${warnings.length}`}
                  tone={warnings.length ? "warn" : "good"}
                />
              </div>
            </section>
          )}

          {plans.length > 0 && workspaceTab === "decision" && (
            <>
              <section className="hidden">
                <div className="grid gap-1 rounded-xl bg-black/25 p-1 sm:grid-cols-3">
                  {[
                    { id: "decision", label: "So sánh phương án", meta: `${currentSummaryMetrics.bars} thanh` },
                    { id: "manual", label: "Mô phỏng chỉnh tay", meta: `${manualSummaryMetrics.bars} nháp` },
                    { id: "params", label: "Thông số đánh giá", meta: `${decisionParams.kerf} mm kerf` },
                  ].map((tab) => {
                    const active = workspaceTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setWorkspaceTab(tab.id as DecisionWorkspaceTab)}
                        className={`rounded-xl border px-4 py-3 text-left transition ${
                          active
                            ? "border-cyan-400/40 bg-cyan-500/15 text-white shadow-[0_0_24px_rgba(34,211,238,0.08)]"
                            : "border-transparent bg-transparent text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/70 hover:text-zinc-200"
                        }`}
                      >
                        <div className="text-xs font-black">{tab.label}</div>
                        <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">{tab.meta}</div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {workspaceTab === "decision" && (
                <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                    <SlidersHorizontal className="h-5 w-5 text-cyan-300" />
                    Bàn quyết định phương án
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    So sánh hướng xử lý trước khi giao xuống xưởng, thay vì chỉ xem một điểm tối ưu đơn lẻ.
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-black/25 px-3 py-2 text-right text-xs text-zinc-400">
                  <div>Hiện tại: <strong className="text-cyan-300">{formatPercent(currentSummaryMetrics.utilization)}</strong></div>
                  <div>Nháp tay: <strong className="text-emerald-300">{formatPercent(manualSummaryMetrics.utilization)}</strong></div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 xl:grid-cols-3">
                <DecisionOptionCard
                  title="Giữ sơ đồ hệ thống"
                  badge="Nhanh"
                  tone={warnings.length ? "amber" : "emerald"}
                  description="Dùng ngay các sơ đồ đã lưu cho worker nếu rủi ro nghiệp vụ thấp."
                  bullets={[
                    `${currentSummaryMetrics.bars} thanh nguồn, tận dụng ${formatPercent(currentSummaryMetrics.utilization)}.`,
                    currentSummaryMetrics.awkwardBars > 0
                      ? `${currentSummaryMetrics.awkwardBars} thanh có phần dư lỡ cỡ cần xem lại.`
                      : "Không phát hiện phần dư lỡ cỡ theo ngưỡng tham khảo.",
                    warnings.length ? "Có cảnh báo nghiệp vụ, nên kiểm tra trước khi giao." : "Phù hợp khi cần thi công nhanh.",
                  ]}
                />
                <DecisionOptionCard
                  title="Chỉnh tay theo công trình"
                  badge="Kiểm soát"
                  tone="cyan"
                  description="Thử gom/tách nhát cắt theo thực tế công trình, hướng lắp đặt hoặc thói quen tổ thợ."
                  bullets={[
                    `Nháp hiện có ${manualSummaryMetrics.bars} thanh, tận dụng ${formatPercent(manualSummaryMetrics.utilization)}.`,
                    `${manualSummaryMetrics.reusableBars} thanh tạo phôi dư tái dùng, ${manualSummaryMetrics.awkwardBars} thanh dư lỡ cỡ.`,
                    "Không ghi DB, dùng để so sánh và ra quyết định trước khi cần backend lưu chính thức.",
                  ]}
                />
                <DecisionOptionCard
                  title="Tạo lại tự động"
                  badge="Làm mới"
                  tone={warnings.some((item) => item.toLowerCase().includes("hoàn thành")) ? "rose" : "amber"}
                  description="Chạy lại tối ưu khi kho đã thay đổi hoặc phương án hiện tại tạo nhiều phần dư khó dùng."
                  bullets={[
                    "Phù hợp sau khi nhập bổ sung phôi hoặc dọn kho phôi dư.",
                    "Không nên tạo lại khi sơ đồ đã hoàn thành hoặc đang cắt.",
                    "Luôn kiểm tra cảnh báo nghiệp vụ trước khi bấm tạo lại.",
                  ]}
                />
              </div>
                </section>
              )}
            </>
          )}

          {manualDraft.length > 0 && workspaceTab === "manual" && (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                    <SlidersHorizontal className="h-5 w-5 text-emerald-300" />
                    Chỉnh tay bản nháp
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Chọn một nhát cắt, sau đó bấm “Chuyển vào thanh này” ở thanh khác để thử phương án thủ công. Bản nháp không sửa sơ đồ chính thức.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={addManualBar}
                    className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/15"
                  >
                    Thêm thanh nháp
                  </button>
                  <button
                    type="button"
                    onClick={resetManualDraft}
                    className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-200 hover:border-zinc-500"
                  >
                    Hoàn tác nháp
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Metric label="Thanh nháp" value={`${manualSummaryMetrics.bars}`} />
                <Metric label="Đã dùng" value={formatMm(manualSummaryMetrics.used)} tone="good" />
                <Metric label="Tổng phôi" value={formatMm(manualSummaryMetrics.input)} />
                <Metric label="Phần dư" value={formatMm(manualSummaryMetrics.remainder)} tone="warn" />
                <Metric label="Tỷ lệ dùng" value={formatPercent(manualSummaryMetrics.utilization)} tone="good" />
              </div>

              {selectedCutId && (
                <div className="mt-4 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-3 text-xs font-semibold text-cyan-100">
                  Đã chọn một nhát cắt. Bấm “Chuyển vào thanh này” trên thanh đích để thử đổi phương án.
                </div>
              )}

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {manualDraft.map((bar) => {
                  const barUsed = getDraftBarUsed(bar, decisionParams);
                  const barRemainder = Math.max(0, bar.inputLength - barUsed);
                  const barOverload = barUsed > bar.inputLength;
                  const barPercent = bar.inputLength > 0 ? Math.min(100, (barUsed / bar.inputLength) * 100) : 0;
                  const isAwkward = barRemainder >= decisionParams.minScrap && barRemainder < decisionParams.minReusableLength;

                  return (
                    <div
                      key={bar.id}
                      className={`rounded-2xl border p-4 ${
                        barOverload
                          ? "border-rose-500/30 bg-rose-500/10"
                          : isAwkward
                            ? "border-amber-500/25 bg-amber-500/5"
                            : "border-zinc-800 bg-black/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-white">{bar.label}</h3>
                          <p className="mt-1 text-xs text-zinc-500">
                            Dùng {formatMm(barUsed)} / {formatMm(bar.inputLength)}
                          </p>
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          {selectedCutId && (
                            <button
                              type="button"
                              onClick={() => moveSelectedCut(bar.id)}
                              className="rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1.5 text-[10px] font-black text-cyan-200 hover:bg-cyan-500/15"
                            >
                              Chuyển vào thanh này
                            </button>
                          )}
                          {bar.cuts.length === 0 && manualDraft.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeManualBar(bar.id)}
                              className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-2.5 py-1.5 text-[10px] font-black text-rose-200 hover:bg-rose-500/15"
                            >
                              Xóa thanh
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                          Chiều dài thanh nháp
                        </label>
                        <input
                          value={bar.inputLength}
                          onChange={(event) => {
                            const nextLength = toPositiveInt(event.target.value, 6000);
                            setManualDraft((current) =>
                              current.map((item) =>
                                item.id === bar.id ? { ...item, inputLength: nextLength } : item,
                              ),
                            );
                          }}
                          className="mt-1 w-32 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-bold text-white"
                          inputMode="numeric"
                        />
                      </div>

                      <div className="mt-4 h-9 overflow-hidden rounded-xl border border-white/10 bg-zinc-950">
                        <div className="flex h-full">
                          <div className={`${barOverload ? "bg-rose-500" : "bg-emerald-500"}`} style={{ width: `${barPercent}%` }} />
                          <div className={isAwkward ? "bg-amber-800/70" : "bg-zinc-800/80"} style={{ width: `${Math.max(0, 100 - barPercent)}%` }} />
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        {bar.cuts.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-zinc-800 px-3 py-4 text-center text-xs text-zinc-500">
                            Thanh nháp đang trống.
                          </div>
                        ) : (
                          bar.cuts.map((cut) => (
                            <div
                              key={cut.id}
                              className={`grid w-full grid-cols-[minmax(0,1fr)_132px] items-center gap-2 rounded-xl border px-2.5 py-2 text-xs transition ${
                                selectedCutId === cut.id
                                  ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-100"
                                  : "border-zinc-800 bg-zinc-950/70 text-zinc-300 hover:border-zinc-700"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => setSelectedCutId(selectedCutId === cut.id ? null : cut.id)}
                                className="min-w-0 truncate text-left font-bold"
                                title="Chọn nhát cắt để chuyển sang thanh khác"
                              >
                                {cut.label}
                              </button>
                              <div className="grid grid-cols-[28px_minmax(0,1fr)_28px] items-center overflow-hidden rounded-lg border border-zinc-700 bg-black/25">
                                <button
                                  type="button"
                                  onClick={() => updateManualCutLength(cut.id, Math.max(1, Number(cut.length || 0) - 1))}
                                  className="h-8 border-r border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                  title="Giảm 1 mm"
                                >
                                  -
                                </button>
                                <input
                                  value={cut.length}
                                  onChange={(event) =>
                                    updateManualCutLength(cut.id, toPositiveInt(event.target.value, cut.length || 1))
                                  }
                                  onFocus={() => setSelectedCutId(cut.id)}
                                  inputMode="numeric"
                                  className="h-8 min-w-0 bg-transparent px-2 text-right font-mono font-bold text-cyan-300 outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateManualCutLength(cut.id, Math.max(1, Number(cut.length || 0) + 1))}
                                  className="h-8 border-l border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                  title="Tăng 1 mm"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="mt-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-xs text-zinc-400">
                        {barOverload ? (
                          <span className="font-bold text-rose-300">Quá chiều dài thanh, cần chuyển bớt nhát cắt.</span>
                        ) : isAwkward ? (
                          <span className="font-bold text-amber-300">Dư lỡ cỡ {formatMm(barRemainder)}, nên cân nhắc gom lại.</span>
                        ) : (
                          <span className="font-bold text-emerald-300">Phần dư {formatMm(barRemainder)} ổn theo ngưỡng tham khảo.</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {plans.length > 0 && workspaceTab === "manual" && (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                    <SlidersHorizontal className="h-5 w-5 text-amber-300" />
                    Thông số mô phỏng quyết định
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">
                    Chỉnh cách hệ đánh giá bản nháp: hao hụt lưỡi cưa, biên an toàn và ngưỡng phân loại phần dư. Chỉ dùng để mô phỏng trên màn hình này.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDecisionParams(DEFAULT_DECISION_PARAMS)}
                  className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-zinc-200 hover:border-zinc-500"
                >
                  Khôi phục mặc định
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { key: "kerf", label: "Kerf lưỡi cưa", suffix: "mm", fallback: DEFAULT_DECISION_PARAMS.kerf },
                  { key: "safeMargin", label: "Biên an toàn", suffix: "mm/thanh", fallback: DEFAULT_DECISION_PARAMS.safeMargin },
                  { key: "minScrap", label: "Ngưỡng phế liệu", suffix: "mm", fallback: DEFAULT_DECISION_PARAMS.minScrap },
                  { key: "minReusableLength", label: "Ngưỡng phôi tái dùng", suffix: "mm", fallback: DEFAULT_DECISION_PARAMS.minReusableLength },
                ].map((field) => (
                  <label key={field.key} className="rounded-2xl border border-zinc-800 bg-black/20 p-4">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">{field.label}</span>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        value={decisionParams[field.key as keyof DecisionParams] as number}
                        onChange={(event) => {
                          const value = field.key === "safeMargin"
                            ? toNonNegativeInt(event.target.value, field.fallback)
                            : toPositiveInt(event.target.value, field.fallback);
                          updateDecisionParam(field.key as keyof DecisionParams, value as never);
                        }}
                        inputMode="numeric"
                        className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-lg font-black text-white outline-none focus:border-cyan-400/70"
                      />
                      <span className="shrink-0 text-xs font-bold text-zinc-500">{field.suffix}</span>
                    </div>
                  </label>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-zinc-800 bg-black/20 p-4">
                <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Chiến lược ưu tiên</div>
                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  {[
                    { id: "balanced", label: "Cân bằng", desc: "Giữ tỷ lệ dùng tốt và ít rủi ro." },
                    { id: "save-stock", label: "Tiết kiệm thanh", desc: "Ưu tiên giảm số thanh nguồn." },
                    { id: "reuse-offcut", label: "Dọn phôi dư", desc: "Ưu tiên tạo phần dư dễ nhập kho." },
                    { id: "site-fit", label: "Theo công trình", desc: "Ưu tiên bản nháp chỉnh tay." },
                  ].map((strategy) => {
                    const active = decisionParams.strategy === strategy.id;
                    return (
                      <button
                        key={strategy.id}
                        type="button"
                        onClick={() => updateDecisionParam("strategy", strategy.id as DecisionStrategy)}
                        className={`rounded-xl border p-3 text-left transition ${
                          active
                            ? "border-amber-400/40 bg-amber-500/15 text-white"
                            : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700"
                        }`}
                      >
                        <div className="text-xs font-black">{strategy.label}</div>
                        <div className="mt-1 text-[10px] leading-4 text-zinc-500">{strategy.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Metric label="Nháp đang dùng" value={formatPercent(manualSummaryMetrics.utilization)} tone="good" />
                <Metric label="Hao hụt/biên" value={formatMm(Math.max(0, manualSummaryMetrics.used - manualDraft.reduce((total, bar) => total + bar.cuts.reduce((sum, cut) => sum + Math.max(0, Number(cut.length || 0)), 0), 0)))} tone="warn" />
                <Metric label="Phần dư nháp" value={formatMm(manualSummaryMetrics.remainder)} tone="warn" />
                <Metric label="Dư tái dùng" value={`${manualSummaryMetrics.reusableBars} thanh`} tone="good" />
                <Metric label="Dư lỡ cỡ" value={`${manualSummaryMetrics.awkwardBars} thanh`} tone={manualSummaryMetrics.awkwardBars ? "warn" : "good"} />
              </div>

              <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-xs leading-5 text-cyan-100">
                Các thông số này không sửa cấu hình backend, không lưu DB và không thay đổi sơ đồ chính thức. Nó giúp admin thử nhiều kịch bản trước khi quyết định có cần tạo lại hoặc yêu cầu backend lưu một bản chỉnh tay chính thức.
              </div>
            </section>
          )}

          {workspaceTab === "bom" && (
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
          )}

          {workspaceTab === "plans" && (
          <section id="saved-plans-section" className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
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
                <div className="rounded-2xl border border-zinc-800 bg-black/20 p-3">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
                      <ArrowUpDown className="h-4 w-4 text-cyan-300" />
                      Sắp xếp / ghim để so sánh nhanh
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "pinned", label: "Mặc định" },
                        { id: "utilization", label: "Tỷ lệ dùng" },
                        { id: "remainder", label: "Phần dư" },
                        { id: "cuts", label: "Số nhát" },
                        { id: "uid", label: "UID phôi" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPlanSort(item.id as PlanSortMode)}
                          className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                            planSort === item.id
                              ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100"
                              : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedPlans(new Set(pinnedPlanIds));
                          setPlanSort("pinned");
                        }}
                        className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-100 hover:bg-amber-500/15"
                      >
                        Mở pin ({pinnedPlanIds.size})
                      </button>
                    </div>
                  </div>
                </div>

                {sortedPlans.map((plan) => {
                  const metrics = getPlanMetrics(plan);
                  const usedPercent =
                    metrics.utilization == null
                      ? 0
                      : Math.max(0, Math.min(100, metrics.utilization));
                  const remainderPercent = metrics.utilization == null ? 0 : Math.max(0, 100 - usedPercent);
                  const isExpanded = expandedPlans.has(plan.masdc);
                  const isPinned = pinnedPlanIds.has(plan.masdc);

                  return (
                    <article
                      key={plan.masdc}
                      className={`rounded-2xl border p-4 ${
                        isPinned
                          ? "border-amber-500/35 bg-amber-500/10"
                          : "border-zinc-800 bg-black/25"
                      }`}
                    >
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
                          <button
                            type="button"
                            onClick={() => togglePinnedPlan(plan.masdc)}
                            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                              isPinned
                                ? "border-amber-400/40 bg-amber-500/15 text-amber-100"
                                : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-amber-500/50 hover:text-amber-100"
                            }`}
                            title={isPinned ? "Bỏ ghim sơ đồ này" : "Ghim sơ đồ này lên đầu"}
                          >
                            <Pin className="h-3.5 w-3.5" />
                            {isPinned ? "Đã pin" : "Pin"}
                          </button>
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
          )}
        </div>
      </div>

    </div>
  );
}
