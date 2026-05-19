"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Scissors, Trash2, Wrench } from "lucide-react";
import { apiData } from "@/lib/api";

type IssueReport = {
  mank: number;
  solanbao?: number;
  nguoibao?: string[];
  masdcs?: number[];
  mapcs?: number[];
  madhs?: number[];
  maphoi: number;
  masdc: number | null;
  mapc: number | null;
  ghichu: string | null;
  chieudaitruoc: number;
  chieudaisau: number;
  thoigian: string;
  trangthaixuly: string;
  khothanhphoi: {
    maphoi: number;
    chieudaibandau: number;
    chieudaihientai: number;
    trangthai: string;
    vattu: { tenvt: string; donvitinh: string } | null;
  } | null;
  phancong: {
    mapc: number;
    madh: number;
    donhang: { madh: number; khachhang: { hoten: string } | null } | null;
  } | null;
  nguoidung: { mand: number; hoten: string } | null;
};

export default function AdminIssuesPage() {
  const [issues, setIssues] = useState<IssueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [trimIssue, setTrimIssue] = useState<IssueReport | null>(null);
  const [trimLength, setTrimLength] = useState("");
  const [trimNote, setTrimNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      setIssues(await apiData<IssueReport[]>("/api/admin/issues"));
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const scrapIssue = async (issue: IssueReport) => {
    const isScrapped = issue.khothanhphoi?.trangthai === "BO_DI";
    // Một UID có thể bị worker báo nhiều lần. Backend sẽ đóng toàn bộ sự cố đang mở cùng UID,
    // nên quản trị viên chỉ cần xác nhận trên một thẻ đại diện.
    const ok = confirm(
      isScrapped
        ? `Đóng các báo cáo còn lại của UID-${issue.maphoi}? Phôi này đã bị bỏ trước đó.`
        : `Xác nhận bỏ phôi UID-${issue.maphoi}? Phôi này sẽ không còn được tối ưu/cắt tiếp.`,
    );
    if (!ok) return;
    setBusyId(issue.mank);
    try {
      const rows = await apiData<IssueReport[]>(`/api/admin/issues/${issue.mank}/scrap`, { method: "POST" });
      setIssues(rows);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const submitTrim = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!trimIssue) return;
    const cutLength = Number(trimLength);
    if (!Number.isFinite(cutLength) || cutLength <= 0) {
      alert("Nhập chiều dài cần cắt bỏ hợp lệ.");
      return;
    }
    setBusyId(trimIssue.mank);
    try {
      // Cắt bỏ đoạn lỗi giữ lại phần phôi còn dùng được; nếu chiều dài về 0 backend tự chuyển BO_DI.
      const rows = await apiData<IssueReport[]>(`/api/admin/issues/${trimIssue.mank}/trim`, {
        method: "POST",
        body: JSON.stringify({ cutLength, ghichu: trimNote || null }),
      });
      setIssues(rows);
      setTrimIssue(null);
      setTrimLength("");
      setTrimNote("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="admin-metal-panel border border-white/10 rounded-2xl p-6 flex items-center justify-between gap-4 relative overflow-hidden">
        <div className="admin-metal-shine" />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-gray-100 flex items-center">
            <AlertTriangle className="w-6 h-6 mr-3 text-red-300" /> Xử lý sự cố phôi
          </h1>
          <p className="text-sm text-gray-400 mt-1 ml-9">
            Tập trung xử lý phôi bị worker báo lỗi. Chống dùng lại phôi lỗi và tránh thông báo rác.
          </p>
        </div>
        <button onClick={load} className="relative z-10 h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 font-semibold">
          <RefreshCw className={`w-4 h-4 mr-2 inline ${loading ? "animate-spin" : ""}`} /> Tải lại
        </button>
      </div>

      {errorMsg && <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-sm">{errorMsg}</div>}

      {loading ? (
        <div className="py-16 flex justify-center text-gray-400"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : issues.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#0a0a0c] px-5 py-16 text-center">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-3" />
          <p className="text-gray-200 font-bold">Không có sự cố phôi đang chờ xử lý.</p>
          <p className="text-sm text-gray-500 mt-1">Khi worker báo lỗi, sự cố sẽ xuất hiện tại đây.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {issues.map((issue) => {
            const stock = issue.khothanhphoi;
            const isScrapped = stock?.trangthai === "BO_DI";
            return (
              <div key={issue.mank} className="rounded-2xl border border-red-500/15 bg-[#0a0a0c] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[11px] font-mono text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-md px-2 py-0.5">UID-{issue.maphoi}</span>
                      <span className="text-[11px] font-bold text-red-100 bg-red-500/10 border border-red-500/20 rounded-md px-2 py-0.5">
                        {issue.solanbao ?? 1} lần báo
                      </span>
                      {(issue.masdcs?.length ? issue.masdcs : issue.masdc ? [issue.masdc] : []).slice(0, 3).map((masdc) => (
                        <span key={`sdc-${masdc}`} className="text-[11px] font-mono text-red-200 bg-red-500/10 border border-red-500/20 rounded-md px-2 py-0.5">SDC-{masdc}</span>
                      ))}
                      {(issue.mapcs?.length ? issue.mapcs : issue.mapc ? [issue.mapc] : []).slice(0, 3).map((mapc) => (
                        <span key={`pc-${mapc}`} className="text-[11px] font-mono text-sky-300 bg-sky-500/10 border border-sky-500/20 rounded-md px-2 py-0.5">PC-{mapc}</span>
                      ))}
                      {(issue.madhs?.length ? issue.madhs : issue.phancong?.madh ? [issue.phancong.madh] : []).slice(0, 3).map((madh) => (
                        <span key={`dh-${madh}`} className="text-[11px] font-mono text-gray-300 bg-white/5 border border-white/10 rounded-md px-2 py-0.5">DH-{madh}</span>
                      ))}
                    </div>
                    <h3 className="text-base font-bold text-gray-100 mt-2">{stock?.vattu?.tenvt || "Phôi chưa rõ vật tư"}</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Báo bởi {(issue.nguoibao?.length ? issue.nguoibao.join(", ") : issue.nguoidung?.hoten) || "Worker"} · mới nhất {new Date(issue.thoigian).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg border ${
                    isScrapped
                      ? "bg-red-500/15 text-red-200 border-red-500/30"
                      : "bg-amber-500/15 text-amber-200 border-amber-500/30"
                  }`}>
                    {isScrapped ? "Phôi đã bỏ" : "Chờ xử lý"}
                  </span>
                </div>

                <div className="mt-4 rounded-xl bg-black/25 border border-white/5 px-3 py-2 text-xs text-gray-300 whitespace-pre-wrap">
                  {issue.ghichu || "Không có mô tả."}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <InfoBox label="Ban đầu" value={`${stock?.chieudaibandau ?? 0} mm`} />
                  <InfoBox label="Hiện tại" value={`${stock?.chieudaihientai ?? issue.chieudaisau ?? 0} mm`} />
                  <InfoBox label="Trạng thái" value={stock?.trangthai || "N/A"} />
                </div>

                {isScrapped && (
                  <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                    Phôi này đã bị bỏ. Bấm đóng báo cáo để xử lý nốt các log sự cố cũ cùng UID.
                  </div>
                )}

                <div className={`mt-4 grid grid-cols-1 ${isScrapped ? "" : "md:grid-cols-2"} gap-2`}>
                  {!isScrapped && (
                    <button
                      onClick={() => {
                        setTrimIssue(issue);
                        setTrimLength("");
                        setTrimNote("");
                      }}
                      disabled={busyId === issue.mank}
                      className="h-11 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-100 border border-amber-500/25 font-bold text-sm flex items-center justify-center disabled:opacity-60"
                    >
                      <Scissors className="w-4 h-4 mr-2" /> Cắt bỏ đoạn lỗi
                    </button>
                  )}
                  <button
                    onClick={() => scrapIssue(issue)}
                    disabled={busyId === issue.mank}
                    className="h-11 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-200 border border-red-500/25 font-bold text-sm flex items-center justify-center disabled:opacity-60"
                  >
                    {busyId === issue.mank ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    {isScrapped ? "Đóng báo cáo" : "Bỏ phôi"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {trimIssue && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={submitTrim} className="w-full max-w-md rounded-2xl border border-white/10 bg-[#12141a] shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10">
              <h3 className="text-white font-bold flex items-center">
                <Wrench className="w-5 h-5 mr-2 text-amber-200" /> Cắt bỏ đoạn lỗi UID-{trimIssue.maphoi}
              </h3>
              <p className="text-xs text-gray-400 mt-1">Nhập chiều dài phần hỏng cần loại bỏ. Ví dụ lỗi 10cm thì nhập 100mm.</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 mb-2 block" htmlFor="trim-length">Chiều dài cắt bỏ (mm)</label>
                <input
                  id="trim-length"
                  type="number"
                  min={1}
                  value={trimLength}
                  onChange={(event) => setTrimLength(event.target.value)}
                  className="h-12 w-full bg-[#030508] border border-white/10 rounded-xl px-3 text-white outline-none focus:border-amber-400"
                  placeholder="Ví dụ: 100"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-300 mb-2 block" htmlFor="trim-note">Ghi chú xử lý</label>
                <textarea
                  id="trim-note"
                  value={trimNote}
                  onChange={(event) => setTrimNote(event.target.value)}
                  rows={3}
                  className="w-full bg-[#030508] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400 resize-none"
                  placeholder="Ví dụ: cắt bỏ đầu phôi bị cong."
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-white/10 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setTrimIssue(null)} className="h-11 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 font-bold">
                Hủy
              </button>
              <button disabled={busyId === trimIssue.mank} className="h-11 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center justify-center disabled:opacity-60">
                {busyId === trimIssue.mank ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Scissors className="w-4 h-4 mr-2" />}
                Xác nhận
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/20 border border-white/5 px-3 py-2">
      <div className="text-gray-500">{label}</div>
      <div className="font-bold text-gray-100">{value}</div>
    </div>
  );
}
