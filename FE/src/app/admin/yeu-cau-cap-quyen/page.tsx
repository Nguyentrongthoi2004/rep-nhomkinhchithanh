"use client";

import { useCallback, useEffect, useState } from "react";
import { XCircle, Loader2, Shield, UserPlus, KeyRound, RefreshCw } from "lucide-react";
import { apiData } from "@/lib/api";

type RequestRow = {
  mayc: number;
  hoten: string;
  sdt: string | null;
  tendangnhap: string;
  vaitro: "ADMIN" | "WORKER";
  trangthai: "PENDING" | "APPROVED" | "REJECTED";
  ghichu: string | null;
  ngaytao: string;
};

export default function AccessRequestsPage() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [credential, setCredential] = useState<{ email: string; password: string } | null>(null);
  const [mailInfo, setMailInfo] = useState<{ ok: boolean; previewUrl?: string | null; error?: string } | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      setRows(await apiData<RequestRow[]>("/api/admin/access-requests"));
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const approve = async (mayc: number) => {
    setActionLoading(mayc);
    setCredential(null);
    setMailInfo(null);
    try {
      const data = await apiData<{
        success: boolean;
        credential?: { email: string; password: string };
        mail?: { ok: boolean; previewUrl?: string | null; error?: string };
      }>(`/api/admin/access-requests/${mayc}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "APPROVE" }),
      });
      if (data?.credential) setCredential(data.credential);
      if (data?.mail) setMailInfo(data.mail);
      fetchRows();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(null);
    }
  };

  const reject = async (mayc: number) => {
    const reason = prompt("Lý do từ chối (tuỳ chọn):") || null;
    setActionLoading(mayc);
    setCredential(null);
    try {
      await apiData(`/api/admin/access-requests/${mayc}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "REJECT", payload: { ghichu: reason } }),
      });
      fetchRows();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="admin-metal-panel rounded-2xl p-6 relative overflow-hidden">
        <div className="admin-metal-shine" />
        <div className="flex justify-between items-start gap-4 relative z-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-100 flex items-center">
              <Shield className="w-6 h-6 mr-3 text-slate-300" />
              Yêu Cầu Cấp Quyền Tài Khoản
            </h1>
            <p className="text-gray-400 text-sm mt-1 ml-9">
              Duyệt yêu cầu → hệ thống tự cấp email/mật khẩu (chỉ hiện 1 lần).
            </p>
          </div>
          <button
            onClick={fetchRows}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 flex items-center font-semibold transition-colors"
            title="Tải lại"
            aria-label="Tải lại"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Tải lại
          </button>
        </div>
      </div>

      {credential && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 text-sm text-emerald-200">
          <div className="font-bold flex items-center mb-2">
            <KeyRound className="w-4 h-4 mr-2" /> Thông tin cấp mới (copy ngay)
          </div>
          <div className="font-mono text-emerald-100">Email: {credential.email}</div>
          <div className="font-mono text-emerald-100">Password: {credential.password}</div>
          <div className="text-xs text-emerald-300/80 mt-2">Lưu ý: mật khẩu không được lưu lại trong hệ thống.</div>
        </div>
      )}

      {mailInfo && (
        <div
          className={`rounded-2xl p-5 text-sm border ${
            mailInfo.ok ? "bg-sky-500/10 border-sky-500/20 text-sky-200" : "bg-amber-500/10 border-amber-500/20 text-amber-200"
          }`}
        >
          <div className="font-bold mb-1">{mailInfo.ok ? "Đã gửi email cấp quyền" : "Gửi email thất bại"}</div>
          {mailInfo.ok ? (
            mailInfo.previewUrl ? (
              <div className="text-xs">
                Preview (dev):{" "}
                <a className="underline underline-offset-2" href={mailInfo.previewUrl} target="_blank" rel="noreferrer">
                  mở preview
                </a>
              </div>
            ) : (
              <div className="text-xs text-sky-300/80">Đã gửi qua SMTP cấu hình.</div>
            )
          ) : (
            <div className="text-xs">{mailInfo.error || "Không rõ lỗi"}</div>
          )}
        </div>
      )}

      {errorMsg && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300">{errorMsg}</div>}

      <div className="bg-[#0a0a0c]/60 border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-[11px] uppercase tracking-wider text-gray-400">
                <th className="p-4 font-semibold w-20">Mã</th>
                <th className="p-4 font-semibold">Người yêu cầu</th>
                <th className="p-4 font-semibold w-44">Tài khoản</th>
                <th className="p-4 font-semibold w-28 text-center">Vai trò</th>
                <th className="p-4 font-semibold w-28 text-center">Trạng thái</th>
                <th className="p-4 font-semibold w-40 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((r) => (
                <tr key={r.mayc} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 text-sm font-mono text-gray-400">#{r.mayc}</td>
                  <td className="p-4">
                    <div className="text-sm font-bold text-gray-200">{r.hoten}</div>
                    <div className="text-xs text-gray-500">{r.sdt || "—"}</div>
                  </td>
                  <td className="p-4 text-sm font-mono text-slate-200">{r.tendangnhap}</td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide border ${
                      r.vaitro === "ADMIN"
                        ? "bg-red-500/10 text-red-300 border-red-500/20"
                        : "bg-blue-500/10 text-blue-300 border-blue-500/20"
                    }`}>
                      {r.vaitro}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide border ${
                      r.trangthai === "PENDING"
                        ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                        : r.trangthai === "APPROVED"
                          ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                          : "bg-gray-500/10 text-gray-300 border-gray-500/20"
                    }`}>
                      {r.trangthai}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {actionLoading === r.mayc ? (
                      <Loader2 className="w-5 h-5 animate-spin inline-block text-gray-400" />
                    ) : r.trangthai !== "PENDING" ? (
                      <span className="text-xs text-gray-500">Đã xử lý</span>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => approve(r.mayc)}
                          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors flex items-center"
                          title="Duyệt"
                          aria-label="Duyệt"
                        >
                          <UserPlus className="w-4 h-4 mr-2" /> Duyệt
                        </button>
                        <button
                          onClick={() => reject(r.mayc)}
                          className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/25 text-rose-200 text-sm font-bold transition-colors flex items-center"
                          title="Từ chối"
                          aria-label="Từ chối"
                        >
                          <XCircle className="w-4 h-4 mr-2 text-rose-300" /> Từ chối
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Chưa có yêu cầu nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

