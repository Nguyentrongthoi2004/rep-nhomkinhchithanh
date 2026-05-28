/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, CheckCircle2, Loader2, RefreshCw, Eye, Check, X, AlertTriangle, HelpCircle, Info, XCircle } from "lucide-react";
import { 
  adminListCuttingProposals, 
  adminGetCuttingProposalDetail, 
  adminApproveCuttingProposal, 
  adminRejectCuttingProposal 
} from "@/lib/api";

type ProposalSummary = {
  madxc: number;
  mapc: number;
  mand: number;
  ngaytao: string;
  trangthai: "CHO_DUYET" | "DA_DUYET" | "TU_CHOI" | "HET_HIEU_LUC";
  lydodexuat: string | null;
  admin_ghichu: string | null;
  tonghaohut_moi: number | null;
  tiletandung_moi: number | null;
  score_moi: number | null;
  metrics_moi: any;
  nguoidung?: { hoten: string } | null;
  phancong?: {
    madh: number;
  } | null;
};

function formatScore(score: number | null | undefined): string {
  if (score == null || !Number.isFinite(Number(score))) return "—";
  return Math.round(Number(score)).toLocaleString("vi-VN");
}

function scoreColor(score: number | null | undefined): string {
  if (score == null) return "text-gray-400";
  const n = Number(score);
  if (n >= 500) return "text-emerald-300";
  if (n > 0) return "text-sky-300";
  if (n === 0) return "text-gray-300";
  return "text-red-300";
}

function scoreBgClass(score: number | null | undefined): string {
  if (score == null) return "bg-gray-500/10 border-gray-500/20";
  const n = Number(score);
  if (n >= 500) return "bg-emerald-500/10 border-emerald-500/20";
  if (n > 0) return "bg-sky-500/10 border-sky-500/20";
  if (n === 0) return "bg-gray-500/10 border-gray-500/20";
  return "bg-red-500/10 border-red-500/20";
}

function loaiPhanDuLabel(loai: string | null | undefined): { text: string; cls: string } {
  switch (loai) {
    case "TAI_SU_DUNG":
      return { text: "Tái sử dụng", cls: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20" };
    case "PHE_LIEU":
      return { text: "Phế liệu", cls: "text-gray-300 bg-gray-500/10 border-gray-500/20" };
    case "LO_CO":
      return { text: "Lỡ cỡ ⚠", cls: "text-amber-300 bg-amber-500/10 border-amber-500/20" };
    default:
      return { text: loai || "—", cls: "text-gray-400 bg-gray-500/10 border-gray-500/20" };
  }
}

function getStatusReasonText(status: string | null | undefined): string {
  switch (status) {
    case "DA_DUYET":
      return "Đề xuất này đã được duyệt và sơ đồ đã được cập nhật.";
    case "TU_CHOI":
      return "Đề xuất này đã bị từ chối.";
    case "HET_HIEU_LUC":
      return "Đề xuất này đã hết hiệu lực do dữ liệu sản xuất hoặc đề xuất song song khác đã thay đổi.";
    default:
      return `Đề xuất đang ở trạng thái: ${status || "Chưa rõ"}. Không thể chỉnh sửa.`;
  }
}

export default function AdminProposalsPage() {
  const [proposals, setProposals] = useState<ProposalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  
  const [actionNote, setActionNote] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showScoreTooltip, setShowScoreTooltip] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
  };

  const loadList = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await adminListCuttingProposals();
      setProposals(data || []);
    } catch (err: any) {
      setErrorMsg(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openDetail = async (id: number) => {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const data = await adminGetCuttingProposalDetail(id);
      setDetail(data);
    } catch (err: any) {
      showToast(err.message || String(err), "error");
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
    setActionNote("");
    setShowRejectModal(false);
    setShowApproveModal(false);
    setShowScoreTooltip(false);
  };

  const handleApprove = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      await adminApproveCuttingProposal(detail.madxc, actionNote);
      showToast(
        "Đã duyệt đề xuất.\nSơ đồ cắt chính thức đã được cập nhật.\nKho chưa bị trừ ở bước duyệt.\nCác đề xuất song song nếu có đã hết hiệu lực.",
        "success"
      );
      closeDetail();
      loadList();
    } catch (err: any) {
      showToast(err.message || "Lỗi khi duyệt đề xuất.", "error");
      closeDetail();
      loadList();
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      await adminRejectCuttingProposal(detail.madxc, actionNote);
      showToast(
        "Đã từ chối đề xuất.\nSơ đồ cắt hiện tại không thay đổi.",
        "success"
      );
      closeDetail();
      loadList();
    } catch (err: any) {
      showToast(err.message || "Lỗi khi từ chối đề xuất.", "error");
    } finally {
      setBusy(false);
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "CHO_DUYET": return <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-1 rounded-md text-xs font-bold">Chờ duyệt</span>;
      case "DA_DUYET": return <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded-md text-xs font-bold">Đã duyệt</span>;
      case "TU_CHOI": return <span className="bg-red-500/15 text-red-300 border border-red-500/30 px-2 py-1 rounded-md text-xs font-bold">Từ chối</span>;
      case "HET_HIEU_LUC": return <span className="bg-gray-500/15 text-gray-300 border border-gray-500/30 px-2 py-1 rounded-md text-xs font-bold">Hết hiệu lực</span>;
      default: return <span className="text-gray-400">{st}</span>;
    }
  };

  // Group chitietdexuatcat by maphoi
  const groupedByPhoi = useMemo(() => {
    if (!detail?.chitietdexuatcat?.length) return [];
    const grouped = new Map<number, any[]>();
    for (const ct of detail.chitietdexuatcat) {
      const key = Number(ct.maphoi);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(ct);
    }
    return Array.from(grouped.entries()).map(([maphoi, cuts]) => ({
      maphoi,
      cuts: cuts.sort((a: any, b: any) => Number(a.thutucat) - Number(b.thutucat)),
      score: cuts[0]?.score,
      phandu_saucat: cuts[0]?.phandu_saucat,
      loai_phandu: cuts[0]?.loai_phandu,
      lydochon: cuts[0]?.lydochon,
      chieudaiphoi_truoccat: cuts[0]?.chieudaiphoi_truoccat,
      kerf_mm: cuts[0]?.kerf_mm,
    }));
  }, [detail]);

  return (
    <div className="space-y-6 pb-20 relative">
      <div className="admin-metal-panel border border-white/10 rounded-2xl p-6 flex items-center justify-between gap-4 relative overflow-hidden">
        <div className="admin-metal-shine" />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-gray-100 flex items-center">
            <ClipboardList className="w-6 h-6 mr-3 text-sky-300" /> Đề xuất cắt phôi
          </h1>
          <p className="text-sm text-gray-400 mt-1 ml-9">
            Xem và phê duyệt các đề xuất điều chỉnh phương án cắt từ thợ.
          </p>
        </div>
        <button onClick={loadList} className="relative z-10 h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 font-semibold">
          <RefreshCw className={`w-4 h-4 mr-2 inline ${loading ? "animate-spin" : ""}`} /> Tải lại
        </button>
      </div>

      {errorMsg && <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-sm">{errorMsg}</div>}

      {loading ? (
        <div className="py-16 flex justify-center text-gray-400"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : proposals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#0a0a0c] px-5 py-16 text-center">
          <CheckCircle2 className="w-10 h-10 mx-auto text-sky-400 mb-3" />
          <p className="text-gray-200 font-bold">Không có đề xuất cắt nào.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {proposals.map((p) => (
            <div key={p.madxc} className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-5 hover:border-sky-500/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <span className="text-[11px] font-mono text-white bg-white/10 border border-white/20 rounded-md px-2 py-0.5">#{p.madxc}</span>
                    <span className="text-[11px] font-mono text-sky-300 bg-sky-500/10 border border-sky-500/20 rounded-md px-2 py-0.5">PC-{p.mapc}</span>
                    {p.phancong?.madh && <span className="text-[11px] font-mono text-gray-300 bg-white/5 border border-white/10 rounded-md px-2 py-0.5">DH-{p.phancong.madh}</span>}
                  </div>
                  <h3 className="text-base font-bold text-gray-100 mt-2">Người gửi: {p.nguoidung?.hoten || "Không rõ"}</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Ngày gửi: {new Date(p.ngaytao).toLocaleString("vi-VN")}
                  </p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-2">
                  {getStatusBadge(p.trangthai)}
                  {/* Score badge */}
                  {p.score_moi != null && (
                    <span className={`text-[11px] font-bold border rounded-md px-2 py-0.5 ${scoreBgClass(p.score_moi)} ${scoreColor(p.score_moi)}`}>
                      Score: {formatScore(p.score_moi)}
                    </span>
                  )}
                  <button 
                    onClick={() => openDetail(p.madxc)}
                    className="flex items-center text-xs font-semibold text-sky-400 hover:text-sky-300 bg-sky-400/10 hover:bg-sky-400/20 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Eye className="w-3 h-3 mr-1" /> Chi tiết
                  </button>
                </div>
              </div>
              
              <div className="mt-4 rounded-xl bg-black/25 border border-white/5 px-3 py-2 text-xs text-gray-300">
                <span className="text-gray-500 font-semibold block mb-1">Lý do đề xuất:</span>
                {p.lydodexuat || <span className="italic text-gray-600">Không có lý do</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL DRAWER / MODAL */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeDetail} />
          
          <div className="relative w-full max-w-2xl h-full bg-[#12141a] border-l border-white/10 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white flex items-center">
                Chi tiết đề xuất #{selectedId}
              </h2>
              <button onClick={closeDetail} className="p-2 rounded-lg hover:bg-white/10 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {detailLoading ? (
                <div className="py-20 flex justify-center text-gray-400"><Loader2 className="w-8 h-8 animate-spin" /></div>
              ) : !detail ? (
                <div className="text-red-400 text-center py-20">Không tải được chi tiết.</div>
              ) : (
                <>
                  {/* Status Box */}
                  <div className="flex items-center justify-between p-4 bg-black/30 border border-white/5 rounded-xl">
                    <div>
                      <div className="text-xs text-gray-500 font-semibold mb-1">Trạng thái hiện tại</div>
                      {getStatusBadge(detail.trangthai)}
                    </div>
                    {detail.admin_ghichu && (
                      <div className="text-right">
                        <div className="text-xs text-gray-500 font-semibold mb-1">Ghi chú xử lý</div>
                        <div className="text-sm text-gray-300">{detail.admin_ghichu}</div>
                      </div>
                    )}
                  </div>

                  {/* HET_HIEU_LUC explanation */}
                  {detail.trangthai === "HET_HIEU_LUC" && (
                    <div className="p-4 bg-gray-500/10 border border-gray-500/20 rounded-xl">
                      <div className="flex items-center text-gray-300 font-bold text-sm mb-2">
                        <Info className="w-4 h-4 mr-2" /> Đề xuất hết hiệu lực
                      </div>
                      <p className="text-sm text-gray-400">
                        Đề xuất này đã hết hiệu lực vì sơ đồ hoặc đề xuất cùng phân công đã thay đổi. Bạn không thể duyệt đề xuất này nữa.
                      </p>
                    </div>
                  )}

                  {/* Score + Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-sky-500/10 border border-sky-500/20 rounded-xl">
                      <div className="text-xs text-sky-400/70 font-bold mb-2">KẾT QUẢ DỰ KIẾN MỚI</div>
                      <div className="text-2xl font-bold text-sky-100 mb-1">{detail.tiletandung_moi != null ? Number(detail.tiletandung_moi).toFixed(1) : "—"}%</div>
                      <div className="text-xs text-sky-300">Tỷ lệ tận dụng phôi</div>
                      <div className="mt-3 text-sm text-sky-200/80">Hao hụt: {detail.tonghaohut_moi != null ? `${Math.round(detail.tonghaohut_moi)} mm` : "—"}</div>
                    </div>
                    {/* Score card */}
                    <div className={`p-4 border rounded-xl ${scoreBgClass(detail.score_moi)}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-bold opacity-70">SCORE TỔNG</div>
                        <button
                          type="button"
                          onClick={() => setShowScoreTooltip(!showScoreTooltip)}
                          className="text-gray-400 hover:text-white"
                          title="Giải thích score"
                        >
                          <HelpCircle className="w-4 h-4" />
                        </button>
                      </div>
                      <div className={`text-3xl font-bold ${scoreColor(detail.score_moi)}`}>
                        {formatScore(detail.score_moi)}
                      </div>
                      {detail.score_moi != null && Number(detail.score_moi) < 0 && (
                        <div className="mt-2 text-xs text-red-300 flex items-center">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Phương án tạo phần dư lỡ cỡ
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Score tooltip */}
                  {showScoreTooltip && (
                    <div className="p-4 bg-[#0c0e14] border border-sky-500/20 rounded-xl text-sm text-gray-300 space-y-2">
                      <h4 className="font-bold text-white text-sm flex items-center">
                        <HelpCircle className="w-4 h-4 mr-2 text-sky-400" /> Giải thích Score
                      </h4>
                      <ul className="space-y-1.5 text-xs text-gray-400">
                        <li><span className="text-emerald-300 font-bold">Score cao dương:</span> Phương án tốt — tận dụng phôi hiệu quả hoặc tạo phần dư còn tái sử dụng được.</li>
                        <li><span className="text-amber-300 font-bold">Score thấp:</span> Phương án kém tối ưu hơn.</li>
                        <li><span className="text-red-300 font-bold">Score âm:</span> Cảnh báo tạo phần dư lỡ cỡ — phần dư không đủ dài để tái sử dụng nhưng cũng không nhỏ để coi là tận dụng hết.</li>
                        <li className="text-gray-500">Score chỉ là chỉ số hỗ trợ đánh giá. Admin nên xem chi tiết phôi, nhát cắt và phần dư trước khi quyết định.</li>
                      </ul>
                    </div>
                  )}

                  {/* Reason */}
                  <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <div className="text-xs text-gray-500 font-bold mb-2">LÝ DO GỬI</div>
                    <div className="text-sm text-gray-300">{detail.lydodexuat || "Không có lý do"}</div>
                  </div>

                  {/* Warnings if any */}
                  {detail.warnings?.length > 0 && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                      <div className="flex items-center text-amber-400 font-bold text-sm mb-2">
                        <AlertTriangle className="w-4 h-4 mr-2" /> Cảnh báo từ hệ thống
                      </div>
                      <ul className="list-disc pl-5 text-sm text-amber-200/80 space-y-1">
                        {detail.warnings.map((w: string, idx: number) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Cut Details - Grouped by phoi */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-300 mb-3 border-b border-white/10 pb-2">
                      Phôi đề xuất ({groupedByPhoi.length} phôi · {detail.chitietdexuatcat?.length || 0} nhát cắt)
                    </h3>
                    <div className="space-y-4">
                      {groupedByPhoi.map((group) => {
                        const phanDu = loaiPhanDuLabel(group.loai_phandu);
                        const barScore = group.score;
                        return (
                          <div key={group.maphoi} className="bg-black/20 border border-white/5 rounded-xl overflow-hidden">
                            {/* Bar header */}
                            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sky-300 font-bold text-sm">UID-{group.maphoi}</span>
                                <span className={`text-[10px] font-bold border rounded px-1.5 py-0.5 ${phanDu.cls}`}>
                                  {phanDu.text}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs">
                                {group.chieudaiphoi_truoccat != null && (
                                  <span className="text-gray-400">Phôi: <b className="text-white">{Math.round(Number(group.chieudaiphoi_truoccat)).toLocaleString("vi-VN")} mm</b></span>
                                )}
                                {group.phandu_saucat != null && (
                                  <span className="text-gray-400">Dư: <b className={Number(group.phandu_saucat) < 0 ? "text-red-300" : "text-amber-300"}>{Math.round(Number(group.phandu_saucat)).toLocaleString("vi-VN")} mm</b></span>
                                )}
                                {barScore != null && (
                                  <span className={`font-bold ${scoreColor(barScore)}`}>
                                    Score: {formatScore(barScore)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Cuts */}
                            <div className="divide-y divide-white/5">
                              {group.cuts.map((ct: any) => (
                                <div key={ct.mactdxc || `${ct.maphoi}-${ct.thutucat}`} className="px-4 py-2.5 text-sm">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="text-[11px] text-gray-500 font-mono w-5 shrink-0">#{ct.thutucat}</span>
                                      <span className="text-gray-200 font-mono">CT-{ct.mactdh}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs shrink-0">
                                      <span className="text-white font-bold font-mono">{Math.round(Number(ct.chieudaicat)).toLocaleString("vi-VN")} mm</span>
                                      {ct.kerf_mm != null && <span className="text-gray-500">kerf {ct.kerf_mm}mm</span>}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Bar reason */}
                            {group.lydochon && (
                              <div className="px-4 py-2.5 border-t border-white/5 text-[11px] text-gray-500">
                                <span className="font-semibold text-gray-400 mr-1">Lý do hệ thống:</span>
                                <span className="italic">
                                  {group.lydochon.split(";").map((part: string, i: number) => (
                                    <span key={i}>
                                      {i > 0 && <br />}
                                      {part.trim()}
                                    </span>
                                  ))}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Actions Footer */}
            {!detailLoading && (
              <div className="p-6 border-t border-white/10 bg-[#0a0a0c] space-y-4">
                {detail?.trangthai !== "CHO_DUYET" && (
                  <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-300 text-xs flex items-start gap-2.5">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block mb-0.5">Không thể duyệt/từ chối</span>
                      <span>{getStatusReasonText(detail?.trangthai)}</span>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <button 
                    disabled={detail?.trangthai !== "CHO_DUYET"}
                    onClick={() => { setActionNote(""); setShowRejectModal(true); }}
                    className="flex-1 h-12 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold flex items-center justify-center border border-red-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <X className="w-5 h-5 mr-2" /> Từ chối
                  </button>
                  <button 
                    disabled={detail?.trangthai !== "CHO_DUYET"}
                    onClick={() => { setActionNote(""); setShowApproveModal(true); }}
                    className="flex-1 h-12 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center border border-emerald-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Check className="w-5 h-5 mr-2" /> Duyệt đề xuất
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* APPROVE MODAL */}
      {showApproveModal && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12141a] border border-emerald-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center">
              <CheckCircle2 className="w-6 h-6 mr-2 text-emerald-400" /> Duyệt và thay sơ đồ cắt?
            </h3>
            <div className="space-y-2 mb-5">
              <p className="text-sm text-gray-300">
                Duyệt đề xuất này sẽ thay thế sơ đồ cắt chính thức của phân công.
              </p>
              <ul className="text-xs text-gray-400 space-y-2 list-disc pl-4">
                <li>Bước duyệt <b>không trừ kho</b>; kho chỉ cập nhật ở luồng hoàn thành.</li>
                <li>Các đề xuất song song của cùng phân công <b>có thể chuyển hết hiệu lực</b>.</li>
              </ul>
            </div>
            <textarea
              placeholder="Ghi chú thêm (tùy chọn)..."
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              className="w-full bg-[#030508] border border-white/10 rounded-xl p-3 text-sm text-white mb-5 focus:border-emerald-500 outline-none resize-none"
              rows={3}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowApproveModal(false)} className="flex-1 h-11 rounded-xl bg-white/5 hover:bg-white/10 font-bold text-gray-300">Hủy</button>
              <button disabled={busy} onClick={handleApprove} className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-50 flex justify-center items-center">
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "Duyệt và thay sơ đồ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12141a] border border-red-500/30 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center">
              <XCircle className="w-6 h-6 mr-2 text-red-400" /> Từ chối đề xuất?
            </h3>
            <p className="text-sm text-gray-300 mb-5">
              Đề xuất này sẽ bị từ chối. Sơ đồ cắt hiện tại không thay đổi.
            </p>
            <textarea
              placeholder="Nhập lý do từ chối (khuyến khích)..."
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              className="w-full bg-[#030508] border border-white/10 rounded-xl p-3 text-sm text-white mb-5 focus:border-red-500 outline-none resize-none"
              rows={3}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowRejectModal(false)} className="flex-1 h-11 rounded-xl bg-white/5 hover:bg-white/10 font-bold text-gray-300">Hủy</button>
              <button disabled={busy} onClick={handleReject} className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold disabled:opacity-50 flex justify-center items-center">
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "Từ chối đề xuất"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CENTER OVERLAY MODAL TOAST */}
      {toast && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md bg-[#12141a] rounded-2xl p-6 shadow-2xl relative text-center border animate-in fade-in zoom-in-95 duration-200 ${
            toast.type === "success" 
              ? "border-emerald-500/30"
              : toast.type === "error"
              ? "border-rose-500/30"
              : "border-sky-500/30"
          }`}>
            <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 border ${
              toast.type === "success" 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : toast.type === "error"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                : "bg-sky-500/10 border-sky-500/30 text-sky-400"
            }`}>
              {toast.type === "success" ? (
                <Check className="w-6 h-6" />
              ) : toast.type === "error" ? (
                <XCircle className="w-6 h-6" />
              ) : (
                <Info className="w-6 h-6" />
              )}
            </div>
            
            <h3 className="text-lg font-bold text-white mb-2">
              {toast.type === "success" 
                ? "Thành công" 
                : toast.type === "error" 
                ? "Lỗi / Thất bại" 
                : "Thông tin"}
            </h3>
            
            <div className="text-sm text-gray-300 space-y-2 mb-6 whitespace-pre-line text-left bg-black/35 p-4 rounded-xl border border-white/5 font-medium leading-relaxed">
              {toast.message}
            </div>

            <button
              onClick={() => setToast(null)}
              className="w-full h-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
