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
  mactdh: number;
  chieudaicat: number;
  thutucat: number;
  label: string;
  materialName: string;
};

type ProposedBar = {
  id: string;
  maphoi: number;
  chieudai: number;
  tenphoi: string;
  materialName: string;
  cuts: ProposedCut[];
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
  const usedLength = sortedCuts.reduce((s, c) => s + Number(c.chieudaicat), 0);
  // Same logic as admin getPlanMetrics: when currentLength < usedLength,
  // the bar has been partially consumed, so reconstruct original input length
  const currentLength = Number(bar.chieudaihientai);
  const originalLength = Number(bar.chieudaibandau);
  const inputLength =
    currentLength > 0 && currentLength < usedLength
      ? Math.max(usedLength + currentLength, usedLength, currentLength, 1)
      : Math.max(currentLength || originalLength, usedLength, 1);
  const remainder = Math.max(0, inputLength - usedLength);
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
        barLength={inputLength}
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
          <b className={remainder < 100 ? "text-amber-400" : "text-emerald-400"}>
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
  onUpdateBar,
  onRemoveBar,
  onAddCut,
  onRemoveCut,
  onUpdateCut,
}: {
  bar: ProposedBar;
  onUpdateBar: (field: string, value: any) => void;
  onRemoveBar: () => void;
  onAddCut: () => void;
  onRemoveCut: (cutId: string) => void;
  onUpdateCut: (cutId: string, field: string, value: any) => void;
}) {
  const totalCut = bar.cuts.reduce((s, c) => s + Number(c.chieudaicat), 0);
  // For editable bars, chieudai is what the worker entered as bar length
  const effectiveLen = bar.chieudai > 0 ? bar.chieudai : Math.max(totalCut, 1);
  const remainder = Math.max(0, effectiveLen - totalCut);
  const overrun = bar.chieudai > 0 && totalCut > bar.chieudai;

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
            <span className="flex-1">Chi tiết (mactdh)</span>
            <span className="w-24 text-right">Dài cắt (mm)</span>
            <span className="w-7" />
          </div>
          <div className="divide-y divide-white/5">
            {bar.cuts.map((cut, ci) => (
              <div key={cut.id} className="flex items-center px-2.5 py-1.5 gap-1">
                <span className="w-7 text-[11px] text-slate-500 font-mono">
                  {cut.thutucat}
                </span>
                <div className="flex-1 flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${CUT_COLORS[ci % CUT_COLORS.length]}`}
                  />
                  <input
                    type="number"
                    value={cut.mactdh || ""}
                    onChange={(e) =>
                      onUpdateCut(cut.id, "mactdh", parseInt(e.target.value) || 0)
                    }
                    className="w-16 bg-transparent border border-white/10 rounded px-1.5 py-1 text-[11px] text-white outline-none focus:border-cyan-400 font-mono"
                    placeholder="mactdh"
                  />
                  {cut.label && (
                    <span className="text-[10px] text-slate-500 truncate">
                      {cut.label}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  value={cut.chieudaicat || ""}
                  onChange={(e) =>
                    onUpdateCut(cut.id, "chieudaicat", parseInt(e.target.value) || 0)
                  }
                  className="w-24 bg-transparent border border-white/10 rounded px-1.5 py-1 text-[11px] text-white outline-none focus:border-cyan-400 font-mono text-right"
                  placeholder="mm"
                />
                <button
                  type="button"
                  onClick={() => onRemoveCut(cut.id)}
                  className="w-7 text-center text-red-400/50 hover:text-red-300"
                >
                  <X className="w-3 h-3 inline" />
                </button>
              </div>
            ))}
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
          <Plus className="w-3 h-3 mr-1" /> Thêm nhát cắt
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

  const plansForMaPC = useMemo(
    () => currentPlans.filter((p) => p.mapc === mapc),
    [currentPlans, mapc]
  );

  // ── Copy from current ─────────────────────────────────
  const copyFromCurrent = useCallback(() => {
    const bars: ProposedBar[] = plansForMaPC
      .filter((p) => p.khothanhphoi)
      .map((p) => {
        const usedLen = p.chitietcat.reduce((s, c) => s + Number(c.chieudaicat), 0);
        const curLen = Number(p.khothanhphoi!.chieudaihientai);
        const origLen = Number(p.khothanhphoi!.chieudaibandau);
        // Same formula as admin getPlanMetrics
        const inputLength =
          curLen > 0 && curLen < usedLen
            ? Math.max(usedLen + curLen, usedLen, curLen, 1)
            : Math.max(curLen || origLen, usedLen, 1);
        return {
          id: uid(),
          maphoi: p.khothanhphoi!.maphoi,
          chieudai: inputLength,
          tenphoi: `UID-${p.khothanhphoi!.maphoi}`,
          materialName: p.khothanhphoi!.vattu?.tenvt || "Phôi",
          cuts: [...p.chitietcat]
            .sort((a, b) => a.thutucat - b.thutucat)
            .map((c, idx) => ({
              id: uid(),
              mactdh: c.mactdh,
              chieudaicat: c.chieudaicat,
              thutucat: idx + 1,
              label: c.chitietdh?.mota || "",
              materialName: c.chitietdh?.vattu?.tenvt || "",
            })),
        };
      });
    setProposedBars(bars);
  }, [plansForMaPC]);

  // ── Bar/cut CRUD ──────────────────────────────────────
  const addEmptyBar = () => {
    setProposedBars((prev) => [
      ...prev,
      { id: uid(), maphoi: 0, chieudai: 0, tenphoi: "", materialName: "", cuts: [] },
    ]);
  };

  const removeBar = (barId: string) =>
    setProposedBars((prev) => prev.filter((b) => b.id !== barId));

  const updateBar = (barId: string, field: string, value: any) =>
    setProposedBars((prev) =>
      prev.map((b) => (b.id === barId ? { ...b, [field]: value } : b))
    );

  const addCut = (barId: string) =>
    setProposedBars((prev) =>
      prev.map((b) =>
        b.id === barId
          ? {
              ...b,
              cuts: [
                ...b.cuts,
                {
                  id: uid(),
                  mactdh: 0,
                  chieudaicat: 0,
                  thutucat: b.cuts.length + 1,
                  label: "",
                  materialName: "",
                },
              ],
            }
          : b
      )
    );

  const removeCut = (barId: string, cutId: string) =>
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

  const updateCut = (barId: string, cutId: string, field: string, value: any) =>
    setProposedBars((prev) =>
      prev.map((b) =>
        b.id === barId
          ? {
              ...b,
              cuts: b.cuts.map((c) =>
                c.id === cutId ? { ...c, [field]: value } : c
              ),
            }
          : b
      )
    );

  // ── Validation ────────────────────────────────────────
  const hasValidBars =
    proposedBars.length > 0 &&
    proposedBars.every(
      (b) =>
        b.maphoi > 0 &&
        b.cuts.length > 0 &&
        b.cuts.every((c) => c.mactdh > 0 && c.chieudaicat > 0 && c.thutucat > 0)
    );

  const hasOverrun = proposedBars.some(
    (b) => b.chieudai > 0 && b.cuts.reduce((s, c) => s + Number(c.chieudaicat), 0) > b.chieudai
  );

  const canSubmit = hasValidBars && !hasOverrun && !!reasonType && !!reasonDetail.trim() && !submitting;

  // ── Submit ────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const payload = {
        mapc,
        lydodexuat: `[${reasonType}] ${reasonDetail}`,
        simulatedBars: proposedBars.map((b) => ({
          maphoi: b.maphoi,
          cuts: b.cuts.map((c) => ({
            mactdh: c.mactdh,
            chieudaicat: c.chieudaicat,
            thutucat: c.thutucat,
          })),
        })),
      };
      await workerSubmitCuttingProposal(payload);
      alert("Gửi đề xuất thành công! Admin sẽ xem xét và duyệt.");
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Lỗi khi gửi đề xuất.");
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
                Đề xuất điều chỉnh phương án cắt
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
              <span>2. Chỉnh sửa & Gửi</span>
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
                  Xem kỹ phương án hiện tại trước khi đề xuất điều chỉnh. Mỗi
                  thanh phôi hiển thị sơ đồ trực quan, danh sách nhát cắt và
                  phần dư.
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

          {/* ━━ STEP 2: Chỉnh sửa & Gửi ━━━━━━━━━━━━━ */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Copy action */}
              <div>
                <h4 className="text-sm font-bold text-white mb-1">
                  Phương án đề xuất của Worker
                </h4>
                <p className="text-[11px] text-slate-400 mb-3">
                  Sao chép sơ đồ đang giao rồi chỉnh sửa phôi, nhát cắt, thứ
                  tự theo thực tế xưởng. Hoặc thêm phôi mới từ đầu.
                </p>

                {proposedBars.length === 0 && plansForMaPC.length > 0 && (
                  <button
                    type="button"
                    onClick={copyFromCurrent}
                    className="w-full mb-4 py-3 border border-dashed border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 rounded-xl text-sm text-cyan-300 font-semibold flex items-center justify-center transition-colors"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Sao chép từ sơ đồ đang giao rồi chỉnh sửa
                  </button>
                )}

                {proposedBars.length === 0 && (
                  <div className="text-xs text-slate-500 italic bg-black/20 rounded-xl p-4 text-center mb-3">
                    Chưa có phương án đề xuất. Bấm &quot;Sao chép&quot; hoặc
                    &quot;Thêm phôi&quot; bên dưới.
                  </div>
                )}
              </div>

              {/* Editable bars */}
              <div className="space-y-3">
                {proposedBars.map((bar) => (
                  <EditableBarCard
                    key={bar.id}
                    bar={bar}

                    onUpdateBar={(field, value) => updateBar(bar.id, field, value)}
                    onRemoveBar={() => removeBar(bar.id)}
                    onAddCut={() => addCut(bar.id)}
                    onRemoveCut={(cutId) => removeCut(bar.id, cutId)}
                    onUpdateCut={(cutId, field, value) =>
                      updateCut(bar.id, cutId, field, value)
                    }
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={addEmptyBar}
                className="w-full py-2.5 border border-dashed border-white/10 hover:border-white/20 bg-white/2 hover:bg-white/5 rounded-xl text-xs text-slate-400 hover:text-slate-300 flex items-center justify-center transition-colors"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Thêm phôi đề xuất
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
                Backend sẽ tự kiểm tra: BOM khớp, vật tư đúng, chiều dài phôi
                đủ, phôi không lỗi. Admin duyệt thì sơ đồ chính thức mới được
                thay đổi.
              </div>
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
                Tiếp: Chỉnh sửa đề xuất
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
    </div>
  );
}
