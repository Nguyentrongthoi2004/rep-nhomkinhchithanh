"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ClipboardList,
  Hammer,
  Loader2,
  Package,
  Ruler,
  Scissors,
  UserRound,
} from "lucide-react";
import { apiJson } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { formatOrderStatus } from "@/lib/order-status";
import { InlineNotice, type NoticeState } from "@/components/admin/Feedback";

type AssignmentDetail = {
  mapc: number;
  madh: number;
  matho: number;
  trangthai: string;
  lydotuchoi: string | null;
  tuchoiluc: string | null;
  donhang: {
    madh: number;
    ngaytao: string;
    trangthai: string;
    tonggiatri: number;
    khachhang: { hoten: string; sdt: string | null; email: string | null; diachi: string | null } | null;
    chitietdh: Array<{
      mactdh: number;
      mota: string | null;
      chieudaicat: number | null;
      soluong: number;
      vattu: { tenvt: string; donvitinh: string } | null;
    }>;
  } | null;
  nguoidung: { hoten: string; sdt: string | null; tendangnhap: string | null } | null;
  sodocat?: Array<{ masdc: number; trangthai: string; maphoi: number | null }> | null;
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  CHO_THUC_HIEN: { label: "Chờ nhận", className: "border-slate-500/25 bg-slate-500/10 text-slate-300" },
  DANG_THUC_HIEN: { label: "Đang làm", className: "border-sky-500/25 bg-sky-500/10 text-sky-300" },
  HOAN_THANH: { label: "Đã xong", className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300" },
  TU_CHOI: { label: "Từ chối", className: "border-red-500/25 bg-red-500/10 text-red-300" },
};

const money = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value || 0);

function statusMeta(status: string) {
  return STATUS_META[status] ?? STATUS_META.CHO_THUC_HIEN;
}

export default function AssignmentDetailPage() {
  const params = useParams<{ mapc: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const mapc = Number(params?.mapc || 0);
  const [detail, setDetail] = useState<AssignmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("phancong")
        .select(`
          mapc, madh, matho, trangthai, lydotuchoi, tuchoiluc,
          donhang:madh(
            madh, ngaytao, trangthai, tonggiatri,
            khachhang:makh(hoten, sdt, email, diachi),
            chitietdh(mactdh, mota, chieudaicat, soluong, vattu:mavt(tenvt, donvitinh))
          ),
          nguoidung:matho(hoten, sdt, tendangnhap),
          sodocat:mapc(masdc, trangthai, maphoi)
        `)
        .eq("mapc", mapc)
        .maybeSingle();
      if (error) throw error;
      setDetail((data ?? null) as unknown as AssignmentDetail | null);
    } catch (error: unknown) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  }, [mapc, supabase]);

  useEffect(() => {
    if (mapc) load();
  }, [load, mapc]);

  const startAssignment = async () => {
    try {
      await apiJson(`/api/admin/assignments/${mapc}`, {
        method: "PATCH",
        body: JSON.stringify({ trangthai: "DANG_THUC_HIEN" }),
      });
      setNotice({ tone: "ok", text: "Đã chuyển phân công sang đang làm." });
      await load();
    } catch (error: unknown) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : String(error) });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => router.push("/admin/phan-cong")} className="inline-flex items-center text-sm font-bold text-gray-300 hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại giao việc
        </button>
        <div className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-8 text-center text-gray-500">Không tìm thấy phân công PC-{mapc}.</div>
      </div>
    );
  }

  const meta = statusMeta(detail.trangthai);
  const bom = detail.donhang?.chitietdh ?? [];
  const cutItems = bom.filter((item) => Number(item.chieudaicat || 0) > 0);
  const totalPieces = bom.reduce((sum, item) => sum + Number(item.soluong || 0), 0);

  return (
    <div className="space-y-6 pb-20">
      <section className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <button type="button" onClick={() => router.push("/admin/phan-cong")} className="mb-4 inline-flex items-center text-sm font-bold text-gray-400 hover:text-white">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại giao việc
            </button>
            <h1 className="flex items-center text-2xl font-bold text-gray-100">
              <ClipboardList className="mr-3 h-6 w-6 text-emerald-400" />
              Chi tiết phân công PC-{detail.mapc}
            </h1>
            <p className="mt-1 text-sm text-gray-400">Tổng hợp đơn hàng, thợ phụ trách, BOM và sơ đồ cắt liên quan.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-bold ${meta.className}`}>{meta.label}</span>
            <Link href={`/admin/toi-uu-cat/${detail.mapc}`} className="inline-flex items-center rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-2.5 text-sm font-bold text-sky-200 hover:bg-sky-500/20">
              <Scissors className="mr-2 h-4 w-4" />
              Tối ưu cắt
            </Link>
          </div>
        </div>
      </section>

      <InlineNotice notice={notice} onClose={() => setNotice(null)} />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <InfoCard icon={Package} label="Đơn hàng" value={`DH-${detail.madh}`} hint={formatOrderStatus(detail.donhang?.trangthai ?? "")} />
        <InfoCard icon={UserRound} label="Thợ phụ trách" value={detail.nguoidung?.hoten || "Không rõ"} hint={detail.nguoidung?.sdt || detail.nguoidung?.tendangnhap || ""} />
        <InfoCard icon={Ruler} label="BOM cần cắt" value={cutItems.length} hint={`${totalPieces} chi tiết tổng`} />
        <InfoCard icon={Scissors} label="Sơ đồ cắt" value={detail.sodocat?.length ?? 0} hint="Số sơ đồ đã tạo" />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-5">
            <div className="text-sm font-bold text-gray-100">Thông tin đơn và khách</div>
            <div className="mt-4 space-y-3 text-sm">
              <Row label="Khách hàng" value={detail.donhang?.khachhang?.hoten || "Khách lẻ"} />
              <Row label="SĐT" value={detail.donhang?.khachhang?.sdt || "Chưa có"} />
              <Row label="Email" value={detail.donhang?.khachhang?.email || "Chưa có"} />
              <Row label="Địa chỉ" value={detail.donhang?.khachhang?.diachi || "Chưa có"} />
              <Row label="Tổng đơn" value={money(detail.donhang?.tonggiatri ?? 0)} strong />
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-5">
            <div className="text-sm font-bold text-gray-100">Thao tác</div>
            <div className="mt-4 grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={startAssignment}
                disabled={detail.trangthai !== "CHO_THUC_HIEN"}
                className="inline-flex items-center justify-center rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm font-bold text-sky-200 hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Hammer className="mr-2 h-4 w-4" />
                Chuyển sang đang làm
              </button>
              <Link href={`/admin/toi-uu-cat/${detail.mapc}`} className="inline-flex items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200 hover:bg-emerald-500/20">
                <Scissors className="mr-2 h-4 w-4" />
                Mở tối ưu cắt
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#0a0a0c]">
          <div className="border-b border-white/10 px-5 py-4">
            <div className="text-sm font-bold text-gray-100">BOM công việc</div>
            <div className="mt-1 text-xs text-gray-500">{bom.length} hạng mục · {cutItems.length} hạng mục có chiều dài cắt</div>
          </div>
          {bom.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500">Đơn chưa có BOM.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="p-4 text-left">Hạng mục</th>
                    <th className="p-4 text-left">Vật tư</th>
                    <th className="p-4 text-right">Chiều dài</th>
                    <th className="p-4 text-right">Số lượng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {bom.map((item) => (
                    <tr key={item.mactdh} className="hover:bg-white/[0.02]">
                      <td className="p-4 font-semibold text-gray-100">{item.mota || "Hạng mục"}</td>
                      <td className="p-4 text-gray-400">{item.vattu?.tenvt || "Không rõ"}</td>
                      <td className="p-4 text-right font-mono text-sky-300">{item.chieudaicat ? `${item.chieudaicat.toLocaleString("vi-VN")} mm` : "Theo SL"}</td>
                      <td className="p-4 text-right font-mono text-gray-200">{item.soluong} {item.vattu?.donvitinh || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, hint }: { icon: typeof Package; label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#0a0a0c] p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-300">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</div>
          <div className="mt-1 truncate text-lg font-bold text-gray-100">{value}</div>
          <div className="mt-0.5 truncate text-xs text-gray-500">{hint}</div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-3 last:border-b-0 last:pb-0">
      <div className="text-gray-500">{label}</div>
      <div className={`max-w-[65%] text-right ${strong ? "font-bold text-gray-100" : "text-gray-300"}`}>{value}</div>
    </div>
  );
}
