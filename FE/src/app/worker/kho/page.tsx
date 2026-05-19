"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Package,
  Search,
  Loader2,
  Scissors,
  Save,
  X,
  Ruler,
  Tag,
  Filter,
  PackageCheck,
  PackageX,
  Sparkles,
} from "lucide-react";
import { apiJson } from "@/lib/api";

interface KhoPhoiItem {
  maphoi: number;
  chieudaibandau: number;
  chieudaihientai: number;
  trangthai: string;
  vattu: { tenvt: string; donvitinh: string } | null;
}

type StatusFilter = "ALL" | "MOI" | "CON_DU" | "BO_DI";

export default function WorkerKhoPage() {
  const [items, setItems] = useState<KhoPhoiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [errorMsg, setErrorMsg] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selected, setSelected] = useState<KhoPhoiItem | null>(null);
  const [cutLength, setCutLength] = useState<number>(0);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const json = await apiJson<KhoPhoiItem[]>("/api/worker/raw-stock");
      setItems(json.data || []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    return items.filter((x) => {
      if (statusFilter !== "ALL" && x.trangthai !== statusFilter) return false;
      if (!s) return true;
      const uid = `uid-${x.maphoi.toString().padStart(5, "0")}`.toLowerCase();
      return uid.includes(s) || (x.vattu?.tenvt || "").toLowerCase().includes(s);
    });
  }, [items, searchTerm, statusFilter]);

  const totals = useMemo(() => {
    return {
      total: items.length,
      reusable: items.filter((i) => i.trangthai !== "BO_DI" && i.chieudaihientai > 0).length,
      scrap: items.filter((i) => i.trangthai === "BO_DI").length,
    };
  }, [items]);

  const openCutModal = (item: KhoPhoiItem) => {
    setSelected(item);
    setCutLength(0);
    setNote("");
    setIsModalOpen(true);
  };

  const handleCut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    if (!cutLength || cutLength <= 0) return alert("Nhập chiều dài cắt hợp lệ");
    if (cutLength > selected.chieudaihientai) return alert("Chiều dài cắt lớn hơn chiều dài còn lại");

    setIsSubmitting(true);
    try {
      await apiJson("/api/worker/raw-stock/cut", {
        method: "POST",
        body: JSON.stringify({
          action: "CUT",
          maphoi: selected.maphoi,
          payload: { cutLength, ghichu: note || null },
        }),
      });
      setIsModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Đầu trang */}
      <section className="relative overflow-hidden rounded-3xl admin-metal-panel border border-white/10 px-5 py-5">
        <div className="admin-metal-shine" />
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-300" /> Kho phôi nhôm
            </div>
            <h2 className="text-xl font-extrabold brand-name mt-1 leading-tight">Chọn phôi để cắt</h2>
            <p className="text-xs text-slate-400 mt-1">Tìm đúng UID. Nhập chiều dài sau khi cắt.</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-400/15 border border-sky-400/30 flex items-center justify-center">
            <Package className="w-6 h-6 text-sky-200" />
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/5">
          <MiniStat icon={<Package className="w-3.5 h-3.5" />} label="Tổng" value={totals.total} tone="slate" />
          <MiniStat icon={<PackageCheck className="w-3.5 h-3.5" />} label="Dùng được" value={totals.reusable} tone="emerald" />
          <MiniStat icon={<PackageX className="w-3.5 h-3.5" />} label="Bỏ đi" value={totals.scrap} tone="rose" />
        </div>
      </section>

      {/* Tìm kiếm và bộ lọc */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4.5 h-4.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 transition"
            placeholder="Tìm UID hoặc tên vật tư..."
            aria-label="Tìm kiếm phôi"
          />
        </div>
        <FilterChips value={statusFilter} onChange={setStatusFilter} />
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Danh sách kho */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="py-16 flex justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/2 px-5 py-10 text-center text-sm text-slate-500">
            Không có phôi khớp bộ lọc hiện tại.
          </div>
        ) : (
          filtered.map((it) => {
            const isScrap = it.trangthai === "BO_DI";
            const isNew = it.trangthai === "MOI";
            return (
              <button
                key={it.maphoi}
                onClick={() => !isScrap && openCutModal(it)}
                disabled={isScrap}
                className={`w-full text-left rounded-2xl border p-3.5 transition-colors relative overflow-hidden ${
                  isScrap
                    ? "border-white/5 bg-[#0a0a0c] opacity-60 cursor-not-allowed"
                    : "border-white/10 bg-[#10131a]/85 active:bg-white/5 hover:border-white/20"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-sky-300" />
                      <div className="text-[12px] font-mono font-bold text-sky-300">
                        UID-{it.maphoi.toString().padStart(5, "0")}
                      </div>
                    </div>
                    <div className="text-sm text-slate-100 font-semibold mt-1 truncate">
                      {it.vattu?.tenvt || "Vật tư không xác định"}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Ruler className="w-3 h-3" />
                        <span className="font-mono text-slate-200">{it.chieudaihientai}</span>
                        <span className="text-slate-500">/ {it.chieudaibandau} mm</span>
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={it.trangthai} />
                </div>

                {/* Thanh tiến độ tồn kho */}
                <progress
                  className={`worker-progress mt-3 ${
                    isNew ? "worker-progress--new" : isScrap ? "worker-progress--scrap" : "worker-progress--usable"
                  }`}
                  value={Math.max(0, it.chieudaihientai)}
                  max={Math.max(1, it.chieudaibandau)}
                />
              </button>
            );
          })
        )}
      </div>

      {/* Hộp thoại chi tiết */}
      {isModalOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#121418] border border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-md shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.7)] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex justify-between items-center bg-[#0c0c0f]">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Scissors className="w-4 h-4 text-emerald-400" /> Cập nhật sau khi cắt
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5"
                title="Đóng"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCut} className="p-5 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/3 p-3.5">
                <div className="font-mono text-[12px] text-sky-300">
                  UID-{selected.maphoi.toString().padStart(5, "0")}
                </div>
                <div className="mt-0.5 text-sm font-semibold text-slate-100">
                  {selected.vattu?.tenvt}
                </div>
                <div className="mt-2 flex items-center gap-2 text-[12px] text-slate-400">
                  <Ruler className="w-3.5 h-3.5" />
                  Còn lại:{" "}
                  <span className="font-mono text-emerald-300 font-semibold">
                    {selected.chieudaihientai} mm
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-300 font-medium">Chiều dài vừa cắt (mm)</label>
                <input
                  type="number"
                  min={1}
                  max={selected.chieudaihientai}
                  inputMode="numeric"
                  value={cutLength || ""}
                  onChange={(e) => setCutLength(Number(e.target.value))}
                  className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-4 py-3.5 text-lg font-mono font-bold text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="VD: 2354"
                />
                {cutLength > 0 && (
                  <div className="text-[11px] text-slate-400">
                    Sau khi cắt còn:{" "}
                    <span className="font-mono text-emerald-300 font-semibold">
                      {Math.max(0, selected.chieudaihientai - cutLength)} mm
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-300 font-medium">Ghi chú (tuỳ chọn)</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-[#0a0a0c] border border-white/10 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="VD: cắt cho DH-0012"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-linear-to-br from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl transition-colors flex items-center justify-center shadow-[0_10px_30px_-10px_rgba(16,185,129,0.6)]"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Save className="w-5 h-5 mr-2" />
                )}
                Lưu cập nhật
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    MOI: { label: "Mới", cls: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
    CON_DU: { label: "Còn dùng", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
    BO_DI: { label: "Bỏ đi", cls: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  };
  const m = map[status] || { label: status, cls: "bg-white/5 text-slate-300 border-white/10" };
  return (
    <span
      className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${m.cls}`}
    >
      {m.label}
    </span>
  );
}

function MiniStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "slate" | "emerald" | "rose";
}) {
  const c = {
    slate: "text-slate-300",
    emerald: "text-emerald-300",
    rose: "text-rose-300",
  }[tone];
  return (
    <div className="rounded-xl border border-white/5 bg-white/2 px-2.5 py-2">
      <div className={`flex items-center gap-1.5 ${c}`}>
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      </div>
      <div className="text-base font-extrabold text-white tabular-nums">{value}</div>
    </div>
  );
}

function FilterChips({
  value,
  onChange,
}: {
  value: StatusFilter;
  onChange: (v: StatusFilter) => void;
}) {
  const options: { id: StatusFilter; label: string }[] = [
    { id: "ALL", label: "Tất cả" },
    { id: "MOI", label: "Mới" },
    { id: "CON_DU", label: "Còn dư" },
    { id: "BO_DI", label: "Bỏ" },
  ];
  const current = options.find((o) => o.id === value) || options[0];
  return (
    <details className="relative">
      <summary className="list-none cursor-pointer flex items-center gap-1.5 px-3 py-3 rounded-xl bg-[#0a0a0c] border border-white/10 text-[12px] font-semibold text-slate-200">
        <Filter className="w-4 h-4 text-slate-400" /> {current.label}
      </summary>
      <div className="absolute right-0 mt-1 z-20 min-w-[140px] rounded-xl border border-white/10 bg-[#101218] p-1 shadow-xl">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => {
              onChange(o.id);
              (document.activeElement as HTMLElement | null)?.blur();
              const d = document.querySelector("details[open]") as HTMLDetailsElement | null;
              if (d) d.open = false;
            }}
            className={`w-full text-left px-3 py-2 text-[12px] rounded-lg transition-colors ${
              o.id === value ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </details>
  );
}
