"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Gauge, ListChecks, Loader2, PackagePlus, Play, RefreshCw, Ruler, Scissors, TrendingUp, X } from "lucide-react";
import { ApiError, apiData } from "@/lib/api";

type AssignmentRow = {
  mapc: number;
  trangthai: string;
  donhang: { madh: number; khachhang: { hoten: string } | null; trangthai: string } | null;
  nguoidung: { hoten: string } | null;
};

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
    trangthai?: string;
    vattu: { tenvt: string } | null;
  } | null;
  chitietcat: CutDetail[];
};

type StockShortage = {
  mavt: number;
  tenvt: string;
  suggestedLength: number;
  availableBars: number;
  reusableBars: number;
  newBars: number;
  missingPieces: Array<{ label: string; length: number }>;
  totalPieces: number;
  neededBars: number;
};

type ShortageDetails = {
  code?: string;
  shortages?: StockShortage[];
};

type SupplementDraft = Record<number, { quantity: string; length: string }>;

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

type CreatePlanResponse = {
  plans: CuttingPlan[];
  metrics: CuttingPlanMetrics;
};

const CUT_COLORS = [
  "bg-cyan-500/70",
  "bg-emerald-500/70",
  "bg-amber-500/70",
  "bg-violet-500/70",
  "bg-rose-500/70",
  "bg-sky-500/70",
  "bg-lime-500/70",
  "bg-pink-500/70",
];

function getShortageDetails(error: unknown): StockShortage[] | null {
  // Backend trả lỗi nghiệp vụ INSUFFICIENT_STOCK trong phần chi tiết của ApiError.
  // Giao diện tách riêng lỗi này thành hộp thoại nhập bổ sung thay vì thông báo lỗi đỏ chung.
  if (!(error instanceof ApiError)) return null;
  const details = error.details as ShortageDetails | undefined;
  if (details?.code !== "INSUFFICIENT_STOCK" || !Array.isArray(details.shortages)) return null;
  return details.shortages;
}

function stockSourceLabel(status?: string) {
  if (status === "CON_DU") return "Tái sử dụng phôi dư";
  if (status === "MOI") return "Thanh nguyên mới";
  if (status === "BO_DI") return "Phôi lỗi";
  return "Không rõ nguồn";
}

function stockSourceClass(status?: string) {
  if (status === "CON_DU") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  if (status === "BO_DI") return "border-red-500/20 bg-red-500/10 text-red-300";
  return "border-amber-500/20 bg-amber-500/10 text-amber-300";
}

function planStatusLabel(status: string, isScrap: boolean) {
  if (isScrap) return "Phôi lỗi";
  if (status === "DANG_CAT") return "Chờ xử lý lỗi";
  const labels: Record<string, string> = {
    CHO_THUC_HIEN: "Chờ thực hiện",
    DANG_THUC_HIEN: "Đang cắt",
    HOAN_THANH: "Hoàn thành",
    DA_CAT: "Đã cắt",
  };
  return labels[status] ?? status;
}

function cutStatusLabel(status: string) {
  const labels: Record<string, string> = {
    CHO_CAT: "Chờ cắt",
    DA_CAT: "Đã cắt",
    LOI: "Lỗi",
  };
  return labels[status] ?? status;
}

function assignmentStatusLabel(status: string) {
  const labels: Record<string, string> = {
    CHO_THUC_HIEN: "Chờ nhận",
    DANG_THUC_HIEN: "Đang làm",
    HOAN_THANH: "Hoàn thành",
    TU_CHOI: "Từ chối",
  };
  return labels[status] ?? status;
}

function formatMm(value: number) {
  return `${Math.max(0, Math.round(value)).toLocaleString("vi-VN")} mm`;
}

function toPositiveInt(raw: string | undefined, fallback: number) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
}

function getPlanMetrics(plan: CuttingPlan) {
  // Sơ đồ đã hoàn thành đã trừ chiều dài phôi trong DB, nên inputLength phải ước tính lại
  // từ chiều dài đã dùng + phần dư để biểu đồ không hiển thị sai tỷ lệ sử dụng.
  const currentLength = Number(plan.khothanhphoi?.chieudaihientai ?? 0);
  const originalLength = Number(plan.khothanhphoi?.chieudaibandau ?? 0);
  const usedLength = plan.chitietcat.reduce((sum, cut) => sum + Number(cut.chieudaicat || 0), 0);
  const inputLength =
    plan.trangthai === "HOAN_THANH" || (currentLength > 0 && currentLength < usedLength)
      ? Math.max(usedLength + currentLength, usedLength, currentLength, 1)
      : Math.max(currentLength || originalLength, usedLength, 1);
  const remainder = Math.max(0, inputLength - usedLength);
  const usageRate = inputLength > 0 ? Math.min(100, Math.round((usedLength / inputLength) * 100)) : 0;

  return { currentLength, originalLength, inputLength, usedLength, remainder, usageRate };
}

// Trang tối ưu cắt: chọn phân công → tạo sơ đồ cắt (FFD 1D-CSP) → hiển thị biểu đồ trực quan
// Xử lý thiếu phôi: đề xuất nhập bổ sung → nhập kho → chạy lại tối ưu
export default function CuttingOptimizationPage() {
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [plans, setPlans] = useState<CuttingPlan[]>([]);
  const [selectedMapc, setSelectedMapc] = useState(0);
  const [loading, setLoading] = useState(true);
  const [plansLoading, setPlansLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [shortages, setShortages] = useState<StockShortage[]>([]);
  const [supplementDraft, setSupplementDraft] = useState<SupplementDraft>({});
  const [errorMsg, setErrorMsg] = useState("");
  const [planMetrics, setPlanMetrics] = useState<CuttingPlanMetrics | null>(null);

  const applyShortages = useCallback((rows: StockShortage[]) => {
    // Đồng bộ bảng thiếu phôi với draft nhập bổ sung.
    // Khi rows rỗng, banner đề xuất sẽ tự ẩn sau khi nhập đủ và generate lại thành công.
    setShortages(rows);
    setSupplementDraft(
      Object.fromEntries(
        rows.map((item) => [
          item.mavt,
          {
            quantity: String(item.neededBars),
            length: String(item.suggestedLength),
          },
        ]),
      ),
    );
  }, []);

  const loadPlansForSelected = useCallback(async (mapc: number) => {
    if (!mapc) {
      setPlans([]);
      return;
    }
    setPlansLoading(true);
    try {
      setPlans(await apiData<CuttingPlan[]>(`/api/admin/cutting-plans/assignment/${mapc}`));
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setPlans([]);
    } finally {
      setPlansLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const assignmentRows = await apiData<AssignmentRow[]>("/api/admin/assignments");
      const nextMapc = assignmentRows.some((row) => row.mapc === selectedMapc) ? selectedMapc : assignmentRows[0]?.mapc || 0;
      setAssignments(assignmentRows);
      setSelectedMapc(nextMapc);
      if (nextMapc === selectedMapc) await loadPlansForSelected(nextMapc);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [loadPlansForSelected, selectedMapc]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    void loadPlansForSelected(selectedMapc);
  }, [loadPlansForSelected, selectedMapc]);

  const selectedPlans = useMemo(() => plans, [plans]);

  const generate = async () => {
    if (!selectedMapc) return;
    setGenerating(true);
    applyShortages([]);
    setErrorMsg("");
    try {
      const result = await apiData<CreatePlanResponse>("/api/admin/cutting-plans", {
        method: "POST",
        body: JSON.stringify({ mapc: selectedMapc }),
      });
      setPlans(result.plans);
      setPlanMetrics(result.metrics);
    } catch (err: unknown) {
      const shortageRows = getShortageDetails(err);
      if (shortageRows) {
        applyShortages(shortageRows);
      } else {
        setErrorMsg(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setGenerating(false);
    }
  };

  const importSupplementStock = async () => {
    if (shortages.length === 0) return;
    setImporting(true);
    setErrorMsg("");
    try {
      // Quản trị viên xác nhận thì mới tạo lô/phôi mới; hệ thống không tự nhập kho khi chỉ phát hiện thiếu.
      const items = shortages.map((item) => ({
        mavt: item.mavt,
        chieudaibandau: Math.max(toPositiveInt(supplementDraft[item.mavt]?.length, item.suggestedLength), item.suggestedLength),
        quantity: Math.max(toPositiveInt(supplementDraft[item.mavt]?.quantity, item.neededBars), item.neededBars),
      }));

      await apiData("/api/admin/raw-stock", {
        method: "POST",
        body: JSON.stringify({
          nhacungcap: "Đề xuất nhập bổ sung từ tối ưu cắt",
          items,
        }),
      });
      applyShortages([]);
      // Sau khi nhập bổ sung, chạy lại tối ưu ngay để chứng minh kho đã đủ và ẩn đề xuất nếu thành công.
      await generate();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  };

  const updateSupplementDraft = (mavt: number, key: "quantity" | "length", value: string) => {
    const sanitized = value.replace(/[^\d]/g, "");
    setSupplementDraft((current) => ({
      ...current,
      [mavt]: {
        quantity: current[mavt]?.quantity ?? "1",
        length: current[mavt]?.length ?? String(shortages.find((item) => item.mavt === mavt)?.suggestedLength ?? 6000),
        [key]: sanitized,
      },
    }));
  };

  const bumpAllSupplementQuantities = () => {
    setSupplementDraft((current) =>
      Object.fromEntries(
        shortages.map((item) => {
          const currentQty = toPositiveInt(current[item.mavt]?.quantity, item.neededBars);
          return [
            item.mavt,
            {
              quantity: String(currentQty + item.neededBars),
              length: current[item.mavt]?.length ?? String(item.suggestedLength),
            },
          ];
        }),
      ),
    );
  };

  const totalSupplementBars = shortages.reduce(
    (sum, item) => sum + toPositiveInt(supplementDraft[item.mavt]?.quantity, item.neededBars),
    0,
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="admin-metal-panel border border-white/10 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="admin-metal-shine" />
        <div className="relative z-10">
          <h1 className="text-xl md:text-2xl font-bold text-gray-100 flex items-center">
            <Scissors className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 text-red-400" /> Tối ưu cắt vật tư
          </h1>
          <p className="text-xs md:text-sm text-gray-400 mt-1 ml-7 md:ml-9">
            Lấy BOM từ đơn đã phân công và kho phôi thật, sau đó lưu vào sơ đồ cắt.
          </p>
        </div>
        <button onClick={load} className="relative z-10 p-2 md:p-3 self-end md:self-auto -mt-12 md:mt-0 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10" title="Tải lại" aria-label="Tải lại">
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {errorMsg && <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-sm">{errorMsg}</div>}

      {shortages.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-amber-100 flex items-center">
                <PackagePlus className="w-5 h-5 mr-2" /> Đề xuất nhập bổ sung vật tư
              </h2>
              <p className="text-sm text-amber-100/70 mt-1">
                Kho hiện tại chưa đủ phôi phù hợp. Admin xác nhận nhập bổ sung rồi hệ thống sẽ chạy lại tối ưu.
              </p>
            </div>
            <button
              type="button"
              onClick={() => applyShortages([])}
              className="p-2 rounded-lg text-amber-100/70 hover:text-white hover:bg-white/10"
              title="Đóng"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-amber-500/20">
            <table className="w-full text-sm">
              <thead className="bg-black/30 text-amber-100/80">
                <tr>
                  <th className="p-3 text-left">Vật tư thiếu</th>
                  <th className="p-3 text-left">Đoạn cần cắt</th>
                  <th className="p-3 text-center">Phôi hiện có</th>
                  <th className="p-3 text-center">Cần nhập</th>
                  <th className="p-3 text-center">Chiều dài đề xuất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-500/10">
                {shortages.map((item) => {
                  const draft = supplementDraft[item.mavt] ?? {
                    quantity: String(item.neededBars),
                    length: String(item.suggestedLength),
                  };
                  return (
                    <tr key={item.mavt} className="text-gray-100 align-top">
                      <td className="p-3 font-bold">
                        {item.tenvt}
                        <div className="text-xs font-normal text-gray-400 mt-1">VT-{item.mavt}</div>
                        <div className="mt-2 text-xs font-normal text-amber-100/70">
                          Thiếu {item.totalPieces} đoạn, đề xuất tối thiểu {item.neededBars} phôi.
                        </div>
                      </td>
                      <td className="p-3 text-gray-300">
                        {item.missingPieces.slice(0, 3).map((piece, idx) => (
                          <div key={`${piece.label}-${idx}`}>{piece.label}: {piece.length}mm</div>
                        ))}
                        {item.missingPieces.length > 3 && (
                          <div className="text-xs text-gray-500">+{item.missingPieces.length - 3} đoạn khác</div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="font-bold">{item.availableBars} phôi</div>
                        <div className="text-xs text-gray-500">{item.reusableBars} dư / {item.newBars} mới</div>
                      </td>
                      <td className="p-3 text-center">
                        <input
                          inputMode="numeric"
                          value={draft.quantity}
                          onChange={(event) => updateSupplementDraft(item.mavt, "quantity", event.target.value)}
                          className="mx-auto h-10 w-24 rounded-lg border border-amber-500/20 bg-black/30 px-3 text-center font-bold text-amber-100 outline-none focus:border-amber-300"
                          aria-label={`Số phôi cần nhập cho ${item.tenvt}`}
                        />
                        <div className="mt-1 text-xs text-gray-500">phôi</div>
                      </td>
                      <td className="p-3 text-center">
                        <input
                          inputMode="numeric"
                          value={draft.length}
                          onChange={(event) => updateSupplementDraft(item.mavt, "length", event.target.value)}
                          className="mx-auto h-10 w-28 rounded-lg border border-amber-500/20 bg-black/30 px-3 text-center font-bold text-white outline-none focus:border-amber-300"
                          aria-label={`Chiều dài phôi đề xuất cho ${item.tenvt}`}
                        />
                        <div className="mt-1 text-xs text-gray-500">mm/thanh</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-sm text-amber-100/80">
              Sẽ nhập <span className="font-bold text-white">{totalSupplementBars}</span> phôi cho <span className="font-bold text-white">{shortages.length}</span> loại vật tư.
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <button
                onClick={bumpAllSupplementQuantities}
                className="h-11 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-100 border border-amber-500/20 font-bold"
              >
                + Bổ sung thêm nhiều phôi
              </button>
            <button
              onClick={() => applyShortages([])}
              className="h-11 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 font-bold"
            >
              Để sau
            </button>
            <button
              onClick={importSupplementStock}
              disabled={importing}
              className="h-11 px-5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white font-bold flex items-center justify-center"
            >
              {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PackagePlus className="w-4 h-4 mr-2" />}
              Nhập bổ sung tất cả
            </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        <section className="xl:col-span-1 bg-[#0a0a0c] border border-white/5 rounded-2xl p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300 mb-4">Phân công</h2>
          {loading ? (
            <div className="py-10 flex justify-center text-gray-400"><Loader2 className="w-7 h-7 animate-spin" /></div>
          ) : (
            <div className="space-y-2">
              {assignments.map((item) => (
                <button
                  key={item.mapc}
                  onClick={() => setSelectedMapc(item.mapc)}
                  className={`w-full text-left rounded-xl border p-3 transition-colors ${selectedMapc === item.mapc ? "border-red-400/40 bg-red-500/10" : "border-white/10 bg-white/3 hover:bg-white/5"}`}
                >
                  <div className="text-sm font-bold text-gray-100">PC-{item.mapc} / DH-{item.donhang?.madh}</div>
                  <div className="text-xs text-gray-400 mt-1">{item.donhang?.khachhang?.hoten || "Khách hàng"} - {item.nguoidung?.hoten || "Thợ"}</div>
                  <div className="text-[10px] text-gray-500 mt-1">{assignmentStatusLabel(item.trangthai)}</div>
                </button>
              ))}
              {assignments.length === 0 && <div className="text-sm text-gray-500 text-center py-8">Chưa có phân công.</div>}
            </div>
          )}

          <button
            onClick={generate}
            disabled={!selectedMapc || generating}
            className="mt-5 w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl py-3 font-bold flex items-center justify-center"
          >
            {generating ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Play className="w-5 h-5 mr-2" />} Tạo sơ đồ cắt
          </button>
        </section>

        <section className="xl:col-span-3 bg-[#0a0a0c] border border-white/5 rounded-2xl p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center mb-6">
            <Ruler className="w-4 h-4 mr-2 text-blue-300" /> Sơ đồ đã lưu
          </h2>

          {plansLoading ? (
            <div className="h-40 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Đang tải sơ đồ cắt...
            </div>
          ) : selectedPlans.length === 0 ? (
            <div className="h-40 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-gray-500">
              Chưa có sơ đồ cắt cho phân công này.
            </div>
          ) : (
            <div className="space-y-5">
              {selectedPlans.map((plan) => {
                const metrics = getPlanMetrics(plan);
                const isScrap = plan.khothanhphoi?.trangthai === "BO_DI";
                const hasOpenIssue = Boolean(plan.coSuCoMo) || plan.trangthai === "DANG_CAT";
                return (
                  <div key={plan.masdc} className={`rounded-2xl border p-4 ${isScrap ? "border-red-500/30 bg-red-500/5" : "border-white/10 bg-white/3"}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-gray-100">SDC-{plan.masdc}</span>
                          <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-mono text-amber-200">
                            UID-{plan.khothanhphoi?.maphoi ?? "-"}
                          </span>
                          <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${stockSourceClass(plan.khothanhphoi?.trangthai)}`}>
                            {stockSourceLabel(plan.khothanhphoi?.trangthai)}
                          </span>
                        </div>
                        <div className="mt-2 text-sm font-semibold text-gray-100">{plan.khothanhphoi?.vattu?.tenvt || "Vật tư chưa xác định"}</div>
                        <div className="mt-1 text-xs text-gray-500">Mã phân công PC-{plan.mapc}</div>
                      </div>
                      <span className={`w-fit text-[11px] font-bold px-2.5 py-1 rounded-lg border ${isScrap ? "bg-red-500/10 text-red-300 border-red-500/20" : hasOpenIssue ? "bg-amber-500/10 text-amber-300 border-amber-500/20" : plan.trangthai === "HOAN_THANH" ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" : "bg-blue-500/10 text-blue-300 border-blue-500/20"}`}>
                        {hasOpenIssue && !isScrap ? "Chờ xử lý lỗi" : planStatusLabel(plan.trangthai, isScrap)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 mb-4">
                      <Metric label="Chiều dài đầu vào" value={formatMm(metrics.inputLength)} />
                      <Metric label="Chiều dài gốc" value={formatMm(metrics.originalLength || metrics.inputLength)} />
                      <Metric label="Đã sử dụng" value={formatMm(metrics.usedLength)} tone="emerald" />
                      <Metric label="Phần dư sau cắt" value={formatMm(metrics.remainder)} tone="amber" />
                      <Metric label="Số nhát cắt" value={`${plan.chitietcat.length}`} />
                      <Metric label="Tỷ lệ dùng" value={`${metrics.usageRate}%`} tone={metrics.usageRate >= 80 ? "emerald" : "amber"} />
                    </div>

                    <div className="mb-3 flex items-center justify-between gap-3 text-xs text-gray-400">
                      <span className="inline-flex items-center"><Gauge className="w-3.5 h-3.5 mr-1.5 text-blue-300" />Thanh biểu diễn sơ đồ cắt</span>
                      <span>Dùng {formatMm(metrics.usedLength)} / {formatMm(metrics.inputLength)}</span>
                    </div>
                    <div className="h-16 bg-[#15171d] rounded-xl border border-white/10 overflow-x-auto overflow-y-hidden flex">
                      {plan.chitietcat.map((cut, idx) => (
                        <div
                          key={cut.mactc}
                          style={{ width: `${Math.max(6, (cut.chieudaicat / metrics.inputLength) * 100)}%` }}
                          className={`h-full ${CUT_COLORS[idx % CUT_COLORS.length]} border-r border-black/40 flex min-w-[54px] flex-col items-center justify-center text-[10px] font-bold text-white`}
                          title={`${cut.thutucat}. ${cut.chitietdh?.mota || cut.chitietdh?.vattu?.tenvt || "Chi tiết"} - ${cut.chieudaicat}mm`}
                        >
                          <span>#{idx + 1}</span>
                          <span>{formatMm(cut.chieudaicat).replace(" mm", "")}</span>
                        </div>
                      ))}
                      <div
                        style={{ minWidth: metrics.remainder > 0 ? 56 : 0 }}
                        className="flex-1 bg-amber-500/20 text-[10px] font-bold text-amber-200 flex items-center justify-center"
                        title={`Phần dư sau cắt: ${formatMm(metrics.remainder)}`}
                      >
                        {metrics.remainder > 0 ? `Dư ${formatMm(metrics.remainder).replace(" mm", "")}` : "Dư 0"}
                      </div>
                    </div>

                    <details className="group mt-3 rounded-xl border border-white/10 bg-black/20">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-bold text-gray-200">
                        <span className="inline-flex items-center"><ListChecks className="w-4 h-4 mr-2 text-blue-300" />Chi tiết nhát cắt</span>
                        <ChevronDown className="w-4 h-4 text-gray-500 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="divide-y divide-white/10 border-t border-white/10">
                        {plan.chitietcat.map((cut) => (
                          <div key={cut.mactc} className="grid grid-cols-[40px_1fr_auto] gap-3 px-3 py-2 text-xs text-gray-300">
                            <div className="font-mono text-gray-500">#{cut.thutucat}</div>
                            <div className="min-w-0">
                              <div className="font-semibold text-gray-100">{cut.chitietdh?.mota || "Chi tiết cắt"}</div>
                              <div className="mt-0.5 text-gray-500 truncate">{cut.chitietdh?.vattu?.tenvt || plan.khothanhphoi?.vattu?.tenvt || "Vật tư"}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-bold text-sky-300">{formatMm(cut.chieudaicat)}</div>
                              <div className="mt-0.5 text-gray-500">{cutStatusLabel(cut.trangthai)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>

                    {isScrap && (
                      <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                        Phôi này đã bị đánh dấu bỏ đi. Hãy tạo lại sơ đồ cắt để hệ thống chọn phôi khác.
                      </div>
                    )}
                    {hasOpenIssue && !isScrap && (
                      <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                        UID này đang có sự cố mở. Worker chưa thể hoàn thành sơ đồ cho đến khi Admin xử lý ở màn Sự cố phôi.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {selectedPlans.length > 0 && (
            <div className="mt-6 text-sm text-emerald-300 flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2" /> Worker sẽ thấy các sơ đồ này ở màn hình Máy cắt.
            </div>
          )}

          {planMetrics && selectedPlans.length > 0 && (
            <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
              <h3 className="text-sm font-bold text-blue-200 flex items-center mb-4">
                <TrendingUp className="w-4 h-4 mr-2" /> Chỉ số phương án cắt
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <Metric label="Tổng chiều dài cần cắt" value={formatMm(planMetrics.totalRequiredLength)} tone="emerald" />
                <Metric label="Tổng phôi sử dụng" value={formatMm(planMetrics.totalStockLength)} />
                <Metric label="Hao hụt lưỡi cưa" value={formatMm(planMetrics.totalKerfLoss)} tone="amber" />
                <Metric label="Tỷ lệ thành phẩm" value={`${planMetrics.productUtilizationRate.toFixed(1)}%`} tone={planMetrics.productUtilizationRate >= 70 ? "emerald" : "amber"} />
                <Metric label="Tỷ lệ tiêu hao NL" value={`${planMetrics.materialUsageRate.toFixed(1)}%`} />
                <Metric label="Phần dư tái sử dụng" value={formatMm(planMetrics.totalReusableRemainder)} tone="emerald" />
                <Metric label="Phế liệu" value={formatMm(planMetrics.totalScrapLength)} tone="amber" />
                <Metric label="Số thanh dùng" value={`${selectedPlans.length} thanh`} />
              </div>
              {Object.keys(planMetrics.selectedReasons).length > 0 && (
                <details className="group rounded-xl border border-blue-500/10 bg-black/20">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-bold text-blue-200">
                    <span className="inline-flex items-center"><ListChecks className="w-4 h-4 mr-2" />Lý do chọn phôi</span>
                    <ChevronDown className="w-4 h-4 text-gray-500 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="divide-y divide-blue-500/10 border-t border-blue-500/10 text-xs text-gray-300 max-h-60 overflow-y-auto">
                    {Object.entries(planMetrics.selectedReasons).map(([stockId, reasons]) => (
                      <div key={stockId} className="px-3 py-2">
                        <div className="font-bold text-blue-200 mb-1">Phôi UID-{stockId}</div>
                        {reasons.map((reason, idx) => (
                          <div key={idx} className="text-gray-400 ml-2">• {reason}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "emerald" | "amber" }) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-300"
      : tone === "amber"
        ? "text-amber-300"
        : "text-gray-100";

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
      <div className="text-[11px] text-gray-500">{label}</div>
      <div className={`mt-1 text-sm font-bold ${toneClass}`}>{value}</div>
    </div>
  );
}
