import { HttpError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { notificationsService } from "@/modules/notifications/notifications.service";
import { isTerminalOrderState } from "@/modules/orders/orders.service";
import { activityLogsService } from "@/modules/activity-logs/activity-logs.service";
import type { ReportIssueDto, SubmitProposalDto, TrimIssueDto } from "./cutting-plans.schema";

type BomItem = {
  mactdh: number;
  mavt: number;
  mota: string | null;
  chieudaicat: number | null;
  soluong: number;
  vattu: { tenvt: string; donvitinh: string } | null;
};

type AssignmentWithBom = {
  mapc: number;
  madh: number;
  trangthai: string;
  matho: number;
  donhang: {
    madh: number;
    trangthai: string;
    khachhang: { hoten: string } | null;
    chitietdh: BomItem[];
  } | null;
};

const ISSUE_TYPE_LABEL: Record<string, string> = {
  CAT_SAI_KICH_THUOC: "Cắt sai kích thước",
  PHOI_CONG_VENH: "Phôi cong/vênh",
  GAY_PHOI: "Gãy phôi",
  THIEU_VAT_TU: "Thiếu vật tư",
  LOI_KHAC: "Lỗi khác",
};

type RawStock = {
  maphoi: number;
  mavt: number;
  chieudaibandau: number;
  chieudaihientai: number;
  trangthai: string;
  vattu: { tenvt: string; donvitinh: string } | null;
};

type CutPiece = {
  mactdh: number;
  mavt: number;
  length: number;
  label: string;
  materialName: string;
  reason?: string;
};

type PlannedBar = {
  stock: RawStock;
  remaining: number;
  cuts: CutPiece[];
};

type BarScore = {
  score: number;
  projectedRemainder: number;
  reasons: string[];
};

type CuttingPlanMetrics = {
  totalRequiredLength: number;
  totalKerfLoss: number;
  totalStockLength: number;
  totalReusableRemainder: number;
  totalScrapLength: number;
  productUtilizationRate: number;
  materialUsageRate: number;
  selectedReasons: Record<string, string[]>;
};

type SimulateOptions = {
  workerId?: number;
  returnShortages?: boolean;
};

type MissingCutPiece = CutPiece & {
  materialName: string;
};

type StockShortage = {
  mavt: number;
  tenvt: string;
  suggestedLength: number;
  availableBars: number;
  reusableBars: number;
  newBars: number;
  missingPieces: Array<{
    label: string;
    length: number;
  }>;
  totalPieces: number;
  neededBars: number;
};

type ProposalRemainderType = "TAI_SU_DUNG" | "PHE_LIEU" | "LO_CO";

type ProposalDetailInsertRow = {
  maphoi: number;
  mactdh: number;
  chieudaicat: number;
  thutucat: number;
  kerf_mm: number;
  chieudaiphoi_truoccat: number;
  phandu_saucat: number;
  loai_phandu: ProposalRemainderType;
  score: number;
  lydochon: string;
};

type ProposedCut = {
  maphoi: number;
  mactdh: number;
  chieudaicat: number;
  thutucat: number;
};

type ProposalStockGroup = {
  stock: RawStock;
  cuts: ProposedCut[];
};

type ProposalRpcRow = {
  status: string;
  message: string;
  proposal_id: number;
  mapc: number;
};

type ProposalRpcError = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

const PLAN_SELECT = `
  masdc,
  mapc,
  maphoi,
  trangthai,
  khothanhphoi:maphoi (
    maphoi,
    mavt,
    chieudaibandau,
    chieudaihientai,
    trangthai,
    vattu:mavt ( tenvt, donvitinh )
  ),
  phancong:mapc (
    mapc,
    matho,
    trangthai,
    donhang:madh (
      madh,
      trangthai,
      khachhang:makh ( hoten )
    ),
    nguoidung:matho ( mand, hoten )
  ),
  chitietcat (
    mactc,
    mactdh,
    thutucat,
    chieudaicat,
    trangthai,
    chitietdh:mactdh ( mota, mavt, vattu:mavt ( tenvt, donvitinh ) )
  )
`;

const ISSUE_SELECT = `
  mank,
  maphoi,
  masdc,
  mapc,
  matho,
  sukien,
  chieudaitruoc,
  chieudaisau,
  ghichu,
  thoigian,
  trangthaixuly,
  huongxuly,
  xulyluc,
  nguoixuly,
  khothanhphoi:maphoi (
    maphoi,
    chieudaibandau,
    chieudaihientai,
    trangthai,
    vattu:mavt ( tenvt, donvitinh )
  ),
  phancong:mapc (
    mapc,
    madh,
    donhang:madh (
      madh,
      khachhang:makh ( hoten )
    )
  ),
  nguoidung:matho ( mand, hoten )
`;

async function getRuleValue(code: string, fallback: number) {
  const { data, error } = await supabaseAdmin.from("quytac").select("giatri").eq("maqt", code).maybeSingle();
  if (error) throw HttpError.internal(error.message);
  return Number(data?.giatri ?? fallback);
}

// Chuyển BOM thành danh sách mảnh cắt riêng lẻ (mỗi số lượng = N mảnh), sắp giảm dần theo chiều dài
function expandPieces(items: BomItem[]) {
  const pieces: CutPiece[] = [];
  for (const item of items) {
    if (!item.chieudaicat || item.chieudaicat <= 0) continue;
    for (let i = 0; i < item.soluong; i += 1) {
      pieces.push({
        mactdh: item.mactdh,
        mavt: item.mavt,
        length: item.chieudaicat,
        label: item.mota || item.vattu?.tenvt || `CT-${item.mactdh}`,
        materialName: item.vattu?.tenvt || `VT-${item.mavt}`,
      });
    }
  }
  return pieces.sort((a, b) => b.length - a.length);
}

function estimateBarsForPieces(pieces: MissingCutPiece[], suggestedLength: number, kerf: number, safeMargin: number) {
  // Ước lượng số phôi cần nhập thêm bằng chính chiến lược FFD thu nhỏ.
  // Con số này dùng cho hộp thoại "Đề xuất nhập bổ sung", không tự động nhập nếu quản trị viên chưa xác nhận.
  const capacity = suggestedLength - safeMargin * 2;
  const bars: number[] = [];

  for (const piece of [...pieces].sort((a, b) => b.length - a.length)) {
    const needed = piece.length + kerf;
    const idx = bars.findIndex((remaining) => remaining >= needed);
    if (idx >= 0) {
      bars[idx] -= needed;
    } else {
      bars.push(Math.max(0, capacity - needed));
    }
  }

  return Math.max(1, bars.length);
}

function suggestStockLength(pieces: MissingCutPiece[], kerf: number, safeMargin: number) {
  // Mặc định đề xuất phôi 6000mm; nếu chi tiết dài hơn chuẩn thì làm tròn lên bội 100mm
  // để vẫn có thể cắt được đoạn dài nhất cộng độ hao lưỡi cưa và biên an toàn.
  const longestPiece = pieces.reduce((max, piece) => Math.max(max, piece.length), 0);
  const minimumUsableLength = longestPiece + kerf + safeMargin * 2;
  const standardLength = 6000;
  return Math.ceil(Math.max(standardLength, minimumUsableLength) / 100) * 100;
}

function buildShortages(missingPieces: MissingCutPiece[], stocks: RawStock[], kerf: number, safeMargin: number) {
  // Gom thiếu phôi theo vật tư để UI hiển thị một dòng/mã vật tư,
  // thay vì bắn nhiều lỗi rời rạc cho từng nhát cắt.
  const grouped = new Map<number, MissingCutPiece[]>();
  for (const piece of missingPieces) {
    const rows = grouped.get(piece.mavt) ?? [];
    rows.push(piece);
    grouped.set(piece.mavt, rows);
  }

  return [...grouped.entries()].map(([mavt, rows]): StockShortage => {
    const relatedStocks = stocks.filter((stock) => stock.mavt === mavt && stock.trangthai !== "BO_DI");
    const suggestedLength = suggestStockLength(rows, kerf, safeMargin);
    return {
      mavt,
      tenvt: rows[0]?.materialName || `VT-${mavt}`,
      suggestedLength,
      availableBars: relatedStocks.length,
      reusableBars: relatedStocks.filter((stock) => stock.trangthai === "CON_DU").length,
      newBars: relatedStocks.filter((stock) => stock.trangthai === "MOI").length,
      missingPieces: rows.map((row) => ({ label: row.label, length: row.length })),
      totalPieces: rows.length,
      neededBars: estimateBarsForPieces(rows, suggestedLength, kerf, safeMargin),
    };
  });
}

function emptyCuttingMetrics(): CuttingPlanMetrics {
  return {
    totalRequiredLength: 0,
    totalKerfLoss: 0,
    totalStockLength: 0,
    totalReusableRemainder: 0,
    totalScrapLength: 0,
    productUtilizationRate: 0,
    materialUsageRate: 0,
    selectedReasons: {},
  };
}

function getInsufficientStockShortages(error: unknown): StockShortage[] | null {
  if (!(error instanceof HttpError) || error.status !== 400) return null;
  const details = error.details as { code?: string; shortages?: StockShortage[] } | undefined;
  if (details?.code !== "INSUFFICIENT_STOCK" || !Array.isArray(details.shortages)) return null;
  return details.shortages;
}

// Ý TƯỞNG THUẬT TOÁN TỐI ƯU CẮT PHÔI NHÔM (Scored Greedy + Look-ahead):
// CÂU HỎI 1: "Sau khi cắt nhát này, khúc phôi thừa còn lại có dùng được không?"
// - Thừa rất ít (dưới scrapThreshold ~ 100mm): Rất tốt (tận dụng tối đa phôi, phần vụn bỏ đi không đáng kể).
// - Thừa đủ dài (trên minReusableLength ~ 1500mm): Rất tốt (nhập kho tái sử dụng được sau này).
// - Thừa lỡ cỡ ở giữa: Rất xấu (bỏ thì phí, giữ chật kho không dùng được), phạt điểm nặng.
function scoreRemainder(remainder: number, scrapThreshold: number, minReusableLength: number) {
  if (remainder < scrapThreshold) {
    return {
      score: 1200 - remainder * 0.02,
      label: "Phần dư rất nhỏ, tận dụng gần hết phôi",
    };
  }

  if (remainder >= minReusableLength) {
    return {
      score: 700 + Math.min(remainder / 25, 350),
      label: "Phần dư đủ dài để tái sử dụng",
    };
  }

  const middle = Math.max(1, minReusableLength - scrapThreshold);
  const awkwardRatio = (remainder - scrapThreshold) / middle;
  return {
    score: -850 - awkwardRatio * 450,
    label: "Phần dư lỡ cỡ, khó tái sử dụng",
  };
}

function normalizeProposalRpcResult(data: unknown): ProposalRpcRow {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") {
    throw HttpError.internal("RPC de xuat cat khong tra ve ket qua hop le");
  }

  const result = row as Partial<ProposalRpcRow>;
  if (!result.status || !result.message || result.proposal_id === undefined || result.mapc === undefined) {
    throw HttpError.internal("RPC de xuat cat tra ve thieu du lieu");
  }

  return {
    status: String(result.status),
    message: String(result.message),
    proposal_id: Number(result.proposal_id),
    mapc: Number(result.mapc),
  };
}

function throwProposalRpcError(error: ProposalRpcError): never {
  const message = error.message || "Loi RPC de xuat cat";
  if (error.code === "P0002" || message.includes("Không tìm thấy") || message.includes("Khong tim thay")) {
    throw HttpError.notFound(message);
  }
  if (error.code === "42501") {
    throw HttpError.forbidden(message);
  }
  throw HttpError.internal(message, error);
}

function mapProposalRpcResult(data: unknown, successStatuses: string[]) {
  const result = normalizeProposalRpcResult(data);
  const payload = {
    status: result.status,
    message: result.message,
    proposalId: result.proposal_id,
    mapc: result.mapc,
  };

  if (successStatuses.includes(result.status)) return payload;
  if (result.status === "EXPIRED" || result.status === "INVALID_STATE") {
    throw HttpError.conflict(result.message, payload);
  }
  throw HttpError.internal(result.message, payload);
}

function scoreCandidateBar(
  candidate: PlannedBar,
  piece: CutPiece,
  remainingPieces: CutPiece[],
  allBars: PlannedBar[],
  kerf: number,
  scrapThreshold: number,
  minReusableLength: number,
): BarScore {
  const needed = piece.length + kerf;
  const projectedRemainder = candidate.remaining - needed;
  const reasons: string[] = [];
  let score = 0;

  const remainderScore = scoreRemainder(projectedRemainder, scrapThreshold, minReusableLength);
  score += remainderScore.score;
  reasons.push(remainderScore.label);

  // CÂU HỎI 2: "Thanh phôi này có phải hàng đang tồn kho cũ không?"
  // Ưu tiên dùng phôi dư lẻ (CON_DU) trước phôi mới để dọn sạch kho cũ.
  if (candidate.stock.trangthai === "CON_DU") {
    score += 120;
    reasons.push("Ưu tiên dùng phôi dư phù hợp trước phôi mới");
  }

  // CÂU HỎI 3: "Sau khi cắt mảnh này, phôi có còn chứa được mảnh tiếp theo không?"
  // Nhìn trước (Look-ahead) danh sách mảnh cắt để tăng điểm gom cụm tối ưu, tránh mở phôi mới.
  const sameMaterialRemaining = remainingPieces.filter((rp) => rp.mavt === piece.mavt);
  const nextPieceFitsRemainder = sameMaterialRemaining.some((rp) => projectedRemainder >= rp.length + kerf);
  if (nextPieceFitsRemainder) {
    score += 240;
    reasons.push("Phần dư sau cắt vẫn chứa được đoạn còn lại trong BOM");
  }

  // CÂU HỎI 4: "Cây phôi này có phải cây duy nhất đủ dài cho một mảnh dài phía sau không?"
  // Bảo tồn phôi dài: Nếu đây là phôi duy nhất đủ dài để gánh mảnh lớn tương lai, cấm băm nhỏ nó.
  for (const futurePiece of sameMaterialRemaining) {
    const futureNeeded = futurePiece.length + kerf;
    const isFutureLonger = futurePiece.length > piece.length;
    const candidateCanServeBeforeCut = candidate.remaining >= futureNeeded;
    const candidateCanServeAfterCut = projectedRemainder >= futureNeeded;
    if (!isFutureLonger || !candidateCanServeBeforeCut || candidateCanServeAfterCut) continue;

    const otherCapableBars = allBars.filter(
      (bar) => bar !== candidate && bar.stock.mavt === piece.mavt && bar.remaining >= futureNeeded,
    );
    if (otherCapableBars.length === 0) {
      score -= 6000;
      reasons.push(`Giữ cây dài duy nhất cho đoạn ${futurePiece.length}mm còn lại`);
      break;
    }
  }

  // Tie-break mềm: khi các lựa chọn gần ngang nhau, thanh tạo phần dư gọn hơn được ưu tiên.
  score -= projectedRemainder * 0.01;

  return {
    score,
    projectedRemainder,
    reasons,
  };
}

// Thuật toán Heuristic Score + Look-ahead cho bài toán cắt phôi 1D (1D-CSP).
// Score CÀNG CAO CÀNG TỐT. SAFE_MARGIN * 2 chỉ trừ MỘT LẦN khi khởi tạo.
function planCuts(pieces: CutPiece[], stocks: RawStock[], kerf: number, safeMargin: number, scrapThreshold: number, minReusableLength: number) {
  const validStocks = stocks.filter(
    (s) => s.trangthai !== "BO_DI" && s.chieudaihientai >= safeMargin * 2
  );

  // remaining = chiều dài khả dụng, đã trừ SAFE_MARGIN * 2 (biên kẹp máy 2 đầu).
  // Các nhát cắt sau đó chỉ trừ (Piece.length + BLADE_KERF), KHÔNG trừ lặp SAFE_MARGIN.
  const bars: PlannedBar[] = validStocks.map((stock) => ({
    stock,
    remaining: stock.chieudaihientai - safeMargin * 2,
    cuts: [],
  }));
  const missingPieces: MissingCutPiece[] = [];

  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i];
    const needed = piece.length + kerf;
    const remainingPieces = pieces.slice(i + 1);

    let bestBar: PlannedBar | null = null;
    let bestScore = -Infinity;
    let bestReason = "";

    const candidates = bars.filter((candidate) => candidate.stock.mavt === piece.mavt && candidate.remaining >= needed);

    for (const candidate of candidates) {
      const result = scoreCandidateBar(
        candidate,
        piece,
        remainingPieces,
        bars,
        kerf,
        scrapThreshold,
        minReusableLength,
      );
      const score = result.score;
      const reasonParts = [
        ...result.reasons,
        `dư sau cắt ${Math.max(0, Math.round(result.projectedRemainder))}mm`,
        `score ${Math.round(score)}`,
      ];

      if (score > bestScore) {
        bestScore = score;
        bestBar = candidate;
        bestReason = reasonParts.join(", ");
      } else if (score === bestScore) {
        if (bestBar && candidate.stock.trangthai === "CON_DU" && bestBar.stock.trangthai !== "CON_DU") {
          bestBar = candidate;
          bestReason = reasonParts.join(", ");
        } else if (bestBar && candidate.remaining < bestBar.remaining) {
          bestBar = candidate;
          bestReason = reasonParts.join(", ");
        }
      }
    }

    if (!bestBar) {
      missingPieces.push({
        ...piece,
        materialName: piece.materialName || stocks.find((stock) => stock.mavt === piece.mavt)?.vattu?.tenvt || piece.label,
      });
      continue;
    }

    bestBar.remaining -= needed;
    bestBar.cuts.push({ ...piece, reason: bestReason } as CutPiece);
  }

  if (missingPieces.length > 0) {
    throw HttpError.badRequest("Không đủ phôi để tạo sơ đồ cắt", {
      code: "INSUFFICIENT_STOCK",
      shortages: buildShortages(missingPieces, stocks, kerf, safeMargin),
    });
  }

  const usedBars = bars.filter((bar) => bar.cuts.length > 0);

  let totalRequiredLength = 0;
  let totalKerfLoss = 0;
  let totalStockLength = 0;
  let totalReusableRemainder = 0;
  let totalScrapLength = 0;
  const selectedReasons: Record<string, string[]> = {};

  for (const bar of usedBars) {
    totalStockLength += bar.stock.chieudaihientai;

    for (const cut of bar.cuts) {
      totalRequiredLength += cut.length;
      totalKerfLoss += kerf;

      const reason = cut.reason || "";
      if (reason) {
        if (!selectedReasons[bar.stock.maphoi]) {
          selectedReasons[bar.stock.maphoi] = [];
        }
        selectedReasons[bar.stock.maphoi].push(`Cắt ${cut.length}mm: ${reason}`);
      }
    }

    // actualRemainder = chiều dài vật lý thực tế còn lại trên thanh phôi sau khi cắt xong.
    // Cộng lại safeMargin * 2 vì phần biên kẹp máy vẫn tồn tại trên thanh phôi vật lý.
    const actualRemainder = bar.remaining + safeMargin * 2;
    if (actualRemainder >= minReusableLength) {
      totalReusableRemainder += actualRemainder;
    } else {
      totalScrapLength += actualRemainder;
    }
  }

  // productUtilizationRate: Tỷ lệ thành phẩm / tổng nguyên liệu sử dụng.
  const productUtilizationRate = totalStockLength > 0 ? (totalRequiredLength / totalStockLength) * 100 : 0;
  // materialUsageRate: Tỷ lệ nguyên liệu thực sự tiêu hao (thành phẩm + kerf) / tổng.
  const materialUsageRate = totalStockLength > 0 ? ((totalRequiredLength + totalKerfLoss) / totalStockLength) * 100 : 0;

  const metrics = {
    totalRequiredLength,
    totalKerfLoss,
    totalStockLength,
    totalReusableRemainder,
    totalScrapLength,
    productUtilizationRate,
    materialUsageRate,
    selectedReasons,
  };

  return { plannedBars: usedBars, metrics };
}

async function getAssignment(mapc: number) {
  const { data, error } = await supabaseAdmin
    .from("phancong")
    .select(`
      mapc,
      madh,
      matho,
      trangthai,
      donhang:madh (
        madh,
        trangthai,
        khachhang:makh ( hoten ),
        chitietdh (
          mactdh,
          mavt,
          mota,
          chieudaicat,
          soluong,
          vattu:mavt ( tenvt, donvitinh )
        )
      )
    `)
    .eq("mapc", mapc)
    .maybeSingle();
  if (error) throw HttpError.internal(error.message);
  if (!data) throw HttpError.notFound(`Assignment ${mapc} not found`);
  return data as unknown as AssignmentWithBom;
}

async function listPlansForAssignment(mapc: number) {
  const { data, error } = await supabaseAdmin
    .from("sodocat")
    .select(PLAN_SELECT)
    .eq("mapc", mapc)
    .order("masdc", { ascending: true });
  if (error) throw HttpError.internal(error.message);
  return attachOpenIssueFlags(data ?? []);
}

async function attachOpenIssueFlags<T extends { maphoi?: number }>(plans: T[]) {
  const stockIds = [...new Set(plans.map((plan) => plan.maphoi).filter((maphoi): maphoi is number => Boolean(maphoi)))];
  if (stockIds.length === 0) return plans;

  const { data, error } = await supabaseAdmin
    .from("nhatkygiacong")
    .select("maphoi")
    .eq("sukien", "LOI")
    .eq("trangthaixuly", "CHO_XU_LY")
    .in("maphoi", stockIds);
  if (error) throw HttpError.internal(error.message);

  const openIssueStockIds = new Set((data ?? []).map((row) => row.maphoi as number));
  return plans.map((plan) => ({ ...plan, coSuCoMo: openIssueStockIds.has(plan.maphoi as number) }));
}

async function hasOpenIssue(input: { maphoi: number; mapc?: number | null; masdc?: number | null }) {
  let query = supabaseAdmin
    .from("nhatkygiacong")
    .select("mank")
    .eq("sukien", "LOI")
    .eq("trangthaixuly", "CHO_XU_LY")
    .eq("maphoi", input.maphoi)
    .limit(1);
  if (input.mapc) query = query.eq("mapc", input.mapc);
  if (input.masdc) query = query.eq("masdc", input.masdc);
  const { data, error } = await query;
  if (error) throw HttpError.internal(error.message);
  return (data ?? []).length > 0;
}

function groupIssueReportsByStock(rows: unknown[]) {
  const typedRows = rows as Array<Record<string, unknown> & {
    maphoi?: number;
    mapc?: number | null;
    masdc?: number | null;
    matho?: number | null;
    phancong?: { madh?: number | null } | null;
    nguoidung?: { hoten?: string | null } | null;
  }>;
  const grouped = new Map<number, typeof typedRows>();

  for (const row of typedRows) {
    if (!row.maphoi) continue;
    const group = grouped.get(row.maphoi) ?? [];
    group.push(row);
    grouped.set(row.maphoi, group);
  }

  return [...grouped.values()].map((group) => {
    const representative = group[0];
    const unique = <T>(values: T[]) => [
      ...new Set(values.filter((value): value is NonNullable<T> => value !== null && value !== undefined)),
    ];
    return {
      ...representative,
      solanbao: group.length,
      nguoibao: unique(group.map((item) => item.nguoidung?.hoten || (item.matho ? `Worker ${item.matho}` : null))),
      masdcs: unique(group.map((item) => item.masdc)),
      mapcs: unique(group.map((item) => item.mapc)),
      madhs: unique(group.map((item) => item.phancong?.madh ?? null)),
      manks: group.map((item) => item.mank),
    };
  });
}

function closeOpenIssuesByStock(maphoi: number, payload: Record<string, unknown>) {
  return supabaseAdmin
    .from("nhatkygiacong")
    .update(payload)
    .eq("sukien", "LOI")
    .eq("trangthaixuly", "CHO_XU_LY")
    .eq("maphoi", maphoi);
}

async function getBusyStockIdsForOtherActivePlans(mapc: number): Promise<Set<number>> {
  const { data, error } = await supabaseAdmin
    .from("sodocat")
    .select("maphoi")
    .in("trangthai", ["CHO_DUYET", "DANG_CAT"])
    .neq("mapc", mapc);
  if (error) throw HttpError.internal(error.message);
  return new Set((data ?? []).map((row) => row.maphoi as number));
}

export const cuttingPlansService = {
  // Quản trị viên xem danh sách tất cả sơ đồ cắt.
  async listAdmin() {
    const { data, error } = await supabaseAdmin
      .from("sodocat")
      .select(PLAN_SELECT)
      .order("masdc", { ascending: false });
    if (error) throw HttpError.internal(error.message);
    return attachOpenIssueFlags(data ?? []);
  },

  // Quản trị viên xem danh sách báo cáo sự cố phôi (chỉ lấy sự cố đang CHO_XU_LY).
  async listIssueReports() {
    const { data, error } = await supabaseAdmin
      .from("nhatkygiacong")
      .select(ISSUE_SELECT)
      .eq("sukien", "LOI")
      .eq("trangthaixuly", "CHO_XU_LY")
      .order("thoigian", { ascending: false })
      .limit(100);
    if (error) throw HttpError.internal(error.message);
    const rows = data ?? [];
    return groupIssueReportsByStock(rows);
  },

  // Quản trị viên xử lý sự cố: bỏ phôi (chuyển trạng thái BO_DI) và đóng sự cố.
  async scrapIssue(issueId: number, adminId: number) {
    const { data: issue, error } = await supabaseAdmin
      .from("nhatkygiacong")
      .select("mank, maphoi, mapc, masdc, trangthaixuly")
      .eq("mank", issueId)
      .eq("sukien", "LOI")
      .maybeSingle();
    if (error) throw HttpError.internal(error.message);
    if (!issue) throw HttpError.notFound(`Issue ${issueId} not found`);
    const typed = issue as { maphoi: number; mapc: number | null; masdc: number | null; trangthaixuly: string };
    if (typed.trangthaixuly !== "CHO_XU_LY") throw HttpError.badRequest("Sự cố đã được xử lý");

    const now = new Date().toISOString();
    const [{ error: stockErr }, { error: issueErr }] = await Promise.all([
      supabaseAdmin.from("khothanhphoi").update({ trangthai: "BO_DI" }).eq("maphoi", typed.maphoi),
      closeOpenIssuesByStock(typed.maphoi, {
        trangthaixuly: "DA_XU_LY",
        huongxuly: "BO_PHOI",
        xulyluc: now,
        nguoixuly: adminId,
      }),
    ]);
    if (stockErr) throw HttpError.internal(stockErr.message);
    if (issueErr) throw HttpError.internal(issueErr.message);

    return this.listIssueReports();
  },

  // Quản trị viên xử lý sự cố: cắt bỏ đoạn lỗi (trừ chiều dài, cập nhật trạng thái phôi).
  async trimIssue(issueId: number, adminId: number, dto: TrimIssueDto) {
    const { data: issue, error } = await supabaseAdmin
      .from("nhatkygiacong")
      .select("mank, maphoi, mapc, masdc, trangthaixuly, khothanhphoi:maphoi(chieudaihientai, trangthai)")
      .eq("mank", issueId)
      .eq("sukien", "LOI")
      .maybeSingle();
    if (error) throw HttpError.internal(error.message);
    if (!issue) throw HttpError.notFound(`Issue ${issueId} not found`);
    const typed = issue as unknown as {
      maphoi: number;
      mapc: number | null;
      masdc: number | null;
      trangthaixuly: string;
      khothanhphoi: { chieudaihientai: number; trangthai: string } | null;
    };
    if (typed.trangthaixuly !== "CHO_XU_LY") throw HttpError.badRequest("Sự cố đã được xử lý");

    if (typed.khothanhphoi?.trangthai === "BO_DI") {
      throw HttpError.badRequest("Phôi đã bị bỏ. Hãy dùng thao tác Bỏ phôi để đóng các báo cáo còn lại.");
    }

    const before = Number(typed.khothanhphoi?.chieudaihientai ?? 0);
    if (dto.cutLength > before) throw HttpError.badRequest("Chiều dài cắt bỏ lớn hơn chiều dài phôi hiện tại");
    const after = before - dto.cutLength;
    const nextStatus = after > 0 ? "CON_DU" : "BO_DI";
    const now = new Date().toISOString();

    const [{ error: stockErr }, { error: issueErr }, { error: planResetErr }] = await Promise.all([
      supabaseAdmin.from("khothanhphoi").update({ chieudaihientai: after, trangthai: nextStatus }).eq("maphoi", typed.maphoi),
      closeOpenIssuesByStock(typed.maphoi, {
        trangthaixuly: "DA_XU_LY",
        huongxuly: `CAT_BO_DOAN_LOI_${dto.cutLength}MM${dto.ghichu ? `: ${dto.ghichu}` : ""}`,
        chieudaisau: after,
        xulyluc: now,
        nguoixuly: adminId,
      }),
      supabaseAdmin.from("sodocat").update({ trangthai: "CHO_DUYET" }).eq("maphoi", typed.maphoi).eq("trangthai", "DANG_CAT"),
    ]);
    if (stockErr) throw HttpError.internal(stockErr.message);
    if (issueErr) throw HttpError.internal(issueErr.message);
    if (planResetErr) throw HttpError.internal(planResetErr.message);

    return this.listIssueReports();
  },

  async listForWorker(matho: number) {
    const { data, error } = await supabaseAdmin
      .from("sodocat")
      .select(PLAN_SELECT)
      .eq("phancong.matho", matho)
      .order("masdc", { ascending: false });
    if (error) throw HttpError.internal(error.message);
    return attachOpenIssueFlags((data ?? []).filter((row) => row.phancong !== null));
  },

  async getForAssignment(mapc: number) {
    await getAssignment(mapc);
    return listPlansForAssignment(mapc);
  },

  async simulateCuts(mapc: number, options: SimulateOptions = {}) {
    const assignment = await getAssignment(mapc);
    if (options.workerId && assignment.matho !== options.workerId) {
      throw HttpError.forbidden("Ban khong duoc mo phong phan cong nay");
    }

    const items = assignment.donhang?.chitietdh ?? [];
    const pieces = expandPieces(items);
    if (pieces.length === 0) {
      return {
        plans: [],
        metrics: emptyCuttingMetrics(),
        warnings: ["Don hang khong co chi tiet cat nhom"],
        shortages: [],
      };
    }

    const materialIds = [...new Set(pieces.map((piece) => piece.mavt))];
    const { data: stockRows, error: stockErr } = await supabaseAdmin
      .from("khothanhphoi")
      .select("maphoi, mavt, chieudaibandau, chieudaihientai, trangthai, vattu:mavt(tenvt, donvitinh)")
      .in("mavt", materialIds)
      .neq("trangthai", "BO_DI");
    if (stockErr) throw HttpError.internal(stockErr.message);

    const kerf = await getRuleValue("BLADE_KERF", 5);
    const safeMargin = await getRuleValue("SAFE_MARGIN", 20);
    const scrapThreshold = await getRuleValue("MIN_SCRAP", 100);
    const minReusableLength = await getRuleValue("MIN_REUSABLE_LENGTH", 1500);

    const stockIds = (stockRows ?? []).map((stock) => stock.maphoi as number);
    let issueStockIds = new Set<number>();
    if (stockIds.length > 0) {
      const { data: issueData, error: issueErr } = await supabaseAdmin
        .from("nhatkygiacong")
        .select("maphoi")
        .eq("sukien", "LOI")
        .eq("trangthaixuly", "CHO_XU_LY")
        .in("maphoi", stockIds);
      if (issueErr) throw HttpError.internal(issueErr.message);
      issueStockIds = new Set((issueData ?? []).map((row) => row.maphoi as number));
    }

    const busyStockIds = await getBusyStockIdsForOtherActivePlans(mapc);
    const validStocks = (stockRows ?? []).filter(
      (stock) => !issueStockIds.has(stock.maphoi as number) && !busyStockIds.has(stock.maphoi as number)
    ) as unknown as RawStock[];

    try {
      const { plannedBars, metrics } = planCuts(pieces, validStocks, kerf, safeMargin, scrapThreshold, minReusableLength);
      const plans = plannedBars.map((bar) => ({
        masdc: null,
        mapc,
        maphoi: bar.stock.maphoi,
        trangthai: "MO_PHONG",
        khothanhphoi: bar.stock,
        chitietcat: bar.cuts.map((cut, index) => ({
          mactc: null,
          masdc: null,
          mactdh: cut.mactdh,
          thutucat: index + 1,
          chieudaicat: cut.length,
          trangthai: "MO_PHONG",
          chitietdh: {
            mota: cut.label,
            mavt: cut.mavt,
            vattu: {
              tenvt: cut.materialName,
              donvitinh: "",
            },
          },
        })),
        remaining: bar.remaining + safeMargin * 2,
      }));

      return { plans, metrics, warnings: [], shortages: [] };
    } catch (error) {
      const shortages = getInsufficientStockShortages(error);
      if (options.returnShortages && shortages) {
        return {
          plans: [],
          metrics: emptyCuttingMetrics(),
          warnings: ["Kho phoi khong du de mo phong cat"],
          shortages,
        };
      }
      throw error;
    }
  },

  // Tạo sơ đồ cắt cho phân công: lấy BOM → expandPieces → planCuts (FFD) → lưu vào sodocat + chitietcat
  async createForAssignment(mapc: number, actorId?: number) {
    const assignment = await getAssignment(mapc);
    if (assignment.donhang?.trangthai && isTerminalOrderState(assignment.donhang.trangthai)) {
      throw HttpError.badRequest("Đơn hàng liên kết đã hoàn thành hoặc đã hủy, không thể tạo sơ đồ cắt");
    }
    if (["KHAO_SAT", "BAO_GIA_NHAP"].includes(assignment.donhang?.trangthai as string)) {
      throw HttpError.badRequest("Cần duyệt giá đơn hàng trước khi tạo sơ đồ cắt");
    }
    const items = assignment.donhang?.chitietdh ?? [];
    const pieces = expandPieces(items);
    if (pieces.length === 0) throw HttpError.badRequest("Don hang khong co chi tiet cat nhom");

    const materialIds = [...new Set(pieces.map((piece) => piece.mavt))];
    const { data: stockRows, error: stockErr } = await supabaseAdmin
      .from("khothanhphoi")
      .select("maphoi, mavt, chieudaibandau, chieudaihientai, trangthai, vattu:mavt(tenvt, donvitinh)")
      .in("mavt", materialIds)
      .neq("trangthai", "BO_DI");
    if (stockErr) throw HttpError.internal(stockErr.message);

    const kerf = await getRuleValue("BLADE_KERF", 5);
    const safeMargin = await getRuleValue("SAFE_MARGIN", 20);
    const scrapThreshold = await getRuleValue("MIN_SCRAP", 100);
    const minReusableLength = await getRuleValue("MIN_REUSABLE_LENGTH", 1500);

    const stockIds = (stockRows ?? []).map(s => s.maphoi);
    let issueStockIds = new Set<number>();
    if (stockIds.length > 0) {
      const { data: issueData, error: issueErr } = await supabaseAdmin
        .from("nhatkygiacong")
        .select("maphoi")
        .eq("sukien", "LOI")
        .eq("trangthaixuly", "CHO_XU_LY")
        .in("maphoi", stockIds);
      if (issueErr) throw HttpError.internal(issueErr.message);
      issueStockIds = new Set((issueData ?? []).map(r => r.maphoi as number));
    }

    const busyStockIds = await getBusyStockIdsForOtherActivePlans(mapc);
    const validStocks = (stockRows ?? []).filter(
      s => !issueStockIds.has(s.maphoi as number) && !busyStockIds.has(s.maphoi as number)
    ) as unknown as RawStock[];

    const { plannedBars, metrics } = planCuts(pieces, validStocks, kerf, safeMargin, scrapThreshold, minReusableLength);

    const { error: deleteErr } = await supabaseAdmin.from("sodocat").delete().eq("mapc", mapc);
    if (deleteErr) throw HttpError.internal(deleteErr.message);

    const { data: insertedPlans, error: planErr } = await supabaseAdmin
      .from("sodocat")
      .insert(plannedBars.map((bar) => ({ mapc, maphoi: bar.stock.maphoi, trangthai: "CHO_DUYET" })))
      .select("masdc, maphoi")
      .order("masdc", { ascending: true });
    if (planErr) throw HttpError.internal(planErr.message);

    const planByStock = new Map<number, number>();
    for (const plan of insertedPlans ?? []) {
      planByStock.set(plan.maphoi as number, plan.masdc as number);
    }

    const cutRows = plannedBars.flatMap((bar) => {
      const masdc = planByStock.get(bar.stock.maphoi);
      if (!masdc) return [];
      return bar.cuts.map((cut, index) => ({
        masdc,
        mactdh: cut.mactdh,
        thutucat: index + 1,
        chieudaicat: cut.length,
        trangthai: "CHO_CAT",
      }));
    });

    const { error: cutErr } = await supabaseAdmin.from("chitietcat").insert(cutRows);
    if (cutErr) throw HttpError.internal(cutErr.message);

    const plans = await listPlansForAssignment(mapc);
    void activityLogsService.record({
      userId: actorId ?? null,
      action: "CUTTING_PLAN_CREATED",
      targetType: "phancong",
      targetId: mapc,
      details: {
        madh: assignment.madh,
        planCount: plans.length,
        totalRequiredLength: metrics.totalRequiredLength,
        totalKerfLoss: metrics.totalKerfLoss,
      },
    });
    return { plans, metrics };
  },

  // Thợ xác nhận hoàn thành sơ đồ cắt: trừ chiều dài phôi, ghi nhật ký, tự động hoàn thành phân công nếu tất cả sơ đồ xong.
  async completePlan(masdc: number, matho: number) {
    const { data: plan, error } = await supabaseAdmin
      .from("sodocat")
      .select("masdc, mapc, maphoi, trangthai, khothanhphoi:maphoi(chieudaihientai, trangthai), phancong:mapc(matho, madh, donhang:madh(trangthai)), chitietcat(mactc, chieudaicat, trangthai)")
      .eq("masdc", masdc)
      .maybeSingle();
    if (error) throw HttpError.internal(error.message);
    if (!plan) throw HttpError.notFound(`Cutting plan ${masdc} not found`);

    interface CuttingPlanWithOrder {
      masdc: number;
      mapc: number;
      maphoi: number;
      trangthai: string;
      khothanhphoi: { chieudaihientai: number; trangthai: string } | null;
      phancong: {
        matho: number;
        madh: number;
        donhang: { trangthai: string } | null;
      } | null;
      chitietcat: Array<{ mactc: number; chieudaicat: number; trangthai: string }>;
    }
    const typed = plan as unknown as CuttingPlanWithOrder;
    if (typed.phancong?.matho !== matho) throw HttpError.forbidden("Cutting plan is not assigned to this worker");

    const orderStatus = typed.phancong?.donhang?.trangthai;
    if (orderStatus && isTerminalOrderState(orderStatus)) {
      throw HttpError.badRequest("Đơn hàng liên kết đã hoàn thành hoặc đã hủy, không thể xác nhận hoàn thành sơ đồ cắt");
    }

    if (typed.trangthai === "HOAN_THANH") {
      throw HttpError.badRequest("Sơ đồ cắt này đã hoàn thành, không thể xác nhận lại");
    }
    if (typed.khothanhphoi?.trangthai === "BO_DI") {
      throw HttpError.badRequest("Phôi này đã bị đánh dấu bỏ đi, cần tạo sơ đồ cắt mới bằng phôi khác");
    }
    // Chặn hoàn thành khi phôi đang chờ quản trị viên xử lý sự cố để tránh dùng lại phôi lỗi.
    if (await hasOpenIssue({ maphoi: typed.maphoi })) {
      throw HttpError.badRequest("Phôi này đang có sự cố chờ Admin xử lý, chưa thể xác nhận hoàn thành");
    }

    // Kiểm tra trùng phôi giữa các sơ đồ active khác phân công
    const { data: activePlans, error: activeErr } = await supabaseAdmin
      .from("sodocat")
      .select("masdc, mapc")
      .eq("maphoi", typed.maphoi)
      .in("trangthai", ["CHO_DUYET", "DANG_CAT"])
      .neq("mapc", typed.mapc)
      .limit(1);
    if (activeErr) throw HttpError.internal(activeErr.message);
    if ((activePlans ?? []).length > 0) {
      throw HttpError.badRequest(
        `Thanh phôi này đang được sử dụng bởi sơ đồ cắt hoạt động khác của phân công PC-${activePlans[0].mapc}. Vui lòng kiểm tra lại sơ đồ trước khi hoàn thành.`
      );
    }

    const { count: cutPhotoCount, error: cutPhotoError } = await supabaseAdmin
      .from("hinhanh")
      .select("maha", { count: "exact", head: true })
      .eq("mapc", typed.mapc)
      .eq("masdc", masdc)
      .eq("loaianh", "CAT_PHOI");
    if (cutPhotoError) throw HttpError.internal(cutPhotoError.message);
    if (!cutPhotoCount) {
      throw HttpError.badRequest("Can upload anh CAT_PHOI cho so do cat truoc khi xac nhan cat xong");
    }

    const before = typed.khothanhphoi?.chieudaihientai ?? 0;
    const kerf = await getRuleValue("BLADE_KERF", 5);
    const used = typed.chitietcat.reduce((sum, cut) => sum + Number(cut.chieudaicat || 0), 0);
    const kerfLoss = typed.chitietcat.length * kerf;
    const after = before - used - kerfLoss;
    if (after < 0) throw HttpError.badRequest("So do cat vuot qua chieu dai phoi hien tai");

    const scrapThreshold = await getRuleValue("MIN_SCRAP", 100);
    const nextStatus = after < scrapThreshold ? "BO_DI" : "CON_DU";

    const [{ error: cutErr }, { error: planErr }, { error: stockErr }, { error: logErr }] = await Promise.all([
      supabaseAdmin.from("chitietcat").update({ trangthai: "DA_CAT" }).eq("masdc", masdc),
      supabaseAdmin.from("sodocat").update({ trangthai: "HOAN_THANH" }).eq("masdc", masdc),
      supabaseAdmin.from("khothanhphoi").update({ chieudaihientai: after, trangthai: nextStatus }).eq("maphoi", typed.maphoi),
      supabaseAdmin.from("nhatkygiacong").insert({
        maphoi: typed.maphoi,
        mapc: typed.mapc,
        matho,
        sukien: "CAT",
        chieudaitruoc: before,
        chieudaisau: after,
        ghichu: `Hoan thanh so do cat SDC-${masdc}`,
      }),
    ]);
    if (cutErr) throw HttpError.internal(cutErr.message);
    if (planErr) throw HttpError.internal(planErr.message);
    if (stockErr) throw HttpError.internal(stockErr.message);
    if (logErr) throw HttpError.internal(logErr.message);

    return listPlansForAssignment(typed.mapc);
  },

  // Thợ báo sự cố cắt hỏng: ghi nhật ký LOI vào nhatkygiacong, gửi thông báo cho quản trị viên.
  async reportIssue(masdc: number, matho: number, input: ReportIssueDto) {
    const { data: plan, error } = await supabaseAdmin
      .from("sodocat")
      .select("masdc, mapc, maphoi, trangthai, khothanhphoi:maphoi(chieudaihientai, trangthai), phancong:mapc(matho, madh, donhang:madh(trangthai))")
      .eq("masdc", masdc)
      .maybeSingle();
    if (error) throw HttpError.internal(error.message);
    if (!plan) throw HttpError.notFound(`Cutting plan ${masdc} not found`);
    interface CuttingPlanReportWithOrder {
      mapc: number;
      maphoi: number;
      trangthai: string;
      khothanhphoi: { chieudaihientai: number; trangthai: string } | null;
      phancong: {
        matho: number;
        madh: number;
        donhang: { trangthai: string } | null;
      } | null;
    }
    const typed = plan as unknown as CuttingPlanReportWithOrder;
    if (typed.phancong?.matho !== matho) throw HttpError.forbidden("Cutting plan is not assigned to this worker");

    const orderStatus = typed.phancong?.donhang?.trangthai;
    if (orderStatus && isTerminalOrderState(orderStatus)) {
      throw HttpError.badRequest("Đơn hàng liên kết đã hoàn thành hoặc đã hủy, không thể báo sự cố");
    }
    if (typed.trangthai === "HOAN_THANH") {
      throw HttpError.badRequest("Sơ đồ cắt này đã hoàn thành, không thể báo thêm sự cố");
    }
    if (typed.khothanhphoi?.trangthai === "BO_DI") {
      throw HttpError.badRequest("Phôi này đã bị đánh dấu bỏ đi, không thể báo thêm sự cố");
    }
    if (await hasOpenIssue({ maphoi: typed.maphoi })) {
      throw HttpError.conflict("Sự cố của phôi này đã được báo và đang chờ Admin xử lý");
    }

    const current = typed.khothanhphoi?.chieudaihientai ?? 0;
    const issueLabel = ISSUE_TYPE_LABEL[input.loaiSuCo] ?? "Lỗi khác";
    const detail = (input.mota || input.ghichu || "").trim();
    const note = [
      `Loại sự cố: ${issueLabel}`,
      `Mô tả: ${detail}`,
      `Mã phân công: PC-${typed.mapc}`,
      `Mã sơ đồ cắt: SDC-${masdc}`,
      `Mã phôi: UID-${typed.maphoi}`,
    ].join("\n");

    const [{ error: planErr }, { error: logErr }] = await Promise.all([
      supabaseAdmin.from("sodocat").update({ trangthai: "DANG_CAT" }).eq("masdc", masdc),
      supabaseAdmin.from("nhatkygiacong").insert({
        maphoi: typed.maphoi,
        masdc,
        mapc: typed.mapc,
        matho,
        sukien: "LOI",
        trangthaixuly: "CHO_XU_LY",
        chieudaitruoc: current,
        chieudaisau: current,
        ghichu: note,
      }),
    ]);
    if (planErr) throw HttpError.internal(planErr.message);
    if (logErr) throw HttpError.internal(logErr.message);

    void notificationsService
      .createForAdmins({
        title: `Sự cố cắt hỏng SDC-${masdc}`,
        body: `Worker báo ${issueLabel.toLowerCase()} tại PC-${typed.mapc} / UID-${typed.maphoi}. ${detail}`,
        type: "su_co",
        href: "/admin/su-co",
        data: {
          doi_tuong: "sodocat",
          ma_doi_tuong: masdc,
          mapc: typed.mapc,
          maphoi: typed.maphoi,
          madh: typed.phancong?.madh ?? null,
          loaiSuCo: input.loaiSuCo,
        },
      })
      .catch(() => null);

    return listPlansForAssignment(typed.mapc);
  },

  // --- DOT 4: PROPOSAL API ---
  async submitProposal(mapc: number, matho: number, dto: SubmitProposalDto) {
    const assignment = await getAssignment(mapc);
    if (assignment.donhang?.trangthai && isTerminalOrderState(assignment.donhang.trangthai)) {
      throw HttpError.badRequest("Đơn hàng liên kết đã hoàn thành hoặc đã hủy, không thể gửi đề xuất cắt");
    }
    if (assignment.matho !== matho) throw HttpError.forbidden("Ban khong duoc phan cong don nay");

    const bomItems = assignment.donhang?.chitietdh ?? [];
    const cutBomItems = bomItems.filter((item) => Number(item.chieudaicat) > 0 && Number(item.soluong) > 0);
    if (cutBomItems.length === 0) throw HttpError.badRequest("Don hang khong co BOM can cat");

    const bomById = new Map<number, BomItem>();
    const expectedCountByItem = new Map<number, number>();
    for (const item of cutBomItems) {
      bomById.set(item.mactdh, item);
      expectedCountByItem.set(item.mactdh, item.soluong);
    }

    const seenBars = new Set<number>();
    const submittedCountByItem = new Map<number, number>();
    const groupsByStock = new Map<number, ProposalStockGroup>();
    let hasAdjustedLength = false;

    for (const bar of dto.simulatedBars) {
      if (seenBars.has(bar.maphoi)) throw HttpError.badRequest(`UID-${bar.maphoi} bi lap trong de xuat`);
      seenBars.add(bar.maphoi);

      const usedOrders = new Set<number>();
      groupsByStock.set(bar.maphoi, {
        stock: {
          maphoi: bar.maphoi,
          mavt: 0,
          chieudaibandau: 0,
          chieudaihientai: 0,
          trangthai: "",
          vattu: null,
        },
        cuts: [],
      });

      for (const cut of bar.cuts) {
        if (usedOrders.has(cut.thutucat)) throw HttpError.badRequest(`Thu tu cat bi lap tren UID-${bar.maphoi}`);
        usedOrders.add(cut.thutucat);

        const bomItem = bomById.get(cut.mactdh);
        if (!bomItem) throw HttpError.badRequest(`mactdh ${cut.mactdh} khong thuoc don hang cua phan cong`);

        const bomLength = Number(bomItem.chieudaicat);
        const proposedLength = Number(cut.chieudaicat);
        if (!Number.isFinite(proposedLength) || proposedLength <= 0) {
          throw HttpError.badRequest(`Chieu dai de xuat cua mactdh ${cut.mactdh} khong hop le`);
        }
        if (proposedLength !== bomLength) {
          hasAdjustedLength = true;
        }

        submittedCountByItem.set(cut.mactdh, (submittedCountByItem.get(cut.mactdh) ?? 0) + 1);
        groupsByStock.get(bar.maphoi)?.cuts.push({
          maphoi: bar.maphoi,
          mactdh: cut.mactdh,
          chieudaicat: proposedLength,
          thutucat: cut.thutucat,
        });
      }
    }

    if (hasAdjustedLength && !dto.lydodexuat?.trim()) {
      throw HttpError.badRequest("Can co ly do khi chieu dai de xuat khac BOM");
    }

    for (const [mactdh, expected] of expectedCountByItem.entries()) {
      const submitted = submittedCountByItem.get(mactdh) ?? 0;
      if (submitted !== expected) {
        throw HttpError.badRequest(`BOM mactdh ${mactdh} can ${expected} nhat cat, de xuat co ${submitted}`);
      }
    }
    for (const mactdh of submittedCountByItem.keys()) {
      if (!expectedCountByItem.has(mactdh)) throw HttpError.badRequest(`De xuat co mactdh la ${mactdh}`);
    }

    const stockIds = [...groupsByStock.keys()].sort((a, b) => a - b);
    const { data: stockRows, error: stockErr } = await supabaseAdmin
      .from("khothanhphoi")
      .select("maphoi, mavt, chieudaibandau, chieudaihientai, trangthai, vattu:mavt(tenvt, donvitinh)")
      .in("maphoi", stockIds);
    if (stockErr) throw HttpError.internal(stockErr.message);

    const stocksById = new Map<number, RawStock>();
    for (const row of (stockRows ?? []) as unknown as RawStock[]) stocksById.set(row.maphoi, row);
    for (const stockId of stockIds) {
      const stock = stocksById.get(stockId);
      if (!stock) throw HttpError.badRequest(`Khong tim thay phoi UID-${stockId}`);
      if (stock.trangthai === "BO_DI") throw HttpError.badRequest(`Phoi UID-${stockId} da bi bo, khong duoc dung`);
      const group = groupsByStock.get(stockId);
      if (group) group.stock = stock;
    }

    const { data: issueRows, error: issueErr } = await supabaseAdmin
      .from("nhatkygiacong")
      .select("maphoi")
      .eq("sukien", "LOI")
      .eq("trangthaixuly", "CHO_XU_LY")
      .in("maphoi", stockIds);
    if (issueErr) throw HttpError.internal(issueErr.message);
    const issueStockIds = new Set((issueRows ?? []).map((row) => row.maphoi as number));
    if (issueStockIds.size > 0) {
      throw HttpError.badRequest(`Phoi UID-${[...issueStockIds].join(", ")} dang co su co mo`);
    }

    const kerf = await getRuleValue("BLADE_KERF", 5);
    const safeMargin = await getRuleValue("SAFE_MARGIN", 20);
    const scrapThreshold = await getRuleValue("MIN_SCRAP", 100);
    const minReusableLength = await getRuleValue("MIN_REUSABLE_LENGTH", 1500);
    const oldSimulation = await this.simulateCuts(mapc, { workerId: matho, returnShortages: true });
    const oldMetrics = oldSimulation.metrics;

    let totalRequiredLength = 0;
    let totalKerfLoss = 0;
    let totalStockLength = 0;
    let totalReusableRemainder = 0;
    let totalScrapLength = 0;
    let scoreMoi = 0;
    const warnings: string[] = [];
    const selectedReasons: Record<string, string[]> = {};
    const chitietRows: ProposalDetailInsertRow[] = [];
    const snapshotPhoi = [];

    for (const group of [...groupsByStock.values()].sort((a, b) => a.stock.maphoi - b.stock.maphoi)) {
      const stock = group.stock;
      const sortedCuts = [...group.cuts].sort((a, b) => a.thutucat - b.thutucat);
      const requiredLength = sortedCuts.reduce((sum, cut) => sum + cut.chieudaicat, 0);
      const kerfLoss = sortedCuts.length * kerf;
      const totalUsed = requiredLength + kerfLoss;
      const availableLength = Math.max(stock.chieudaihientai - safeMargin * 2, 0);
      if (totalUsed > availableLength) {
        warnings.push(
          `UID-${stock.maphoi}: tong chieu dai de xuat ${totalUsed}mm vuot chieu dai kha dung ${availableLength}mm. Admin/RPC se kiem tra lai khi duyet.`,
        );
      }

      for (const cut of sortedCuts) {
        const bomItem = bomById.get(cut.mactdh);
        if (!bomItem) throw HttpError.badRequest(`mactdh ${cut.mactdh} khong hop le`);
        if (stock.mavt !== bomItem.mavt) {
          throw HttpError.badRequest(`Phoi UID-${stock.maphoi} khong dung vat tu cho mactdh ${cut.mactdh}`);
        }
      }

      const remainder = Math.max(stock.chieudaihientai - totalUsed, 0);
      const remainderScore = scoreRemainder(remainder, scrapThreshold, minReusableLength);
      let loaiPhanDu: ProposalRemainderType = "PHE_LIEU";
      if (remainder >= minReusableLength) {
        loaiPhanDu = "TAI_SU_DUNG";
        totalReusableRemainder += remainder;
      } else {
        totalScrapLength += remainder;
        if (remainder >= scrapThreshold) loaiPhanDu = "LO_CO";
      }

      let barScore = remainderScore.score;
      const reasons = [remainderScore.label, `UID-${stock.maphoi}: dung ${totalUsed}mm, du ${remainder}mm`];
      if (stock.trangthai === "CON_DU") {
        barScore += 120;
        reasons.push("Uu tien phoi du phu hop de don kho");
      }
      if (loaiPhanDu === "LO_CO") {
        warnings.push(`UID-${stock.maphoi} con phan du lo co ${remainder}mm, can admin xem xet`);
      }

      selectedReasons[String(stock.maphoi)] = reasons;
      scoreMoi += barScore;
      totalRequiredLength += requiredLength;
      totalKerfLoss += kerfLoss;
      totalStockLength += stock.chieudaihientai;
      snapshotPhoi.push({
        maphoi: stock.maphoi,
        mavt: stock.mavt,
        chieudaihientai: stock.chieudaihientai,
        trangthai: stock.trangthai,
      });

      sortedCuts.forEach((cut, index) => {
        chitietRows.push({
          maphoi: stock.maphoi,
          mactdh: cut.mactdh,
          chieudaicat: cut.chieudaicat,
          thutucat: index + 1,
          kerf_mm: kerf,
          chieudaiphoi_truoccat: stock.chieudaihientai,
          phandu_saucat: remainder,
          loai_phandu: loaiPhanDu,
          score: barScore,
          lydochon: reasons.join("; "),
        });
      });
    }

    const metricsMoi: CuttingPlanMetrics = {
      totalRequiredLength,
      totalKerfLoss,
      totalStockLength,
      totalReusableRemainder,
      totalScrapLength,
      productUtilizationRate: totalStockLength > 0 ? (totalRequiredLength / totalStockLength) * 100 : 0,
      materialUsageRate: totalStockLength > 0 ? ((totalRequiredLength + totalKerfLoss) / totalStockLength) * 100 : 0,
      selectedReasons,
    };

    const snapshotBom = cutBomItems.map((item) => ({
      mactdh: item.mactdh,
      madh: assignment.madh,
      mavt: item.mavt,
      chieudaicat: item.chieudaicat,
      soluong: item.soluong,
    }));
    const snapshotRules = {
      BLADE_KERF: kerf,
      SAFE_MARGIN: safeMargin,
      MIN_SCRAP: scrapThreshold,
      MIN_REUSABLE_LENGTH: minReusableLength,
    };

    const { data: dxData, error: dxErr } = await supabaseAdmin.from("dexuatcat").insert({
      mapc,
      matho,
      trangthai: "CHO_DUYET",
      lydodexuat: dto.lydodexuat || null,
      tonghaohut_cu: oldMetrics.totalKerfLoss,
      tonghaohut_moi: totalKerfLoss,
      tiletandung_cu: oldMetrics.productUtilizationRate,
      tiletandung_moi: metricsMoi.productUtilizationRate,
      phandutaisudung_cu: oldMetrics.totalReusableRemainder,
      phandutaisudung_moi: totalReusableRemainder,
      phanduphelieu_cu: oldMetrics.totalScrapLength,
      phanduphelieu_moi: totalScrapLength,
      score_cu: 0,
      score_moi: scoreMoi,
      metrics_cu: oldMetrics,
      metrics_moi: metricsMoi,
      snapshot_bom: snapshotBom,
      snapshot_phoi: snapshotPhoi,
      snapshot_rules: snapshotRules,
      warnings,
      selected_reasons: selectedReasons,
    }).select("madxc").single();
    if (dxErr) throw HttpError.internal(dxErr.message);

    const mappedChitiet = chitietRows.map((row) => ({ ...row, madxc: dxData.madxc }));
    const { error: ctErr } = await supabaseAdmin.from("chitietdexuatcat").insert(mappedChitiet);
    if (ctErr) throw HttpError.internal(ctErr.message);

    return {
      proposalId: dxData.madxc,
      status: "CHO_DUYET",
      metrics: metricsMoi,
      warnings,
      selectedReasons,
      message: "Gui de xuat cat thanh cong",
    };
  },

  async listProposals(mapc?: number) {
    let query = supabaseAdmin
      .from("dexuatcat")
      .select("*, nguoidung!matho(hoten), chitietdexuatcat(*)")
      .order("ngaytao", { ascending: false });
    if (mapc) query = query.eq("mapc", mapc);
    const { data, error } = await query;
    if (error) throw HttpError.internal(error.message);
    return data;
  },

  async listWorkerProposals(matho: number, mapc?: number) {
    let query = supabaseAdmin
      .from("dexuatcat")
      .select("*, chitietdexuatcat(*)")
      .eq("matho", matho)
      .order("ngaytao", { ascending: false });

    if (mapc !== undefined) {
      const assignment = await getAssignment(mapc);
      if (assignment.matho !== matho) throw HttpError.forbidden("Khong duoc xem de xuat cua phan cong khac");
      query = query.eq("mapc", mapc);
    }

    const { data, error } = await query;
    if (error) throw HttpError.internal(error.message);
    return data;
  },

  async getProposalDetail(madxc: number) {
    const { data, error } = await supabaseAdmin
      .from("dexuatcat")
      .select("*, nguoidung!matho(hoten), chitietdexuatcat(*)")
      .eq("madxc", madxc)
      .maybeSingle();
    if (error) throw HttpError.internal(error.message);
    if (!data) throw HttpError.notFound("Khong tim thay de xuat cat");
    return data;
  },

  async approveProposal(madxc: number, adminId: number, ghichu?: string) {
    const { data: proposal, error: propErr } = await supabaseAdmin
      .from("dexuatcat")
      .select("madxc, mapc, phancong:mapc(madh, donhang:madh(trangthai))")
      .eq("madxc", madxc)
      .maybeSingle();
    if (propErr) throw HttpError.internal(propErr.message);
    if (!proposal) throw HttpError.notFound("Không tìm thấy đề xuất cắt");

    interface ProposalWithOrder {
      madxc: number;
      mapc: number;
      phancong: {
        madh: number;
        donhang: { trangthai: string } | null;
      } | null;
    }
    const typed = proposal as unknown as ProposalWithOrder;
    const orderStatus = typed.phancong?.donhang?.trangthai;
    if (orderStatus && isTerminalOrderState(orderStatus)) {
      throw HttpError.badRequest("Đơn hàng liên kết đã hoàn thành hoặc đã hủy, không thể duyệt đề xuất cắt");
    }

    const { data, error } = await supabaseAdmin.rpc("approve_cutting_proposal", {
      p_proposal_id: madxc,
      p_admin_id: adminId,
      p_admin_note: ghichu || null,
    });
    if (error) throwProposalRpcError(error);
    return mapProposalRpcResult(data, ["APPROVED"]);
  },

  async rejectProposal(madxc: number, adminId: number, ghichu?: string) {
    const { data: proposal, error: propErr } = await supabaseAdmin
      .from("dexuatcat")
      .select("madxc, mapc, phancong:mapc(madh, donhang:madh(trangthai))")
      .eq("madxc", madxc)
      .maybeSingle();
    if (propErr) throw HttpError.internal(propErr.message);
    if (!proposal) throw HttpError.notFound("Không tìm thấy đề xuất cắt");

    interface ProposalWithOrder {
      madxc: number;
      mapc: number;
      phancong: {
        madh: number;
        donhang: { trangthai: string } | null;
      } | null;
    }
    const typed = proposal as unknown as ProposalWithOrder;
    const orderStatus = typed.phancong?.donhang?.trangthai;
    if (orderStatus && isTerminalOrderState(orderStatus)) {
      throw HttpError.badRequest("Đơn hàng liên kết đã hoàn thành hoặc đã hủy, không thể từ chối đề xuất cắt");
    }

    const { data, error } = await supabaseAdmin.rpc("reject_cutting_proposal", {
      p_proposal_id: madxc,
      p_admin_id: adminId,
      p_admin_note: ghichu || null,
    });
    if (error) throwProposalRpcError(error);
    return mapProposalRpcResult(data, ["REJECTED"]);
  },
};
