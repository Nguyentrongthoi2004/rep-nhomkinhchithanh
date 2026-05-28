/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Loader2,
  AlertTriangle,
  Check,
  X,
  Plus,
  Trash2,
  Copy,
  ClipboardEdit,
  ArrowRight,
  ArrowLeft,
  Scissors,
  Eye,
} from "lucide-react";
import { workerSubmitCuttingProposal } from "@/lib/api";
import { calculateCuttingPlanMetrics } from "@/lib/cuttingMetrics";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

type CurrentCutDetail = {
  mactc: number;
  mactdh: number;
  thutucat: number;
  chieudaicat: number;
  trangthai: string;
  chitietdh: { mota: string | null; vattu: { tenvt: string } | null } | null;
};

type CurrentPlan = {
  masdc: number;
  mapc: number;
  trangthai: string;
  khothanhphoi: {
    maphoi: number;
    chieudaibandau: number;
    chieudaihientai: number;
    trangthai: string;
    vattu: { tenvt: string } | null;
  } | null;
  chitietcat: CurrentCutDetail[];
};

type ProposedCut = {
  id: string;
  sourceMactc?: number;
  sourceMasdc?: number;
  sourceMaphoi?: number;
  sourceKey: string;
  mactdh: number;
  bomLength: number;
  chieudaicat: number;
  thutucat: number;
  label: string;
  materialName: string;
  adjustmentReason: string;
};

type ProposedBar = {
  id: string;
  maphoi: number;
  chieudai: number;
  tenphoi: string;
  materialName: string;
  cuts: ProposedCut[];
};

type BomOption = {
  sourceKey: string;
  sourceMactc?: number;
  sourceMasdc: number;
  sourceMaphoi: number;
  sourceBarLength: number;
  mactdh: number;
  label: string;
  materialName: string;
  chieudaicat: number;
  thutucat: number;
  sdcLabel: string;
  uidLabel: string;
};

type Props = {
  mapc: number;
  currentPlans: CurrentPlan[];
  onClose: () => void;
  onSuccess: () => void;
};

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

let _nextId = 1;
function uid() {
  return `_uid_${Date.now()}_${_nextId++}`;
}

function fmtMm(val: number | null | undefined): string {
  if (val == null || isNaN(Number(val))) return "—";
  return `${Math.round(Number(val)).toLocaleString("vi-VN")} mm`;
}

function makeSourceCutKey({
  sourceMactc,
  sourceMasdc,
  sourceMaphoi,
  thutucat,
  mactdh,
}: {
  sourceMactc?: number | null;
  sourceMasdc?: number | null;
  sourceMaphoi?: number | null;
  thutucat?: number | null;
  mactdh?: number | null;
}) {
  if (sourceMactc != null && Number(sourceMactc) > 0) {
    return `mactc:${Number(sourceMactc)}`;
  }
  return `fallback:${Number(sourceMasdc) || 0}-${Number(sourceMaphoi) || 0}-${Number(thutucat) || 0}-${Number(mactdh) || 0}`;
}

function stockLabel(status?: string) {
  if (status === "CON_DU") return "Phôi dư";
  if (status === "MOI") return "Thanh mới";
  return "";
}

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



const REASON_OPTIONS = [
  "Phôi thực tế khó thao tác hoặc có dấu hiệu lỗi",
  "Phương án hiện tại tạo phần dư lỡ cỡ",
  "Muốn đổi sang phôi dư dễ tận dụng hơn",
  "Thứ tự cắt hiện tại chưa thuận tiện",
  "Quan sát thực tế tại xưởng cho thấy phương án khác hợp lý hơn",
  "Khác",
] as const;

const MAX_PROPOSAL_DELTA_MM = 20;

// ────────────────────────────────────────────────────────────
// Visual Bar Diagram component
// ────────────────────────────────────────────────────────────

function BarDiagram({
  barLength,
  cuts,
  usedLength,
}: {
  barLength: number;
  cuts: { chieudaicat: number; label?: string }[];
  usedLength?: number;
}) {
  if (barLength <= 0) return null;
  const totalCut = usedLength ?? cuts.reduce((s, c) => s + Number(c.chieudaicat), 0);
  const remainder = Math.max(0, barLength - totalCut);

  return (
    <div className="mt-2 mb-1">
      <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400 mb-1.5">
        <span className="inline-flex items-center font-semibold">
          <Scissors className="w-3 h-3 mr-1 text-cyan-400" />
          Thanh biểu diễn sơ đồ cắt
        </span>
        <span>
          Dùng <b className="text-white">{fmtMm(totalCut)}</b> / {fmtMm(barLength)}
        </span>
      </div>
      <div className="w-full h-14 bg-[#15171d] rounded-xl border border-white/10 overflow-x-auto overflow-y-hidden flex">
        {cuts.map((cut, i) => (
          <div
            key={i}
            style={{ width: `${Math.max(6, (Number(cut.chieudaicat) / barLength) * 100)}%` }}
            className={`h-full ${CUT_COLORS[i % CUT_COLORS.length]} border-r border-black/40 flex min-w-[54px] flex-col items-center justify-center text-[10px] font-bold text-white`}
            title={`#${i + 1}: ${cut.label || ""} - ${fmtMm(cut.chieudaicat)}`}
          >
            <span>#{i + 1}</span>
            <span>{Math.round(Number(cut.chieudaicat)).toLocaleString("vi-VN")}</span>
          </div>
        ))}
        <div
          style={{ minWidth: remainder > 0 ? 56 : 0 }}
          className="flex-1 bg-amber-500/20 text-[10px] font-bold text-amber-200 flex items-center justify-center"
          title={`Phần dư: ${fmtMm(remainder)}`}
        >
          {remainder > 0 ? `Dư ${Math.round(remainder).toLocaleString("vi-VN")}` : "Dư 0"}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Detailed bar card for display (read-only)
// ────────────────────────────────────────────────────────────

function PlanBarCard({ plan }: { plan: CurrentPlan }) {
  const bar = plan.khothanhphoi;
  if (!bar) return null;
  const sortedCuts = [...plan.chitietcat].sort((a, b) => a.thutucat - b.thutucat);
  const metrics = calculateCuttingPlanMetrics(plan);
  const usedLength = metrics.usedLength;
  const currentLength = Number(bar.chieudaihientai);
  const originalLength = Number(bar.chieudaibandau);
  const inputLength = metrics.inputLength;
  const remainder = metrics.remainder;
  const statusTag = stockLabel(bar.trangthai);

  return (
    <div className="bg-[#0c0e14] border border-white/10 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <span className="font-mono text-amber-300 font-bold text-sm">
            UID-{bar.maphoi}
          </span>
          {statusTag && (
            <span className="ml-2 text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-1.5 py-0.5 rounded">
              {statusTag}
            </span>
          )}
        </div>
        <span className="text-[10px] text-slate-500 font-mono shrink-0">
          SDC-{plan.masdc}
        </span>
      </div>
      <div className="text-[11px] text-slate-400 mb-2">
        {bar.vattu?.tenvt || "Phôi"} · Dài ban đầu{" "}
        <b className="text-white">{fmtMm(originalLength)}</b>
        {originalLength !== currentLength && (
          <span className="text-slate-500">
            {" "}· Còn lại <b className="text-amber-300">{fmtMm(currentLength)}</b>
          </span>
        )}
      </div>

      {/* Visual diagram - admin style */}
      <BarDiagram
        barLength={inputLength ?? 0}
        usedLength={usedLength}
        cuts={sortedCuts.map((c) => ({
          chieudaicat: c.chieudaicat,
          label: c.chitietdh?.mota || "",
        }))}
      />

      {/* Cut details */}
      <div className="space-y-1 mt-2">
        {sortedCuts.map((c, i) => (
          <div
            key={c.mactc}
            className="flex items-center gap-2 text-[11px] bg-black/30 px-2.5 py-1.5 rounded-lg"
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${CUT_COLORS[i % CUT_COLORS.length]}`}
            />
            <span className="text-slate-500 font-mono w-5">#{c.thutucat}</span>
            <span className="text-cyan-300 font-mono w-12 shrink-0">
              CT-{c.mactdh}
            </span>
            <span className="text-slate-300 flex-1 truncate">
              {c.chitietdh?.mota || "—"}
            </span>
            <span className="text-white font-mono font-bold shrink-0">
              {fmtMm(c.chieudaicat)}
            </span>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-2 pt-2 border-t border-white/5 flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
        <span className="text-slate-400">
          Nhát cắt: <b className="text-white">{sortedCuts.length}</b>
        </span>
        <span className="text-slate-400">
          Tổng cắt: <b className="text-white">{fmtMm(usedLength)}</b>
        </span>
        <span className="text-slate-400">
          Dư:{" "}
          <b className={remainder != null && remainder < 100 ? "text-amber-400" : "text-emerald-400"}>
            {fmtMm(remainder)}
          </b>
        </span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Editable bar card for proposal
// ────────────────────────────────────────────────────────────

function EditableBarCard({
  bar,
  bomOptions,
  onUpdateBar,
  onRemoveBar,
  onAddCut,
  onRemoveCut,
  onSelectBom,
  onUpdateCutLength,
  onUpdateCutReason,
  getCutError,
}: {
  bar: ProposedBar;
  bomOptions: BomOption[];
  onUpdateBar: (field: string, value: any) => void;
  onRemoveBar: () => void;
  onAddCut: () => void;
  onRemoveCut: (cutId: string) => void;
  onSelectBom: (cutId: string, sourceKey: string) => void;
  onUpdateCutLength: (cutId: string, value: number) => void;
  onUpdateCutReason: (cutId: string, value: string) => void;
  getCutError: (cut: ProposedCut) => string;
}) {
  const totalCut = bar.cuts.reduce((s, c) => s + Number(c.chieudaicat), 0);
  // For editable bars, chieudai is what the worker entered as bar length
  const effectiveLen = bar.chieudai > 0 ? bar.chieudai : Math.max(totalCut, 1);
  const remainder = Math.max(0, effectiveLen - totalCut);
  const overrun = bar.chieudai > 0 && totalCut > bar.chieudai;
  const sourceOptionByKey = useMemo(
    () => new Map(bomOptions.map((option) => [option.sourceKey, option])),
    [bomOptions]
  );

  return (
    <div className="bg-[#0c0e14] border border-white/10 rounded-xl p-4">
      {/* Header with UID */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {bar.maphoi > 0 ? (
            <span className="font-mono text-cyan-300 font-bold text-sm">
              UID-{bar.maphoi}
            </span>
          ) : (
            <span className="text-slate-500 text-sm italic">Phôi mới</span>
          )}
          {bar.materialName && (
            <span className="text-[10px] text-slate-400 truncate max-w-[180px]">
              {bar.materialName}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRemoveBar}
          className="text-red-400/60 hover:text-red-300 p-1"
          title="Xóa phôi này khỏi đề xuất"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* UID and length inputs */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="text-[10px] text-slate-500 block mb-1">
            Mã phôi (UID)
          </label>
          <input
            type="number"
            value={bar.maphoi || ""}
            onChange={(e) => onUpdateBar("maphoi", parseInt(e.target.value) || 0)}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-2 text-sm text-white outline-none focus:border-cyan-400 font-mono"
            placeholder="VD: 596"
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 block mb-1">
            Chiều dài phôi (mm)
          </label>
          <input
            type="number"
            value={bar.chieudai || ""}
            onChange={(e) => onUpdateBar("chieudai", parseInt(e.target.value) || 0)}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-2 text-sm text-white outline-none focus:border-cyan-400 font-mono"
            placeholder="VD: 6000"
          />
        </div>
      </div>

      {/* Visual diagram */}
      {bar.chieudai > 0 && bar.cuts.length > 0 && (
        <BarDiagram
          barLength={bar.chieudai}
          cuts={bar.cuts.map((c) => ({ chieudaicat: c.chieudaicat }))}
        />
      )}

      {/* Cuts table */}
      {bar.cuts.length > 0 && (
        <div className="rounded-lg border border-white/5 overflow-hidden mb-2 mt-2">
          <div className="bg-black/30 px-2.5 py-1.5 text-[10px] text-slate-500 font-bold uppercase flex">
            <span className="w-7">#</span>
            <span className="flex-1">BOM cần cắt</span>
            <span className="w-28 text-right">Dài đề xuất</span>
            <span className="w-7" />
          </div>
          <div className="divide-y divide-white/5">
            {bar.cuts.map((cut, ci) => {
              const cutError = getCutError(cut);
              const selectedSource = sourceOptionByKey.get(cut.sourceKey);
              const delta = Number(cut.chieudaicat || 0) - Number(cut.bomLength || 0);
              const hasDelta = cut.bomLength > 0 && delta !== 0;
              return (
                <div key={cut.id} className="px-2.5 py-2">
                  <div className="flex items-start gap-1.5">
                    <span className="w-7 text-[11px] text-slate-500 font-mono">
                      {cut.thutucat}
                    </span>
                    <div className="flex-1 flex items-center gap-1.5 min-w-0">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${CUT_COLORS[ci % CUT_COLORS.length]}`}
                      />
                      <select
                        value={cut.sourceKey || ""}
                        onChange={(e) => onSelectBom(cut.id, e.target.value)}
                        className="min-w-0 flex-1 bg-black/40 border border-white/10 rounded px-2 py-1.5 text-[11px] text-white outline-none focus:border-cyan-400"
                      >
                        <option value="">Chọn nhát cắt trong sơ đồ</option>
                        {bomOptions.map((option) => (
                          <option key={option.sourceKey} value={option.sourceKey}>
                            {option.uidLabel} · {option.sdcLabel} · #{option.thutucat} · {option.label} · BOM {fmtMm(option.chieudaicat)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-28">
                      <input
                        type="number"
                        min={1}
                        value={cut.chieudaicat || ""}
                        onChange={(e) => onUpdateCutLength(cut.id, parseInt(e.target.value) || 0)}
                        className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-[11px] text-white outline-none focus:border-cyan-400 font-mono text-right"
                        placeholder="mm"
                      />
                      <div className="mt-1 text-[10px] text-slate-500 text-right">
                        BOM: {cut.bomLength > 0 ? fmtMm(cut.bomLength) : "—"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveCut(cut.id)}
                      className="w-7 text-center text-red-400/50 hover:text-red-300"
                    >
                      <X className="w-3 h-3 inline" />
                    </button>
                  </div>
                  {cut.label && (
                    <div className="ml-9 mt-1 text-[10px] text-slate-500 truncate">
                      {selectedSource && (
                        <span className="text-cyan-300">
                          {selectedSource.uidLabel} · {selectedSource.sdcLabel} · #{selectedSource.thutucat} ·{" "}
                        </span>
                      )}
                      {cut.materialName ? `${cut.materialName} · ` : ""}
                      {cut.label}
                    </div>
                  )}
                  {cut.bomLength > 0 && (
                    <div
                      className={`ml-9 mt-1 text-[10px] ${
                        hasDelta ? "text-amber-300" : "text-slate-500"
                      }`}
                    >
                      Đề xuất: {fmtMm(cut.chieudaicat)} · Sai lệch:{" "}
                      <b>{delta > 0 ? `+${fmtMm(delta)}` : fmtMm(delta)}</b>
                    </div>
                  )}
                  {hasDelta && (
                    <div className="ml-9 mt-2">
                      <input
                        type="text"
                        value={cut.adjustmentReason ?? ""}
                        onChange={(e) => onUpdateCutReason(cut.id, e.target.value)}
                        className="w-full bg-amber-500/5 border border-amber-500/20 rounded px-2 py-1.5 text-[11px] text-amber-50 outline-none focus:border-amber-300"
                        placeholder="Lý do sai lệch, ví dụ: chừa mép để mài/căn chỉnh"
                      />
                    </div>
                  )}
                  {cutError ? (
                    <div className="ml-9 mt-1 text-[10px] text-red-300 bg-red-500/10 border border-red-500/20 rounded px-2 py-1 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                      <span>{cutError}</span>
                    </div>
                  ) : hasDelta && Math.abs(delta) > MAX_PROPOSAL_DELTA_MM ? (
                    <div className="ml-9 mt-1 text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1 flex items-center gap-1.5 animate-in fade-in duration-200">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                      <span>Sai lệch lớn so với BOM. Admin cần kiểm tra kỹ trước khi duyệt.</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add cut + summary */}
      <div className="flex items-center justify-between mt-1">
        <button
          type="button"
          onClick={onAddCut}
          className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center font-semibold"
        >
          <Plus className="w-3 h-3 mr-1" /> Chỉnh thêm nhát trong sơ đồ
        </button>
        {bar.cuts.length > 0 && (
          <div className="flex gap-3 text-[10px]">
            <span className="text-slate-400">
              Cắt: <b className="text-white">{bar.cuts.length}</b>
            </span>
            <span className="text-slate-400">
              Tổng: <b className="text-white">{fmtMm(totalCut)}</b>
            </span>
            <span className={overrun ? "text-red-400 font-bold" : "text-emerald-400"}>
              Dư: <b>{overrun ? "VƯỢT!" : fmtMm(remainder)}</b>
            </span>
          </div>
        )}
      </div>

      {overrun && (
        <div className="mt-2 text-[10px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1.5 flex items-center">
          <AlertTriangle className="w-3 h-3 mr-1.5 shrink-0" />
          Tổng cắt ({fmtMm(totalCut)}) vượt chiều dài phôi (
          {fmtMm(bar.chieudai)}). Backend sẽ từ chối.
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main Modal Component - 2 Step Wizard
// ────────────────────────────────────────────────────────────

export default function ProposalSubmitModal({
  mapc,
  currentPlans,
  onClose,
  onSuccess,
}: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [reasonType, setReasonType] = useState("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [proposedBars, setProposedBars] = useState<ProposedBar[]>([]);
  const [successData, setSuccessData] = useState<{
    totalCuts: number;
    changedCuts: number;
    unchangedCuts: number;
  } | null>(null);

  const plansForMaPC = useMemo(
    () => currentPlans.filter((p) => p.mapc === mapc),
    [currentPlans, mapc]
  );

  const bomOptions = useMemo<BomOption[]>(() => {
    const options: BomOption[] = [];
    plansForMaPC.forEach((plan) => {
      const stock = plan.khothanhphoi;
      if (!stock) return;
      [...plan.chitietcat].sort((a, b) => a.thutucat - b.thutucat).forEach((cut) => {
        const label =
          cut.chitietdh?.mota ||
          cut.chitietdh?.vattu?.tenvt ||
          `BOM ${cut.mactdh}`;
        const materialName = cut.chitietdh?.vattu?.tenvt || "";
        options.push({
          sourceKey: makeSourceCutKey({
            sourceMactc: cut.mactc,
            sourceMasdc: plan.masdc,
            sourceMaphoi: stock.maphoi,
            thutucat: cut.thutucat,
            mactdh: cut.mactdh,
          }),
          sourceMactc: cut.mactc,
          sourceMasdc: plan.masdc,
          sourceMaphoi: stock.maphoi,
          sourceBarLength:
            calculateCuttingPlanMetrics(plan).inputLength ?? (Number(stock.chieudaihientai) || 0),
          mactdh: cut.mactdh,
          label,
          materialName,
          chieudaicat: Number(cut.chieudaicat) || 0,
          thutucat: cut.thutucat,
          sdcLabel: `SDC-${plan.masdc}`,
          uidLabel: `UID-${stock.maphoi}`,
        });
      });
    });
    return options.sort(
      (a, b) =>
        a.sourceMaphoi - b.sourceMaphoi ||
        a.sourceMasdc - b.sourceMasdc ||
        a.thutucat - b.thutucat ||
        a.mactdh - b.mactdh
    );
  }, [plansForMaPC]);

  const bomOptionById = useMemo(
    () => new Map(bomOptions.map((option) => [option.sourceKey, option])),
    [bomOptions]
  );

  // ── Copy from current ─────────────────────────────────
  const copyFromCurrent = useCallback(() => {
    setErrorMsg("");
    const bars = plansForMaPC
      .filter((plan) => plan.khothanhphoi)
      .map((plan) => {
        const stock = plan.khothanhphoi!;
        const metrics = calculateCuttingPlanMetrics(plan);
        return {
          id: `plan-${plan.masdc}-${stock.maphoi}`,
          maphoi: stock.maphoi,
          chieudai: metrics.inputLength ?? (Number(stock.chieudaihientai) || 0),
          tenphoi: `UID-${stock.maphoi}`,
          materialName: stock.vattu?.tenvt || "Phôi",
          cuts: [...plan.chitietcat]
            .sort((a, b) => a.thutucat - b.thutucat)
            .map((cut) => ({
              id: `cut-${plan.masdc}-${stock.maphoi}-${cut.mactc || cut.thutucat}-${cut.mactdh}`,
              sourceMactc: cut.mactc,
              sourceMasdc: plan.masdc,
              sourceMaphoi: stock.maphoi,
              sourceKey: makeSourceCutKey({
                sourceMactc: cut.mactc,
                sourceMasdc: plan.masdc,
                sourceMaphoi: stock.maphoi,
                thutucat: cut.thutucat,
                mactdh: cut.mactdh,
              }),
              mactdh: cut.mactdh,
              bomLength: Number(cut.chieudaicat) || 0,
              chieudaicat: Number(cut.chieudaicat) || 0,
              thutucat: cut.thutucat,
              label: cut.chitietdh?.mota || cut.chitietdh?.vattu?.tenvt || `BOM ${cut.mactdh}`,
              materialName: cut.chitietdh?.vattu?.tenvt || "",
              adjustmentReason: "",
            })),
        };
      });
    setProposedBars(bars);
  }, [plansForMaPC]);

  // ── Bar/cut CRUD ──────────────────────────────────────
  const addEmptyBar = () => {
    setErrorMsg("");
    setProposedBars((prev) => [
      ...prev,
      { id: uid(), maphoi: 0, chieudai: 0, tenphoi: "", materialName: "", cuts: [] },
    ]);
  };

  const removeBar = (barId: string) => {
    setErrorMsg("");
    setProposedBars((prev) => prev.filter((b) => b.id !== barId));
  };

  const updateBar = (barId: string, field: string, value: any) => {
    setErrorMsg("");
    setProposedBars((prev) =>
      prev.map((b) => (b.id === barId ? { ...b, [field]: value } : b))
    );
  };

  const addCut = (barId: string) => {
    setErrorMsg("");
    setProposedBars((prev) =>
      prev.map((b) =>
        b.id === barId
          ? {
              ...b,
              cuts: [
                ...b.cuts,
                {
                  id: uid(),
                  sourceKey: "",
                  mactdh: 0,
                  bomLength: 0,
                  chieudaicat: 0,
                  thutucat: b.cuts.length + 1,
                  label: "",
                  materialName: "",
                  adjustmentReason: "",
                },
              ],
            }
          : b
      )
    );
  };

  const removeCut = (barId: string, cutId: string) => {
    setErrorMsg("");
    setProposedBars((prev) =>
      prev.map((b) =>
        b.id === barId
          ? {
              ...b,
              cuts: b.cuts
                .filter((c) => c.id !== cutId)
                .map((c, idx) => ({ ...c, thutucat: idx + 1 })),
            }
          : b
      )
    );
  };

  const selectBomForCut = (barId: string, cutId: string, sourceKey: string) => {
    setErrorMsg("");
    const option = bomOptionById.get(sourceKey);
    setProposedBars((prev) =>
      prev.map((bar) =>
        bar.id === barId
          ? {
              ...bar,
              maphoi: option?.sourceMaphoi ?? bar.maphoi,
              chieudai: option?.sourceBarLength ?? bar.chieudai,
              tenphoi: option?.sourceMaphoi ? `UID-${option.sourceMaphoi}` : bar.tenphoi,
              materialName: option?.materialName || bar.materialName,
              cuts: bar.cuts.map((cut) =>
                cut.id === cutId
                  ? {
                      ...cut,
                      sourceMactc: option?.sourceMactc,
                      sourceMasdc: option?.sourceMasdc,
                      sourceMaphoi: option?.sourceMaphoi,
                      sourceKey,
                      mactdh: option?.mactdh ?? 0,
                      bomLength: option?.chieudaicat ?? 0,
                      chieudaicat: option?.chieudaicat ?? 0,
                      thutucat: option?.thutucat ?? cut.thutucat,
                      label: option?.label ?? "",
                      materialName: option?.materialName ?? "",
                      adjustmentReason: "",
                    }
                  : cut
              ),
            }
          : bar
      )
    );
  };

  const updateCutLength = (barId: string, cutId: string, value: number) => {
    setErrorMsg("");
    setProposedBars((prev) =>
      prev.map((bar) =>
        bar.id === barId
          ? {
              ...bar,
              cuts: bar.cuts.map((cut) =>
                cut.id === cutId ? { ...cut, chieudaicat: value } : cut
              ),
            }
          : bar
      )
    );
  };

  const updateCutReason = (barId: string, cutId: string, value: string) => {
    setErrorMsg("");
    setProposedBars((prev) =>
      prev.map((bar) =>
        bar.id === barId
          ? {
              ...bar,
              cuts: bar.cuts.map((cut) =>
                cut.id === cutId ? { ...cut, adjustmentReason: value } : cut
              ),
            }
          : bar
      )
    );
  };

  const selectedSourceKeyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    proposedBars.forEach((bar) => {
      bar.cuts.forEach((cut) => {
        if (!cut.sourceKey) return;
        counts.set(cut.sourceKey, (counts.get(cut.sourceKey) ?? 0) + 1);
      });
    });
    return counts;
  }, [proposedBars]);

  const getCutError = useCallback(
    (cut: ProposedCut) => {
      if (!cut.sourceKey) {
        return "Nhát cắt chưa chọn từ sơ đồ đang giao.";
      }
      const option = bomOptionById.get(cut.sourceKey);
      if (!option) {
        return "Nhát cắt này không còn khớp sơ đồ đang giao. Vui lòng tải lại trang.";
      }
      if ((selectedSourceKeyCounts.get(cut.sourceKey) ?? 0) > 1) {
        return "Nhát cắt này đã có trong phương án điều chỉnh.";
      }
      const proposedLength = Number(cut.chieudaicat);
      const bomLength = Number(cut.bomLength || option.chieudaicat);
      if (!Number.isFinite(proposedLength) || proposedLength <= 0) {
        return "Chiều dài đề xuất phải lớn hơn 0 mm.";
      }
      const delta = proposedLength - bomLength;
      const cutReason = (cut.adjustmentReason ?? "").trim();
      if (delta !== 0 && !cutReason && !reasonDetail.trim()) {
        return "Chiều dài đề xuất khác BOM, vui lòng nhập lý do.";
      }

      if (!cut.thutucat || cut.thutucat <= 0) {
        return "Thứ tự cắt chưa hợp lệ.";
      }
      return "";
    },
    [bomOptionById, reasonDetail, selectedSourceKeyCounts]
  );

  const sourcePlanValidationError = useMemo(() => {
    for (const plan of plansForMaPC) {
      const stock = plan.khothanhphoi;
      if (!stock?.maphoi) {
        return "Sơ đồ đang giao thiếu thông tin UID phôi. Vui lòng tải lại trang hoặc yêu cầu Admin kiểm tra sơ đồ.";
      }
      for (const cut of plan.chitietcat) {
        if (!Number(cut.mactdh) || Number(cut.mactdh) <= 0) {
          return "Nhát cắt trong sơ đồ thiếu BOM hợp lệ. Vui lòng tải lại trang hoặc yêu cầu Admin tạo lại sơ đồ.";
        }
        if (!Number.isFinite(Number(cut.chieudaicat)) || Number(cut.chieudaicat) <= 0) {
          return "Nhát cắt trong sơ đồ thiếu chiều dài hợp lệ. Vui lòng tải lại trang hoặc yêu cầu Admin tạo lại sơ đồ.";
        }
      }
    }
    return "";
  }, [plansForMaPC]);

  const toFriendlyProposalError = (message: string) => {
    const rawMessage = message || "";
    if (/ly do|lydodexuat|lý do/i.test(rawMessage)) {
      return "Chiều dài đề xuất khác BOM, vui lòng nhập lý do điều chỉnh.";
    }
    if (/khong dung vat tu|không đúng vật tư|mavt|vật tư|vat tu|maphoi|phoi UID|phôi UID/i.test(rawMessage)) {
      return "Phôi đã chọn không khớp vật tư BOM hoặc không còn hợp lệ. Vui lòng kiểm tra UID phôi.";
    }
    if (/BOM mactdh|can \d+ nhat cat|de xuat co/i.test(rawMessage)) {
      return "Không dựng được phương án đầy đủ từ sơ đồ đang giao. Vui lòng tải lại trang hoặc yêu cầu Admin kiểm tra sơ đồ.";
    }
    if (/mactdh.*khong thuoc|mactdh.*khong hop le|mactdh.*không thuộc|mactdh.*không hợp lệ/i.test(rawMessage)) {
      return "Nhát cắt trong sơ đồ thiếu BOM hợp lệ. Vui lòng tải lại trang hoặc yêu cầu Admin tạo lại sơ đồ.";
    }
    if (/chi.?u d.?i|chieu dai|chiều dài/i.test(rawMessage)) {
      return "Chiều dài đề xuất hoặc tổng chiều dài phôi chưa hợp lệ. Vui lòng kiểm tra lại các nhát cắt.";
    }
    if (/mactdh/i.test(rawMessage)) {
      return "Backend báo lỗi BOM trong phương án gửi lên. Vui lòng tải lại trang; nếu vẫn lặp lại, gửi lại mã PC/UID để kiểm tra dữ liệu sơ đồ.";
    }
    return rawMessage || "Lỗi khi gửi đề xuất.";
  };

  // ── Validation ────────────────────────────────────────
  const hasValidBars =
    proposedBars.length > 0 &&
    proposedBars.every(
      (b) =>
        b.maphoi > 0 &&
        b.cuts.length > 0 &&
        b.cuts.every((c) => c.mactdh > 0 && c.chieudaicat > 0 && !getCutError(c))
    );

  const completeProposalBars = useMemo(() => {
    if (proposedBars.length === 0) return [];

    const barsByMaphoi = new Map<number, ProposedBar>();
    const overridesBySourceCut = new Map<string, ProposedCut>();

    proposedBars.forEach((bar) => {
      bar.cuts.forEach((cut) => {
        if (cut.sourceKey) {
          overridesBySourceCut.set(cut.sourceKey, cut);
        }
      });
    });

    const ensureBar = (base: ProposedBar) => {
      const current = barsByMaphoi.get(base.maphoi);
      if (current) return current;
      const created: ProposedBar = { ...base, cuts: [] };
      barsByMaphoi.set(base.maphoi, created);
      return created;
    };

    const addCutToBar = (bar: ProposedBar, cut: ProposedCut) => {
      ensureBar(bar).cuts.push({ ...cut });
    };

    // Proposal approve thay sơ đồ chính thức, nên payload gửi lên phải là một phương án đầy đủ.
    // Worker chỉ nhập phần cần chỉnh; các nhát không chỉnh được giữ nguyên từ sơ đồ đang giao.
    plansForMaPC.forEach((plan) => {
      const stock = plan.khothanhphoi;
      if (!stock) return;
      const metrics = calculateCuttingPlanMetrics(plan);
      const baseBar: ProposedBar = {
        id: `current-${plan.masdc}`,
        maphoi: stock.maphoi,
        chieudai: metrics.inputLength ?? 0,
        tenphoi: `UID-${stock.maphoi}`,
        materialName: stock.vattu?.tenvt || "Phôi",
        cuts: [],
      };

      [...plan.chitietcat]
        .sort((a, b) => a.thutucat - b.thutucat)
        .forEach((currentCut) => {
          const sourceKey = makeSourceCutKey({
            sourceMactc: currentCut.mactc,
            sourceMasdc: plan.masdc,
            sourceMaphoi: stock.maphoi,
            thutucat: currentCut.thutucat,
            mactdh: currentCut.mactdh,
          });
          const directOverride = overridesBySourceCut.get(sourceKey);

          if (directOverride) {
            addCutToBar(baseBar, {
              ...directOverride,
              sourceMactc: currentCut.mactc,
              sourceMasdc: plan.masdc,
              sourceMaphoi: stock.maphoi,
              sourceKey,
              mactdh: currentCut.mactdh,
              bomLength: Number(currentCut.chieudaicat) || 0,
              thutucat: currentCut.thutucat,
            });
            return;
          }

          addCutToBar(baseBar, {
            id: `current-cut-${currentCut.mactc}`,
            sourceMactc: currentCut.mactc,
            sourceMasdc: plan.masdc,
            sourceMaphoi: stock.maphoi,
            sourceKey,
            mactdh: currentCut.mactdh,
            bomLength: Number(currentCut.chieudaicat) || 0,
            chieudaicat: Number(currentCut.chieudaicat) || 0,
            thutucat: currentCut.thutucat,
            label: currentCut.chitietdh?.mota || "",
            materialName: currentCut.chitietdh?.vattu?.tenvt || "",
            adjustmentReason: "",
          });
        });
    });

    return Array.from(barsByMaphoi.values()).map((bar) => ({
      ...bar,
      cuts: bar.cuts.map((cut, index) => ({ ...cut, thutucat: index + 1 })),
    }));
  }, [plansForMaPC, proposedBars]);

  const originalCutCount = useMemo(
    () => plansForMaPC.reduce((sum, plan) => sum + plan.chitietcat.length, 0),
    [plansForMaPC]
  );

  const mergedCutCount = completeProposalBars.reduce(
    (sum, bar) => sum + bar.cuts.length,
    0
  );

  const adjustedCutCount = proposedBars.reduce(
    (sum, bar) =>
      sum +
      bar.cuts.filter(
        (cut) =>
          Number(cut.chieudaicat) !== Number(cut.bomLength) ||
          Boolean((cut.adjustmentReason ?? "").trim()),
      ).length,
    0
  );

  const payloadBuildError =
    proposedBars.length > 0 && sourcePlanValidationError
      ? sourcePlanValidationError
      : proposedBars.length > 0 && mergedCutCount !== originalCutCount
      ? "Không dựng được phương án đầy đủ từ sơ đồ đang giao. Vui lòng tải lại trang hoặc yêu cầu Admin kiểm tra sơ đồ."
      : "";

  const hasOverrun = proposedBars.some((bar) => {
    const totalCut = bar.cuts.reduce((s, c) => s + Number(c.chieudaicat), 0);
    return bar.chieudai > 0 && totalCut > bar.chieudai;
  });

  const hasProposalReason = !!reasonType && !!reasonDetail.trim();
  const hasLineReason = proposedBars.some((bar) =>
    bar.cuts.some((cut) => (cut.adjustmentReason ?? "").trim().length > 0)
  );
  const hasAnyReason = hasProposalReason || hasLineReason;

  const canSubmit =
    hasValidBars &&
    !payloadBuildError &&
    !hasOverrun &&
    hasAnyReason &&
    !submitting;

  const submitBlockers = useMemo(() => {
    const blockers: string[] = [];
    if (proposedBars.length === 0) {
      blockers.push("Chưa có phương án Worker đề xuất.");
    }
    if (!hasValidBars) {
      blockers.push("Còn nhát cắt hoặc phôi chưa hợp lệ. Kiểm tra lỗi màu đỏ ngay trong từng dòng.");
    }
    if (payloadBuildError) {
      blockers.push(payloadBuildError);
    }
    if (hasOverrun) {
      blockers.push("Tổng chiều dài các nhát cắt vượt quá chiều dài phôi.");
    }
    // Proposal chỉ là đề xuất để Admin duyệt. Trường hợp dài/phôi cần xem lại
    // sẽ được backend lưu warning và RPC approve kiểm tra an toàn lần cuối.
    if (!hasAnyReason) {
      blockers.push("Cần nhập lý do đề xuất: dùng lý do tổng hoặc lý do ngay dưới nhát cắt bị chỉnh.");
    }
    return blockers;
  }, [hasAnyReason, hasValidBars, payloadBuildError, proposedBars.length, hasOverrun]);

  // ── Submit ────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const adjustmentSummary = proposedBars
        .flatMap((bar) =>
          bar.cuts
            .filter((cut) => cut.bomLength > 0 && Number(cut.chieudaicat) !== Number(cut.bomLength))
            .map((cut) => {
              const delta = Number(cut.chieudaicat) - Number(cut.bomLength);
              const reason = (cut.adjustmentReason ?? "").trim();
              return `UID-${bar.maphoi} ${cut.label || `BOM ${cut.mactdh}`}: BOM ${cut.bomLength}mm, đề xuất ${cut.chieudaicat}mm (${delta > 0 ? "+" : ""}${delta}mm)${reason ? ` - ${reason}` : ""}`;
            })
        )
        .join("; ");
      const finalReasonType = reasonType || "Điều chỉnh thực tế tại xưởng";
      const finalReasonDetail =
        reasonDetail.trim() || "Worker đã nhập lý do chi tiết ở từng nhát cắt.";
      const payload = {
        mapc,
        lydodexuat: adjustmentSummary
          ? `[${finalReasonType}] ${finalReasonDetail}. Điều chỉnh chiều dài: ${adjustmentSummary}`
          : `[${finalReasonType}] ${finalReasonDetail}`,
        simulatedBars: completeProposalBars.map((b) => ({
          maphoi: b.maphoi,
          cuts: b.cuts.map((c) => ({
            mactdh: c.mactdh,
            chieudaicat: c.chieudaicat,
            thutucat: c.thutucat,
          })),
        })),
      };
      await workerSubmitCuttingProposal(payload);
      const keptCount = Math.max(0, mergedCutCount - adjustedCutCount);
      setSuccessData({
        totalCuts: mergedCutCount,
        changedCuts: adjustedCutCount,
        unchangedCuts: keptCount,
      });
    } catch (err: any) {
      setErrorMsg(toFriendlyProposalError(err.message || ""));
    } finally {
      setSubmitting(false);
    }
  };

  // ────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-2 sm:p-4 pb-[84px] sm:pb-4">
      <div className="w-full max-w-2xl max-h-[calc(100dvh-110px)] sm:max-h-[calc(100dvh-40px)] bg-[#12141a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* ── Header ──────────────────────────────────── */}
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-bold text-white flex items-center text-[15px]">
                <ClipboardEdit className="w-5 h-5 mr-2 text-cyan-400 shrink-0" />
                Đề xuất phương án cắt thực tế
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">PC-{mapc}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white shrink-0 mt-0.5">
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-3">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                step === 1
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                  : "bg-white/5 text-slate-500 border border-white/5"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>1. Xem sơ đồ hiện tại</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                step === 2
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                  : "bg-white/5 text-slate-500 border border-white/5"
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>2. Nhập phương án & Gửi</span>
            </div>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 flex items-start">
              <AlertTriangle className="w-4 h-4 mr-2 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ━━ STEP 1: Xem sơ đồ hiện tại ━━━━━━━━━━━ */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h4 className="text-sm font-bold text-white mb-1">
                  Sơ đồ cắt đang giao từ Admin
                </h4>
                <p className="text-[11px] text-slate-400 mb-4">
                  Xem kỹ phương án lý thuyết đang giao trước khi nhập phương
                  án cắt thực tế từ xưởng. Mỗi thanh phôi hiển thị sơ đồ trực
                  quan, danh sách nhát cắt và phần dư.
                </p>
              </div>

              {plansForMaPC.length === 0 ? (
                <div className="text-sm text-slate-500 italic bg-black/20 rounded-xl p-6 text-center">
                  Chưa có sơ đồ cắt nào được giao cho phân công PC-{mapc}.
                </div>
              ) : (
                <div className="space-y-3">
                  {plansForMaPC.map((plan) => (
                    <PlanBarCard key={plan.masdc} plan={plan} />
                  ))}
                </div>
              )}

              {/* Summary */}
              {plansForMaPC.length > 0 && (
                <div className="bg-black/20 border border-white/5 rounded-xl p-3 text-[11px] text-slate-400">
                  <b className="text-slate-300">Tổng kết phương án đang giao:</b>{" "}
                  {plansForMaPC.length} phôi ·{" "}
                  {plansForMaPC.reduce((s, p) => s + p.chitietcat.length, 0)}{" "}
                  nhát cắt ·{" "}
                  Tổng cắt{" "}
                  {fmtMm(
                    plansForMaPC.reduce(
                      (s, p) =>
                        s +
                        p.chitietcat.reduce(
                          (ss, c) => ss + Number(c.chieudaicat),
                          0
                        ),
                      0
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {/* ━━ STEP 2: Nhập phương án & Gửi ━━━━━━━━━ */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Copy action */}
              <div>
                <h4 className="text-sm font-bold text-white mb-1">
                  Phương án Worker đề xuất
                </h4>
                <p className="text-[11px] text-slate-400 mb-3">
                  Chọn đúng nhát cắt trong sơ đồ đang giao, nhập chiều dài thực
                  tế cần điều chỉnh và gửi Admin duyệt. Các nhát không chỉnh sẽ
                  được giữ nguyên trong phương án gửi lên.
                </p>
                {proposedBars.length > 0 && (
                  <div className="mb-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-[11px] text-cyan-100">
                    Bạn chỉ cần nhập phần muốn điều chỉnh. Khi gửi, hệ thống sẽ giữ nguyên các nhát cắt còn lại trong sơ đồ đang giao để Admin duyệt an toàn.
                  </div>
                )}

                {proposedBars.length === 0 && plansForMaPC.length > 0 && (
                  <button
                    type="button"
                    onClick={copyFromCurrent}
                    className="w-full mb-4 py-3 border border-dashed border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 rounded-xl text-sm text-cyan-300 font-semibold flex items-center justify-center transition-colors"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Bắt đầu chọn nhát cắt cần điều chỉnh
                  </button>
                )}

                {proposedBars.length === 0 && (
                  <div className="text-xs text-slate-500 italic bg-black/20 rounded-xl p-4 text-center mb-3">
                    Chưa có phương án Worker đề xuất. Bấm &quot;Bắt đầu&quot;
                    hoặc &quot;Chỉnh thêm nhát trong sơ đồ&quot; bên dưới để nhập phần cần điều chỉnh.
                  </div>
                )}
              </div>

              {/* Editable bars */}
              <div className="space-y-3">
                {proposedBars.map((bar) => (
                  <EditableBarCard
                    key={bar.id}
                    bar={bar}
                    bomOptions={bomOptions}

                    onUpdateBar={(field, value) => updateBar(bar.id, field, value)}
                    onRemoveBar={() => removeBar(bar.id)}
                    onAddCut={() => addCut(bar.id)}
                    onRemoveCut={(cutId) => removeCut(bar.id, cutId)}
                    onSelectBom={(cutId, sourceKey) => selectBomForCut(bar.id, cutId, sourceKey)}
                    onUpdateCutLength={(cutId, value) => updateCutLength(bar.id, cutId, value)}
                    onUpdateCutReason={(cutId, value) => updateCutReason(bar.id, cutId, value)}
                    getCutError={getCutError}
                  />
                ))}
              </div>

              {proposedBars.length > 0 && !payloadBuildError && (
                <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-[11px] text-cyan-100">
                  Phương án gửi Admin gồm <b>{mergedCutCount}</b> nhát:{" "}
                  <b>{adjustedCutCount}</b> nhát điều chỉnh,{" "}
                  <b>{Math.max(0, mergedCutCount - adjustedCutCount)}</b> nhát giữ nguyên.
                </div>
              )}

              <button
                type="button"
                onClick={addEmptyBar}
                className="w-full py-2.5 border border-dashed border-white/10 hover:border-white/20 bg-white/2 hover:bg-white/5 rounded-xl text-xs text-slate-400 hover:text-slate-300 flex items-center justify-center transition-colors"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Chỉnh thêm nhát trong sơ đồ
              </button>

              {/* Reason */}
              <div className="bg-[#0c0e14] border border-white/10 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2" />
                  Lý do đề xuất
                </h4>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 mb-1.5 block">
                    Lý do thực tế (bắt buộc)
                  </label>
                  <select
                    value={reasonType}
                    onChange={(e) => setReasonType(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400"
                  >
                    <option value="" disabled>
                      -- Chọn lý do --
                    </option>
                    {REASON_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 mb-1.5 block">
                    Mô tả chi tiết (bắt buộc)
                  </label>
                  <textarea
                    value={reasonDetail}
                    onChange={(e) => setReasonDetail(e.target.value)}
                    rows={3}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400 resize-none"
                    placeholder="VD: Em đổi UID-596 sang UID-601 vì UID-596 bị cong nhẹ, UID-601 còn dư 3.9m vừa đủ dùng..."
                  />
                </div>
              </div>

              {/* Note */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                Backend sẽ kiểm tra tính hợp lệ của phương án: BOM khớp, vật
                tư đúng, chiều dài phôi đủ, phôi không lỗi. Worker chỉ gửi đề
                xuất; Admin duyệt thì sơ đồ chính thức mới được thay đổi.
              </div>

              {submitBlockers.length > 0 && (
                <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-[11px] text-red-100">
                  <div className="font-bold text-red-200 mb-1">
                    Chưa thể gửi Admin duyệt
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {submitBlockers.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────── */}
        <div className="px-5 py-4 border-t border-white/10 flex items-center gap-2">
          {step === 1 && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="h-11 px-5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-bold text-sm"
              >
                Hủy
              </button>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => setStep(2)}
                className="h-11 px-6 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm flex items-center"
              >
                Tiếp: Nhập phương án đề xuất
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="h-11 px-5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-bold text-sm flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Xem lại sơ đồ
              </button>
              <div className="flex-1" />
              <button
                disabled={!canSubmit}
                onClick={handleSubmit}
                className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Gửi Admin duyệt
              </button>
            </>
          )}
        </div>
      </div>

      {successData && (
        <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12141a] border border-emerald-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl relative text-center animate-in fade-in zoom-in duration-300">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/30">
              <Check className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Đã gửi đề xuất cho Admin duyệt</h3>
            
            <div className="text-sm text-gray-300 space-y-2 mb-6 text-left bg-black/20 p-4 rounded-xl border border-white/5 font-medium leading-relaxed">
              <p>• Phương án gồm <strong className="text-white">{successData.totalCuts}</strong> nhát: <strong className="text-cyan-300">{successData.changedCuts}</strong> nhát điều chỉnh, <strong className="text-emerald-300">{successData.unchangedCuts}</strong> nhát giữ nguyên.</p>
              <p>• Trạng thái: <strong className="text-amber-300">Chờ duyệt</strong>.</p>
              <p>• Sơ đồ chính thức chưa thay đổi cho tới khi Admin duyệt.</p>
            </div>

            <button
              onClick={() => {
                setSuccessData(null);
                onSuccess();
              }}
              className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
