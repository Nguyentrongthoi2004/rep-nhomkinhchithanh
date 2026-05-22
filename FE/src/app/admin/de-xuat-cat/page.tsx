/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardList, CheckCircle2, Loader2, RefreshCw, Eye, Check, X, AlertTriangle } from "lucide-react";
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
  metrics_moi: any;
  nguoidung?: { hoten: string } | null;
  phancong?: {
    madh: number;
  } | null;
};

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
      alert(err.message || String(err));
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
  };

  const handleApprove = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      await adminApproveCuttingProposal(detail.madxc, actionNote);
      alert("Đã duyệt đề xuất thành công!");
      closeDetail();
      loadList();
    } catch (err: any) {
      if (err.status === 409) {
        alert("Đề xuất đã hết hiệu lực do dữ liệu sản xuất đã thay đổi.");
        closeDetail();
        loadList();
      } else {
        alert(err.message || "Lỗi khi duyệt đề xuất.");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!detail) return;
    if (!actionNote.trim()) {
      alert("Vui lòng nhập lý do từ chối!");
      return;
    }
    setBusy(true);
    try {
      await adminRejectCuttingProposal(detail.madxc, actionNote);
      alert("Đã từ chối đề xuất!");
      closeDetail();
      loadList();
    } catch (err: any) {
      alert(err.message || "Lỗi khi từ chối đề xuất.");
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

  return (
    <div className="space-y-6 pb-20 relative">
      <div className="admin-metal-panel border border-white/10 rounded-2xl p-6 flex items-center justify-between gap-4 relative overflow-hidden">
        <div className="admin-metal-shine" />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-gray-100 flex items-center">
            <ClipboardList className="w-6 h-6 mr-3 text-sky-300" /> Đề xuất cắt phôi
          </h1>
          <p className="text-sm text-gray-400 mt-1 ml-9">
            Xem và phê duyệt các đề xuất tối ưu cắt phôi từ thợ.
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

                  {/* Metrics Comparison */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-sky-500/10 border border-sky-500/20 rounded-xl">
                      <div className="text-xs text-sky-400/70 font-bold mb-2">KẾT QUẢ DỰ KIẾN MỚI</div>
                      <div className="text-2xl font-bold text-sky-100 mb-1">{detail.tiletandung_moi != null ? Number(detail.tiletandung_moi).toFixed(1) : "—"}%</div>
                      <div className="text-xs text-sky-300">Tỷ lệ tận dụng phôi</div>
                      <div className="mt-3 text-sm text-sky-200/80">Hao hụt: {detail.tonghaohut_moi != null ? `${Math.round(detail.tonghaohut_moi)} mm` : "—"}</div>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl opacity-70">
                      <div className="text-xs text-gray-500 font-bold mb-2">LÝ DO GỬI</div>
                      <div className="text-sm text-gray-300">{detail.lydodexuat || "Không có lý do"}</div>
                    </div>
                  </div>

                  {/* Warnings if any */}
                  {detail.metrics_moi?.warnings?.length > 0 && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                      <div className="flex items-center text-amber-400 font-bold text-sm mb-2">
                        <AlertTriangle className="w-4 h-4 mr-2" /> Cảnh báo từ hệ thống
                      </div>
                      <ul className="list-disc pl-5 text-sm text-amber-200/80 space-y-1">
                        {detail.metrics_moi.warnings.map((w: string, idx: number) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Cut Details */}
                  <div>
                    <h3 className="text-sm font-bold text-gray-300 mb-3 border-b border-white/10 pb-2">Danh sách phôi đề xuất ({detail.chitietdexuatcat?.length || 0})</h3>
                    <div className="space-y-3">
                      {detail.chitietdexuatcat?.map((ct: any, idx: number) => (
                        <div key={ct.mactdxc || idx} className="p-3 bg-black/20 border border-white/5 rounded-lg text-sm text-gray-300">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-mono text-sky-300 font-bold">UID-{ct.maphoi}</span>
                            <span className="text-xs text-gray-500">{ct.nhapxuat?.vattu?.tenvt || "Phôi"}</span>
                          </div>
                          <div className="text-xs text-gray-400">
                            Số nhát cắt: <span className="text-gray-200">{ct.soluongcat || 0}</span>
                            <br />
                            Lý do hệ thống: <span className="italic">{ct.lydochon}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Actions Footer */}
            {detail?.trangthai === "CHO_DUYET" && !detailLoading && (
              <div className="p-6 border-t border-white/10 bg-[#0a0a0c] flex gap-3">
                <button 
                  onClick={() => { setActionNote(""); setShowRejectModal(true); }}
                  className="flex-1 h-12 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold flex items-center justify-center border border-red-500/20 transition-colors"
                >
                  <X className="w-5 h-5 mr-2" /> Từ chối
                </button>
                <button 
                  onClick={() => { setActionNote(""); setShowApproveModal(true); }}
                  className="flex-1 h-12 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center border border-emerald-500/20 transition-colors"
                >
                  <Check className="w-5 h-5 mr-2" /> Duyệt đề xuất
                </button>
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
              <CheckCircle2 className="w-6 h-6 mr-2 text-emerald-400" /> Xác nhận duyệt
            </h3>
            <p className="text-sm text-gray-400 mb-5">
              Hệ thống sẽ cập nhật sơ đồ cắt chính thức dựa trên đề xuất này. Mọi sơ đồ của PC-{detail?.mapc} chưa cắt sẽ bị thay thế. Bạn có chắc chắn?
            </p>
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
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "Duyệt ngay"}
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
              <X className="w-6 h-6 mr-2 text-red-400" /> Từ chối đề xuất
            </h3>
            <p className="text-sm text-gray-400 mb-5">
              Đề xuất này sẽ bị hủy bỏ. Sơ đồ cắt hiện tại không thay đổi. Vui lòng nhập lý do.
            </p>
            <textarea
              placeholder="Nhập lý do từ chối (bắt buộc)..."
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              className="w-full bg-[#030508] border border-white/10 rounded-xl p-3 text-sm text-white mb-5 focus:border-red-500 outline-none resize-none"
              rows={3}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowRejectModal(false)} className="flex-1 h-11 rounded-xl bg-white/5 hover:bg-white/10 font-bold text-gray-300">Hủy</button>
              <button disabled={busy || !actionNote.trim()} onClick={handleReject} className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold disabled:opacity-50 flex justify-center items-center">
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "Xác nhận từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
